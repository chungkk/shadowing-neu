"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Pause,
  FastForward,
  Play,
  Rewind,
  SkipBack,
  SkipForward,
  RotateCcw,
  Star,
  X,
} from "lucide-react";
import { clientApi } from "@/lib/client-api";
import { FAIL_TEXT, grade, isRight, type DrivingQ, type ExamAnswer, type ExamResult, type Lang } from "@/lib/fuehrerschein-rules";
import type { QuizStat } from "@/lib/quiz-types";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { LoginLink } from "../LoginDialog";

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
  const pathname = usePathname();
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
    if (reveal || !q) return;
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
    if (!q || !answer.length) return;
    const ok = isRight(q, answer);
    setChecked((c) => ({ ...c, [q.id]: true }));
    setLocal((s) => ({ ...s, [q.id]: { correct: (s[q.id]?.correct ?? 0) + +ok, wrong: (s[q.id]?.wrong ?? 0) + +!ok, lastOk: ok } }));
    if (!ok) {
      setShake((n) => n + 1);
      navigator.vibrate?.(150);
      setShowExplain(true);
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
  const gated = !!q?.video && (mode === "ueben" || (mode === "exam" && !submitted));
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
      <div className="sticker flex flex-col items-center gap-3 p-6 text-center">
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
          <h1 className="text-xl leading-tight font-extrabold">{title}</h1>
          {subtitle && <p className="truncate text-sm text-muted">{subtitle}</p>}
        </div>
        {mode === "exam" && !submitted && exam && <Timer minutes={exam.minutes} startedAt={startedAt} onEnd={submit} />}
        <button type="button" onClick={() => setShowTr(!showTr)} aria-pressed={showTr} className={`btn px-3 py-1.5 ${showTr ? "bg-accent/15" : ""}`} title="Hiện / ẩn bản dịch">
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

      {!loggedIn && mode !== "review" && (
        <p className="rounded-2xl border-2 border-dashed border-ink/40 px-3 py-2 text-sm">
          Bạn đang học thử.{" "}
          <LoginLink href={`/login?next=${encodeURIComponent(pathname)}`} className="font-extrabold text-accent-text underline">
            Đăng nhập
          </LoginLink>{" "}
          để lưu tiến độ, đánh dấu câu và xem lại lịch sử thi.
        </p>
      )}

      {result && <ResultBar module={module} result={result} maxErrorPoints={maxErrorPoints} savedId={savedId} saveError={saveError} />}

      <div className={fs ? "theme-fahrschule flex flex-col overflow-hidden rounded-3xl border-2 border-ink bg-background shadow-[0_4px_0_var(--ink)]" : "contents"}>
      {/* Bảng số câu (thi: chia phần cơ bản / phần riêng) — lái xe: nằm dưới câu hỏi như app */}
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
          <FsPager idx={idx} total={questions.length} items={visible.map(({ x, i }) => ({ i, state: status(x), marked: marked.has(x.id) }))} go={go} />
        ) : (
          <nav aria-label="Danh sách câu" className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto p-0.5">
            {visible.map(({ x, i }) => (
              <GridCell key={x.id} n={i + 1} state={status(x)} current={i === idx} marked={marked.has(x.id)} onClick={() => go(i)} />
            ))}
          </nav>
        )}
      </section>

      <article key={`${q.id}-${shake}`} className={`${fs ? "" : "sticker"} flex flex-col gap-4 p-4 sm:p-6 ${shake && reveal && !right && mode === "ueben" ? "shake" : ""}`}>
        <div className={`flex flex-wrap items-center gap-2 text-xs font-bold ${fs ? "-mx-4 -mt-4 bg-accent px-4 py-2 text-white sm:-mx-6 sm:-mt-6 sm:px-6" : "text-muted"}`}>
          <span className="tabular-nums">
            Câu {idx + 1}/{questions.length}
          </span>
          <span className={`pill border px-2 py-0.5 tabular-nums ${fs ? "border-white/50" : "border-ink/30"}`}>{module === "lid" ? q.chapter : q.id}</span>
          {fs && <span className={`pill px-2 py-0.5 tabular-nums ${q.points === 5 ? "bg-red text-white" : "bg-white/20"}`}>Punkte: {q.points}</span>}
          <span className="flex-1" />
          {!cfg.single && q.options.length > 0 && !reveal && <span>Có thể có nhiều đáp án đúng</span>}
          {loggedIn ? (
            <button type="button" onClick={() => toggleMark(q.id)} aria-pressed={marked.has(q.id)} className={`btn-icon size-8 ${fs ? "text-white hover:bg-white/15" : ""}`} aria-label={marked.has(q.id) ? "Bỏ đánh dấu" : "Đánh dấu câu này"} title="Đánh dấu">
              <Star className={`size-4 ${marked.has(q.id) ? "fill-gold text-gold" : ""}`} />
            </button>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <h2 className="text-lg leading-snug font-extrabold whitespace-pre-line">{q.q}</h2>
          {showTr && q.tr?.q && (
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
          <>
            <Media q={q} gated={gated} />
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
                  const tone = !reveal
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
                        className={`relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border-2 p-3 text-left transition disabled:cursor-default ${tone}`}
                      >
                        {mistake && <span className="absolute inset-y-0 left-0 w-1.5 bg-red" aria-hidden />}
                        <span className={`flex size-9 shrink-0 items-center justify-center ${cfg.single ? "rounded-full" : "rounded-lg"} border-2 border-ink text-sm font-extrabold ${ticked ? (reveal && correct ? "border-accent bg-accent text-white" : reveal ? "border-red bg-red text-white" : "bg-foreground text-background") : "bg-card"}`}>
                          {ticked ? <Check className="size-5" strokeWidth={3} /> : <span className="text-muted">{n + 1}</span>}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          {img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={img} alt={`Lựa chọn ${n + 1}`} className="max-h-28 w-auto self-start rounded-lg bg-white" loading="lazy" />
                          ) : (
                            <span className="font-bold">{o.text || `Lựa chọn ${o.key} (xem hình)`}</span>
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
            ) : (
              <NumberAnswer
                value={mode === "lesen" ? q.answer[0] : (mine[0] ?? "")}
                disabled={reveal}
                onChange={(v) => setPicked((p) => ({ ...p, [q.id]: v ? [v] : [] }))}
                onEnter={() => mode === "ueben" && check()}
                correct={reveal && mode !== "lesen" ? q.answer[0] : null}
              />
            )}
          </>
        )}

        {reveal && mode !== "lesen" && (
          <p className={`rounded-2xl border-2 px-3 py-2 font-extrabold ${right ? "border-accent bg-accent/15" : "border-red bg-red/15"}`} role="status">
            {right ? "✓ Đúng rồi!" : `${mine.length ? "✗ Chưa đúng" : "Chưa trả lời"}${module === "fuehrerschein" ? ` · ${q.points} điểm lỗi` : ""}`}
          </p>
        )}

        {(reveal || mode === "ueben") && q.explain && (
          <div className="flex flex-col gap-2">
            <button type="button" className="btn self-start px-3 py-1.5" aria-expanded={showExplain || mode === "lesen"} onClick={() => setShowExplain(!showExplain)} hidden={mode === "lesen"}>
              <Lightbulb className="size-4" /> {showExplain ? "Ẩn giải thích" : "Giải thích"}
            </button>
            {(showExplain || mode === "lesen") && (
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
          {mode === "exam" && !submitted && idx === questions.length - 1 ? (
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

      {mode === "exam" && !submitted && (
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

/** Thanh dưới kiểu phần mềm thi thật: |◀ ◀◀ ◀ · 10 ô số · ▶ ▶▶ ▶| */
function FsPager({ idx, total, items, go }: { idx: number; total: number; items: { i: number; state: Cell; marked: boolean }[]; go: (i: number) => void }) {
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
      <div className="flex min-w-0 flex-1 justify-center gap-1 sm:gap-1.5">
        {page.map(({ i, state, marked }) => {
          const current = i === idx;
          return (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-current={current ? "true" : undefined}
              aria-label={`Câu ${i + 1}${marked ? " (đã đánh dấu)" : ""}`}
              className={`relative flex h-8 max-w-12 min-w-0 flex-1 items-center justify-center border text-xs font-bold text-black tabular-nums ${
                current ? "border-2 border-black bg-linear-to-b from-white to-[#c9c9c9] text-[#1a73e8]" : `border-black/70 ${tone[state]} hover:brightness-95`
              }`}
            >
              {i + 1}
              {marked && <Star className="absolute -top-1.5 -right-1.5 size-3 fill-gold text-gold" aria-hidden />}
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

function PagerBtn({ label, disabled, onClick, icon: Icon, hideSm, flip }: { label: string; disabled: boolean; onClick: () => void; icon: typeof Play; hideSm?: boolean; flip?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`${hideSm ? "hidden sm:flex" : "flex"} size-9 shrink-0 items-center justify-center border border-black bg-white text-black hover:bg-[#eee] disabled:opacity-50`}
    >
      <Icon className={`size-5 fill-current ${flip ? "rotate-180" : ""}`} strokeWidth={1.5} />
    </button>
  );
}

function NavBtn({ label, disabled, onClick, icon: Icon, hideSm }: { label: string; disabled: boolean; onClick: () => void; icon: typeof ChevronFirst; hideSm?: boolean }) {
  return (
    <button type="button" className={`btn px-2.5 ${hideSm ? "hidden sm:inline-flex" : ""}`} onClick={onClick} disabled={disabled} aria-label={label} title={label}>
      <Icon className="size-4" />
    </button>
  );
}

function Media({ q, gated }: { q: DrivingQ; gated: boolean }) {
  if (q.video) {
    // Đã qua bước xem video (luyện / thi): chỉ hiện khung hình; đọc / xem lại: xem video tự do
    if (gated)
      return q.poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={q.poster} alt="Khung hình cuối của video" className="w-full max-w-xl rounded-2xl border-2 border-ink bg-black object-contain" />
      ) : null;
    return (
      <video src={q.video} poster={q.poster ?? undefined} controls playsInline preload="none" className="w-full max-w-xl rounded-2xl border-2 border-ink bg-black">
        Trình duyệt không phát được video.
      </video>
    );
  }
  if (q.optionImages || !q.images.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {q.images.map((src) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={src} src={src} alt="Hình minh hoạ câu hỏi" loading="lazy" className="max-h-80 w-auto max-w-full rounded-2xl border-2 border-ink bg-white object-contain" />
      ))}
    </div>
  );
}

/** Bước xem video của câu video: bấm Bắt đầu (mỗi lần = 1 lượt, tối đa 5), xem ít nhất 1 lượt mới được sang câu hỏi */
function VideoGate({ src, poster, count, onView, onAnswer }: { src: string; poster: string | null; count: number; onView: () => void; onAnswer: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const left = MAX_VIEWS - count;

  const start = () => {
    const v = ref.current;
    if (!v) return;
    if (paused) {
      v.play().catch(() => {});
      return;
    }
    if (left <= 0) return;
    v.currentTime = 0;
    v.play()
      .then(() => onView())
      .catch(() => {});
  };

  return (
    <div className="flex flex-col gap-3">
      <video
        ref={ref}
        src={src}
        poster={poster ?? undefined}
        playsInline
        preload="metadata"
        onPlay={() => {
          setPlaying(true);
          setPaused(false);
        }}
        onPause={(e) => {
          setPlaying(false);
          setPaused(!e.currentTarget.ended);
        }}
        onEnded={() => {
          setPlaying(false);
          setPaused(false);
        }}
        className="w-full max-w-xl rounded-2xl border-2 border-ink bg-black"
      >
        Trình duyệt không phát được video.
      </video>
      <div className="flex flex-wrap items-center gap-2">
        {playing ? (
          <button type="button" className="btn" onClick={() => ref.current?.pause()}>
            <Pause className="size-4" /> Tạm dừng
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={start} disabled={!paused && left <= 0}>
            <Play className="size-4" /> {paused ? "Xem tiếp" : count ? "Xem lại" : "Bắt đầu video"}
          </button>
        )}
        <span className="text-sm text-muted tabular-nums">Còn {left}/{MAX_VIEWS} lượt xem</span>
        <span className="flex-1" />
        <button
          type="button"
          className="btn btn-amber"
          disabled={!count}
          onClick={() => {
            ref.current?.pause();
            onAnswer();
          }}
          title={count ? undefined : "Xem video ít nhất 1 lần"}
        >
          Sang câu hỏi (Zur Aufgabe) <ChevronRight className="size-4" />
        </button>
      </div>
      <p className="text-xs text-muted">Như thi thật: xem tối đa {MAX_VIEWS} lần, sang câu hỏi rồi thì không xem lại video được.</p>
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
    <section className={`sticker flex flex-col gap-1 p-4 ${result.passed ? "bg-accent/15" : "bg-red/15"}`} aria-live="polite">
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
