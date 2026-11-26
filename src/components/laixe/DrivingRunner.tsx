"use client";

import { useCallback, useEffect, useEffectEvent, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Flag,
  PartyPopper,
  Check,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  Languages,
  LayoutGrid,
  Lightbulb,
  FastForward,
  Play,
  Rewind,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  TriangleAlert,
  Star,
  X,
  ZoomIn,
} from "lucide-react";
import { clientApi } from "@/lib/client-api";
import { FAIL_TEXT, grade, isRight, type DrivingQ, type ExamAnswer, type ExamResult, type Lang } from "@/lib/laixe/rules";
import { stemVi } from "@/lib/laixe/stems-vi";
import { NUM_PRE_VI, NUM_UNIT_VI } from "@/lib/laixe/units";
import type { QuizStat } from "@/lib/quiz/types";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { GuestTrialNote, GuestWall, useGuestCount, useGuestQuota } from "../GuestQuota";
import { ImageLightbox } from "../quiz/ImageLightbox";
import { useConfirm } from "@/components/ConfirmDialog";
import { useExamLeaveGuard } from "@/hooks/useExamLeaveGuard";
import Mascot from "@/components/Mascot";

/**
 * Màn làm câu hỏi của tab Lái xe và Leben in Deutschland (giống app iOS/Android):
 * - lesen: đọc — đáp án đúng đã đánh dấu sẵn
 * - ueben: luyện — chọn rồi bấm Kiểm tra, lưu kết quả từng câu
 * - exam: thi thử — có giờ, nộp bài rồi xem lại (chấm theo điểm lỗi)
 * - review: xem lại bài thi đã lưu
 */
export type RunnerMode = "lesen" | "ueben" | "exam" | "review";

export type ExamSetup = { kind: "random" | "bogen"; ref: string; cls: string; minutes: number; maxErrorPoints: number };
export type QuizModule = "fuehrerschein" | "lid";

/** Khác nhau giữa 2 phần: lái xe chọn nhiều đáp án + điểm lỗi; LiD 1 đáp án, đếm câu đúng (mỗi câu 1 "điểm lỗi") */
const MODULES = {
  fuehrerschein: { base: "/lai-xe", single: false, parts: ["Grundstoff", "Zusatzstoff"] },
  lid: { base: "/leben-in-deutschland", single: true, parts: ["Câu chung", "Câu của bang"] },
} as const;

type Props = {
  module?: QuizModule;
  mode: RunnerMode;
  title: string;
  subtitle?: string;
  backHref: string;
  questions: DrivingQ[];
  loggedIn: boolean;
  lang: Lang;
  stats?: Record<string, QuizStat>;
  bookmarks?: string[];
  exam?: ExamSetup;
  /** review: câu đã chọn + kết quả của bài thi đã lưu */
  review?: { picked: Record<string, string[]>; result: ExamResult; maxErrorPoints: number };
  /** Link đổi chế độ học (đọc ⇄ luyện) cho cùng nhóm câu */
  modeLinks?: { lesen: string; ueben: string };
  /** Nhớ câu đang học (localStorage) để lần sau mở lại đúng chỗ — như app */
  resumeKey?: string;
};

const MAX_VIEWS = 5;
type VideoState = { count: number; answering: boolean; replay?: boolean };

export default function DrivingRunner({
  module = "fuehrerschein",
  mode,
  title,
  subtitle,
  backHref,
  questions,
  loggedIn,
  stats = {},
  bookmarks = [],
  exam,
  review,
  modeLinks,
  resumeKey,
}: Props) {
  const cfg = MODULES[module];
  /** Lái xe: khung xanh lá giống phần mềm thi thật */
  const fs = module === "fuehrerschein";
  const pathname = usePathname();
  const router = useRouter();
  const [rawIdx, setIdx] = useState(0);
  const idx = Math.min(rawIdx, Math.max(0, questions.length - 1));
  const [picked, setPicked] = useState<Record<string, string[]>>(review?.picked ?? {});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<ExamResult | null>(review?.result ?? null);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [saveError, setSaveError] = useState("");
  const [local, setLocal] = useState(stats);
  const [marked, setMarked] = useState(() => new Set(bookmarks));
  const [videos, setVideos] = useState<Record<string, VideoState>>({});
  const [showExplain, setShowExplain] = useState(false);
  const [picker, setPicker] = useState(false);
  const [zoom, setZoom] = useState<{ src: string; alt: string } | null>(null);
  const [shake, setShake] = useState(0);
  const [tab, setTab] = useState<"grund" | "zusatz">("grund");
  const [startedAt] = useState(() => Date.now());
  const [ready, setReady] = useState(!resumeKey);
  // Bản dịch: luyện / đọc mặc định hiện, thi thử mặc định ẩn (như app)
  const prefix = module === "lid" ? "lid" : "lx";
  const [trLearn, setTrLearn] = useLocalStorage<boolean>(`${prefix}:tr`, true);
  const [trExam, setTrExam] = useLocalStorage<boolean>(`${prefix}:tr-exam`, false);
  // LiD (như app): làm sai tự đánh dấu ⭐, làm đúng tự bỏ đánh dấu
  const [autoMark] = useLocalStorage<boolean>("lid:auto-mark", true);
  const isExam = mode === "exam" || mode === "review";
  const showTr = isExam ? trExam : trLearn;
  const setShowTr = isExam ? setTrExam : setTrLearn;
  const top = useRef<HTMLDivElement>(null);
  const [ask, confirmDialog] = useConfirm();
  const [abandoned, setAbandoned] = useState(false); // rời bài thi rồi quay lại → đang tạo đề mới

  const submitted = mode === "review" || (mode === "exam" && !!result);

  // Như LiD: trang bị <Activity> ẩn khi chuyển trang và được giữ lại. Hiện lại (vd. bấm Back) sau khi đã rời bài thi đang làm
  // → bỏ lượt đó, lấy đề mới (không thì đáp án + đồng hồ cũ chạy tiếp ngầm, hết giờ tự nộp bài người học đã bỏ).
  // Đã nộp bài thì giữ nguyên trang kết quả. >1 giây: bỏ qua lần chạy kép của StrictMode lúc mount.
  const hiddenAt = useRef(0);
  const onShown = useEffectEvent(() => {
    if (mode === "exam" && !result && hiddenAt.current && Date.now() - hiddenAt.current > 1000) {
      setAbandoned(true);
      router.refresh(); // đề mới có key mới (xem trang lam-bai / de-mau) → màn mới
    }
    hiddenAt.current = 0;
  });
  useLayoutEffect(() => {
    onShown();
    return () => {
      hiddenAt.current = Date.now();
      setPicker(false);
      setZoom(null);
    };
  }, []);

  const q = questions[idx];
  // Khách: học thử có giới hạn số câu mỗi ngày · thi thử cần tài khoản
  const quota = useGuestQuota(module, loggedIn);
  const guestExam = !loggedIn && mode === "exam";
  const blocked = useGuestCount(quota, q?.id, ready && (mode === "ueben" || mode === "lesen")) || guestExam;
  const mine = picked[q?.id] ?? [];
  const reveal = mode === "lesen" || submitted || (mode === "ueben" && !!checked[q?.id]);
  const maxErrorPoints = review?.maxErrorPoints ?? exam?.maxErrorPoints ?? 10;

  const go = useCallback(
    (i: number) => {
      const next = Math.max(0, Math.min(questions.length - 1, i));
      setIdx(next);
      setShowExplain(false);
      setPicker(false);
      const nq = questions[next];
      if (nq && isExam) setTab(nq.grund ? "grund" : "zusatz");
      top.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    },
    [questions, isExam],
  );

  const switchExamTab = useCallback(
    (nextTab: "grund" | "zusatz") => {
      setTab(nextTab);
      const cur = questions[idx];
      if (cur && cur.grund !== (nextTab === "grund")) {
        const firstIdx = questions.findIndex((x) => x.grund === (nextTab === "grund"));
        if (firstIdx >= 0) {
          setIdx(firstIdx);
          setShowExplain(false);
        }
      }
    },
    [questions, idx],
  );

  // Mở lại đúng câu đang học dở (không nhảy vào câu đang bị GuestWall chặn)
  const posKey = resumeKey ? (resumeKey.startsWith("laixe:pos:") ? `pos:${resumeKey}` : `pos:${resumeKey}`) : null;
  useEffect(() => {
    if (!posKey) return;
    try {
      const id = localStorage.getItem(posKey);
      const i = id ? questions.findIndex((x) => x.id === id) : -1;
      if (i > 0) {
        if (quota.canOpen(questions[i].id)) {
          setIdx(i); // eslint-disable-line react-hooks/set-state-in-effect -- localStorage chỉ đọc được sau khi hydrate
        } else {
          const fallback = questions.findLastIndex((x, k) => k < i && quota.canOpen(x.id));
          if (fallback > 0) setIdx(fallback);
        }
      }
    } catch {}
    setReady(true);
  }, [posKey, questions, quota]);

  useEffect(() => {
    if (!posKey || !ready || !questions[idx] || blocked || !quota.canOpen(questions[idx].id)) return;
    try {
      localStorage.setItem(posKey, questions[idx].id);
    } catch {}
  }, [posKey, ready, idx, questions, blocked, quota]);

  const toggle = (key: string) => {
    if (reveal || !q || blocked) return;
    if (cfg.single) {
      setPicked((p) => ({ ...p, [q.id]: [key] }));
      if (mode === "ueben") check([key]); // 1 đáp án: chọn là chấm luôn (như app)
      return;
    }
    setPicked((p) => {
      const cur = p[q.id] ?? [];
      return { ...p, [q.id]: cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key] };
    });
  };

  const setMark = (id: string, on: boolean) => {
    setMarked((s) => {
      const n = new Set(s);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });
    return clientApi("/quiz/bookmarks", { method: "POST", body: { module, qid: id, on } });
  };

  const onBookmarksPage = pathname.endsWith("/danh-dau");

  const check = (answer = mine) => {
    if (!q || !answer.length || blocked) return;
    const ok = isRight(q, answer);
    setChecked((c) => ({ ...c, [q.id]: true }));
    setLocal((s) => ({ ...s, [q.id]: { correct: (s[q.id]?.correct ?? 0) + +ok, wrong: (s[q.id]?.wrong ?? 0) + +!ok, lastOk: ok } }));
    if (!ok) {
      setShake((n) => n + 1);
      navigator.vibrate?.(150);
    }
    if (!loggedIn) return;
    clientApi("/quiz", { method: "POST", body: { module, answers: [{ qid: q.id, ok }] }, keepalive: true }).catch(() => {});
    if (module === "lid" && autoMark && !(onBookmarksPage && ok) && marked.has(q.id) === ok) setMark(q.id, !ok).catch(() => {});
  };

  const retry = () => {
    if (!q) return;
    const drop = <T,>(o: Record<string, T>) => Object.fromEntries(Object.entries(o).filter(([k]) => k !== q.id));
    setChecked(drop);
    setPicked(drop);
    setVideos(drop);
    setShowExplain(false);
  };

  const answeredCount = questions.filter((x) => picked[x.id]?.length).length;

  // Đang thi và đã làm câu nào (khách không thi được): hỏi trước khi rời trang bằng link, nút Back trình duyệt hay đóng tab.
  // Chưa làm câu nào thì cho đi thẳng, không hỏi thừa
  useExamLeaveGuard(mode === "exam" && !submitted && !abandoned && loggedIn && answeredCount > 0, ask, backHref);

  const submit = useCallback(() => {
    if (!exam || result || abandoned) return;
    const r = grade(questions, picked, exam.maxErrorPoints);
    setResult(r);
    setIdx(0);
    setTab("grund");
    top.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    if (!loggedIn) return;
    const answers: ExamAnswer[] = questions.map((x) => ({ qid: x.id, picked: picked[x.id] ?? [], order: x.order }));
    if (module === "lid" && autoMark)
      for (const x of questions) {
        if (!picked[x.id]?.length) continue;
        const ok = isRight(x, picked[x.id]);
        if (marked.has(x.id) === ok) setMark(x.id, !ok).catch(() => {});
      }
    clientApi<{ id: number }>("/quiz/exams", {
      method: "POST",
      body: { module, kind: exam.kind, ref: exam.ref, cls: exam.cls, durationS: (Date.now() - startedAt) / 1000, answers },
      keepalive: true,
    })
      .then((d) => setSavedId(d.id))
      .catch((e: Error) => setSaveError(e.message));
  }, [exam, result, abandoned, questions, picked, loggedIn, startedAt, module, autoMark, marked]); // eslint-disable-line react-hooks/exhaustive-deps -- setMark chỉ gọi API

  const askSubmit = async () => {
    const left = questions.length - answeredCount;
    const yes = await ask(
      left
        ? { title: "Nộp bài?", text: `Còn ${left} câu chưa làm (tính là sai). Nộp bài?`, ok: "Nộp bài", cancel: "Làm tiếp", tone: "red", icon: <Flag className="size-5" /> }
        : { title: "Nộp bài?", text: "Nộp bài và xem kết quả?", ok: "Nộp bài", cancel: "Làm tiếp", icon: <Flag className="size-5" /> },
    );
    if (yes) submit();
  };

  const toggleMark = (id: string) => {
    const on = !marked.has(id);
    setMark(id, on).catch(() =>
      setMarked((s) => {
        const n = new Set(s);
        if (on) n.delete(id);
        else n.add(id);
        return n;
      }),
    );
  };

  // Video: KHÔNG bật VideoGate ở chế độ Đọc lướt (lesen); chỉ bật cho thi thử và luyện tập khi chưa chấm đáp án
  const gated = !!q?.video && ((mode === "exam" && !submitted) || (mode === "ueben" && !checked[q?.id]));
  const vstate = (q && videos[q.id]) || { count: 0, answering: false, replay: false };
  const videoStep = gated && !vstate.answering;
  const setVideo = (patch: Partial<VideoState>) => q && setVideos((v) => ({ ...v, [q.id]: { ...vstate, ...patch } }));

  // Phím tắt: ←/→ chuyển câu, 1–4 chọn đáp án, Enter kiểm tra (lần 2 sau khi chấm: sang câu tiếp)
  const display = useMemo(() => (q ? q.order.map((i) => q.options[i]).filter(Boolean) : []), [q]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        blocked ||
        picker ||
        zoom !== null ||
        confirmDialog ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        document.querySelector('[aria-modal="true"]') ||
        t?.closest("input:not(:disabled), textarea, select, [contenteditable]")
      )
        return;
      if (e.key === "ArrowRight") go(idx + 1);
      else if (e.key === "ArrowLeft") go(idx - 1);
      else if (/^[1-9]$/.test(e.key) && !videoStep && !reveal) {
        const o = display[Number(e.key) - 1];
        if (o) toggle(o.key);
      } else if (e.key === "Enter" && mode === "ueben" && !videoStep) {
        if (!reveal && !cfg.single && mine.length > 0) {
          check();
        } else if (reveal && idx < questions.length - 1 && !t?.closest("button:not(:disabled), a[href]")) {
          go(idx + 1);
        } else return;
      } else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (abandoned) {
    return (
      <div className="card empty" role="status">
        <span className="icon-bubble tint-sec size-14" aria-hidden>
          <RotateCw className="size-7 animate-spin motion-reduce:animate-none" />
        </span>
        <p className="font-bold text-foreground">Đang tạo đề thi mới…</p>
      </div>
    );
  }

  if (!q) {
    const isMarkedEmpty = pathname.endsWith("/danh-dau");
    const isWrongEmpty = pathname.endsWith("/cau-sai");
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link href={backHref} className="btn-icon" aria-label="Quay lại" title="Quay lại">
            <ArrowLeft className="size-5" />
          </Link>
          <div className="flex min-w-0 flex-1 flex-col">
            <h1 className="page-title">{title}</h1>
            {subtitle && <p className="truncate text-sm text-muted">{subtitle}</p>}
          </div>
        </div>
        <div className="card empty">
          <Mascot className="size-20" />
          <p className="text-base font-semibold text-foreground">
            {isMarkedEmpty ? "Chưa có câu hỏi nào được đánh dấu" : isWrongEmpty ? "Không còn câu sai nào — giỏi lắm!" : "Không có câu hỏi nào trong mục này."}
          </p>
          {isMarkedEmpty && (
            <p className="-mt-2 flex items-center gap-1.5 text-sm text-muted">
              Bấm <Star className="size-4 text-gold" aria-label="ngôi sao" /> ở câu hỏi để lưu lại những câu khó cần ôn kỹ.
            </p>
          )}
          {isWrongEmpty && <p className="-mt-2 text-sm text-muted">Các câu làm sai khi luyện tập hoặc thi thử sẽ tự gom về đây để bạn ôn lại.</p>}
          <Link href={backHref} className="btn">
            <ArrowLeft className="size-4" /> Quay lại
          </Link>
        </div>
      </div>
    );
  }

  const status = (x: DrivingQ): Cell => {
    if (mode === "exam" && !submitted) return picked[x.id]?.length ? "answered" : "empty";
    if (submitted) return isRight(x, picked[x.id]) ? "ok" : "bad";
    if (mode === "ueben" && checked[x.id]) return isRight(x, picked[x.id]) ? "ok" : "bad";
    const s = local[x.id];
    return s ? (s.lastOk ? "ok-old" : "bad-old") : "empty";
  };

  const right = isRight(q, mine);
  const grundCount = questions.filter((x) => x.grund).length;
  const visible =
    isExam && grundCount && grundCount < questions.length
      ? questions.map((x, i) => ({ x, i })).filter(({ x }) => x.grund === (tab === "grund"))
      : questions.map((x, i) => ({ x, i }));
  const hasLeftMedia = Boolean(q.video || (!q.optionImages && q.images.length > 0));
  const stemTranslation = showTr ? stemVi(q.stem) : null;

  // Khi khách hết lượt 10 câu/ngày, cho phép lùi lại câu đã mở trước đó trong cùng danh sách thay vì khóa cứng
  const fallbackAllowedIdx =
    !loggedIn && quota.wall
      ? (() => {
          const prevIdx = questions.findLastIndex((x, k) => k < idx && quota.canOpen(x.id));
          return prevIdx >= 0 ? prevIdx : questions.findIndex((x) => quota.canOpen(x.id));
        })()
      : -1;

  const startNewExam = () => {
    const target = `${cfg.base}/thi-thu/lam-bai`;
    if (pathname === target) {
      setAbandoned(true);
      router.refresh();
    } else {
      router.push(target);
    }
  };

  return (
    <div ref={top} className="flex scroll-mt-20 flex-col gap-4">
      {/* Đầu trang */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <Link
          href={backHref}
          className="btn-icon"
          aria-label={mode === "exam" && !submitted ? "Thoát bài thi" : "Quay lại"}
          title={mode === "exam" && !submitted ? "Thoát" : "Quay lại"}
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="truncate text-sm text-muted">{subtitle}</p>}
        </div>
        {mode === "exam" && !submitted && exam && <Timer minutes={exam.minutes} startedAt={startedAt} onEnd={submit} />}
        <button
          type="button"
          onClick={() => setShowTr(!showTr)}
          aria-pressed={showTr}
          className={`btn ${showTr ? "btn-soft" : "btn-ghost"}`}
          aria-label={showTr ? "Ẩn bản dịch" : "Hiện bản dịch"}
          title="Hiện / ẩn bản dịch"
        >
          <Languages className="size-4" /> <span className="hidden sm:inline">{showTr ? "Ẩn bản dịch" : "Hiện bản dịch"}</span>
        </button>
      </div>

      {modeLinks && (mode === "lesen" || mode === "ueben") && (
        <div className="tabs self-start" role="tablist" aria-label="Chế độ học">
          {(["lesen", "ueben"] as const).map((m) => (
            <Link key={m} href={modeLinks[m]} role="tab" aria-selected={mode === m} replace className="tab">
              {m === "lesen" ? "Đọc (Lesen)" : "Luyện (Üben)"}
            </Link>
          ))}
        </div>
      )}

      {!loggedIn && !isExam && <GuestTrialNote area={module} quota={quota} extra="lưu tiến độ và đánh dấu câu" />}
      <GuestWall
        area={module}
        quota={quota}
        backHref={backHref}
        exam={guestExam}
        onBack={
          fallbackAllowedIdx >= 0
            ? () => {
                quota.dismiss();
                go(fallbackAllowedIdx);
              }
            : undefined
        }
      />

      {result && (
        <ResultBar
          module={module}
          result={result}
          maxErrorPoints={maxErrorPoints}
          savedId={savedId}
          saveError={saveError}
          loggedIn={loggedIn}
          savingExam={mode === "exam" && loggedIn && !savedId && !saveError}
          onNewExam={startNewExam}
        />
      )}

      <div className={fs ? "theme-fahrschule laixe-sim flex flex-col rounded-panel border border-border bg-background" : "contents"}>
        {/* Bảng số câu (thi: chia phần cơ bản / phần riêng) — lái xe: nằm dưới câu hỏi như app */}
        {fs && isExam ? (
          <FsExamBar
            tabs={grundCount > 0 && grundCount < questions.length ? ["Grundstoff", exam?.cls || "Zusatzstoff"] : ["Grundstoff"]}
            tab={tab === "grund" || grundCount === questions.length ? 0 : 1}
            setTab={(t) => switchExamTab(t === 0 ? "grund" : "zusatz")}
            items={visible.map(({ x, i }) => ({ i, state: status(x), marked: marked.has(x.id), video: !!x.video, num: !x.options.length }))}
            idx={idx}
            go={go}
            info={
              submitted && result
                ? `${result.errorPoints} Fehlerpunkte · ${result.passed ? "bestanden" : "nicht bestanden"}`
                : `noch ${questions.length - answeredCount} Aufgaben`
            }
            warn={!submitted && answeredCount < questions.length}
            onSubmit={mode === "exam" && !submitted ? askSubmit : null}
            mark={loggedIn ? { on: marked.has(q.id), toggle: () => toggleMark(q.id) } : null}
            last={idx === questions.length - 1}
          />
        ) : (
          <section className={fs ? "sim-bar order-last flex flex-col rounded-b-[calc(var(--radius-lg)-1px)] px-2 pt-2 pb-3 sm:px-4" : "flex flex-col gap-2"}>
            {isExam && grundCount > 0 && grundCount < questions.length && (
              <div className={fs ? "-mt-2 mb-2 flex gap-1" : "tabs self-start"} role="tablist" aria-label="Phần thi">
                {(["grund", "zusatz"] as const).map((t) => {
                  const n = t === "grund" ? grundCount : questions.length - grundCount;
                  return (
                    <button
                      key={t}
                      type="button"
                      role="tab"
                      aria-selected={tab === t}
                      onClick={() => switchExamTab(t)}
                      className={fs ? "sim-subtab" : "tab"}
                    >
                      {t === "grund" ? cfg.parts[0] : module === "lid" ? cfg.parts[1] : `${cfg.parts[1]} ${exam?.cls ?? ""}`.trim()} · {n}
                    </button>
                  );
                })}
              </div>
            )}
            {fs ? (
              <FsPager
                idx={idx}
                total={questions.length}
                items={visible.map(({ x, i }) => ({ i, state: status(x), marked: marked.has(x.id), video: !!x.video, num: !x.options.length }))}
                go={go}
              />
            ) : (
              <nav aria-label="Danh sách câu" className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto p-0.5">
                {visible.map(({ x, i }) => (
                  <GridCell key={x.id} n={i + 1} state={status(x)} current={i === idx} marked={marked.has(x.id)} onClick={() => go(i)} />
                ))}
              </nav>
            )}
          </section>
        )}

        <article
          key={`${q.id}-${shake}`}
          className={`${fs ? (isExam ? "min-h-[28rem] p-4 sm:p-6" : "min-h-[22rem] p-4 sm:p-6") : "card"} flex flex-col gap-4 ${shake && reveal && !right && mode === "ueben" ? "shake" : ""}`}
        >
          <div
            className={`flex flex-wrap items-center gap-2 text-xs font-bold ${fs ? "sim-head -mx-4 -mt-4 rounded-t-[calc(var(--radius-lg)-1px)] px-4 py-2 sm:-mx-6 sm:-mt-6 sm:px-6" : "text-muted"}`}
          >
            <button
              type="button"
              onClick={() => setPicker(true)}
              aria-haspopup="dialog"
              aria-label={`Câu ${idx + 1} trên ${questions.length} — mở bảng chọn câu nhanh`}
              title="Mở bảng chọn câu nhanh"
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 tabular-nums transition-colors ${
                fs ? "bg-white/15 text-white hover:bg-white/25" : "badge badge-muted hover:bg-card-2"
              }`}
            >
              <LayoutGrid className="size-3.5" aria-hidden />
              Câu {idx + 1}/{questions.length}
            </button>
            <span className={`tabular-nums ${fs ? "sim-tag" : "badge badge-muted"}`}>{module === "lid" ? q.chapter : q.id}</span>
            {fs && (
              <span className="sim-tag tabular-nums" data-hot={q.points === 5 || undefined}>
                Punkte: {q.points}
              </span>
            )}
            <span className="flex-1" />
            {!cfg.single && q.options.length > 0 && !reveal && <span>Có thể có nhiều đáp án đúng</span>}
            {loggedIn && !(fs && isExam) ? (
              <button
                type="button"
                onClick={() => toggleMark(q.id)}
                aria-pressed={marked.has(q.id)}
                className={`btn-icon hit-44 size-8 ${fs ? "sim-head-icon" : ""}`}
                aria-label={marked.has(q.id) ? "Bỏ đánh dấu" : "Đánh dấu câu này"}
                title="Đánh dấu"
              >
                <Star className={`size-4 ${marked.has(q.id) ? "fill-gold text-gold" : ""}`} />
              </button>
            ) : null}
          </div>

          <div className={fs ? "flex flex-1 flex-col gap-4" : "contents"}>
            <div className="flex flex-col gap-1">
              <h2 className="section-title whitespace-pre-line">
                {videoStep ? "Bitte starten Sie den Film, um sich mit der Situation vertraut zu machen." : q.q}
              </h2>
              {showTr && videoStep && (
                <p className="quiz-tr">Vui lòng bấm bắt đầu xem đoạn video để nắm rõ tình huống giao thông.</p>
              )}
              {showTr && !videoStep && q.tr?.q && <p className="quiz-tr">{q.tr.q}</p>}
            </div>

            {videoStep ? (
              <VideoGate
                key={q.id}
                src={q.video!}
                poster={q.poster}
                count={vstate.count}
                showTr={showTr}
                onView={() => setVideo({ count: vstate.count + 1 })}
                onAnswer={() => setVideo({ answering: true })}
              />
            ) : (
              <div className={fs && hasLeftMedia ? "grid items-start gap-4 sm:grid-cols-2 sm:gap-8" : "flex flex-col gap-4"}>
                {hasLeftMedia && (
                  <div className="min-w-0">
                    <Media
                      q={q}
                      mode={mode}
                      submitted={submitted}
                      checked={!!checked[q.id]}
                      replaying={!!vstate.replay}
                      onReplay={() => setVideo({ replay: true })}
                      onZoom={(src, alt) => setZoom({ src, alt })}
                      fs={fs}
                    />
                  </div>
                )}
                <div className="flex min-w-0 flex-col gap-3">
                  {q.stem && (
                    <div className="flex flex-col gap-0.5">
                      <p className="font-bold text-muted">{q.stem}</p>
                      {stemTranslation && <p className="quiz-tr text-sm font-medium">{stemTranslation}</p>}
                    </div>
                  )}
                  {q.options.length ? (
                    <ul className="flex flex-col gap-2">
                      {display.map((o, n) => {
                        const on = mine.includes(o.key);
                        const correct = q.answer.includes(o.key);
                        const orig = q.options.indexOf(o);
                        const img = q.optionImages ? q.images[orig] : null;
                        const trText = q.tr?.o[orig];
                        // Đọc: tích sẵn đáp án đúng · Luyện/Thi sau khi chấm: tô đúng/sai
                        const ticked = mode === "lesen" ? correct : on;
                        const mistake = reveal && mode !== "lesen" && on !== correct;
                        const state = !reveal ? (on ? "on" : "") : correct ? "correct" : on ? "wrong" : "idle";
                        return (
                          <li key={o.key}>
                            <button
                              type="button"
                              role={cfg.single ? "radio" : "checkbox"}
                              aria-checked={ticked}
                              disabled={reveal}
                              onClick={() => toggle(o.key)}
                              data-state={state || undefined}
                              className={fs ? "sim-option" : "quiz-option"}
                            >
                              {fs ? (
                                <span className="sim-check">{ticked && <Check className="size-6" strokeWidth={3.5} />}</span>
                              ) : (
                                <span
                                  className={`quiz-mark ${cfg.single ? "rounded-full" : "rounded-lg"}`}
                                  data-tick={ticked ? (reveal && !correct ? "bad" : "on") : undefined}
                                >
                                  {ticked ? <Check className="size-5" strokeWidth={3} /> : <span>{n + 1}</span>}
                                </span>
                              )}
                              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                {img ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={img}
                                    alt={`Lựa chọn ${n + 1}`}
                                    className="max-h-28 w-auto self-start rounded-lg border border-line bg-white"
                                    loading="lazy"
                                  />
                                ) : (
                                  <span className={fs ? "text-[0.95rem] font-semibold sm:text-base" : "font-semibold"}>
                                    {o.text || `Lựa chọn ${o.key} (xem hình)`}
                                  </span>
                                )}
                                {showTr && trText && trText !== o.text && (
                                  <span className="quiz-tr border-l-0 pl-0 text-sm font-normal">{trText}</span>
                                )}
                              </span>
                              {reveal && mode !== "lesen" && (
                                <span
                                  className="shrink-0"
                                  aria-label={correct ? (on ? "Chọn đúng" : "Bỏ sót đáp án đúng") : on ? "Chọn sai" : undefined}
                                >
                                  {correct ? (
                                    <span className="flex items-center gap-1.5">
                                      {mistake && <span className="badge badge-red">Bỏ sót</span>}
                                      <span
                                        className={`flex size-6 items-center justify-center rounded-full ${on ? "bg-ok text-white" : "border-2 border-ok bg-card text-ok-text"}`}
                                      >
                                        <Check className="size-4" strokeWidth={3} />
                                      </span>
                                    </span>
                                  ) : on ? (
                                    <span className="flex size-6 items-center justify-center rounded-full bg-red text-white">
                                      <X className="size-4" strokeWidth={3} />
                                    </span>
                                  ) : null}
                                </span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : fs ? (
                    <FsNumberAnswer
                      value={mode === "lesen" ? q.answer[0] : (mine[0] ?? "")}
                      hint={q.num ?? null}
                      showTr={showTr}
                      disabled={reveal}
                      onChange={(v) => setPicked((p) => ({ ...p, [q.id]: v ? [v] : [] }))}
                      onEnter={() => mode === "ueben" && check()}
                      correct={reveal && mode !== "lesen" ? q.answer[0] : null}
                    />
                  ) : (
                    <NumberAnswer
                      value={mode === "lesen" ? q.answer[0] : (mine[0] ?? "")}
                      disabled={reveal}
                      onChange={(v) => setPicked((p) => ({ ...p, [q.id]: v ? [v] : [] }))}
                      onEnter={() => mode === "ueben" && check()}
                      correct={reveal && mode !== "lesen" ? q.answer[0] : null}
                    />
                  )}
                </div>
              </div>
            )}

            {reveal && mode !== "lesen" && (
              <p className="quiz-verdict" data-ok={right} role="status">
                <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-white ${right ? "bg-ok" : "bg-red"}`} aria-hidden>
                  {right ? <Check className="size-4" strokeWidth={3} /> : <X className="size-4" strokeWidth={3} />}
                </span>
                {right ? "Đúng rồi!" : `${mine.length ? "Chưa đúng" : "Chưa trả lời"}${module === "fuehrerschein" ? ` · ${q.points} điểm lỗi` : ""}`}
              </p>
            )}

            {(reveal || mode === "ueben") && !videoStep && q.explain && (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  className={`btn btn-sm self-start ${showExplain ? "btn-soft" : ""}`}
                  aria-expanded={showExplain}
                  onClick={() => setShowExplain(!showExplain)}
                >
                  <Lightbulb className="size-4" /> {showExplain ? "Ẩn giải thích" : "Giải thích"}
                </button>
                {showExplain && (
                  <div className="quiz-explain rise-in">
                    <p className="flex items-center gap-1.5 font-extrabold text-amber">
                      <Lightbulb className="size-4" /> Giải thích
                    </p>
                    <p className="mt-1 whitespace-pre-line">{q.explain}</p>
                    {showTr && q.tr?.c && <p className="quiz-tr mt-2">{q.tr.c}</p>}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Điều hướng: trên điện thoại ở chế độ học (ueben/lesen) ghim sticky đáy màn hình giống LidRunner; Desktop có nút "Câu tiếp" rõ ngay cạnh "Làm lại" */}
          {!(fs && isExam) && (
            <div
              className={`mt-auto flex flex-wrap items-center gap-2 ${
                fs
                  ? "max-sm:sticky max-sm:bottom-[calc(4rem+env(safe-area-inset-bottom))] max-sm:z-10 max-sm:-mx-4 max-sm:-mb-4 max-sm:flex-nowrap max-sm:justify-between max-sm:border-t max-sm:border-line max-sm:bg-card/95 max-sm:p-3 max-sm:backdrop-blur-xs"
                  : ""
              }`}
            >
              {fs ? (
                <button
                  type="button"
                  className="btn min-h-12 min-w-12 px-3 sm:hidden"
                  onClick={() => go(idx - 1)}
                  disabled={idx === 0}
                  aria-label="Câu trước"
                >
                  <ChevronLeft className="size-5" />
                </button>
              ) : (
                <>
                  <NavBtn label="Câu đầu" disabled={idx === 0} onClick={() => go(0)} icon={ChevronFirst} hideSm />
                  <NavBtn label="Lùi 10 câu" disabled={idx === 0} onClick={() => go(idx - 10)} icon={ChevronsLeft} hideSm />
                  <button type="button" className="btn" onClick={() => go(idx - 1)} disabled={idx === 0}>
                    <ChevronLeft className="size-4" /> Trước
                  </button>
                </>
              )}

              {fs && mode === "lesen" && (
                <button
                  type="button"
                  onClick={() => setPicker(true)}
                  className="btn min-h-12 min-w-0 flex-1 sm:hidden"
                  aria-haspopup="dialog"
                  aria-label={`Câu ${idx + 1} trên ${questions.length} — mở bảng chọn câu`}
                >
                  <LayoutGrid className="size-4 text-muted" aria-hidden />
                  <span className="truncate tabular-nums">
                    {idx + 1} / {questions.length}
                  </span>
                </button>
              )}

              <div className={`flex-1 ${fs ? "max-sm:hidden" : ""}`} />

              {mode === "ueben" && !reveal && !videoStep && !cfg.single && (
                <button
                  type="button"
                  className="btn btn-primary max-sm:min-h-12 max-sm:flex-1"
                  onClick={() => check()}
                  disabled={!mine.length}
                >
                  <Check className="size-4" /> Kiểm tra
                </button>
              )}

              {mode === "ueben" && reveal && (
                <>
                  <button type="button" className="btn max-sm:min-h-12 max-sm:flex-1" onClick={retry}>
                    <RotateCcw className="size-4" /> Làm lại
                  </button>
                  {fs && (
                    <button
                      type="button"
                      className="btn btn-primary max-sm:hidden"
                      onClick={() => go(idx + 1)}
                      disabled={idx === questions.length - 1}
                    >
                      Câu tiếp <ChevronRight className="size-4" />
                    </button>
                  )}
                </>
              )}

              <div className={`flex-1 ${fs ? "max-sm:hidden" : ""}`} />

              {mode === "exam" && !submitted && !fs && idx === questions.length - 1 ? (
                <button type="button" className="btn btn-primary" onClick={askSubmit}>
                  <Flag className="size-4" /> Nộp bài
                </button>
              ) : fs ? null : (
                <button
                  type="button"
                  className={`btn ${reveal || mode === "exam" ? "btn-primary" : ""}`}
                  onClick={() => go(idx + 1)}
                  disabled={idx === questions.length - 1}
                >
                  Tiếp <ChevronRight className="size-4" />
                </button>
              )}

              {fs && (
                <button
                  type="button"
                  className={`btn min-h-12 min-w-12 px-3 sm:hidden ${reveal && mode !== "lesen" ? "btn-primary" : ""}`}
                  onClick={() => go(idx + 1)}
                  disabled={idx === questions.length - 1}
                  aria-label="Câu tiếp"
                >
                  {reveal && mode !== "lesen" && <span>Tiếp</span>}
                  <ChevronRight className="size-5" />
                </button>
              )}

              {!fs && (
                <>
                  <NavBtn label="Tiến 10 câu" disabled={idx === questions.length - 1} onClick={() => go(idx + 10)} icon={ChevronsRight} hideSm />
                  <NavBtn label="Câu cuối" disabled={idx === questions.length - 1} onClick={() => go(questions.length - 1)} icon={ChevronLast} hideSm />
                </>
              )}
            </div>
          )}
        </article>
      </div>

      {mode === "exam" && !submitted && !fs && (
        <div className={`alert flex-wrap items-center justify-between gap-2 ${answeredCount === questions.length ? "alert-ok" : ""}`}>
          <span className="font-bold" aria-live="polite">
            {answeredCount === questions.length ? "Đã làm hết các câu — có thể nộp bài." : `Đã làm ${answeredCount}/${questions.length} câu`}
          </span>
          <button type="button" className="btn btn-primary" onClick={askSubmit}>
            <Flag className="size-4" /> Nộp bài
          </button>
        </div>
      )}

      <p className="hidden text-xs text-muted sm:block">
        Phím tắt: ← → chuyển câu · 1–4 chọn đáp án{mode === "ueben" && !cfg.single ? " · Enter kiểm tra / sang câu tiếp" : ""}
      </p>
      {confirmDialog}

      {picker && (
        <QuestionPickerModal
          questions={questions}
          idx={idx}
          onPick={go}
          onClose={() => setPicker(false)}
          testing={mode === "exam" && !submitted}
          status={status}
          marked={marked}
        />
      )}

      {zoom && <ImageLightbox src={zoom.src} alt={zoom.alt} onClose={() => setZoom(null)} />}
    </div>
  );
}

type Cell = "empty" | "answered" | "ok" | "bad" | "ok-old" | "bad-old";

function GridCell({ n, state, current, marked, onClick }: { n: number; state: Cell; current: boolean; marked: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={current ? "true" : undefined}
      aria-label={`Câu ${n}${marked ? " (đã đánh dấu)" : ""}`}
      data-state={state === "empty" ? undefined : state}
      className="quiz-cell"
    >
      {n}
      {marked && <Star className="absolute -top-1.5 -right-1.5 size-3 fill-gold text-gold" aria-hidden />}
    </button>
  );
}

type FilterKey = "all" | "todo" | "bad" | "marked";

/** Hộp thoại chọn câu nhanh dạng lưới số câu kèm bộ lọc Tất cả / Chưa làm / Đang sai / Đánh dấu */
function QuestionPickerModal({
  questions,
  idx,
  onPick,
  onClose,
  testing,
  status,
  marked,
}: {
  questions: DrivingQ[];
  idx: number;
  onPick: (i: number) => void;
  onClose: () => void;
  testing: boolean;
  status: (q: DrivingQ) => Cell;
  marked: Set<string>;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const current = useRef<HTMLButtonElement>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  useDialogFocus(panel, true);

  useEffect(() => {
    current.current?.scrollIntoView({ block: "center" });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        onClose();
      }
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey, true);
    };
  }, [onClose]);

  const items = useMemo(() => questions.map((x, i) => ({ x, i, st: status(x) })), [questions, status]);
  const counts = useMemo(
    () => ({
      all: items.length,
      todo: items.filter(({ st }) => st === "empty").length,
      bad: items.filter(({ st }) => st === "bad" || st === "bad-old").length,
      marked: items.filter(({ x }) => marked.has(x.id)).length,
    }),
    [items, marked],
  );

  const filters: { key: FilterKey; label: string; count: number }[] = testing
    ? [
        { key: "all", label: "Tất cả", count: counts.all },
        { key: "todo", label: "Chưa trả lời", count: counts.todo },
        { key: "marked", label: "Đánh dấu", count: counts.marked },
      ]
    : [
        { key: "all", label: "Tất cả", count: counts.all },
        { key: "todo", label: "Chưa làm", count: counts.todo },
        { key: "bad", label: "Đang sai", count: counts.bad },
        { key: "marked", label: "Đánh dấu", count: counts.marked },
      ];

  const filtered = items.filter(({ x, st }) => {
    if (filter === "todo") return st === "empty";
    if (filter === "bad") return st === "bad" || st === "bad-old";
    if (filter === "marked") return marked.has(x.id);
    return true;
  });

  return (
    <div className="dialog-backdrop z-[100]" onClick={onClose}>
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lx-picker-title"
        onClick={(e) => e.stopPropagation()}
        className="dialog dialog-lg max-h-[82dvh] gap-3 overflow-hidden outline-none"
      >
        <div className="dialog-head items-center">
          <h2 id="lx-picker-title" className="dialog-title">
            Chọn câu nhanh ({idx + 1}/{questions.length})
          </h2>
          <button type="button" onClick={onClose} aria-label="Đóng" className="btn-icon">
            <X className="size-5" />
          </button>
        </div>
        <div className="scroll-row -mx-1 flex shrink-0 gap-1.5 px-1 pb-0.5" role="group" aria-label="Lọc câu hỏi">
          {filters.map((f) => (
            <button key={f.key} type="button" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)} className="chip tabular-nums">
              {f.label} ({f.count})
            </button>
          ))}
        </div>
        <div className="-mx-2 min-h-0 flex-1 overflow-y-auto px-2 py-1 sm:-mx-3 sm:px-3">
          {filtered.length === 0 ? (
            <p className="empty py-8">Không có câu nào thuộc bộ lọc này.</p>
          ) : (
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 md:grid-cols-10">
              {filtered.map(({ x, i, st }) => {
                const isCurrent = i === idx;
                const isMarked = marked.has(x.id);
                return (
                  <button
                    key={x.id}
                    ref={isCurrent ? current : undefined}
                    type="button"
                    onClick={() => onPick(i)}
                    aria-current={isCurrent ? "true" : undefined}
                    aria-label={`Câu ${i + 1}${isMarked ? " (đã đánh dấu)" : ""}`}
                    data-state={st === "empty" ? undefined : st}
                    className="quiz-cell w-full"
                  >
                    {i + 1}
                    {isMarked && <Star className="absolute -top-1.5 -right-1.5 size-3 fill-gold text-gold" aria-hidden />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type PagerItem = { i: number; state: Cell; marked: boolean; video: boolean; num: boolean };

/** Dấu góc ô số như phần mềm thi: ▶ đen = câu video, tam giác vàng = câu điền số, ⭐ = câu đã đánh dấu */
function CellMarks({ video, num, marked }: { video: boolean; num: boolean; marked: boolean }) {
  return (
    <>
      {video && (
        <span className="sim-mark-video" aria-hidden>
          <Play className="size-2 fill-current" strokeWidth={0} />
        </span>
      )}
      {num && <span className="sim-mark-num" aria-hidden />}
      {marked && <Star className={`sim-mark-star ${num ? "-left-1.5" : "-right-1.5"}`} strokeWidth={1.5} aria-hidden />}
    </>
  );
}

/** Thanh dưới kiểu phần mềm thi thật: |◀ ◀◀ ◀ · 10 ô số · ▶ ▶▶ ▶| */
function FsPager({ idx, total, items, go }: { idx: number; total: number; items: PagerItem[]; go: (i: number) => void }) {
  const pos = Math.max(0, items.findIndex((it) => it.i === idx));
  const start = Math.floor(pos / 10) * 10;
  const page = items.slice(start, start + 10);
  const first = idx === 0;
  const last = idx === total - 1;
  return (
    <nav aria-label="Danh sách câu" className="flex items-center gap-1 sm:gap-1.5">
      <PagerBtn label="Câu đầu" disabled={first} onClick={() => go(0)} icon={SkipBack} hideSm />
      <PagerBtn label="Lùi 10 câu" disabled={first} onClick={() => go(idx - 10)} icon={Rewind} hideSm />
      <PagerBtn label="Câu trước" disabled={first} onClick={() => go(idx - 1)} icon={Play} flip />
      <div className="flex min-w-0 flex-1 justify-center gap-1 sm:gap-1.5 lg:gap-2">
        {page.map(({ i, state, marked, video, num }) => {
          const current = i === idx;
          return (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-current={current ? "true" : undefined}
              aria-label={`Câu ${i + 1}${video ? " (video)" : ""}${num ? " (điền số)" : ""}${marked ? " (đã đánh dấu)" : ""}`}
              data-state={state}
              className="sim-cell h-10 max-w-12 min-w-0 flex-1 text-xs sm:h-8 lg:h-9 lg:max-w-15 lg:text-sm"
            >
              <CellMarks video={video} num={num} marked={marked} />
              <span className="relative">{i + 1}</span>
            </button>
          );
        })}
      </div>
      <PagerBtn label="Câu sau" disabled={last} onClick={() => go(idx + 1)} icon={Play} />
      <PagerBtn label="Tiến 10 câu" disabled={last} onClick={() => go(idx + 10)} icon={FastForward} hideSm />
      <PagerBtn label="Câu cuối" disabled={last} onClick={() => go(total - 1)} icon={SkipForward} hideSm />
    </nav>
  );
}

/** Thi thử lái xe — chân màn hình như phần mềm thi thật:
 *  tab phần (Grundstoff / hạng) · "noch N Aufgaben" · Auswertung / ☆ / Weiter, bên dưới là lưới số câu */
function FsExamBar({
  tabs,
  tab,
  setTab,
  items,
  idx,
  go,
  info,
  warn,
  onSubmit,
  mark,
  last,
}: {
  tabs: string[];
  tab: number;
  setTab: (t: number) => void;
  items: PagerItem[];
  idx: number;
  go: (i: number) => void;
  info: string;
  warn: boolean;
  onSubmit: (() => void) | null;
  mark: { on: boolean; toggle: () => void } | null;
  last: boolean;
}) {
  // Thi: ô câu học trước đó (ok-old / bad-old) không tô màu — chỉ "đã trả lời" / kết quả bài này
  const cell = (st: Cell) => (st === "ok-old" || st === "bad-old" ? "empty" : st);
  return (
    <section className="order-last flex flex-col">
      <div className="flex flex-col gap-2 pt-2 lg:flex-row lg:items-end lg:gap-4">
        <div className="order-2 flex min-w-0 items-end justify-between gap-2 pr-2 lg:order-none lg:flex-1 lg:justify-start lg:gap-4 lg:pr-0">
          <div className="flex shrink-0 items-end gap-0.5" role="tablist" aria-label="Phần thi">
            {tabs.map((label, t) => (
              <button key={label} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className="sim-tab">
                {label}
              </button>
            ))}
          </div>
          <p className="flex min-w-0 items-center gap-1.5 pb-2 text-xs font-bold text-foreground sm:pb-2.5 sm:text-base lg:text-lg">
            {warn && <TriangleAlert className="sim-warn size-4 shrink-0 sm:size-6" strokeWidth={1.75} aria-hidden />}
            <span className="truncate">{info}</span>
          </p>
        </div>
        <div className="order-1 flex w-full justify-end gap-2 px-2 max-sm:[&>button:last-child]:flex-1 lg:order-none lg:ml-auto lg:w-auto lg:shrink-0 lg:gap-3 lg:px-3 lg:pb-3">
          {onSubmit && (
            <button type="button" onClick={onSubmit} title="Nộp bài (Auswertung)" className="sim-btn flex-col gap-0 px-3 py-1 leading-tight sm:px-4" data-tone="submit">
              <span>Auswertung</span>
              <span className="text-[11px] font-medium opacity-90">Nộp bài</span>
            </button>
          )}
          {mark && (
            <button
              type="button"
              onClick={mark.toggle}
              aria-pressed={mark.on}
              aria-label={mark.on ? "Bỏ đánh dấu" : "Đánh dấu câu này"}
              title="Đánh dấu"
              className="sim-btn w-12 shrink-0 px-0 sm:w-14"
              data-tone="mark"
            >
              <Star className={`size-6 sm:size-7 ${mark.on ? "fill-current" : ""}`} strokeWidth={2} />
            </button>
          )}
          <button
            type="button"
            onClick={() => go(idx + 1)}
            disabled={last}
            title="Câu tiếp (Weiter)"
            className="sim-btn flex-col gap-0 px-3 py-1 leading-tight sm:min-w-32 sm:px-4"
            data-tone="go"
          >
            <span>Weiter</span>
            <span className="text-[11px] font-medium opacity-90">Câu tiếp</span>
          </button>
        </div>
      </div>
      <nav
        aria-label="Danh sách câu"
        className="sim-bar grid grid-cols-6 gap-2 rounded-b-[calc(var(--radius-lg)-1px)] p-2 min-[420px]:flex min-[420px]:flex-wrap sm:gap-3.5 sm:px-2 sm:py-3"
      >
        {items.map(({ i, state, marked, video, num }) => {
          const current = i === idx;
          return (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-current={current ? "true" : undefined}
              aria-label={`Câu ${i + 1}${video ? " (video)" : ""}${num ? " (điền số)" : ""}${marked ? " (đã đánh dấu)" : ""}`}
              data-state={cell(state)}
              data-ring
              className="sim-cell h-10 w-full text-sm min-[420px]:w-12 sm:h-8 sm:w-14 sm:text-base"
            >
              <CellMarks video={video} num={num} marked={marked} />
              <span className="relative">{i + 1}</span>
            </button>
          );
        })}
      </nav>
    </section>
  );
}

function PagerBtn({
  label,
  disabled,
  onClick,
  icon: Icon,
  hideSm,
  flip,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  icon: typeof Play;
  hideSm?: boolean;
  flip?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`sim-key ${hideSm ? "hidden sm:flex" : "flex"} h-10 w-9 shrink-0 sm:size-9 lg:size-11`}
    >
      <Icon className={`size-5 fill-current ${flip ? "rotate-180" : ""}`} strokeWidth={1.5} />
    </button>
  );
}

function NavBtn({
  label,
  disabled,
  onClick,
  icon: Icon,
  hideSm,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  icon: typeof ChevronFirst;
  hideSm?: boolean;
}) {
  return (
    <button type="button" className={`btn size-10 p-0 ${hideSm ? "hidden sm:inline-flex" : ""}`} onClick={onClick} disabled={disabled} aria-label={label} title={label}>
      <Icon className="size-4" />
    </button>
  );
}

function Media({
  q,
  mode,
  submitted,
  checked,
  replaying,
  onReplay,
  onZoom,
  fs,
}: {
  q: DrivingQ;
  mode: RunnerMode;
  submitted: boolean;
  checked: boolean;
  replaying: boolean;
  onReplay: () => void;
  onZoom: (src: string, alt: string) => void;
  fs?: boolean;
}) {
  const frame = fs ? "sim-media w-full" : "w-full max-w-xl rounded-ui border border-line bg-black";
  if (q.video) {
    // Đọc lướt (lesen), xem lại bài thi (submitted), hoặc đã bấm "Xem lại video" sau khi chấm ở chế độ luyện (ueben): phát video tự do
    const freePlay = mode === "lesen" || submitted || (mode === "ueben" && checked && replaying);
    if (freePlay) {
      return (
        <video
          key={`${q.id}-${replaying ? "replay" : "free"}`}
          src={q.video}
          poster={q.poster ?? undefined}
          controls
          autoPlay={replaying}
          playsInline
          preload="metadata"
          className={frame}
        >
          Trình duyệt không phát được video.
        </video>
      );
    }
    // Đang ở bước trả lời (hoặc vừa chấm xong ở ueben trước khi bấm "Xem lại video"):
    // Hiện ảnh tình huống (hoặc khung video tĩnh nếu poster: null — 21 câu) + nút Xem lại video khi đã chấm ở ueben
    return (
      <div className="flex flex-col items-start gap-2">
        {q.poster ? (
          <button
            type="button"
            onClick={() => onZoom(q.poster!, "Tình huống trong video")}
            aria-label="Phóng to hình tình huống trong video"
            title="Chạm để phóng to"
            className="group relative block w-full cursor-zoom-in overflow-hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={q.poster} alt="Tình huống trong video" className={`${frame} object-contain`} />
            <span
              className="pointer-events-none absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-full bg-black/65 px-2 py-1 text-xs font-semibold text-white opacity-80 transition-opacity group-hover:opacity-100"
              aria-hidden
            >
              <ZoomIn className="size-3.5" />
            </span>
          </button>
        ) : (
          <video
            src={`${q.video}#t=0.1`}
            preload="metadata"
            muted
            playsInline
            aria-label="Tình huống trong video"
            className={`${frame} pointer-events-none object-contain`}
          />
        )}
        {mode === "ueben" && checked && (
          <button type="button" onClick={onReplay} className="btn btn-sm btn-soft">
            <Play className="size-4" /> Xem lại video
          </button>
        )}
      </div>
    );
  }
  if (q.optionImages || !q.images.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {q.images.map((src, i) => {
        const alt = q.images.length > 1 ? `Tình huống giao thông (hình ${i + 1})` : "Tình huống giao thông";
        return (
          <button
            key={src}
            type="button"
            onClick={() => onZoom(src, alt)}
            aria-label={`Phóng to ${alt.toLowerCase()}`}
            title="Chạm để phóng to"
            className={`group relative cursor-zoom-in overflow-hidden ${fs ? "w-full" : ""}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              loading="lazy"
              className={fs ? "w-full bg-white object-contain" : "max-h-80 w-auto max-w-full rounded-ui border border-line bg-white object-contain shadow-xs"}
            />
            <span
              className="pointer-events-none absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-full bg-black/65 px-2 py-1 text-xs font-semibold text-white opacity-80 transition-opacity group-hover:opacity-100"
              aria-hidden
            >
              <ZoomIn className="size-3.5" />
            </span>
          </button>
        );
      })}
    </div>
  );
}

const noop = () => () => {};

/** Bước xem video như phần mềm thi (theorie24):
 *  1. khung hình đầu + nút ▶ · "Video starten" · được xem tối đa 5 lần
 *  2. bấm xem → video phát toàn màn hình, "Schliessen" để đóng (xem hết tự đóng)
 *  3. đã xem → khung hình tình huống · thêm "Zur Aufgabenstellung" · "noch N mal" */
function VideoGate({
  src,
  poster,
  count,
  showTr,
  onView,
  onAnswer,
}: {
  src: string;
  poster: string | null;
  count: number;
  showTr: boolean;
  onView: () => void;
  onAnswer: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [open, setOpen] = useState(false);
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const left = MAX_VIEWS - count;

  const close = useCallback(() => {
    ref.current?.pause();
    setOpen(false);
  }, []);

  // Gọi play() ngay trong lúc bấm (video luôn nằm sẵn trong DOM) để iOS / Safari không chặn phát có tiếng
  const start = () => {
    const v = ref.current;
    if (!v || left <= 0) return;
    v.currentTime = 0;
    setOpen(true);
    v.play()
      .then(() => onView())
      .catch(() => setOpen(false));
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      e.stopImmediatePropagation();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open, close]);

  return (
    <div className="grid items-start gap-4 sm:grid-cols-2 sm:gap-8">
      <div className="sim-media relative min-w-0">
        {count && poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt="Tình huống trong video" className="w-full object-contain" />
        ) : (
          <video src={`${src}#t=0.1`} preload="metadata" muted playsInline className="w-full" aria-hidden />
        )}
        {left > 0 && (
          <button type="button" onClick={start} aria-label="Xem video" className="group absolute inset-0 flex items-center justify-center">
            <span className="sim-play">
              <Play className="ml-2 size-10 fill-current text-transparent sm:size-12" />
            </span>
          </button>
        )}
      </div>

      <div className="flex min-w-0 flex-col items-center gap-4 sm:pt-4">
        <button type="button" className="sim-btn min-h-11 w-full max-w-md flex-col gap-0 py-1.5 leading-tight" data-tone="video" onClick={start} disabled={left <= 0}>
          <span>Video starten</span>
          {showTr && <span className="text-xs font-normal opacity-90">Bắt đầu xem video</span>}
        </button>
        {count > 0 && (
          <button type="button" className="sim-btn min-h-11 w-full max-w-md flex-col gap-0 py-1.5 leading-tight" data-tone="video" onClick={onAnswer}>
            <span>Zur Aufgabenstellung</span>
            {showTr && <span className="text-xs font-normal opacity-90">Mở câu hỏi để trả lời</span>}
          </button>
        )}
        <p className="mt-2 text-center text-lg font-bold">
          {count ? (
            <>
              Sie können sich den Film noch <span className="text-red-400">{left}</span> mal ansehen.
            </>
          ) : (
            `Sie können das Video insgesamt ${MAX_VIEWS} Mal ansehen.`
          )}
        </p>
        <p className="text-center text-xs text-muted">
          Xem ít nhất 1 lần mới mở câu hỏi được (tối đa {MAX_VIEWS} lần). Ở chế độ luyện tập, chấm xong có thể bấm „Xem lại video“.
        </p>
      </div>

      {mounted &&
        createPortal(
          <div
            className={`theme-fahrschule laixe-sim fixed inset-0 z-[100] flex flex-col bg-background ${open ? "" : "hidden"}`}
            role={open ? "dialog" : undefined}
            aria-modal={open ? "true" : undefined}
            aria-label="Video tình huống"
          >
            <div className="flex min-h-0 flex-1 items-center justify-center">
              <video ref={ref} src={src} playsInline preload="metadata" onEnded={() => setOpen(false)} className="max-h-full w-full bg-black object-contain">
                Trình duyệt không phát được video.
              </video>
            </div>
            <div className="sim-bar flex justify-end px-4 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
              <button type="button" onClick={close} className="sim-btn h-10" data-tone="go" title="Đóng video">
                Schliessen {showTr ? "(Đóng)" : ""}
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function NumberAnswer({
  value,
  disabled,
  onChange,
  onEnter,
  correct,
}: {
  value: string;
  disabled: boolean;
  onChange: (v: string) => void;
  onEnter: () => void;
  correct: string | null;
}) {
  return (
    <label className="field flex-row flex-wrap items-center gap-2 text-base text-foreground">
      Đáp án:
      <input
        inputMode="decimal"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, "").slice(0, 10))}
        onKeyDown={(e) => {
          if (e.key === "Enter") onEnter();
        }}
        className="input w-32 tabular-nums"
        placeholder="Nhập số"
      />
      {correct !== null && <span className="field-hint">Đáp án đúng: {correct}</span>}
    </label>
  );
}

const KEYS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "C"] as const;

/** Câu điền số kiểu phần mềm thi: "Antwort: … [ô] đơn vị" + bàn phím số (C xoá 1 ký tự, Löschen xoá hết) */
function FsNumberAnswer({
  value,
  hint,
  showTr,
  disabled,
  onChange,
  onEnter,
  correct,
}: {
  value: string;
  hint: { pre?: string; unit?: string } | null;
  showTr: boolean;
  disabled: boolean;
  onChange: (v: string) => void;
  onEnter: () => void;
  correct: string | null;
}) {
  const clean = (v: string) => {
    const s = v.replace(/\./g, ",").replace(/[^\d,]/g, "");
    const i = s.indexOf(",");
    return (i < 0 ? s : s.slice(0, i + 1) + s.slice(i + 1).replace(/,/g, "")).slice(0, 8);
  };
  const press = (k: (typeof KEYS)[number]) => onChange(k === "C" ? value.slice(0, -1) : clean(value + k));
  const ok = correct !== null && isRight({ options: [], answer: [correct] }, [value]);
  const preVi = hint?.pre ? NUM_PRE_VI[hint.pre] : null;
  const unitVi = hint?.unit ? NUM_UNIT_VI[hint.unit] : null;
  return (
    <div className="flex flex-col gap-3 text-sm font-bold">
      <label className="flex flex-col gap-1">
        <span>
          Antwort:{hint?.pre ? ` ${hint.pre}` : ""}
          {showTr && (
            <span className="ml-1.5 font-normal text-accent-text">
              ({preVi ? `Trả lời: ${preVi}` : "Trả lời"})
            </span>
          )}
        </span>
        <span className="flex flex-wrap items-center gap-2.5">
          <input
            inputMode="decimal"
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(clean(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === "Enter") onEnter();
            }}
            data-ok={correct === null ? undefined : ok}
            className="sim-input h-9 w-28 tabular-nums"
          />
          {hint?.unit && (
            <span>
              {hint.unit}
              {showTr && unitVi && <span className="ml-1 font-normal text-accent-text">({unitVi})</span>}
            </span>
          )}
        </span>
      </label>
      {correct !== null && !ok && (
        <p className="text-ok-text">
          Đáp án đúng: {correct}
          {hint?.unit ? ` ${hint.unit}` : ""}
        </p>
      )}
      {!disabled && (
        <div className="grid w-full max-w-56 grid-cols-3 gap-1.5" role="group" aria-label="Bàn phím số">
          {KEYS.map((k) => (
            <button key={k} type="button" onClick={() => press(k)} aria-label={k === "C" ? "Xoá 1 ký tự" : k} title={k === "C" ? "Xoá 1 ký tự" : undefined} className="sim-key h-11">
              {k}
            </button>
          ))}
          <button type="button" onClick={() => onChange("")} title="Xoá" className="sim-key col-span-3 h-11">
            Löschen{showTr ? <span className="ml-1 text-xs font-normal text-muted">(Xoá)</span> : null}
          </button>
        </div>
      )}
    </div>
  );
}

function Timer({ minutes, startedAt, onEnd }: { minutes: number; startedAt: number; onEnd: () => void }) {
  const end = startedAt + minutes * 60_000;
  const [now, setNow] = useState(() => Date.now());
  const ended = useRef(false);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, end - now);
  useEffect(() => {
    if (left === 0 && !ended.current) {
      ended.current = true;
      onEnd();
    }
  }, [left, onEnd]);
  const mm = Math.floor(left / 60_000);
  const ss = Math.floor((left % 60_000) / 1000);
  return (
    <span className="quiz-timer" data-warn={left < 5 * 60_000} role="timer" aria-label="Thời gian còn lại">
      <Clock className="size-4" /> {mm}:{String(ss).padStart(2, "0")}
    </span>
  );
}

function ResultBar({
  module,
  result,
  maxErrorPoints,
  savedId,
  saveError,
  loggedIn,
  savingExam,
  onNewExam,
}: {
  module: QuizModule;
  result: ExamResult;
  maxErrorPoints: number;
  savedId: number | null;
  saveError: string;
  loggedIn: boolean;
  savingExam: boolean;
  onNewExam: () => void;
}) {
  const lid = module === "lid";
  const base = MODULES[module].base;
  const wrongCount = result.total - result.correct;
  const pct = result.total ? (result.correct / result.total) * 100 : 0;
  return (
    <section className="card hero flex flex-col gap-4 p-4 sm:p-6" style={{ ["--hero" as string]: result.passed ? "var(--ok)" : "var(--red)" }} aria-live="polite">
      <div className="flex items-center gap-4">
        <span className={`flex size-14 shrink-0 items-center justify-center rounded-xl text-white sm:size-16 ${result.passed ? "bg-ok" : "bg-red"}`} aria-hidden>
          {result.passed ? <PartyPopper className="size-7" /> : <X className="size-8" strokeWidth={3} />}
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className={`font-display text-2xl leading-tight font-extrabold tracking-[-0.02em] sm:text-3xl ${result.passed ? "text-ok-text" : "text-red-400"}`}>
            {result.passed ? "Bestanden — Đậu!" : "Nicht bestanden — Chưa đậu"}
          </p>
          {!lid && result.failReason && <p className="text-sm font-bold text-red-400">{FAIL_TEXT[result.failReason]}</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {lid ? (
          <>
            <div className="stat rounded-ui bg-card p-3">
              <span className="stat-value">
                {result.correct}/{result.total}
              </span>
              <span className="stat-label">câu đúng</span>
            </div>
            <div className="stat rounded-ui bg-card p-3">
              <span className="stat-value">≥ {result.total - maxErrorPoints}</span>
              <span className="stat-label">câu đúng để đậu</span>
            </div>
          </>
        ) : (
          <>
            <div className="stat rounded-ui bg-card p-3">
              <span className={`stat-value ${result.errorPoints > maxErrorPoints ? "text-red-400" : ""}`}>
                {result.errorPoints}
                <span className="text-base text-muted">/{maxErrorPoints}</span>
              </span>
              <span className="stat-label">điểm lỗi (tối đa {maxErrorPoints})</span>
            </div>
            <div className="stat rounded-ui bg-card p-3">
              <span className="stat-value">
                {result.correct}
                <span className="text-base text-muted">/{result.total}</span>
              </span>
              <span className="stat-label">câu đúng</span>
            </div>
          </>
        )}
      </div>
      <div className="progress bg-card" aria-hidden>
        <div className={`progress-bar ${result.passed ? "bg-ok" : "bg-red"}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onNewExam} className="btn btn-primary">
          <RotateCw className="size-4" /> Thi đề mới
        </button>
        {loggedIn && wrongCount > 0 && (
          savingExam ? (
            <span className="btn pointer-events-none opacity-60" aria-disabled="true">
              <RotateCcw className="size-4" /> Đang lưu câu sai…
            </span>
          ) : (
            <Link href={`${base}/cau-sai?tu=bai-thi`} prefetch={false} className="btn">
              <RotateCcw className="size-4" /> Ôn lại câu sai ({wrongCount})
            </Link>
          )
        )}
      </div>
      <p className="text-sm text-muted">
        Bấm số câu để xem lại từng câu: viền xanh lá = đáp án đúng, viền đỏ = chọn sai, nhãn „Bỏ sót“ = đáp án đúng chưa chọn.
        {savedId ? (
          <>
            {" "}
            Đã lưu vào{" "}
            <Link href={`${base}/thong-ke`} className="font-bold text-link underline">
              lịch sử thi
            </Link>
            .
          </>
        ) : null}
      </p>
      {saveError && (
        <p className="alert alert-err" role="alert">
          Không lưu được: {saveError}
        </p>
      )}
    </section>
  );
}
