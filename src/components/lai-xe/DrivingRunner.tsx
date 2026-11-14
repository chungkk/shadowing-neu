"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  Languages,
  Lightbulb,
  FastForward,
  Play,
  Rewind,
  SkipBack,
  SkipForward,
  RotateCcw,
  TriangleAlert,
  Star,
  X,
} from "lucide-react";
import { clientApi } from "@/lib/client-api";
import { FAIL_TEXT, grade, isRight, type DrivingQ, type ExamAnswer, type ExamResult, type Lang } from "@/lib/fuehrerschein-rules";
import type { QuizStat } from "@/lib/quiz-types";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { GuestTrialNote, GuestWall, useGuestCount, useGuestQuota } from "../GuestQuota";

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
type VideoState = { count: number; answering: boolean };

export default function DrivingRunner({ module = "fuehrerschein", mode, title, subtitle, backHref, questions, loggedIn, lang, stats = {}, bookmarks = [], exam, review, modeLinks, resumeKey }: Props) {
  const cfg = MODULES[module];
  /** Lái xe: khung xanh lá giống phần mềm thi thật */
  const fs = module === "fuehrerschein";
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<Record<string, string[]>>(review?.picked ?? {});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<ExamResult | null>(review?.result ?? null);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [saveError, setSaveError] = useState("");
  const [local, setLocal] = useState(stats);
  const [marked, setMarked] = useState(() => new Set(bookmarks));
  const [videos, setVideos] = useState<Record<string, VideoState>>({});
  const [showExplain, setShowExplain] = useState(false);
  const [shake, setShake] = useState(0);
  const [tab, setTab] = useState<"grund" | "zusatz">("grund");
  const [startedAt] = useState(() => Date.now());
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

  const submitted = mode === "review" || (mode === "exam" && !!result);
  const q = questions[idx];
  // Khách: học thử có giới hạn số câu mỗi ngày · thi thử cần tài khoản
  const quota = useGuestQuota(module, loggedIn);
  const guestExam = !loggedIn && mode === "exam";
  const blocked = useGuestCount(quota, q?.id, mode === "ueben" || mode === "lesen") || guestExam;
  const mine = picked[q?.id] ?? [];
  const reveal = mode === "lesen" || submitted || (mode === "ueben" && !!checked[q?.id]);
  const maxErrorPoints = review?.maxErrorPoints ?? exam?.maxErrorPoints ?? 10;

  const go = useCallback(
    (i: number) => {
      const next = Math.max(0, Math.min(questions.length - 1, i));
      setIdx(next);
      setShowExplain(false);
      const nq = questions[next];
      if (nq && isExam) setTab(nq.grund ? "grund" : "zusatz");
      top.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    },
    [questions, isExam],
  );

  // Mở lại đúng câu đang học dở
  useEffect(() => {
    if (!resumeKey) return;
    try {
      const id = localStorage.getItem(`pos:${resumeKey}`);
      const i = id ? questions.findIndex((x) => x.id === id) : -1;
      if (i > 0) setIdx(i); // eslint-disable-line react-hooks/set-state-in-effect -- localStorage chỉ đọc được sau khi hydrate
    } catch {}
  }, [resumeKey, questions]);
  useEffect(() => {
    if (!resumeKey || !questions[idx]) return;
    try {
      localStorage.setItem(`pos:${resumeKey}`, questions[idx].id);
    } catch {}
  }, [resumeKey, idx, questions]);

  // Thi thử đang làm: hỏi trước khi rời trang
  useEffect(() => {
    if (mode !== "exam" || submitted) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [mode, submitted]);

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
    if (module === "lid" && autoMark && marked.has(q.id) === ok) setMark(q.id, !ok).catch(() => {});
  };

  const retry = () => {
    if (!q) return;
    const drop = <T,>(o: Record<string, T>) => Object.fromEntries(Object.entries(o).filter(([k]) => k !== q.id));
    setChecked(drop);
    setPicked(drop);
    setShowExplain(false);
  };

  const answeredCount = questions.filter((x) => picked[x.id]?.length).length;

  const submit = useCallback(() => {
    if (!exam || result) return;
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
  }, [exam, result, questions, picked, loggedIn, startedAt, module, autoMark, marked]); // eslint-disable-line react-hooks/exhaustive-deps -- setMark chỉ gọi API

  const askSubmit = () => {
    const left = questions.length - answeredCount;
    if (left && !confirm(`Còn ${left} câu chưa làm (tính là sai). Nộp bài?`)) return;
    if (!left && !confirm("Nộp bài và xem kết quả?")) return;
    submit();
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

  // Video: tối đa 5 lượt xem; xem ít nhất 1 lượt mới được trả lời; đã sang bước trả lời thì không xem lại (như thi thật)
  const gated = !!q?.video && (mode === "lesen" || mode === "ueben" || (mode === "exam" && !submitted));
  const vstate = (q && videos[q.id]) || { count: 0, answering: false };
  const videoStep = gated && !vstate.answering && !checked[q.id];
  const setVideo = (patch: Partial<VideoState>) => q && setVideos((v) => ({ ...v, [q.id]: { ...vstate, ...patch } }));

  // Phím tắt: ←/→ chuyển câu, 1–4 chọn đáp án, Enter kiểm tra
  const display = useMemo(() => (q ? q.order.map((i) => q.options[i]).filter(Boolean) : []), [q]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || t?.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "ArrowRight") go(idx + 1);
      else if (e.key === "ArrowLeft") go(idx - 1);
      else if (/^[1-9]$/.test(e.key) && !videoStep) {
        const o = display[Number(e.key) - 1];
        if (o) toggle(o.key);
      } else if (e.key === "Enter" && mode === "ueben" && !reveal && !videoStep && !cfg.single) check();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!q) {
    return (
      <div className="card flex flex-col items-center gap-3 p-6 text-center">
        <p className="font-bold">Không có câu nào ở đây.</p>
        <Link href={backHref} className="btn">
          <ArrowLeft className="size-4" /> Quay lại
        </Link>
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
  const trDir = lang === "ar" ? "rtl" : undefined;
  const grundCount = questions.filter((x) => x.grund).length;
  const visible = isExam && grundCount && grundCount < questions.length ? questions.map((x, i) => ({ x, i })).filter(({ x }) => x.grund === (tab === "grund")) : questions.map((x, i) => ({ x, i }));

  return (
    <div ref={top} className="flex scroll-mt-20 flex-col gap-4">
      {/* Đầu trang */}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={backHref}
          className="btn-icon"
          aria-label="Quay lại"
          onClick={(e) => {
            if (mode === "exam" && !submitted && answeredCount && !confirm("Thoát bài thi? Bài đang làm sẽ không được lưu.")) e.preventDefault();
          }}
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="truncate text-sm text-muted">{subtitle}</p>}
        </div>
        {mode === "exam" && !submitted && exam && <Timer minutes={exam.minutes} startedAt={startedAt} onEnd={submit} />}
        <button type="button" onClick={() => setShowTr(!showTr)} aria-pressed={showTr} className={`btn ${showTr ? "bg-accent/15" : ""}`} title="Hiện / ẩn bản dịch">
          <Languages className="size-4" /> <span className="hidden sm:inline">{showTr ? "Ẩn bản dịch" : "Hiện bản dịch"}</span>
        </button>
      </div>

      {modeLinks && (mode === "lesen" || mode === "ueben") && (
        <div className="flex gap-1 self-start rounded-2xl border-2 border-ink bg-card p-1" role="tablist" aria-label="Chế độ học">
          {(["lesen", "ueben"] as const).map((m) => (
            <Link
              key={m}
              href={modeLinks[m]}
              role="tab"
              aria-selected={mode === m}
              replace
              className={`rounded-xl px-3 py-1 text-sm font-extrabold ${mode === m ? "bg-gold text-black" : "text-muted hover:text-foreground"}`}
            >
              {m === "lesen" ? "Đọc (Lesen)" : "Luyện (Üben)"}
            </Link>
          ))}
        </div>
      )}

      {!loggedIn && !isExam && <GuestTrialNote area={module} quota={quota} extra="lưu tiến độ và đánh dấu câu" />}
      <GuestWall area={module} quota={quota} backHref={backHref} exam={guestExam} />

      {result && <ResultBar module={module} result={result} maxErrorPoints={maxErrorPoints} savedId={savedId} saveError={saveError} />}

      <div className={fs ? "theme-fahrschule flex flex-col overflow-hidden rounded-3xl border-2 border-ink bg-background shadow-[0_4px_0_var(--ink)]" : "contents"}>
      {/* Bảng số câu (thi: chia phần cơ bản / phần riêng) — lái xe: nằm dưới câu hỏi như app */}
      {fs && isExam ? (
        <FsExamBar
          tabs={grundCount > 0 && grundCount < questions.length ? ["Grundstoff", exam?.cls || "Zusatzstoff"] : ["Grundstoff"]}
          tab={tab === "grund" || grundCount === questions.length ? 0 : 1}
          setTab={(t) => setTab(t === 0 ? "grund" : "zusatz")}
          items={visible.map(({ x, i }) => ({ i, state: status(x), marked: marked.has(x.id), video: !!x.video, num: !x.options.length }))}
          idx={idx}
          go={go}
          info={submitted && result ? `${result.errorPoints} Fehlerpunkte · ${result.passed ? "bestanden" : "nicht bestanden"}` : `noch ${questions.length - answeredCount} Aufgaben`}
          warn={!submitted && answeredCount < questions.length}
          onSubmit={mode === "exam" && !submitted ? askSubmit : null}
          mark={loggedIn ? { on: marked.has(q.id), toggle: () => toggleMark(q.id) } : null}
          last={idx === questions.length - 1}
        />
      ) : (
      <section className={fs ? "order-last flex flex-col bg-accent px-2 pt-2 pb-3 sm:px-4" : "flex flex-col gap-2"}>
        {isExam && grundCount > 0 && grundCount < questions.length && (
          <div className={fs ? "-mt-2 mb-2 flex gap-1" : "flex gap-1"} role="tablist" aria-label="Phần thi">
            {(["grund", "zusatz"] as const).map((t) => {
              const n = t === "grund" ? grundCount : questions.length - grundCount;
              return (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={
                    fs
                      ? `rounded-b-lg px-3 py-1 text-sm font-extrabold ${tab === t ? "bg-white text-accent-dark" : "text-white/80 hover:text-white"}`
                      : `rounded-xl border-2 px-3 py-1 text-sm font-extrabold ${tab === t ? "border-ink bg-gold text-black" : "border-ink/30 text-muted"}`
                  }
                >
                  {t === "grund" ? cfg.parts[0] : module === "lid" ? cfg.parts[1] : `${cfg.parts[1]} ${exam?.cls ?? ""}`.trim()} · {n}
                </button>
              );
            })}
          </div>
        )}
        {fs ? (
          <FsPager idx={idx} total={questions.length} items={visible.map(({ x, i }) => ({ i, state: status(x), marked: marked.has(x.id), video: !!x.video, num: !x.options.length }))} go={go} />
        ) : (
          <nav aria-label="Danh sách câu" className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto p-0.5">
            {visible.map(({ x, i }) => (
              <GridCell key={x.id} n={i + 1} state={status(x)} current={i === idx} marked={marked.has(x.id)} onClick={() => go(i)} />
            ))}
          </nav>
        )}
      </section>
      )}

      <article key={`${q.id}-${shake}`} className={`${fs ? "min-h-[28rem] p-4 sm:h-[36rem]" : "card"} flex flex-col gap-4 sm:p-6 ${shake && reveal && !right && mode === "ueben" ? "shake" : ""}`}>
        <div className={`flex flex-wrap items-center gap-2 text-xs font-bold ${fs ? "-mx-4 -mt-4 bg-accent px-4 py-2 text-white sm:-mx-6 sm:-mt-6 sm:px-6" : "text-muted"}`}>
          <span className="tabular-nums">
            Câu {idx + 1}/{questions.length}
          </span>
          <span className={`pill border px-2 py-0.5 tabular-nums ${fs ? "border-white/50" : "border-ink/30"}`}>{module === "lid" ? q.chapter : q.id}</span>
          {fs && <span className={`pill px-2 py-0.5 tabular-nums ${q.points === 5 ? "bg-red text-white" : "bg-white/20"}`}>Punkte: {q.points}</span>}
          <span className="flex-1" />
          {!cfg.single && q.options.length > 0 && !reveal && <span>Có thể có nhiều đáp án đúng</span>}
          {loggedIn && !(fs && isExam) ? (
            <button type="button" onClick={() => toggleMark(q.id)} aria-pressed={marked.has(q.id)} className={`btn-icon size-8 ${fs ? "text-white hover:bg-white/15" : ""}`} aria-label={marked.has(q.id) ? "Bỏ đánh dấu" : "Đánh dấu câu này"} title="Đánh dấu">
              <Star className={`size-4 ${marked.has(q.id) ? "fill-gold text-gold" : ""}`} />
            </button>
          ) : null}
        </div>

        {/* Lái xe: khung cố định — nội dung dài thì cuộn bên trong, đầu/chân khung đứng yên */}
        <div className={fs ? "-mr-2 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-2 pb-1 [scrollbar-gutter:stable]" : "contents"}>
        <div className="flex flex-col gap-1">
          <h2 className={`section-title whitespace-pre-line ${fs ? "min-h-[2lh]" : ""}`}>
            {videoStep ? "Bitte starten Sie den Film, um sich mit der Situation vertraut zu machen." : q.q}
          </h2>
          {showTr && !videoStep && q.tr?.q && (
            <p dir={trDir} className="border-l-4 border-accent/60 pl-2 text-accent-text italic whitespace-pre-line">
              {q.tr.q}
            </p>
          )}
        </div>

        {videoStep ? (
          <VideoGate
            key={q.id}
            src={q.video!}
            poster={q.poster}
            count={vstate.count}
            onView={() => setVideo({ count: vstate.count + 1 })}
            onAnswer={() => setVideo({ answering: true })}
          />
        ) : (
          <div className={fs ? "grid items-start gap-4 sm:grid-cols-2 sm:gap-8" : "contents"}>
            {fs ? (
              <div className="min-w-0 empty:hidden sm:empty:block">
                <Media q={q} gated={gated} fs />
              </div>
            ) : (
              <Media q={q} gated={gated} />
            )}
            <div className={fs ? "flex min-w-0 flex-col gap-3" : "contents"}>
            {q.stem && <p className="font-bold text-muted">{q.stem}</p>}
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
                  const tone = fs
                    ? !reveal
                      ? "hover:bg-white/50"
                      : correct
                        ? "bg-accent/15"
                        : on
                          ? "bg-red/15"
                          : ""
                    : !reveal
                    ? on
                      ? "border-ink bg-gold/30"
                      : "border-ink/30 hover:border-ink"
                    : correct
                      ? "border-accent bg-accent/10"
                      : on
                        ? "border-red bg-red/10"
                        : "border-ink/20";
                  return (
                    <li key={o.key}>
                      <button
                        type="button"
                        role={cfg.single ? "radio" : "checkbox"}
                        aria-checked={ticked}
                        disabled={reveal}
                        onClick={() => toggle(o.key)}
                        className={`relative flex w-full items-center gap-3 overflow-hidden text-left transition disabled:cursor-default ${fs ? "rounded-md p-2" : "rounded-2xl border-2 p-3"} ${tone}`}
                      >
                        {mistake && <span className="absolute inset-y-0 left-0 w-1.5 bg-red" aria-hidden />}
                        {fs ? (
                          <span className="flex size-9 shrink-0 items-center justify-center border-2 border-black bg-white text-black">
                            {ticked && <Check className="size-6" strokeWidth={3.5} />}
                          </span>
                        ) : (
                          <span className={`flex size-9 shrink-0 items-center justify-center ${cfg.single ? "rounded-full" : "rounded-lg"} border-2 border-ink text-sm font-extrabold ${ticked ? (reveal && correct ? "border-accent bg-accent text-white" : reveal ? "border-red bg-red text-white" : "bg-foreground text-background") : "bg-card"}`}>
                            {ticked ? <Check className="size-5" strokeWidth={3} /> : <span className="text-muted">{n + 1}</span>}
                          </span>
                        )}
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          {img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={img} alt={`Lựa chọn ${n + 1}`} className="max-h-28 w-auto self-start rounded-lg bg-white" loading="lazy" />
                          ) : (
                            <span className={fs ? "text-sm font-bold sm:text-base" : "font-bold"}>{o.text || `Lựa chọn ${o.key} (xem hình)`}</span>
                          )}
                          {showTr && trText && trText !== o.text && (
                            <span dir={trDir} className="text-sm text-accent-text italic">
                              {trText}
                            </span>
                          )}
                        </span>
                        {reveal && mode !== "lesen" && (
                          <span className="shrink-0" aria-label={correct ? (on ? "Chọn đúng" : "Bỏ sót đáp án đúng") : on ? "Chọn sai" : undefined}>
                            {correct ? (
                              <span className={`flex size-6 items-center justify-center rounded-full ${on ? "bg-accent text-white" : "border-2 border-accent text-accent-text"}`}>
                                <Check className="size-4" strokeWidth={3} />
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
          <p className={`rounded-2xl border-2 px-3 py-2 font-extrabold ${right ? "border-accent bg-accent/15" : "border-red bg-red/15"}`} role="status">
            {right ? "✓ Đúng rồi!" : `${mine.length ? "✗ Chưa đúng" : "Chưa trả lời"}${module === "fuehrerschein" ? ` · ${q.points} điểm lỗi` : ""}`}
          </p>
        )}

        {(reveal || mode === "ueben") && !videoStep && q.explain && (
          <div className="flex flex-col gap-2">
            <button type="button" className="btn btn-sm self-start" aria-expanded={showExplain} onClick={() => setShowExplain(!showExplain)}>
              <Lightbulb className="size-4" /> {showExplain ? "Ẩn giải thích" : "Giải thích"}
            </button>
            {showExplain && (
              <div className="rounded-2xl border-2 border-gold/60 bg-gold/10 p-3 text-sm">
                <p className="font-extrabold">💡 Giải thích</p>
                <p className="mt-1 whitespace-pre-line">{q.explain}</p>
                {showTr && q.tr?.c && (
                  <p dir={trDir} className="mt-2 border-l-4 border-accent/60 pl-2 text-accent-text italic whitespace-pre-line">
                    {q.tr.c}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
        </div>

        {/* Điều hướng: đầu / −10 / trước · kiểm tra · sau / +10 / cuối */}
        <div className="flex flex-wrap items-center gap-1.5">
          {!fs && (
            <>
              <NavBtn label="Câu đầu" disabled={idx === 0} onClick={() => go(0)} icon={ChevronFirst} hideSm />
              <NavBtn label="Lùi 10 câu" disabled={idx === 0} onClick={() => go(idx - 10)} icon={ChevronsLeft} hideSm />
              <button type="button" className="btn" onClick={() => go(idx - 1)} disabled={idx === 0}>
                <ChevronLeft className="size-4" /> Trước
              </button>
            </>
          )}
          <div className="flex-1" />
          {mode === "ueben" && !reveal && !videoStep && !cfg.single && (
            <button type="button" className="btn btn-amber" onClick={() => check()} disabled={!mine.length}>
              Kiểm tra
            </button>
          )}
          {mode === "ueben" && reveal && (
            <button type="button" className="btn" onClick={retry}>
              <RotateCcw className="size-4" /> Làm lại
            </button>
          )}
          <div className="flex-1" />
          {mode === "exam" && !submitted && !fs && idx === questions.length - 1 ? (
            <button type="button" className="btn btn-red" onClick={askSubmit}>
              Nộp bài
            </button>
          ) : fs ? null : (
            <button type="button" className={`btn ${reveal || mode === "exam" ? "btn-primary" : ""}`} onClick={() => go(idx + 1)} disabled={idx === questions.length - 1}>
              Tiếp <ChevronRight className="size-4" />
            </button>
          )}
          {!fs && (
            <>
              <NavBtn label="Tiến 10 câu" disabled={idx === questions.length - 1} onClick={() => go(idx + 10)} icon={ChevronsRight} hideSm />
              <NavBtn label="Câu cuối" disabled={idx === questions.length - 1} onClick={() => go(questions.length - 1)} icon={ChevronLast} hideSm />
            </>
          )}
        </div>
      </article>
      </div>

      {mode === "exam" && !submitted && !fs && (
        <div className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 p-3 text-sm ${answeredCount === questions.length ? "border-accent bg-accent/10" : "border-ink/20"}`}>
          <span className="font-bold">{answeredCount === questions.length ? "Đã làm hết các câu — có thể nộp bài." : `Đã làm ${answeredCount}/${questions.length} câu`}</span>
          <button type="button" className="btn btn-red" onClick={askSubmit}>
            Nộp bài
          </button>
        </div>
      )}

      <p className="hidden text-xs text-muted sm:block">Phím tắt: ← → chuyển câu · 1–4 chọn đáp án{mode === "ueben" && !cfg.single ? " · Enter kiểm tra" : ""}</p>
    </div>
  );
}

type Cell = "empty" | "answered" | "ok" | "bad" | "ok-old" | "bad-old";

function GridCell({ n, state, current, marked, onClick }: { n: number; state: Cell; current: boolean; marked: boolean; onClick: () => void }) {
  const tone = {
    ok: "bg-accent text-white",
    bad: "bg-red text-white",
    "ok-old": "bg-accent/20",
    "bad-old": "bg-red/20",
    answered: "bg-accent/40",
    empty: "bg-card",
  }[state];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={current ? "true" : undefined}
      aria-label={`Câu ${n}${marked ? " (đã đánh dấu)" : ""}`}
      className={`relative flex size-8 items-center justify-center rounded-lg border-2 text-xs font-extrabold tabular-nums transition ${current ? "border-ink ring-2 ring-gold" : "border-ink/30"} ${tone}`}
    >
      {n}
      {marked && <Star className="absolute -top-1.5 -right-1.5 size-3 fill-gold text-gold" aria-hidden />}
    </button>
  );
}

type PagerItem = { i: number; state: Cell; marked: boolean; video: boolean; num: boolean };

/** Dấu góc ô số như phần mềm thi: ▶ đen = câu video, tam giác vàng = câu điền số, ⭐ = câu đã đánh dấu */
function CellMarks({ video, num, marked }: { video: boolean; num: boolean; marked: boolean }) {
  return (
    <>
      {video && (
        <span className="absolute top-0 left-0 flex h-2.5 w-3.5 items-center justify-center bg-black lg:h-3 lg:w-4" aria-hidden>
          <Play className="size-2 fill-white text-white" strokeWidth={0} />
        </span>
      )}
      {num && <span className="absolute top-0 right-0 size-4 bg-[#e3b13c] [clip-path:polygon(0_0,100%_0,100%_100%)] sm:size-5" aria-hidden />}
      {marked && <Star className={`absolute -top-1.5 size-3.5 fill-gold text-black ${num ? "-left-1.5" : "-right-1.5"}`} strokeWidth={1.5} aria-hidden />}
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
  const tone: Record<Cell, string> = {
    empty: "bg-white",
    answered: "bg-[#fff3b0]",
    ok: "bg-[#9fe3b5]",
    bad: "bg-[#ffb3b8]",
    "ok-old": "bg-[#d9f5e2]",
    "bad-old": "bg-[#ffe0e2]",
  };
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
              className={`relative flex h-8 max-w-12 min-w-0 flex-1 items-center justify-center border text-xs font-bold lg:h-9 lg:max-w-15 lg:text-sm text-black tabular-nums ${
                current ? "border-2 border-black bg-linear-to-b from-white to-[#c9c9c9] text-[#1a73e8]" : `border-black/70 ${tone[state]} hover:brightness-95`
              }`}
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
  const tone: Record<Cell, string> = {
    empty: "bg-white",
    answered: "bg-[#fff3b0]",
    ok: "bg-[#9fe3b5]",
    bad: "bg-[#ffb3b8]",
    "ok-old": "bg-white",
    "bad-old": "bg-white",
  };
  const bigBtn = "flex h-10 items-center justify-center rounded-md px-4 text-lg font-medium text-white shadow-sm transition hover:brightness-105 active:brightness-95 disabled:opacity-50 sm:h-10 sm:text-xl";
  return (
    <section className="order-last flex flex-col">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2 pt-2 sm:flex-nowrap">
        <div className="order-2 flex items-end gap-0.5 sm:order-none" role="tablist" aria-label="Phần thi">
          {tabs.map((label, t) => (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`h-10 min-w-14 rounded-t-md px-4 text-lg font-extrabold sm:h-11 sm:px-6 sm:text-xl ${
                tab === t ? "bg-[#518f52] text-white" : "border border-b-0 border-black/20 bg-[#f2f2f2] text-black hover:bg-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="order-3 flex min-w-0 items-center gap-2 pb-2.5 whitespace-nowrap text-base font-bold text-[#1d3a2c] sm:order-none sm:text-lg">
          {warn && <TriangleAlert className="size-6 shrink-0 fill-[#f2c443] text-[#8a6d1a]" strokeWidth={1.75} aria-hidden />}
          {info}
        </p>
        <div className="order-1 flex w-full justify-end gap-2 px-2 sm:order-none sm:ml-auto sm:w-auto sm:shrink-0 sm:gap-3 sm:px-3 sm:pb-4">
          {onSubmit && (
            <button type="button" onClick={onSubmit} className={`${bigBtn} bg-[#e8322f]`}>
              Auswertung
            </button>
          )}
          {mark && (
            <button type="button" onClick={mark.toggle} aria-pressed={mark.on} aria-label={mark.on ? "Bỏ đánh dấu" : "Đánh dấu câu này"} title="Đánh dấu" className={`${bigBtn} bg-[#f2c443] !px-0 w-12 sm:w-14`}>
              <Star className={`size-6 sm:size-7 ${mark.on ? "fill-black" : ""} text-black`} strokeWidth={2} />
            </button>
          )}
          <button type="button" onClick={() => go(idx + 1)} disabled={last} className={`${bigBtn} bg-[#3f9a52] sm:min-w-32`}>
            Weiter
          </button>
        </div>
      </div>
      <nav aria-label="Danh sách câu" className="flex flex-wrap gap-2 border-t-2 border-[#3d7a3e] bg-[#518f52] p-2 sm:gap-3.5 sm:px-2 sm:py-3">
        {items.map(({ i, state, marked, video, num }) => {
          const current = i === idx;
          return (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-current={current ? "true" : undefined}
              aria-label={`Câu ${i + 1}${video ? " (video)" : ""}${num ? " (điền số)" : ""}${marked ? " (đã đánh dấu)" : ""}`}
              className={`relative flex h-7 w-12 items-center justify-center text-sm font-bold tabular-nums sm:h-8 sm:w-14 sm:text-base ${
                current ? "outline-[3px] outline-black outline-offset-2 border border-black bg-linear-to-b from-white to-[#c9c9c9] text-[#1a73e8]" : `border border-black/40 text-black ${tone[state]} hover:brightness-95`
              }`}
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

function PagerBtn({ label, disabled, onClick, icon: Icon, hideSm, flip }: { label: string; disabled: boolean; onClick: () => void; icon: typeof Play; hideSm?: boolean; flip?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`${hideSm ? "hidden sm:flex" : "flex"} size-9 shrink-0 items-center justify-center border border-black bg-white text-black hover:bg-[#eee] disabled:opacity-50 lg:size-11`}
    >
      <Icon className={`size-5 fill-current ${flip ? "rotate-180" : ""}`} strokeWidth={1.5} />
    </button>
  );
}

function NavBtn({ label, disabled, onClick, icon: Icon, hideSm }: { label: string; disabled: boolean; onClick: () => void; icon: typeof ChevronFirst; hideSm?: boolean }) {
  return (
    <button type="button" className={`btn size-10 p-0 ${hideSm ? "hidden sm:inline-flex" : ""}`} onClick={onClick} disabled={disabled} aria-label={label} title={label}>
      <Icon className="size-4" />
    </button>
  );
}

function Media({ q, gated, fs }: { q: DrivingQ; gated: boolean; fs?: boolean }) {
  const frame = fs ? "w-full bg-black" : "w-full max-w-xl rounded-2xl border-2 border-ink bg-black";
  if (q.video) {
    // Đã qua bước xem video (đọc / luyện / thi): chỉ hiện khung hình; xem lại bài thi: xem video tự do
    if (gated)
      return q.poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={q.poster} alt="Khung hình cuối của video" className={`${frame} object-contain`} />
      ) : null;
    return (
      <video src={q.video} poster={q.poster ?? undefined} controls playsInline preload="none" className={frame}>
        Trình duyệt không phát được video.
      </video>
    );
  }
  if (q.optionImages || !q.images.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {q.images.map((src) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={src} src={src} alt="Hình minh hoạ câu hỏi" loading="lazy" className={fs ? "w-full bg-white object-contain" : "max-h-80 w-auto max-w-full rounded-2xl border-2 border-ink bg-white object-contain"} />
      ))}
    </div>
  );
}

const noop = () => () => {};

/** Bước xem video như phần mềm thi (theorie24):
 *  1. khung hình đầu + nút ▶ · "Video starten" · được xem tối đa 5 lần
 *  2. bấm xem → video phát toàn màn hình, "Schliessen" để đóng (xem hết tự đóng)
 *  3. đã xem → khung hình cuối · thêm "Zur Aufgabenstellung" · "noch N mal" — sang câu hỏi rồi thì không xem lại được */
function VideoGate({ src, poster, count, onView, onAnswer }: { src: string; poster: string | null; count: number; onView: () => void; onAnswer: () => void }) {
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

  const blue = "flex h-11 w-full max-w-md items-center justify-center rounded-md bg-[#0000a8] px-4 text-lg text-white shadow-md transition hover:bg-[#0000c8] disabled:opacity-50 sm:text-xl";

  return (
    <div className="grid items-start gap-4 sm:grid-cols-2 sm:gap-8">
      <div className="relative min-w-0 bg-black">
        {count && poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt="Khung hình cuối của video" className="w-full object-contain" />
        ) : (
          <video src={`${src}#t=0.1`} preload="metadata" muted playsInline className="w-full" aria-hidden />
        )}
        {left > 0 && (
          <button type="button" onClick={start} aria-label="Xem video" className="group absolute inset-0 flex items-center justify-center">
            <span className="flex size-20 items-center justify-center rounded-full border-[6px] border-white/75 transition group-hover:border-white sm:size-24">
              <Play className="ml-2 size-10 fill-white/75 text-transparent group-hover:fill-white sm:size-12" />
            </span>
          </button>
        )}
      </div>

      <div className="flex min-w-0 flex-col items-center gap-5 sm:pt-4">
        <button type="button" className={blue} onClick={start} disabled={left <= 0}>
          Video starten
        </button>
        {count > 0 && (
          <button type="button" className={blue} onClick={onAnswer}>
            Zur Aufgabenstellung
          </button>
        )}
        <p className="mt-4 text-center text-lg font-bold">
          {count ? (
            <>
              Sie können sich den Film noch <span className="text-red">{left}</span> mal ansehen.
            </>
          ) : (
            `Sie können das Video insgesamt ${MAX_VIEWS} Mal ansehen.`
          )}
        </p>
        <p className="text-center text-xs text-muted">Xem ít nhất 1 lần mới sang câu hỏi được; sang câu hỏi rồi thì không xem lại video.</p>
      </div>

      {mounted &&
        createPortal(
          <div className={`fixed inset-0 z-[100] flex flex-col bg-[#d9f2da] ${open ? "" : "hidden"}`} role="dialog" aria-modal="true" aria-label="Video tình huống">
            <div className="flex min-h-0 flex-1 items-center justify-center">
              <video ref={ref} src={src} playsInline preload="metadata" onEnded={() => setOpen(false)} className="max-h-full w-full bg-black object-contain">
                Trình duyệt không phát được video.
              </video>
            </div>
            <div className="flex justify-end bg-[#518f52] px-4 py-2.5">
              <button type="button" onClick={close} className="rounded px-2 text-lg font-bold text-white hover:bg-white/15">
                Schliessen
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function NumberAnswer({ value, disabled, onChange, onEnter, correct }: { value: string; disabled: boolean; onChange: (v: string) => void; onEnter: () => void; correct: string | null }) {
  return (
    <label className="flex flex-wrap items-center gap-2 font-bold">
      Đáp án:
      <input
        inputMode="decimal"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, "").slice(0, 10))}
        onKeyDown={(e) => {
          if (e.key === "Enter") onEnter();
        }}
        className="w-32 rounded-xl border-2 border-ink bg-card px-3 py-2 text-lg tabular-nums"
        placeholder="Nhập số"
      />
      {correct !== null && <span className="text-sm text-muted">Đáp án đúng: {correct}</span>}
    </label>
  );
}

const KEYS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "C"] as const;

/** Câu điền số kiểu phần mềm thi: "Antwort: … [ô] đơn vị" + bàn phím số (C xoá 1 ký tự, Löschen xoá hết) */
function FsNumberAnswer({
  value,
  hint,
  disabled,
  onChange,
  onEnter,
  correct,
}: {
  value: string;
  hint: { pre?: string; unit?: string } | null;
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
  return (
    <div className="flex flex-col gap-3 text-sm font-bold">
      <label className="flex flex-col gap-1">
        <span>Antwort:{hint?.pre ? ` ${hint.pre}` : ""}</span>
        <span className="flex items-center gap-3">
          <input
            inputMode="decimal"
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(clean(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === "Enter") onEnter();
            }}
            className={`h-8 w-28 border bg-white px-2 text-base text-black tabular-nums outline-none focus:border-2 ${correct === null ? "border-black/60" : ok ? "border-2 border-accent" : "border-2 border-red"}`}
          />
          {hint?.unit && <span>{hint.unit}</span>}
        </span>
      </label>
      {correct !== null && !ok && <p className="text-accent-text">Đáp án đúng: {correct}{hint?.unit ? ` ${hint.unit}` : ""}</p>}
      {!disabled && (
        <div className="grid w-44 grid-cols-3 gap-1.5" aria-label="Bàn phím số">
          {KEYS.map((k) => (
            <button key={k} type="button" onClick={() => press(k)} aria-label={k === "C" ? "Xoá 1 ký tự" : k} className="h-9 border border-black/30 bg-white text-black hover:bg-[#eee] active:bg-[#ddd]">
              {k}
            </button>
          ))}
          <button type="button" onClick={() => onChange("")} className="col-span-3 h-9 border border-black/30 bg-white text-black hover:bg-[#eee] active:bg-[#ddd]">
            Löschen
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
    <span className={`pill gap-1 border-2 border-ink px-2.5 py-1 text-sm tabular-nums ${left < 5 * 60_000 ? "bg-red text-white" : "bg-card"}`} role="timer" aria-label="Thời gian còn lại">
      <Clock className="size-4" /> {mm}:{String(ss).padStart(2, "0")}
    </span>
  );
}

function ResultBar({ module, result, maxErrorPoints, savedId, saveError }: { module: QuizModule; result: ExamResult; maxErrorPoints: number; savedId: number | null; saveError: string }) {
  return (
    <section className={`card flex flex-col gap-1 ${result.passed ? "bg-accent/15" : "bg-red/15"}`} aria-live="polite">
      <p className="text-2xl font-extrabold">{result.passed ? "🎉 Bestanden — Đậu!" : "Nicht bestanden — Chưa đậu"}</p>
      <p className="font-bold">
        {module === "lid" ? (
          <>
            Đúng {result.correct}/{result.total} câu · cần đúng ≥ {result.total - maxErrorPoints} câu
          </>
        ) : (
          <>
            {result.errorPoints} / {maxErrorPoints} điểm lỗi · đúng {result.correct}/{result.total} câu
            {result.failReason ? ` · ${FAIL_TEXT[result.failReason]}` : ""}
          </>
        )}
      </p>
      <p className="text-sm text-muted">
        Bấm số câu để xem lại từng câu: ✓ xanh = đáp án đúng, ✗ đỏ = chọn sai, vạch đỏ = chỗ sai.
        {savedId ? (
          <>
            {" "}
            Đã lưu vào{" "}
            <Link href={`${MODULES[module].base}/thong-ke`} className="font-bold underline">
              lịch sử thi
            </Link>
            .
          </>
        ) : null}
        {saveError ? ` Không lưu được: ${saveError}` : ""}
      </p>
    </section>
  );
}
