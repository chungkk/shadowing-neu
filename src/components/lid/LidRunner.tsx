"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckCircle2, Languages, X, XCircle } from "lucide-react";
import { clientApi } from "@/lib/client-api";
import { grade, isRight, type DrivingQ, type ExamAnswer, type ExamResult, type Lang } from "@/lib/fuehrerschein-rules";
import type { QuizStat } from "@/lib/quiz-types";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { LoginLink } from "../LoginDialog";
import { pill } from "./LidParts";

/**
 * Màn câu hỏi Leben in Deutschland — giống hệt app LiD Ckk:
 * - ueben: học — bấm đáp án là chấm ngay (đúng viền xanh, sai viền đỏ + khung câu hỏi đỏ)
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
    if (!q || submitted || mode === "lesen") return;
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
          <Link href={backHref} className={pill}>
            Quay lại
          </Link>
          <h1 className="min-w-0 flex-1 truncate text-center">{title}</h1>
          <span className="w-20 shrink-0" aria-hidden />
        </div>
        <div className="flex flex-col items-center gap-4 py-24 text-center text-lg text-[#666]">
          <BookmarkIcon />
          {mode === "ueben" && pathname.endsWith("danh-dau") ? "Chưa có câu hỏi nào được đánh dấu" : "Không có câu hỏi"}
        </div>
      </div>
    );
  }

  const isMarked = marked.has(q.id);
  const mine = isExam ? (picked[q.id]?.[0] ?? null) : answer;
  const wrongNow = mode === "ueben" && answer !== null && !isRight(q, [answer]);
  const trOn = showTr && !testing && !!q.tr;
  const trDir = lang === "ar" ? "rtl" : undefined;
  const passed = result?.passed;

  const confirmLeave = (e: MouseEvent<HTMLAnchorElement>) => {
    if (testing && answeredCount && !confirm("Thoát bài thi?\nCác câu trả lời hiện tại sẽ bị mất.")) e.preventDefault();
  };

  return (
    <div ref={scroller} className="lid-runner flex min-h-[calc(100dvh-7rem)] scroll-mt-20 flex-col">
      {/* Thanh đầu: [Quay lại/Thoát]  tiêu đề · giờ · điểm  [Đánh dấu] [文A] */}
      <div className="sticky top-0 z-10 -mx-4 flex items-center gap-2 bg-background/95 px-4 py-2 backdrop-blur md:-mx-6 md:px-6">
        <Link href={backHref} onClick={confirmLeave} className={pill}>
          {isExam ? "Thoát" : "Quay lại"}
        </Link>
        <div className="min-w-0 flex-1 truncate text-center text-base">
          {submitted && result ? (
            <span className={`font-bold ${passed ? "text-[#10b981]" : "text-[#ef4444]"}`}>
              {result.correct}/{result.total} · {passed ? "Đỗ" : "Trượt"}
            </span>
          ) : testing && exam ? (
            <Timer minutes={exam.minutes} startedAt={startedAt} onEnd={submit} />
          ) : (
            title
          )}
        </div>
        {loggedIn && (
          <button type="button" onClick={toggleMark} aria-pressed={isMarked} className={pill}>
            {isMarked ? "Bỏ đánh dấu" : "Đánh dấu"}
          </button>
        )}
        {!testing && (
          <button
            type="button"
            onClick={() => setShowTr(!showTr)}
            aria-pressed={showTr}
            aria-label={showTr ? "Ẩn bản dịch" : "Hiện bản dịch"}
            title="Bản dịch"
            className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-white/10"
          >
            <Languages className={`size-6 ${showTr ? "text-[#ffcc00]" : "text-[#007aff]"}`} />
          </button>
        )}
      </div>

      {!loggedIn && !submitted && (
        <p className="mt-1 text-center text-xs text-white/45">
          Đang học thử ·{" "}
          <LoginLink href={`/login?next=${encodeURIComponent(pathname)}`} className="font-bold text-white underline">
            Đăng nhập
          </LoginLink>{" "}
          để lưu tiến độ và đánh dấu câu
        </p>
      )}

      {submitted && mode === "exam" && (
        <p className="mt-2 text-center text-xs text-white/45" aria-live="polite">
          {savedId ? (
            <>
              Đã lưu vào{" "}
              <Link href="/leben-in-deutschland/thong-ke" className="font-bold text-white underline">
                lịch sử thi
              </Link>
            </>
          ) : saveError ? (
            `Không lưu được: ${saveError}`
          ) : loggedIn ? (
            "Đang lưu…"
          ) : (
            "Đăng nhập để lưu lịch sử thi"
          )}
        </p>
      )}

      {/* Khung câu hỏi */}
      <div className="flex-1 pb-4">
        <div
          className={`mt-4 rounded-lg p-6 ${
            wrongNow ? "border-2 border-[#ef4444] bg-[#ef4444]/30" : isMarked && !isExam ? "border-2 border-[#f59e0b] bg-[#f59e0b]/15" : "bg-[#333]"
          }`}
        >
          <p className="leading-[22px] whitespace-pre-line">{q.q}</p>
          {trOn && q.tr?.q && (
            <p dir={trDir} className="mt-2 text-sm leading-[18px] text-[#999] italic whitespace-pre-line">
              {q.tr.q}
            </p>
          )}
          {q.images.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt="Hình minh hoạ câu hỏi" className="mt-4 max-h-[200px] w-full rounded object-contain sm:max-h-72" />
          ))}
        </div>

        {/* Đáp án: nút tròn bên trái */}
        <ul className="mt-4 flex flex-col gap-2" role="radiogroup" aria-label="Đáp án">
          {q.options.map((o, n) => {
            const on = mine === o.key;
            const correct = q.answer.includes(o.key);
            const reveal = mode === "lesen" || submitted || (mode === "ueben" && answer !== null);
            const showOk = reveal && correct;
            const showBad = reveal && on && !correct;
            const tr = q.tr?.o[n];
            const border = showBad
              ? "border-[#ef4444] bg-[#ef4444]/10"
              : showOk
                ? "border-[#10b981] bg-[#10b981]/10"
                : on
                  ? testing
                    ? "border-[#ffcc00] bg-[#ffcc00]/10"
                    : "border-[#666]"
                  : "border-transparent";
            const dot = testing ? "#ffcc00" : "#ffffff";
            return (
              <li key={o.key}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={on || (mode === "lesen" && correct)}
                  disabled={submitted || mode === "lesen" || (mode === "ueben" && answer !== null)}
                  onClick={() => choose(o.key)}
                  className={`flex w-full items-center rounded-lg border-2 bg-[#1a1a1a] px-4 py-6 text-left transition enabled:hover:bg-[#222] disabled:cursor-default ${border}`}
                >
                  <span className="mr-4 flex size-6 shrink-0 items-center justify-center rounded-full border-2" style={{ borderColor: on ? dot : "#666" }}>
                    {on && <span className="size-3 rounded-full" style={{ backgroundColor: dot }} />}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm leading-5">{o.text}</span>
                    {trOn && tr && tr !== o.text && (
                      <span dir={trDir} className="mt-0.5 text-xs leading-4 text-[#999]">
                        {tr}
                      </span>
                    )}
                  </span>
                  {isExam && submitted && showOk && <CheckCircle2 className="ml-2 size-6 shrink-0 text-[#10b981]" aria-label="Đáp án đúng" />}
                  {isExam && submitted && showBad && <XCircle className="ml-2 size-6 shrink-0 text-[#ef4444]" aria-label="Chọn sai" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Chân: ‹trước · n của N · sau› (thi: làm hết thì giữa thành nút Nộp bài đỏ) */}
      <div className="sticky bottom-0 -mx-4 flex items-center gap-2 bg-background px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] md:-mx-6 md:px-6">
        <button type="button" className={`${pill} min-w-[70px] py-3 text-base`} onClick={() => go(idx - 1)} disabled={idx === 0}>
          ‹trước
        </button>
        {testing && answeredCount === questions.length ? (
          <button
            type="button"
            onClick={() => confirm("Nộp bài và xem kết quả?") && submit()}
            className="flex-1 rounded-full bg-[#dd0000] px-4 py-3 text-base font-semibold text-white transition hover:brightness-110"
          >
            Nộp bài
          </button>
        ) : (
          <button type="button" onClick={() => setPicker(true)} className={`${pill} min-w-0 flex-1 py-3 ${testing ? "text-sm" : "text-base"}`} aria-haspopup="dialog">
            <span className="truncate tabular-nums">
              {isExam
                ? `${idx + 1} / ${questions.length}${testing ? ` (${answeredCount} đã trả lời)` : ""}`
                : `${idx + 1} của ${questions.length}`}
            </span>
          </button>
        )}
        <button type="button" className={`${pill} min-w-[70px] py-3 text-base`} onClick={() => go(idx + 1)} disabled={idx === questions.length - 1}>
          sau›
        </button>
      </div>

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
    <svg viewBox="0 0 24 24" className="size-16" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path d="M6 3h12v18l-6-4-6 4z" />
    </svg>
  );
}

/** Bảng chọn câu trượt lên từ dưới (như app): số câu + đầu câu hỏi */
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
  const dot = { ok: "bg-[#10b981]", bad: "bg-[#ef4444]", answered: "bg-[#ffcc00]" };
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Chọn câu hỏi" onClick={(e) => e.stopPropagation()} className="flex max-h-[70dvh] w-full max-w-2xl flex-col rounded-t-[20px] bg-[#1a1a1a] text-white">
        <div className="flex items-center justify-between border-b border-[#333] p-6">
          <h2 className="text-lg font-semibold">Chọn câu hỏi</h2>
          <button type="button" onClick={onClose} aria-label="Đóng">
            <X className="size-6" />
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
                  className={`flex h-[60px] w-full items-center border-b border-[#333] px-6 text-left ${on ? "bg-[#007aff]/20" : "hover:bg-white/5"}`}
                >
                  <span className={`w-10 shrink-0 font-semibold tabular-nums ${on ? "text-[#007aff]" : "text-[#666]"}`}>{i + 1}</span>
                  <span className={`line-clamp-2 min-w-0 flex-1 text-sm ${on ? "text-[#007aff]" : ""}`}>{x.q}</span>
                  {marked.has(x.id) && <span className="ml-2 text-xs text-[#f59e0b]" aria-label="Đã đánh dấu">★</span>}
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
    <span role="timer" aria-label="Thời gian còn lại" className={`tabular-nums ${left < 300 ? "text-[#ef4444]" : ""}`}>
      {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
    </span>
  );
}
