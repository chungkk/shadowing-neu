"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Clock, Flag, Languages, LayoutGrid, Lightbulb, RotateCw, Star, X } from "lucide-react";
import Mascot from "../Mascot";
import { clientApi } from "@/lib/client-api";
import { isRight, type DrivingQ, type ExamAnswer, type ExamResult, type Lang } from "@/lib/laixe/rules";
import type { QuizStat } from "@/lib/quiz/types";
import { sendAnswer, watchOutbox } from "@/lib/quiz/outbox";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { GuestTrialNote, GuestWall, useGuestCount, useGuestQuota } from "../games/GuestQuota";
import { ProgressBar } from "../quiz/QuizParts";
import { useConfirm } from "@/components/ConfirmDialog";
import { useExamLeaveGuard } from "@/hooks/useExamLeaveGuard";

/**
 * Màn câu hỏi Leben in Deutschland — cách chơi như app LiD, giao diện chung với tab Lái xe:
 * - ueben: học — bấm đáp án là chấm ngay (đúng viền xanh, sai viền đỏ + vạch đỏ), có giải thích nếu có
 * - lesen: đọc lướt — đáp án đúng tô sẵn
 * - exam: thi thử — đồng hồ đếm ngược, đổi đáp án tuỳ ý, nộp lúc nào cũng được. Đáp án KHÔNG có ở trình duyệt:
 *   server chấm khi nộp rồi chuyển sang trang xem lại bài (/thi-thu/[id])
 * - review: xem lại bài thi — đúng ✓ xanh, chọn sai ✗ đỏ
 *
 * Trang cha đặt `key` theo bộ câu (vd. ids của đề thi): Cache Components giữ trang đã rời bằng <Activity>,
 * key mới (đề mới) là cách duy nhất để không mang state cũ (đồng hồ, kết quả, vị trí câu) sang lượt mới.
 */
export type LidMode = "lesen" | "ueben" | "exam" | "review";
export type LidExam = { ref: string; cls: string; minutes: number; maxWrong: number };

type Props = {
  mode: LidMode;
  /** Chữ giữa thanh đầu (học) */
  title: string;
  backHref: string;
  questions: DrivingQ[];
  /** Người đang đăng nhập (undefined = khách): tiến độ gửi lên tài khoản này, dữ liệu trên máy tách theo người */
  userId?: number;
  lang?: Lang;
  stats?: Record<string, QuizStat>;
  bookmarks?: string[];
  exam?: LidExam;
  review?: { picked: Record<string, string[]>; result: ExamResult };
  /** Nhớ câu đang học để lần sau mở lại đúng chỗ (như app) */
  resumeKey?: string;
};

// Mặc định cố định (không tạo mảng / object mới mỗi lần render — dùng để so props đổi)
const NO_STATS: Record<string, QuizStat> = {};
const NO_MARKS: string[] = [];

export default function LidRunner({ mode, title, backHref, questions, userId, stats = NO_STATS, bookmarks = NO_MARKS, exam, review, resumeKey }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [ask, confirmDialog] = useConfirm();
  const [rawIdx, setIdx] = useState(0);
  // Danh sách câu có thể ngắn lại khi trang được tải lại (vd. Ôn câu sai sau khi làm đúng) → giữ vị trí trong khoảng
  const idx = Math.min(rawIdx, Math.max(0, questions.length - 1));
  // Học: như app, mỗi lần mở câu là làm lại từ đầu → chỉ giữ đáp án của câu đang xem
  const [answer, setAnswer] = useState<string | null>(null);
  // Thi / xem lại: đáp án của cả bài
  const [picked, setPicked] = useState<Record<string, string[]>>(review?.picked ?? {});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [abandoned, setAbandoned] = useState(false); // rời bài thi rồi quay lại → đang tạo đề mới
  const [marked, setMarked] = useState(() => new Set(bookmarks));
  const [local, setLocal] = useState(stats);
  // Server gửi số liệu mới (tải lại trang, đổi bang, xoá tiến độ…) → cập nhật state đang giữ
  const [prev, setPrev] = useState({ stats, bookmarks });
  if (prev.stats !== stats || prev.bookmarks !== bookmarks) {
    setPrev({ stats, bookmarks });
    setLocal(stats);
    setMarked(new Set(bookmarks));
  }
  const [picker, setPicker] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const loggedIn = userId !== undefined;
  // Vị trí học dở trên máy: mỗi tài khoản một khoá riêng (2 người dùng chung trình duyệt không lẫn chỗ học)
  const posKey = resumeKey ? `pos:${loggedIn ? `u${userId}:` : ""}${resumeKey}` : null;
  const [ready, setReady] = useState(!resumeKey); // đã đọc xong vị trí học dở (khách: chỉ đếm lượt sau bước này)
  const [showTr, setShowTr] = useLocalStorage<boolean>("lid:tr", true);
  const [autoMark] = useLocalStorage<boolean>("lid:auto-mark", true);
  const [vibrate] = useLocalStorage<boolean>("lid:vibrate", true);
  const top = useRef<HTMLDivElement>(null);
  const nav = useRef<HTMLDivElement>(null);
  const markQueue = useRef<Promise<unknown>>(Promise.resolve());
  const hiddenAt = useRef(0);

  const q = questions[idx];
  // Khách: học thử có giới hạn số câu mỗi ngày (thi thử cần tài khoản — trang thi không render màn này cho khách)
  const quota = useGuestQuota("lid", loggedIn);
  const blocked = useGuestCount(quota, q?.id, ready && (mode === "ueben" || mode === "lesen"));
  const isExam = mode === "exam" || mode === "review";
  const submitted = mode === "review";
  const testing = mode === "exam" && !abandoned;
  const answeredCount = questions.filter((x) => picked[x.id]?.length).length;
  const buzz = (p: number | number[]) => vibrate && navigator.vibrate?.(p);

  const go = useCallback(
    (i: number) => {
      setIdx(Math.max(0, Math.min(questions.length - 1, i)));
      setAnswer(null);
      setPicker(false);
      top.current?.scrollIntoView({ block: "nearest" });
    },
    [questions.length],
  );

  // Mở lại đúng câu đang học dở
  useEffect(() => {
    if (!posKey) return;
    try {
      const id = localStorage.getItem(posKey);
      const i = id ? questions.findIndex((x) => x.id === id) : -1;
      if (i > 0) setIdx(i); // eslint-disable-line react-hooks/set-state-in-effect -- localStorage chỉ đọc được sau khi hydrate
    } catch {}
    setReady(true);
  }, [posKey, questions]);
  useEffect(() => {
    if (!posKey || !ready || !questions[idx]) return;
    try {
      localStorage.setItem(posKey, questions[idx].id);
    } catch {}
  }, [posKey, ready, idx, questions]);

  // Gửi lại tiến độ còn chờ (lần trước mất mạng)
  useEffect(() => (userId !== undefined ? watchOutbox(userId) : undefined), [userId]);

  // Trang bị <Activity> ẩn (chuyển sang trang khác): đóng bảng chọn câu. Hiện lại sau khi đã rời bài thi → bỏ bài đó, lấy đề mới
  // (không thì đồng hồ chạy tiếp ngầm và tự nộp bài người học đã bỏ). >1 giây: bỏ qua lần chạy kép của StrictMode lúc mount.
  useLayoutEffect(() => {
    if (mode === "exam" && hiddenAt.current && Date.now() - hiddenAt.current > 1000) {
      setAbandoned(true); // trang hiện lại sau khi đã rời bài thi
      router.refresh();
    }
    hiddenAt.current = 0;
    return () => {
      hiddenAt.current = Date.now();
      setPicker(false);
    };
  }, [mode, router]);

  // Đang thi và đã làm câu nào: hỏi trước khi rời trang bằng link (thanh dưới, đầu trang, nút ←), nút Back trình duyệt
  // hay đóng / tải lại tab. Chưa làm câu nào → rời trang không cần hỏi
  const leave = useExamLeaveGuard(testing && answeredCount > 0, ask, backHref);

  // Đánh dấu: gửi lần lượt theo thứ tự bấm (bấm nhanh 2 lần không bị server nhận ngược thứ tự)
  const setMark = (id: string, on: boolean) => {
    setMarked((s) => {
      const n = new Set(s);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });
    const p = markQueue.current.then(() => clientApi("/quiz/bookmarks", { method: "POST", body: { module: "lid", qid: id, on } }));
    markQueue.current = p.catch(() => {});
    return p;
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
    if (!ok) buzz(300);
    setLocal((s) => ({ ...s, [q.id]: { correct: (s[q.id]?.correct ?? 0) + +ok, wrong: (s[q.id]?.wrong ?? 0) + +!ok, lastOk: ok } }));
    // Điện thoại: phản hồi + nút Tiếp nằm dưới thanh tab → cuộn lên cho thấy
    requestAnimationFrame(() => nav.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
    if (userId === undefined) return;
    sendAnswer(userId, "lid", { qid: q.id, picked: [key] });
    // Như app: sai tự đánh dấu, đúng tự bỏ đánh dấu
    if (autoMark && marked.has(q.id) === ok) setMark(q.id, !ok).catch(() => {});
  };

  // Nộp bài: server chấm (trình duyệt không có đáp án) → lưu lịch sử → mở trang xem lại bài
  const submit = useCallback(async () => {
    if (!exam || saving || abandoned) return;
    setSaving(true);
    setSaveError("");
    try {
      const answers: ExamAnswer[] = questions.map((x) => ({ qid: x.id, picked: picked[x.id] ?? [], order: x.order }));
      const d = await clientApi<{ id: number; result: ExamResult; results: { qid: string; ok: boolean }[] }>("/quiz/exams", {
        method: "POST",
        body: { module: "lid", kind: "random", ref: exam.ref, cls: exam.cls, durationS: (Date.now() - startedAt) / 1000, answers },
        keepalive: true,
      });
      if (!d.result.passed) buzz([0, 200, 100, 200]);
      // Tự đánh dấu câu làm sai / bỏ đánh dấu câu làm đúng — chỉ câu đã trả lời (câu bỏ trống không phải câu "khó")
      if (autoMark) await Promise.allSettled((d.results ?? []).filter((r) => marked.has(r.qid) === r.ok).map((r) => setMark(r.qid, !r.ok)));
      setAbandoned(true); // tắt cảnh báo rời trang trước khi chuyển trang
      leave(`/leben-in-deutschland/thi-thu/${d.id}`); // trang kết quả thay chỗ mục chặn Back
    } catch (e) {
      setSaveError((e as Error).message);
      setSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setMark/buzz chỉ đọc state hiện tại
  }, [exam, saving, abandoned, questions, picked, startedAt, autoMark, marked, leave]);

  // Phím tắt: ←/→ chuyển câu, 1–4 chọn đáp án (không chạy khi đang mở hộp thoại nào)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (picker || e.metaKey || e.ctrlKey || e.altKey || t?.closest("input, textarea, select, [contenteditable]") || document.querySelector('[aria-modal="true"]')) return;
      if (e.key === "ArrowRight") go(idx + 1);
      else if (e.key === "ArrowLeft") go(idx - 1);
      else if (/^[1-4]$/.test(e.key) && q?.options[Number(e.key) - 1]) choose(q.options[Number(e.key) - 1].key);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (abandoned && mode === "exam" && !saving) {
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
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Link href={backHref} className="btn-icon" aria-label="Quay lại">
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="page-title min-w-0 flex-1 truncate">{title}</h1>
        </div>
        <div className="card empty">
          <Mascot className="size-20" />
          <p className="text-base font-semibold text-foreground">
            {pathname.endsWith("danh-dau") ? "Chưa có câu hỏi nào được đánh dấu" : pathname.endsWith("cau-sai") ? "Không còn câu sai nào — giỏi lắm!" : "Không có câu hỏi"}
          </p>
          {pathname.endsWith("danh-dau") && (
            <p className="-mt-2 flex items-center gap-1.5">
              Bấm <Star className="size-4" aria-label="ngôi sao" /> ở câu hỏi để đánh dấu câu cần ôn.
            </p>
          )}
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
  const showExplain = !!q.explain && (answeredNow || mode === "lesen" || submitted);
  // Thanh tiến độ: học = đúng/sai lần gần nhất · xem lại = kết quả bài thi
  const okCount = submitted ? questions.filter((x) => isRight(x, picked[x.id])).length : questions.filter((x) => local[x.id]?.lastOk === true).length;
  const badCount = submitted ? questions.length - okCount : questions.filter((x) => local[x.id]?.lastOk === false).length;
  const left = questions.length - answeredCount;
  const result = review?.result;

  return (
    <div ref={top} className="flex scroll-mt-20 flex-col gap-4">
      {/* Đầu trang: [←]  tiêu đề  [giờ] [bản dịch] */}
      <div className="flex flex-wrap items-center gap-2">
        <Link href={backHref} className="btn-icon" aria-label={testing ? "Thoát bài thi" : "Quay lại"} title={testing ? "Thoát" : "Quay lại"}>
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="page-title truncate">{title}</h1>
          {isExam && <p className="truncate text-sm text-muted">{testing ? `${questions.length} câu · ${exam?.minutes ?? 60} phút` : "Xem lại bài thi"}</p>}
        </div>
        {testing && exam && <Timer minutes={exam.minutes} startedAt={startedAt} onEnd={submit} />}
        {!testing && (
          <button
            type="button"
            onClick={() => setShowTr(!showTr)}
            aria-pressed={showTr}
            aria-label={showTr ? "Ẩn bản dịch" : "Hiện bản dịch"}
            title="Hiện / ẩn bản dịch"
            className={`btn ${showTr ? "btn-soft" : "btn-ghost"}`}
          >
            <Languages className="size-4" /> <span className="hidden sm:inline">{showTr ? "Ẩn bản dịch" : "Hiện bản dịch"}</span>
          </button>
        )}
      </div>

      {!testing && <ProgressBar total={questions.length} ok={okCount} wrong={badCount} />}

      {!loggedIn && !isExam && <GuestTrialNote area="lid" quota={quota} extra="lưu tiến độ và đánh dấu câu" />}
      <GuestWall area="lid" quota={quota} backHref={backHref} />

      {/* Kết quả bài thi */}
      {submitted && result && (
        <section className="sticker hero flex flex-col gap-4 p-4 sm:p-6" style={{ ["--hero" as string]: result.passed ? "var(--ok)" : "var(--red)" }} aria-live="polite">
          <div className="flex items-center gap-4">
            <span className={`flex size-14 shrink-0 items-center justify-center rounded-xl text-white sm:size-16 ${result.passed ? "bg-ok" : "bg-red"}`} aria-hidden>
              {result.passed ? <Check className="size-8" strokeWidth={3} /> : <X className="size-8" strokeWidth={3} />}
            </span>
            <p className={`min-w-0 font-display text-2xl leading-tight font-extrabold tracking-[-0.02em] sm:text-3xl ${result.passed ? "text-ok-text" : "text-red-400"}`}>{result.passed ? "Bestanden — Đậu!" : "Nicht bestanden — Chưa đậu"}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="stat rounded-ui bg-card p-3">
              <span className="stat-value">
                {result.correct}
                <span className="text-base text-muted">/{result.total}</span>
              </span>
              <span className="stat-label">câu đúng</span>
            </div>
            {exam && (
              <div className="stat rounded-ui bg-card p-3">
                <span className="stat-value">≥ {result.total - exam.maxWrong}</span>
                <span className="stat-label">câu đúng để đậu</span>
              </div>
            )}
          </div>
          <div className="progress bg-card" aria-hidden>
            <div className={`progress-bar ${result.passed ? "bg-ok" : "bg-red"}`} style={{ width: `${result.total ? (result.correct / result.total) * 100 : 0}%` }} />
          </div>
          <p className="text-sm text-muted">Mở bảng chọn câu bên dưới để xem lại từng câu: viền xanh lá = đáp án đúng, viền đỏ = chọn sai.</p>
        </section>
      )}

      {/* Khung câu hỏi: cao theo nội dung (câu có hình vẫn thấy đủ 4 đáp án), nút điều hướng luôn ở đáy khung */}
      <article className={`card flex min-h-[26rem] flex-col gap-4 sm:p-6 ${answeredNow && !rightNow ? "shake" : ""}`}>
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-muted">
          {q.chapter && <span className="badge badge-muted">{q.chapter}</span>}
          <span className="flex-1" />
          {loggedIn && (
            <button type="button" onClick={toggleMark} aria-pressed={isMarked} className={`btn-icon size-11 ${isMarked ? "tint-gold" : ""}`} aria-label={isMarked ? "Bỏ đánh dấu" : "Đánh dấu câu này"} title="Đánh dấu">
              <Star className={`size-5 ${isMarked ? "fill-gold text-gold" : ""}`} />
            </button>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <h2 className="section-title whitespace-pre-line">{q.q}</h2>
          {trOn && q.tr?.q && <p className="quiz-tr">{q.tr.q}</p>}
        </div>

        {q.images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {q.images.map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt={`Hình của ${q.chapter.toLowerCase()} — xem các hình đánh số 1–4`} loading="lazy" className="max-h-64 w-auto max-w-full rounded-ui border border-line bg-white object-contain shadow-xs sm:max-h-72" />
            ))}
          </div>
        )}

        {/* Đáp án: số thứ tự bên trái (như tab Lái xe) */}
        <div className="flex flex-col gap-2" role="radiogroup" aria-label="Đáp án">
          {q.options.map((o, n) => {
            const on = mine === o.key;
            const correct = q.answer.includes(o.key);
            const reveal = mode === "lesen" || submitted || answeredNow;
            // Đọc: tích sẵn đáp án đúng · Học/Xem lại: tô đúng/sai
            const ticked = mode === "lesen" ? correct : on;
            const mistake = reveal && mode !== "lesen" && on && !correct;
            const tr = q.tr?.o[n];
            const state = !reveal ? (on ? "on" : undefined) : correct ? "correct" : on ? "wrong" : "idle";
            const tick = ticked ? (reveal && !correct ? "bad" : "on") : undefined;
            return (
              <button
                key={o.key}
                type="button"
                role="radio"
                aria-checked={on || (mode === "lesen" && correct)}
                disabled={submitted || mode === "lesen" || answeredNow}
                onClick={() => choose(o.key)}
                data-state={state}
                className="quiz-option"
              >
                <span className="quiz-mark rounded-full" data-tick={tick}>
                  {mistake ? <X className="size-5" strokeWidth={3} /> : ticked ? <Check className="size-5" strokeWidth={3} /> : <span>{n + 1}</span>}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-semibold">{o.text}</span>
                  {trOn && tr && tr !== o.text && <span className="text-sm font-normal text-muted">{tr}</span>}
                </span>
                {reveal && mode !== "lesen" && (correct || on) && (
                  <span className="shrink-0" aria-label={correct ? (on ? "Chọn đúng" : "Đáp án đúng") : "Chọn sai"}>
                    {correct ? (
                      <span className={`flex size-6 items-center justify-center rounded-full ${on ? "bg-ok text-white" : "border-2 border-ok bg-card text-ok-text"}`}>
                        <Check className="size-4" strokeWidth={3} />
                      </span>
                    ) : (
                      <span className="flex size-6 items-center justify-center rounded-full bg-red text-white">
                        <X className="size-4" strokeWidth={3} />
                      </span>
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {showExplain && (
          <p className="quiz-explain flex gap-2">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber" aria-hidden />
            <span>{q.explain}</span>
          </p>
        )}

        {/* Điều hướng: ‹ Trước · n / N (mở bảng chọn câu) · Tiếp › — phản hồi đúng/sai ngay trên, cuộn vào tầm nhìn sau khi trả lời */}
        <div
          ref={nav}
          className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 -mx-4 mt-auto flex scroll-mb-[calc(5rem+env(safe-area-inset-bottom))] flex-col gap-2 rounded-b-[var(--radius-lg)] border-t border-line bg-card px-4 py-3 sm:-mx-6 sm:px-6 md:static md:mx-0 md:scroll-mb-4 md:rounded-none md:border-t-0 md:bg-transparent md:px-0 md:pb-0 dark:border-border"
        >
          {answeredNow && (
            <p className="quiz-verdict" data-ok={rightNow} role="status">
              <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-white ${rightNow ? "bg-ok" : "bg-red"}`} aria-hidden>
                {rightNow ? <Check className="size-4" strokeWidth={3} /> : <X className="size-4" strokeWidth={3} />}
              </span>
              {rightNow ? "Đúng rồi!" : "Chưa đúng — đáp án đúng có viền xanh lá"}
            </p>
          )}
          <div className="flex items-center gap-2">
            <button type="button" className="btn min-h-12 min-w-12 px-3 md:min-h-11" onClick={() => go(idx - 1)} disabled={idx === 0} aria-label="Câu trước">
              <ChevronLeft className="size-5" /> <span className="hidden sm:inline">Trước</span>
            </button>
            <button type="button" onClick={() => setPicker(true)} className="btn min-h-12 min-w-0 flex-1 md:min-h-11" aria-haspopup="dialog" aria-label={`Câu ${idx + 1} trên ${questions.length} — mở bảng chọn câu`}>
              <LayoutGrid className="size-4 text-muted" aria-hidden />
              <span className="truncate tabular-nums">
                {idx + 1} / {questions.length}
                {testing ? ` · ${answeredCount} đã trả lời` : ""}
              </span>
            </button>
            <button type="button" className={`btn min-h-12 min-w-12 px-3 md:min-h-11 ${answeredNow || submitted ? "btn-primary" : ""}`} onClick={() => go(idx + 1)} disabled={idx === questions.length - 1} aria-label="Câu tiếp">
              <span className={answeredNow ? "" : "hidden sm:inline"}>Tiếp</span> <ChevronRight className="size-5" />
            </button>
          </div>
        </div>
      </article>

      {testing && (
        <div className={`alert flex-wrap items-center justify-between gap-2 ${saveError ? "alert-err" : left === 0 ? "alert-ok" : ""}`}>
          <span className="font-bold" aria-live="polite">
            {saveError ? `Chưa nộp được: ${saveError}` : left === 0 ? "Đã làm hết các câu — có thể nộp bài." : `Đã làm ${answeredCount}/${questions.length} câu`}
          </span>
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving}
            onClick={async () => {
              if (!saveError) {
                const yes = await ask(
                  left
                    ? { title: "Nộp bài?", text: `Còn ${left} câu chưa trả lời (tính là sai). Vẫn nộp bài?`, ok: "Nộp bài", cancel: "Làm tiếp", tone: "red", icon: <Flag className="size-5" /> }
                    : { title: "Nộp bài?", text: "Nộp bài và xem kết quả?", ok: "Nộp bài", cancel: "Làm tiếp", icon: <Flag className="size-5" /> },
                );
                if (!yes) return;
              }
              submit();
            }}
          >
            {saving ? "Đang nộp…" : saveError ? "Thử nộp lại" : "Nộp bài"}
          </button>
        </div>
      )}

      <p className="hidden text-xs text-muted sm:block">Phím tắt: ← → chuyển câu · 1–4 chọn đáp án</p>
      {confirmDialog}

      {picker && (
        <QuestionPicker
          questions={questions}
          idx={idx}
          onPick={go}
          onClose={() => setPicker(false)}
          testing={testing}
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

type Status = "ok" | "bad" | "answered" | null;
type Filter = "all" | "bad" | "todo" | "marked";

/** Bảng chọn câu (điện thoại: trượt lên từ dưới như app; máy tính: hộp giữa màn): số câu + đầu câu hỏi, lọc câu sai / chưa làm / đánh dấu */
function QuestionPicker({
  questions,
  idx,
  onPick,
  onClose,
  status,
  marked,
  testing,
}: {
  questions: DrivingQ[];
  idx: number;
  onPick: (i: number) => void;
  onClose: () => void;
  status: (q: DrivingQ) => Status;
  marked: Set<string>;
  testing: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const current = useRef<HTMLButtonElement>(null);
  const [filter, setFilter] = useState<Filter>("all");
  useDialogFocus(panel, true);
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
  const dot = { ok: "bg-ok", bad: "bg-red", answered: "bg-gold" };
  const filters: { key: Filter; label: string }[] = testing
    ? [
        { key: "all", label: "Tất cả" },
        { key: "todo", label: "Chưa trả lời" },
      ]
    : [
        { key: "all", label: "Tất cả" },
        { key: "bad", label: "Đang sai" },
        { key: "todo", label: "Chưa làm" },
        { key: "marked", label: "Đánh dấu" },
      ];
  const rows = questions
    .map((x, i) => ({ x, i, s: status(x) }))
    .filter(({ x, s }) => (filter === "all" ? true : filter === "bad" ? s === "bad" : filter === "todo" ? !s : marked.has(x.id)));
  return (
    <div className="dialog-backdrop z-[100]" onClick={onClose}>
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lid-picker-title"
        onClick={(e) => e.stopPropagation()}
        className="dialog dialog-lg max-h-[80dvh] gap-3 overflow-hidden outline-none"
      >
        <div className="dialog-head items-center">
          <h2 id="lid-picker-title" className="dialog-title">
            Chọn câu hỏi
          </h2>
          <button type="button" onClick={onClose} aria-label="Đóng" className="btn-icon">
            <X className="size-5" />
          </button>
        </div>
        <div className="scroll-row -mx-1 flex shrink-0 gap-1.5 px-1 pb-0.5" role="group" aria-label="Lọc câu">
          {filters.map((f) => (
            <button key={f.key} type="button" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)} className="chip">
              {f.label}
            </button>
          ))}
        </div>
        <ul className="-mx-2 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 sm:-mx-3 sm:px-3">
          {rows.length === 0 && <li className="empty py-6">Không có câu nào.</li>}
          {rows.map(({ x, i, s }) => {
            const on = i === idx;
            return (
              <li key={x.id}>
                <button
                  ref={on ? current : undefined}
                  type="button"
                  onClick={() => onPick(i)}
                  className={`flex min-h-[60px] w-full items-center gap-1 rounded-ui px-3 py-2 text-left transition-colors ${on ? "bg-accent-soft ring-1 ring-accent ring-inset" : "hover:bg-card-2"}`}
                >
                  <span className={`w-10 shrink-0 font-bold tabular-nums ${on ? "text-accent-text" : "text-muted"}`}>{i + 1}</span>
                  <span className={`line-clamp-2 min-w-0 flex-1 text-sm ${on ? "font-bold" : ""}`}>{x.q}</span>
                  {marked.has(x.id) && <Star className="ml-2 size-3.5 shrink-0 fill-gold text-gold" aria-label="Đã đánh dấu" />}
                  {s && <span className={`ml-2 size-2.5 shrink-0 rounded-full ${dot[s]}`} aria-label={s === "ok" ? "Đúng" : s === "bad" ? "Sai" : "Đã trả lời"} />}
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
  // Thông báo cho trình đọc màn hình ở mốc 5 phút và 1 phút (không đọc từng giây)
  const notice = left <= 60 ? "Còn 1 phút" : left <= 300 ? "Còn 5 phút" : "";
  return (
    <>
      <span className="quiz-timer" data-warn={left < 300} role="timer" aria-label="Thời gian còn lại">
        <Clock className="size-4" /> {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
      </span>
      <span className="sr-only" aria-live="assertive">
        {notice}
      </span>
    </>
  );
}
