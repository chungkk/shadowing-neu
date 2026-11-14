"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Clock, Languages, Star, X } from "lucide-react";
import { clientApi } from "@/lib/client-api";
import { grade, isRight, type DrivingQ, type ExamAnswer, type ExamResult, type Lang } from "@/lib/fuehrerschein-rules";
import type { QuizStat } from "@/lib/quiz-types";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { GuestTrialNote, GuestWall, useGuestCount, useGuestQuota } from "../GuestQuota";
import { ProgressBar } from "../QuizParts";

/**
 * Màn câu hỏi Leben in Deutschland — cách chơi như app LiD Ckk, giao diện chung của trang (giống tab Lái xe):
 * - ueben: học — bấm đáp án là chấm ngay (đúng viền xanh, sai viền đỏ + vạch đỏ)
 * - lesen: đọc lướt — đáp án đúng tô sẵn
 * - exam: thi thử — đồng hồ đếm ngược, đổi đáp án tuỳ ý, làm hết mới hiện "Nộp bài"
 * - review: xem lại bài thi — đúng ✓ xanh, chọn sai ✗ đỏ
 */
export type LidMode = "lesen" | "ueben" | "exam" | "review";
export type LidExam = { ref: string; cls: string; minutes: number; maxWrong: number };

type Props = {
  mode: LidMode;
  /** Chữ giữa thanh đầu (học) */
  title: string;
  backHref: string;
  questions: DrivingQ[];
  loggedIn: boolean;
  lang: Lang;
  stats?: Record<string, QuizStat>;
  bookmarks?: string[];
  exam?: LidExam;
  review?: { picked: Record<string, string[]>; result: ExamResult };
  /** Nhớ câu đang học để lần sau mở lại đúng chỗ (như app) */
  resumeKey?: string;
};

export default function LidRunner({ mode, title, backHref, questions, loggedIn, lang, stats = {}, bookmarks = [], exam, review, resumeKey }: Props) {
  const pathname = usePathname();
  const [idx, setIdx] = useState(0);
  // Học: như app, mỗi lần mở câu là làm lại từ đầu → chỉ giữ đáp án của câu đang xem
  const [answer, setAnswer] = useState<string | null>(null);
  // Thi / xem lại: đáp án của cả bài
  const [picked, setPicked] = useState<Record<string, string[]>>(review?.picked ?? {});
  const [result, setResult] = useState<ExamResult | null>(review?.result ?? null);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [saveError, setSaveError] = useState("");
  const [marked, setMarked] = useState(() => new Set(bookmarks));
  const [local, setLocal] = useState(stats);
  const [picker, setPicker] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const [showTr, setShowTr] = useLocalStorage<boolean>("lid:tr", true);
  const [autoMark] = useLocalStorage<boolean>("lid:auto-mark", true);
  const scroller = useRef<HTMLDivElement>(null);

  const q = questions[idx];
  // Khách: học thử có giới hạn số câu mỗi ngày · thi thử cần tài khoản
  const quota = useGuestQuota("lid", loggedIn);
  const guestExam = !loggedIn && mode === "exam";
  const blocked = useGuestCount(quota, q?.id, mode === "ueben" || mode === "lesen") || guestExam;
  const isExam = mode === "exam" || mode === "review";
  const submitted = mode === "review" || (mode === "exam" && !!result);
  const testing = mode === "exam" && !submitted;
  const answeredCount = questions.filter((x) => picked[x.id]?.length).length;

  const go = useCallback(
    (i: number) => {
      const next = Math.max(0, Math.min(questions.length - 1, i));
      setIdx(next);
      setAnswer(null);
      setPicker(false);
      scroller.current?.scrollIntoView({ block: "nearest" });
    },
    [questions.length],
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

  // Đang thi: hỏi trước khi rời trang
  useEffect(() => {
    if (!testing) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [testing]);

  const setMark = (id: string, on: boolean) => {
    setMarked((s) => {
      const n = new Set(s);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });
    return clientApi("/quiz/bookmarks", { method: "POST", body: { module: "lid", qid: id, on } });
  };

  const toggleMark = () => {
    if (!q) return;
    const on = !marked.has(q.id);
    setMark(q.id, on).catch(() =>
      setMarked((s) => {
        const n = new Set(s);
        if (on) n.delete(q.id);
        else n.add(q.id);
        return n;
      }),
    );
  };

  const choose = (key: string) => {
    if (!q || submitted || mode === "lesen" || blocked) return;
    if (testing) {
      setPicked((p) => ({ ...p, [q.id]: [key] }));
      return;
    }
    if (answer !== null) return;
    setAnswer(key);
    const ok = isRight(q, [key]);
    if (!ok) navigator.vibrate?.(300);
    setLocal((s) => ({ ...s, [q.id]: { correct: (s[q.id]?.correct ?? 0) + +ok, wrong: (s[q.id]?.wrong ?? 0) + +!ok, lastOk: ok } }));
    if (!loggedIn) return;
    clientApi("/quiz", { method: "POST", body: { module: "lid", answers: [{ qid: q.id, ok }] }, keepalive: true }).catch(() => {});
    // Như app: sai tự đánh dấu, đúng tự bỏ đánh dấu
    if (autoMark && marked.has(q.id) === ok) setMark(q.id, !ok).catch(() => {});
  };

  const submit = useCallback(() => {
    if (!exam || result) return;
    const r = grade(questions, picked, exam.maxWrong);
    setResult(r);
    setIdx(0);
    setAnswer(null);
    if (!r.passed) navigator.vibrate?.([0, 200, 100, 200]);
    if (!loggedIn) return;
    if (autoMark)
      for (const x of questions) {
        const ok = isRight(x, picked[x.id]);
        if (marked.has(x.id) === ok) setMark(x.id, !ok).catch(() => {});
      }
    const answers: ExamAnswer[] = questions.map((x) => ({ qid: x.id, picked: picked[x.id] ?? [], order: x.order }));
    clientApi<{ id: number }>("/quiz/exams", {
      method: "POST",
      body: { module: "lid", kind: "random", ref: exam.ref, cls: exam.cls, durationS: (Date.now() - startedAt) / 1000, answers },
      keepalive: true,
    })
      .then((d) => setSavedId(d.id))
      .catch((e: Error) => setSaveError(e.message));
  }, [exam, result, questions, picked, loggedIn, startedAt, autoMark, marked]);

  // Phím tắt: ←/→ chuyển câu, 1–4 chọn đáp án
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (picker || e.metaKey || e.ctrlKey || e.altKey || t?.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "ArrowRight") go(idx + 1);
      else if (e.key === "ArrowLeft") go(idx - 1);
      else if (/^[1-4]$/.test(e.key) && q?.options[Number(e.key) - 1]) choose(q.options[Number(e.key) - 1].key);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!q) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Link href={backHref} className="btn-icon" aria-label="Quay lại">
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="page-title min-w-0 flex-1 truncate">{title}</h1>
        </div>
        <div className="card flex flex-col items-center gap-3 p-6 text-center">
          <BookmarkIcon />
          <p className="font-bold">{mode === "ueben" && pathname.endsWith("danh-dau") ? "Chưa có câu hỏi nào được đánh dấu" : "Không có câu hỏi"}</p>
          <Link href={backHref} className="btn">
            <ArrowLeft className="size-4" /> Quay lại
          </Link>
        </div>
      </div>
    );
  }

  const isMarked = marked.has(q.id);
  const mine = isExam ? (picked[q.id]?.[0] ?? null) : answer;
  const answeredNow = mode === "ueben" && answer !== null;
  const rightNow = answeredNow && isRight(q, [answer]);
  const trOn = showTr && !testing && !!q.tr;
  const trDir = lang === "ar" ? "rtl" : undefined;
  // Thanh tiến độ: học = đúng/sai lần gần nhất · xem lại = kết quả bài thi
  const okCount = submitted ? questions.filter((x) => isRight(x, picked[x.id])).length : questions.filter((x) => local[x.id]?.lastOk === true).length;
  const badCount = submitted ? questions.length - okCount : questions.filter((x) => local[x.id]?.lastOk === false).length;

  const confirmLeave = (e: MouseEvent<HTMLAnchorElement>) => {
    if (testing && answeredCount && !confirm("Thoát bài thi?\nCác câu trả lời hiện tại sẽ bị mất.")) e.preventDefault();
  };

  return (
    <div ref={scroller} className="flex scroll-mt-20 flex-col gap-4">
      {/* Đầu trang: [←]  tiêu đề  [giờ] [bản dịch] */}
      <div className="flex flex-wrap items-center gap-2">
        <Link href={backHref} onClick={confirmLeave} className="btn-icon" aria-label={isExam ? "Thoát" : "Quay lại"} title={isExam ? "Thoát" : "Quay lại"}>
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="page-title truncate">{title}</h1>
          {isExam && <p className="truncate text-sm text-muted">{testing ? `Thi thử · ${questions.length} câu` : "Xem lại bài thi"}</p>}
        </div>
        {testing && exam && <Timer minutes={exam.minutes} startedAt={startedAt} onEnd={submit} />}
        {!testing && (
          <button
            type="button"
            onClick={() => setShowTr(!showTr)}
            aria-pressed={showTr}
            aria-label={showTr ? "Ẩn bản dịch" : "Hiện bản dịch"}
            title="Hiện / ẩn bản dịch"
            className={`btn ${showTr ? "bg-accent/15" : ""}`}
          >
            <Languages className="size-4" /> <span className="hidden sm:inline">{showTr ? "Ẩn bản dịch" : "Hiện bản dịch"}</span>
          </button>
        )}
      </div>

      {!testing && <ProgressBar total={questions.length} ok={okCount} wrong={badCount} />}

      {!loggedIn && !isExam && <GuestTrialNote area="lid" quota={quota} extra="lưu tiến độ và đánh dấu câu" />}
      <GuestWall area="lid" quota={quota} backHref={backHref} exam={guestExam} />

      {/* Kết quả bài thi */}
      {submitted && result && (
        <section className={`card flex flex-col gap-1 ${result.passed ? "bg-accent/15" : "bg-red/15"}`} aria-live="polite">
          <p className="text-2xl font-extrabold">{result.passed ? "🎉 Bestanden — Đậu!" : "Nicht bestanden — Chưa đậu"}</p>
          <p className="font-bold">
            Đúng {result.correct}/{result.total} câu
            {exam ? ` · cần đúng ≥ ${result.total - exam.maxWrong} câu` : ""}
          </p>
          <p className="text-sm text-muted">
            Bấm số câu để xem lại từng câu: ✓ xanh = đáp án đúng, ✗ đỏ = chọn sai.
            {mode === "exam" && (
              <>
                {" "}
                {savedId ? (
                  <>
                    Đã lưu vào{" "}
                    <Link href="/leben-in-deutschland/thong-ke" className="font-bold underline">
                      lịch sử thi
                    </Link>
                    .
                  </>
                ) : saveError ? (
                  `Không lưu được: ${saveError}`
                ) : loggedIn ? (
                  "Đang lưu…"
                ) : (
                  "Đăng nhập để lưu lịch sử thi."
                )}
              </>
            )}
          </p>
        </section>
      )}

      {/* Khung câu hỏi */}
      <article className={`card flex min-h-[28rem] flex-col gap-4 sm:h-[36rem] sm:p-6 ${answeredNow && !rightNow ? "shake" : ""}`}>
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-muted">
          <span className="tabular-nums">
            Câu {idx + 1}/{questions.length}
          </span>
          {q.chapter && <span className="pill border border-ink/30 px-2 py-0.5">{q.chapter}</span>}
          <span className="flex-1" />
          {loggedIn && (
            <button type="button" onClick={toggleMark} aria-pressed={isMarked} className="btn-icon size-8" aria-label={isMarked ? "Bỏ đánh dấu" : "Đánh dấu câu này"} title="Đánh dấu">
              <Star className={`size-4 ${isMarked ? "fill-gold text-gold" : ""}`} />
            </button>
          )}
        </div>

        {/* Khung cố định: câu dài cuộn bên trong, không làm trang nhảy */}
        <div className="-mr-2 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-2 pb-1 [scrollbar-gutter:stable]">
          <div className="flex flex-col gap-1">
            <h2 className="section-title min-h-[2lh] whitespace-pre-line">{q.q}</h2>
            {trOn && q.tr?.q && (
              <p dir={trDir} className="border-l-4 border-accent/60 pl-2 text-accent-text italic whitespace-pre-line">
                {q.tr.q}
              </p>
            )}
          </div>

          {q.images.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {q.images.map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={src} src={src} alt="Hình minh hoạ câu hỏi" loading="lazy" className="max-h-80 w-auto max-w-full rounded-2xl border-2 border-ink bg-white object-contain" />
              ))}
            </div>
          )}

          {/* Đáp án: số thứ tự bên trái (như tab Lái xe) */}
          <ul className="flex flex-col gap-2" role="radiogroup" aria-label="Đáp án">
            {q.options.map((o, n) => {
              const on = mine === o.key;
              const correct = q.answer.includes(o.key);
              const reveal = mode === "lesen" || submitted || answeredNow;
              // Đọc: tích sẵn đáp án đúng · Học/Xem lại: tô đúng/sai
              const ticked = mode === "lesen" ? correct : on;
              const mistake = reveal && mode !== "lesen" && on && !correct;
              const tr = q.tr?.o[n];
              const tone = !reveal
                ? on
                  ? "border-ink bg-gold/30"
                  : "border-ink/30 enabled:hover:border-ink"
                : correct
                  ? "border-accent bg-accent/10"
                  : on
                    ? "border-red bg-red/10"
                    : "border-ink/20";
              const badge = ticked ? (reveal && correct ? "border-accent bg-accent text-white" : reveal ? "border-red bg-red text-white" : "bg-foreground text-background") : "bg-card";
              return (
                <li key={o.key}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={on || (mode === "lesen" && correct)}
                    disabled={submitted || mode === "lesen" || answeredNow}
                    onClick={() => choose(o.key)}
                    className={`relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border-2 p-3 text-left transition disabled:cursor-default ${tone}`}
                  >
                    {mistake && <span className="absolute inset-y-0 left-0 w-1.5 bg-red" aria-hidden />}
                    <span className={`flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-ink text-sm font-extrabold ${badge}`}>
                      {ticked ? <Check className="size-5" strokeWidth={3} /> : <span className="text-muted">{n + 1}</span>}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="font-bold">{o.text}</span>
                      {trOn && tr && tr !== o.text && (
                        <span dir={trDir} className="text-sm text-accent-text italic">
                          {tr}
                        </span>
                      )}
                    </span>
                    {reveal && mode !== "lesen" && (
                      <span className="shrink-0" aria-label={correct ? (on ? "Chọn đúng" : "Đáp án đúng") : on ? "Chọn sai" : undefined}>
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

          {answeredNow && (
            <p className={`rounded-2xl border-2 px-3 py-2 font-extrabold ${rightNow ? "border-accent bg-accent/15" : "border-red bg-red/15"}`} role="status">
              {rightNow ? "✓ Đúng rồi!" : "✗ Chưa đúng"}
            </p>
          )}
        </div>

        {/* Điều hướng: ‹ Trước · n / N (mở bảng chọn câu) · Tiếp › */}
        <div className="flex items-center gap-1.5">
          <button type="button" className="btn" onClick={() => go(idx - 1)} disabled={idx === 0}>
            <ChevronLeft className="size-4" /> <span className="hidden sm:inline">Trước</span>
          </button>
          <button type="button" onClick={() => setPicker(true)} className="btn min-w-0 flex-1" aria-haspopup="dialog">
            <span className="truncate tabular-nums">
              {idx + 1} / {questions.length}
              {testing ? ` · ${answeredCount} đã trả lời` : ""}
            </span>
          </button>
          <button type="button" className={`btn ${answeredNow || isExam ? "btn-primary" : ""}`} onClick={() => go(idx + 1)} disabled={idx === questions.length - 1}>
            <span className="hidden sm:inline">Tiếp</span> <ChevronRight className="size-4" />
          </button>
        </div>
      </article>

      {testing && (
        <div className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 p-3 text-sm ${answeredCount === questions.length ? "border-accent bg-accent/10" : "border-ink/20"}`}>
          <span className="font-bold">{answeredCount === questions.length ? "Đã làm hết các câu — có thể nộp bài." : `Đã làm ${answeredCount}/${questions.length} câu · làm hết mới nộp được`}</span>
          {answeredCount === questions.length && (
            <button type="button" className="btn btn-red" onClick={() => confirm("Nộp bài và xem kết quả?") && submit()}>
              Nộp bài
            </button>
          )}
        </div>
      )}

      <p className="hidden text-xs text-muted sm:block">Phím tắt: ← → chuyển câu · 1–4 chọn đáp án</p>

      {picker && (
        <QuestionPicker
          questions={questions}
          idx={idx}
          onPick={go}
          onClose={() => setPicker(false)}
          status={(x) => {
            if (testing) return picked[x.id]?.length ? "answered" : null;
            if (submitted) return isRight(x, picked[x.id]) ? "ok" : "bad";
            const s = local[x.id];
            return s ? (s.lastOk ? "ok" : "bad") : null;
          }}
          marked={marked}
        />
      )}
    </div>
  );
}

function BookmarkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-12 text-muted" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path d="M6 3h12v18l-6-4-6 4z" />
    </svg>
  );
}

/** Bảng chọn câu (điện thoại: trượt lên từ dưới như app; máy tính: hộp giữa màn): số câu + đầu câu hỏi */
function QuestionPicker({
  questions,
  idx,
  onPick,
  onClose,
  status,
  marked,
}: {
  questions: DrivingQ[];
  idx: number;
  onPick: (i: number) => void;
  onClose: () => void;
  status: (q: DrivingQ) => "ok" | "bad" | "answered" | null;
  marked: Set<string>;
}) {
  const current = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    current.current?.scrollIntoView({ block: "center" });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  const dot = { ok: "bg-accent", bad: "bg-red", answered: "bg-gold" };
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Chọn câu hỏi" onClick={(e) => e.stopPropagation()} className="flex max-h-[70dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border-2 border-ink bg-card text-foreground shadow-[0_4px_0_var(--ink)] sm:rounded-3xl">
        <div className="flex items-center justify-between border-b-2 border-ink/15 px-4 py-3 sm:px-6">
          <h2 className="section-title">Chọn câu hỏi</h2>
          <button type="button" onClick={onClose} aria-label="Đóng" className="btn-icon">
            <X className="size-5" />
          </button>
        </div>
        <ul className="overflow-y-auto">
          {questions.map((x, i) => {
            const on = i === idx;
            const s = status(x);
            return (
              <li key={x.id}>
                <button
                  ref={on ? current : undefined}
                  type="button"
                  onClick={() => onPick(i)}
                  className={`flex min-h-[60px] w-full items-center border-b border-ink/10 px-4 py-2 text-left transition sm:px-6 ${on ? "bg-gold/30" : "hover:bg-foreground/5"}`}
                >
                  <span className={`w-10 shrink-0 font-extrabold tabular-nums ${on ? "text-foreground" : "text-muted"}`}>{i + 1}</span>
                  <span className={`line-clamp-2 min-w-0 flex-1 text-sm ${on ? "font-bold" : ""}`}>{x.q}</span>
                  {marked.has(x.id) && <Star className="ml-2 size-3.5 shrink-0 fill-gold text-gold" aria-label="Đã đánh dấu" />}
                  {s && <span className={`ml-2 size-2.5 shrink-0 rounded-full ${dot[s]}`} aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
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
  const left = Math.max(0, Math.ceil((end - now) / 1000));
  useEffect(() => {
    if (left === 0 && !ended.current) {
      ended.current = true;
      onEnd();
    }
  }, [left, onEnd]);
  return (
    <span className={`pill gap-1 border-2 border-ink px-2.5 py-1 text-sm tabular-nums ${left < 300 ? "bg-red text-white" : "bg-card"}`} role="timer" aria-label="Thời gian còn lại">
      <Clock className="size-4" /> {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
    </span>
  );
}
