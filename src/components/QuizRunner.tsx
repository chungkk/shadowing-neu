"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Clock, Languages, RotateCcw, X } from "lucide-react";
import { clientApi } from "@/lib/client-api";
import { isCorrect, type QuizQuestion, type QuizStat } from "@/lib/quiz-types";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { LoginLink } from "./LoginDialog";

type Module = "fuehrerschein" | "lid";

/** Luật đậu của đề thi thử */
export type ExamRule =
  | { kind: "errorPoints"; maxErrorPoints: number; minutes: number } // lái xe: tổng điểm lỗi ≤ N, không sai 2 câu 5 điểm
  | { kind: "correctCount"; pass: number; minutes: number }; // LiD: đúng ≥ N câu

type Props = {
  module: Module;
  title: string;
  backHref: string;
  questions: QuizQuestion[];
  loggedIn: boolean;
  stats?: Record<string, QuizStat>;
  /** Có = chế độ thi thử (làm hết rồi nộp bài, có giờ) */
  exam?: ExamRule;
  /** Lái xe: chọn được nhiều đáp án; LiD: chỉ 1 */
  multi?: boolean;
};

/** Lưu kết quả lên server (chỉ khi đã đăng nhập); lỗi mạng không chặn việc học */
function save(module: Module, answers: { qid: string; ok: boolean }[]) {
  for (let i = 0; i < answers.length; i += 100)
    clientApi("/quiz", { method: "POST", body: { module, answers: answers.slice(i, i + 100) }, keepalive: true }).catch(() => {});
}

export default function QuizRunner({ module, title, backHref, questions, loggedIn, stats = {}, exam, multi = false }: Props) {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({}); // luyện tập: câu đã bấm Kiểm tra
  const [submitted, setSubmitted] = useState(false); // thi thử: đã nộp bài
  const [vi, setVi] = useLocalStorage<boolean>("quiz:vi", true);
  const [local, setLocal] = useState(stats); // thống kê cập nhật ngay khi trả lời
  const top = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const q = questions[idx];
  const mine = picked[q?.id] ?? [];
  const reveal = exam ? submitted : !!checked[q?.id];

  const go = (i: number) => {
    setIdx(Math.max(0, Math.min(questions.length - 1, i)));
    top.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  const toggle = (key: string) => {
    if (reveal) return;
    setPicked((p) => {
      const cur = p[q.id] ?? [];
      const next = multi ? (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]) : [key];
      return { ...p, [q.id]: next };
    });
  };

  const check = () => {
    const ok = isCorrect(q, mine);
    setChecked((c) => ({ ...c, [q.id]: true }));
    setLocal((s) => ({ ...s, [q.id]: { correct: (s[q.id]?.correct ?? 0) + +ok, wrong: (s[q.id]?.wrong ?? 0) + +!ok, lastOk: ok } }));
    if (loggedIn) save(module, [{ qid: q.id, ok }]);
  };

  const submit = () => {
    setSubmitted(true);
    setIdx(0);
    // Chỉ ghi câu đã làm: câu bỏ trống (hết giờ, nộp sớm) không tính là câu sai cần ôn
    const done = questions.filter((x) => picked[x.id]?.length);
    if (loggedIn && done.length) save(module, done.map((x) => ({ qid: x.id, ok: isCorrect(x, picked[x.id]) })));
    top.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  const result = useMemo(() => (exam && submitted ? grade(questions, picked, exam) : null), [exam, submitted, questions, picked]);

  if (!q) {
    return (
      <div className="sticker flex flex-col items-center gap-3 p-6 text-center">
        <p className="font-bold">Không còn câu nào ở đây.</p>
        <Link href={backHref} className="btn">
          <ArrowLeft className="size-4" /> Quay lại
        </Link>
      </div>
    );
  }

  const status = (x: QuizQuestion) => {
    if (exam) {
      if (!submitted) return picked[x.id]?.length ? "answered" : "empty";
      return isCorrect(x, picked[x.id] ?? []) ? "ok" : "bad";
    }
    if (checked[x.id]) return isCorrect(x, picked[x.id] ?? []) ? "ok" : "bad";
    const s = local[x.id];
    return s ? (s.lastOk ? "ok-old" : "bad-old") : "empty";
  };

  const answeredCount = questions.filter((x) => picked[x.id]?.length).length;

  return (
    <div ref={top} className="flex scroll-mt-20 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={backHref} className="btn-icon" aria-label="Quay lại">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="min-w-0 flex-1 text-xl font-extrabold">{title}</h1>
        {exam && !submitted && <Timer minutes={exam.minutes} onEnd={submit} />}
        <button type="button" onClick={() => setVi(!vi)} aria-pressed={vi} className={`btn px-3 py-1.5 ${vi ? "bg-accent/15" : ""}`}>
          <Languages className="size-4" /> {vi ? "Ẩn tiếng Việt" : "Hiện tiếng Việt"}
        </button>
      </div>

      {!loggedIn && (
        <p className="rounded-2xl border-2 border-dashed border-ink/40 px-3 py-2 text-sm">
          Bạn đang học thử.{" "}
          <LoginLink href={`/login?next=${encodeURIComponent(pathname)}`} className="font-extrabold text-accent-text underline">
            Đăng nhập
          </LoginLink>{" "}
          để lưu tiến độ và ôn lại câu sai.
        </p>
      )}

      {result && <ExamResult result={result} exam={exam!} />}

      {/* Bảng số câu: bấm để nhảy tới */}
      <nav aria-label="Danh sách câu" className="flex flex-wrap gap-1.5">
        {questions.map((x, i) => {
          const s = status(x);
          return (
            <button
              key={x.id}
              type="button"
              onClick={() => go(i)}
              aria-current={i === idx ? "true" : undefined}
              aria-label={`Câu ${i + 1}`}
              className={`flex size-8 items-center justify-center rounded-lg border-2 text-xs font-extrabold tabular-nums transition ${
                i === idx ? "border-ink ring-2 ring-gold" : "border-ink/30"
              } ${
                s === "ok" ? "bg-accent text-white" : s === "bad" ? "bg-red text-white" : s === "ok-old" ? "bg-accent/20" : s === "bad-old" ? "bg-red/20" : s === "answered" ? "bg-gold/60 text-black" : "bg-card"
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </nav>

      <article className="sticker flex flex-col gap-4 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-2 text-xs font-bold text-muted">
          <span>
            Câu {idx + 1}/{questions.length}
            {q.label ? ` · ${q.label}` : ""}
          </span>
          {multi && q.options.length > 0 && <span>Có thể có nhiều đáp án đúng</span>}
        </div>

        <div className="flex flex-col gap-1">
          <h2 className="text-lg leading-snug font-extrabold">{q.q}</h2>
          {vi && q.qVi && <p className="text-muted">{q.qVi}</p>}
        </div>

        <Media q={q} />

        {q.options.length ? (
          <ul className="flex flex-col gap-2">
            {q.options.map((o, i) => {
              const on = mine.includes(o.key);
              const right = q.answer.includes(o.key);
              const imageOption = !o.text && q.images?.length === q.options.length ? q.images[i] : null;
              const tone = reveal ? (right ? "border-accent bg-accent/15" : on ? "border-red bg-red/15" : "border-ink/30") : on ? "border-ink bg-gold/30" : "border-ink/30 hover:border-ink";
              return (
                <li key={o.key}>
                  <button
                    type="button"
                    role={multi ? "checkbox" : "radio"}
                    aria-checked={on}
                    disabled={reveal}
                    onClick={() => toggle(o.key)}
                    className={`flex w-full items-start gap-3 rounded-2xl border-2 p-3 text-left transition disabled:cursor-default ${tone}`}
                  >
                    <span
                      className={`mt-0.5 flex size-6 shrink-0 items-center justify-center border-2 border-ink text-xs font-extrabold ${multi ? "rounded-md" : "rounded-full"} ${on ? "bg-ink text-card" : "bg-card"}`}
                    >
                      {reveal && right ? <Check className="size-4" /> : reveal && on ? <X className="size-4" /> : module === "lid" ? "ABCD"[i] : o.key}
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      {imageOption ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={imageOption} alt={`Lựa chọn ${o.key}`} className="max-h-28 w-auto rounded-lg bg-white" loading="lazy" />
                      ) : (
                        <span className="font-bold">{o.text}</span>
                      )}
                      {vi && o.textVi && o.textVi !== o.text && <span className="text-sm text-muted">{o.textVi}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <NumberAnswer
            value={mine[0] ?? ""}
            disabled={reveal}
            onChange={(v) => setPicked((p) => ({ ...p, [q.id]: v ? [v] : [] }))}
            correct={reveal ? q.answer[0] : null}
          />
        )}

        {reveal && (
          <div className={`rounded-2xl border-2 p-3 ${isCorrect(q, mine) ? "border-accent bg-accent/10" : "border-red bg-red/10"}`}>
            <p className="font-extrabold">{isCorrect(q, mine) ? "Đúng rồi!" : mine.length ? "Chưa đúng" : "Chưa trả lời"}</p>
            {(q.explain || q.explainVi) && (
              <details className="mt-1 text-sm" open={!isCorrect(q, mine)}>
                <summary className="cursor-pointer font-bold">Giải thích</summary>
                {q.explain && <p className="mt-1">{q.explain}</p>}
                {vi && q.explainVi && <p className="mt-1 text-muted">{q.explainVi}</p>}
              </details>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn" onClick={() => go(idx - 1)} disabled={idx === 0}>
            <ArrowLeft className="size-4" /> Trước
          </button>
          <div className="flex-1" />
          {!exam && !reveal && (
            <button type="button" className="btn btn-primary" onClick={check} disabled={!mine.length}>
              Kiểm tra
            </button>
          )}
          {!exam && reveal && (
            <button
              type="button"
              className="btn"
              onClick={() => {
                const drop = <T,>(o: Record<string, T>) => Object.fromEntries(Object.entries(o).filter(([k]) => k !== q.id));
                setChecked(drop);
                setPicked(drop);
              }}
            >
              <RotateCcw className="size-4" /> Làm lại
            </button>
          )}
          {exam && !submitted && idx === questions.length - 1 ? (
            <button type="button" className="btn btn-amber" onClick={() => (answeredCount < questions.length && !confirm(`Còn ${questions.length - answeredCount} câu chưa làm. Nộp bài?`) ? null : submit())}>
              Nộp bài
            </button>
          ) : (
            <button type="button" className={`btn ${reveal || exam ? "btn-primary" : ""}`} onClick={() => go(idx + 1)} disabled={idx === questions.length - 1}>
              Tiếp <ArrowRight className="size-4" />
            </button>
          )}
        </div>
      </article>

      {exam && !submitted && (
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted">
            Đã làm {answeredCount}/{questions.length} câu
          </span>
          <button type="button" className="btn btn-amber" onClick={() => (answeredCount < questions.length && !confirm(`Còn ${questions.length - answeredCount} câu chưa làm. Nộp bài?`) ? null : submit())}>
            Nộp bài
          </button>
        </div>
      )}
    </div>
  );
}

function Media({ q }: { q: QuizQuestion }) {
  if (q.video) {
    return (
      <video src={q.video} controls playsInline preload="metadata" className="w-full max-w-xl rounded-2xl border-2 border-ink bg-black">
        Trình duyệt không phát được video.
      </video>
    );
  }
  // 3 ảnh = 3 lựa chọn bằng hình → hiện trong từng lựa chọn, không hiện ở đây
  const imgs = q.images?.length && !(q.images.length === q.options.length && q.options.every((o) => !o.text)) ? q.images : [];
  if (!imgs.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {imgs.map((src) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={src} src={src} alt="Hình minh hoạ câu hỏi" loading="lazy" className="max-h-72 w-auto max-w-full rounded-2xl border-2 border-ink bg-white object-contain" />
      ))}
    </div>
  );
}

function NumberAnswer({ value, disabled, onChange, correct }: { value: string; disabled: boolean; onChange: (v: string) => void; correct: string | null }) {
  return (
    <label className="flex flex-wrap items-center gap-2 font-bold">
      Đáp án:
      <input
        inputMode="decimal"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ""))}
        className="w-28 rounded-xl border-2 border-ink bg-card px-3 py-2 text-base tabular-nums"
        placeholder="Số"
      />
      {correct !== null && <span className="text-sm text-muted">Đáp án đúng: {correct}</span>}
    </label>
  );
}

function Timer({ minutes, onEnd }: { minutes: number; onEnd: () => void }) {
  const [end] = useState(() => Date.now() + minutes * 60_000);
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
    <span className={`pill gap-1 border-2 border-ink px-2.5 py-1 text-sm tabular-nums ${left < 5 * 60_000 ? "bg-red text-white" : "bg-card"}`} role="timer">
      <Clock className="size-4" /> {mm}:{String(ss).padStart(2, "0")}
    </span>
  );
}

type Result = { correct: number; total: number; errorPoints: number; fiveWrong: number; passed: boolean };

function grade(questions: QuizQuestion[], picked: Record<string, string[]>, exam: ExamRule): Result {
  let correct = 0;
  let errorPoints = 0;
  let fiveWrong = 0;
  for (const q of questions) {
    if (isCorrect(q, picked[q.id] ?? [])) correct++;
    else {
      errorPoints += q.points ?? 0;
      if (q.points === 5) fiveWrong++;
    }
  }
  const passed = exam.kind === "correctCount" ? correct >= exam.pass : errorPoints <= exam.maxErrorPoints && fiveWrong < 2;
  return { correct, total: questions.length, errorPoints, fiveWrong, passed };
}

function ExamResult({ result, exam }: { result: Result; exam: ExamRule }) {
  return (
    <section className={`sticker flex flex-col gap-1 p-4 ${result.passed ? "bg-accent/15" : "bg-red/15"}`} aria-live="polite">
      <p className="text-2xl font-extrabold">{result.passed ? "🎉 Đậu!" : "Chưa đậu"}</p>
      <p className="font-bold">
        Đúng {result.correct}/{result.total} câu
        {exam.kind === "errorPoints" && (
          <>
            {" "}
            · {result.errorPoints} điểm lỗi (tối đa {exam.maxErrorPoints}){result.fiveWrong >= 2 ? " · sai 2 câu 5 điểm" : ""}
          </>
        )}
        {exam.kind === "correctCount" && <> · cần đúng {exam.pass} câu</>}
      </p>
      <p className="text-sm text-muted">Bấm vào số câu bên dưới để xem lại từng câu và giải thích.</p>
    </section>
  );
}
