"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ChevronRight, Eye, RotateCcw } from "lucide-react";
import { checkSlots, hintFor, isOpenWord, nextOpenSlot, POINTS_HINT, slotForTyped, slotsFromInput, splitWords, type DictationLevel, type WordState } from "@/lib/dictation";
import { emitPoints } from "@/lib/points";
import Mascot from "./Mascot";
import { Gem } from "./PointsBadge";

/** Ô từ như sticker: ô trống viền đứt chờ dán, từ đúng là sticker đã dán (viền đậm, bóng cứng, hơi nghiêng) */
const BOX: Record<WordState | "hint", string> = {
  correct: "border-ink bg-accent/20 text-foreground shadow-[0_2px_0_var(--ink)]",
  close: "border-amber bg-amber/10 text-amber",
  wrong: "border-red bg-red/10 text-red-400",
  missing: "border-dashed border-red/60 bg-card text-muted",
  revealed: "border-amber/60 bg-amber/5 text-amber",
  given: "border-ink/40 bg-card-2 text-foreground",
  hint: "border-dashed border-ink/30 bg-card text-muted",
};
const TILT = ["-1.5deg", "1deg", "-0.5deg", "1.5deg"];
const PRAISE = ["Tuyệt vời!", "Chính xác!", "Giỏi lắm!", "Xuất sắc!", "Quá chuẩn!"];
const SPARK_COLORS = ["var(--red)", "var(--gold)", "var(--accent)", "var(--gem)"];
const SPARKS = Array.from({ length: 12 }, (_, k) => ({ a: `${k * 30}deg`, d: `${k % 2 ? 26 : 38}px`, c: SPARK_COLORS[k % 4] }));

const HOP: Keyframe[] = [{ transform: "none" }, { transform: "translateY(-7px) rotate(-5deg)" }, { transform: "none" }];
const JUMP: Keyframe[] = [{ transform: "none" }, { transform: "translateY(-16px) scale(1.15) rotate(-8deg)" }, { transform: "translateY(-4px) rotate(6deg)" }, { transform: "none" }];
const NOPE: Keyframe[] = [{ transform: "none" }, { transform: "rotate(-9deg)" }, { transform: "rotate(8deg)" }, { transform: "rotate(-4deg)" }, { transform: "none" }];

/** Bản nháp 1 câu: chữ đã gõ + các từ đã bấm xem — giữ lại khi chuyển sang câu khác rồi quay về */
export type DictDraft = { input: string; revealed: number[] };

/**
 * Nghe chép chính tả 1 câu. Mỗi từ là 1 ô, gõ thẳng vào ô đang chọn (ô nhập thật ẩn đi); gõ đúng thì tự nhảy ô — không cần dấu cách,
 * Space chỉ phát / dừng video. Từ sai thì bấm ô khác hoặc ← → để đổi ô, ↑ ↓ để đổi câu; bấm "Kiểm tra" để xem từ sai / thiếu.
 * Remount theo câu (key); dựng lại từ `draft` (nháp lần trước) hoặc `saved` (câu đã làm xong → hiện đủ câu + điểm).
 * Câu đã xong: bấm vào từ để tra nghĩa (`onWord`), có bản dịch câu nếu đang bật dịch.
 * `onEarn` gọi mỗi lần gõ, trả về số điểm vừa được (+1 mỗi từ đúng mới) → huy hiệu điểm trên thanh trên cùng hiện "+N".
 * Linh vật học cùng: bong bóng thoại báo tiến độ, gõ đúng 1 từ thì nhảy, kiểm tra còn sai thì lắc đầu, vừa xong câu thì bật cao + các ô từ nảy.
 * `onHint(n)`: vừa bấm xem n từ (mỗi từ −2 điểm) — chỉ truyền khi có tài khoản (được tính điểm).
 */
export default function DictationPanel({
  text,
  level,
  onReplay,
  onTogglePlay,
  onNext,
  onPrevSentence,
  onNextSentence,
  onDone,
  hasNext,
  draft,
  saved,
  onDraft,
  onHint,
  onEarn,
  onWord,
  translation,
}: {
  text: string;
  level: DictationLevel;
  onReplay: () => void;
  onTogglePlay: () => void; // Space khi đang gõ: phát / dừng video
  onNext: () => void;
  onPrevSentence: () => void; // ↑ khi đang gõ: sang câu trước
  onNextSentence: () => void; // ↓ khi đang gõ: sang câu sau
  onDone: (correct: number, total: number) => void;
  onEarn?: (correct: number, total: number, input: string, revealed: number[]) => number; // input, revealed: câu đang chép + các từ đã xem, server chấm lại
  hasNext: boolean;
  draft?: DictDraft;
  saved?: { correct: number; total: number };
  onDraft: (d: DictDraft | null) => void;
  onHint?: (n: number) => void; // vừa bấm xem n từ → trừ điểm
  onWord?: (word: string) => void; // câu đã xong: bấm vào từ → bảng tra từ
  translation?: string; // bản dịch câu (chỉ hiện khi đã xong)
}) {
  const refWords = useMemo(() => splitWords(text), [text]);
  const [slots, setSlots] = useState(() => (draft ? slotsFromInput(text, draft.input) : saved ? refWords : refWords.map(() => "")));
  const [revealed, setRevealed] = useState<Set<number>>(() => new Set(draft?.revealed ?? []));
  const result = useMemo(() => checkSlots(text, slots, revealed), [text, slots, revealed]);
  const [checked, setChecked] = useState(() => !!saved || (!!draft && result.done));
  const [active, setActive] = useState(() => nextOpenSlot(result.words, result.words.length - 1)); // ô đang gõ
  const [reported, setReported] = useState(!!saved);
  const [score, setScore] = useState(saved); // điểm lần làm này, hoặc điểm đã lưu
  const [gained, setGained] = useState(0); // điểm vừa được ở câu này → chữ báo điểm
  const [won, setWon] = useState(false); // vừa làm xong câu ngay lúc này (mở lại câu đã xong thì không ăn mừng lại)
  const [stuck, setStuck] = useState(-1); // ô vừa gõ đúng → hiệu ứng dán sticker
  const mascotRef = useRef<HTMLSpanElement>(null);
  const react = (frames: Keyframe[], duration: number) => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    mascotRef.current?.animate(frames, { duration, easing: "cubic-bezier(0.3, 1.4, 0.5, 1)" });
  };
  // Mở câu → con trỏ vào ô gõ luôn, nhưng không cuộn trang (autoFocus kéo cả trang tới ô gõ, các phần khác nhảy theo)
  const inputRef = useRef<HTMLInputElement>(null);
  const focusInput = () => inputRef.current?.focus({ preventScroll: true });
  useEffect(focusInput, []);
  const [focused, setFocused] = useState(false); // ô nhập ẩn đang nhận phím: chỉ khi đó mới hiện con trỏ
  const composing = useRef(false); // đang ghép chữ (bộ gõ, dấu ä…): chưa chấm, chưa nhảy ô
  const revealedCount = result.words.filter((w) => w.state === "revealed").length; // số từ đã bấm xem
  const hintCost = onHint ? `−${POINTS_HINT} điểm` : "tính là lỗi";

  const finish = (r = result) => {
    if (!reported) {
      setReported(true);
      setScore({ correct: r.correct, total: r.total });
      setWon(true);
      react(JUMP, 620);
      onDone(r.correct, r.total);
    }
  };
  /** Cập nhật các ô / từ đã xem; đúng hết thì tự tính là xong */
  const change = (nextSlots: string[], nextRevealed: Set<number>) => {
    const nextInput = nextSlots.join(" ");
    setSlots(nextSlots);
    setRevealed(nextRevealed);
    onDraft({ input: nextInput, revealed: [...nextRevealed] });
    const r = checkSlots(text, nextSlots, nextRevealed);
    const gain = onEarn?.(r.correct, r.total, nextInput, r.words.flatMap((w, k) => (w.state === "revealed" || w.state === "given" ? [k] : []))) ?? 0;
    if (gain > 0) {
      setGained((g) => g + gain);
      emitPoints({ delta: gain, earned: true });
    }
    setChecked(r.done);
    if (r.done) finish(r);
    return r;
  };
  /** Gõ vào ô đang chọn; từ gõ đúng → nhảy sang ô chưa xong kế tiếp */
  const type = (raw: string) => {
    if (result.done || !refWords.length) return;
    // Bàn phím ảo không báo phím Space qua keydown → nhận ra ở đây
    if (raw === `${slots[active]} `) return onTogglePlay();
    const value = raw.replace(/\s/g, "").replace(/^[^\p{L}\p{N}]+/u, ""); // dấu câu gõ theo thói quen ngay sau khi nhảy ô thì bỏ
    const next = [...slots];
    if (composing.current) {
      next[active] = value;
      return setSlots(next);
    }
    const at = slotForTyped(result.words, active, value);
    if (at !== active) next[active] = "";
    next[at] = value;
    const r = change(next, revealed);
    if (r.words[at].state === "correct") {
      setStuck(at);
      if (!r.done) react(HOP, 340);
    }
    setActive(r.words[at].state === "correct" ? nextOpenSlot(r.words, at) : at);
  };
  const check = () => {
    setChecked(true);
    if (result.done) return finish();
    react(NOPE, 460);
    setActive(nextOpenSlot(result.words, result.words.length - 1));
  };
  const submit = () => (result.done ? onNext() : check());
  /** Bấm xem các từ ks (bỏ qua từ đã gõ đúng / đã xem) → hiện từ, trừ điểm */
  const reveal = (ks: number[]) => {
    const fresh = ks.filter((k) => isOpenWord(result.words[k]));
    if (!fresh.length) return;
    const r = change(slots, new Set([...revealed, ...fresh]));
    if (!isOpenWord(r.words[active])) setActive(nextOpenSlot(r.words, active));
    onHint?.(fresh.length);
  };
  const revealAll = () => reveal(result.words.map((_, k) => k));
  /** Làm lại câu này từ đầu (kết quả mới ghi đè khi làm xong) */
  const retry = () => {
    setSlots(refWords.map(() => ""));
    setActive(refWords.length > 1 ? 1 : 0); // từ đầu câu hiện sẵn
    setRevealed(new Set());
    setChecked(false);
    setReported(false);
    setScore(undefined);
    setGained(0);
    setWon(false);
    setStuck(-1);
    onDraft(null);
    focusInput();
  };

  const left = result.words.filter(isOpenWord).length;
  const scored = result.total - left; // số từ đã xong (đúng + đã xem)
  const shownScore = score ?? { correct: result.correct, total: result.total };
  const say = result.done
    ? shownScore.correct === shownScore.total
      ? `${PRAISE[text.length % PRAISE.length]} ${shownScore.correct}/${shownScore.total} từ`
      : `Xong! Đúng ${shownScore.correct}/${shownScore.total} từ${revealedCount ? ` · xem ${revealedCount} từ` : ""}`
    : checked
      ? `Đúng ${result.correct}/${result.total} từ, cố lên!`
      : scored
        ? `Còn ${left} từ nữa!`
        : "Gõ những gì bạn nghe";

  return (
    <div data-dict={result.done ? "done" : checked ? "check" : "type"} className="flex flex-col gap-3">
      <div className="flex flex-col gap-3">
        <div className="flex min-h-11 items-center gap-2">
          {/* Linh vật lật lại để nhìn và "nói" về phía bong bóng thoại */}
          <span ref={mascotRef} className="relative -my-1.5 -ml-1 shrink-0">
            <Mascot animated className="size-14 -scale-x-100" />
            {won && (
              <span className="pt-burst left-1/2 top-1/2" aria-hidden>
                {SPARKS.map((p) => (
                  <span key={p.a} className="pt-spark" style={{ "--a": p.a, "--d": p.d, "--spark": p.c } as CSSProperties} />
                ))}
              </span>
            )}
          </span>
          <p role="status" className="dict-bubble ml-1 min-w-0 rounded-2xl border-2 border-ink bg-card px-3 py-1.5 text-sm leading-snug font-extrabold text-foreground">
            {say}
          </p>
          <button
            className="btn ml-auto shrink-0 px-2.5 py-1.5 text-xs text-link"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onReplay();
              focusInput();
            }}
          >
            <RotateCcw className="size-3.5" /> Nghe lại <span className="max-md:hidden">(Tab)</span>
          </button>
        </div>

        {/* Tiến độ câu: dải sọc kẹo như thân linh vật */}
        <div className="h-3 overflow-hidden rounded-full border-2 border-ink bg-card-2" aria-hidden>
          <div className="dict-progress h-full" style={{ width: `${result.total ? (scored / result.total) * 100 : 0}%` }} />
        </div>

        {/* Ô từng từ: chưa gõ → gợi ý theo mức độ (đáp án ẩn), gõ tới đâu hiện trong ô tới đó; mắt phía trên ô để xem từ (tính là lỗi); xong → bấm để tra từ.
            mouseDown giữ focus ở ô nhập ẩn để gõ tiếp được ngay */}
        <div className="relative flex cursor-text flex-wrap gap-x-2 gap-y-4 pt-2" onClick={focusInput}>
          <input
            ref={inputRef}
            aria-label="Gõ từ đang chọn"
            value={slots[active] ?? ""}
            readOnly={result.done}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={(e) => type(e.target.value)}
            onCompositionStart={() => (composing.current = true)}
            onCompositionEnd={(e) => {
              composing.current = false;
              type(e.currentTarget.value);
            }}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              } else if (e.key === "Escape") {
                e.currentTarget.blur(); // thoát ô gõ (bàn phím / trình đọc màn hình không bị kẹt)
              } else if (e.key === "Tab" && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                onReplay(); // Tab = nghe lại; Shift+Tab / Esc vẫn rời ô như bình thường
              } else if (e.code === "Space" && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                onTogglePlay();
              } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                e.preventDefault();
                setActive(nextOpenSlot(result.words, active, e.key === "ArrowRight" ? 1 : -1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                onPrevSentence();
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                onNextSentence();
              } else if (e.key === "Backspace" && !slots[active] && active > 0) {
                // Ô trống → lùi về ô trước (kể cả ô vừa tự nhảy qua: "ein" đúng nhưng định gõ "einen")
                e.preventDefault();
                for (let k = active - 1; k >= 1; k--) {
                  if (!revealed.has(k)) {
                    setActive(k);
                    break;
                  }
                }
              }
            }}
            className="absolute left-0 top-0 size-px text-base opacity-0"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
          />
          {result.words.map((w, k) => {
            const shown = w.state === "correct" || w.state === "revealed" || w.state === "given";
            const state = shown || checked ? w.state : "hint";
            const isActive = k === active && !result.done;
            const typedNow = !!slots[k] && state === "hint";
            const box = `min-h-9 min-w-10 max-w-full break-all rounded-xl border-2 px-2 py-1 text-center font-mono text-base font-bold transition ${BOX[state]} ${typedNow ? "border-solid border-ink/60 text-foreground" : ""} ${won ? "dict-win" : k === stuck ? "dict-stick" : ""} ${checked && !result.done && (w.state === "wrong" || w.state === "close") ? "shake" : ""} ${isActive ? "-translate-y-0.5 border-solid border-link bg-card shadow-[0_3px_0_var(--link)]" : ""}`;
            const tilt = { rotate: w.state === "correct" ? TILT[k % TILT.length] : undefined };
            if (result.done && onWord)
              return (
                <button
                  key={k}
                  className={`${box} cursor-pointer transition hover:brightness-125`}
                  style={{ "--i": k, ...tilt } as CSSProperties}
                  title="Tra nghĩa từ này"
                  onClick={(e) => {
                    e.stopPropagation();
                    onWord(w.text);
                  }}
                >
                  {w.text}
                </button>
              );
            if (w.state === "revealed" || w.state === "given" || result.done)
              return (
                <span key={k} className={box} style={tilt}>
                  {w.text}
                </span>
              );
            const typed = slots[k];
            return (
              <span key={k} className="group relative max-w-full">
                <button
                  className={`${box} cursor-text`}
                  style={tilt}
                  title={`Bấm để gõ vào ô này${checked && typed ? ` · Bạn gõ: ${typed}` : ""}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setActive(k)}
                >
                  {w.state === "correct" ? w.text : typed || (isActive && focused ? "" : hintFor(w.text, level) || "\u00A0")}
                  {isActive && focused && <span className="ml-px inline-block h-4 w-0.5 translate-y-0.5 animate-pulse bg-link" />}
                </button>
                {w.state !== "correct" && (
                  <button
                    className={`absolute -top-3.5 left-1/2 flex size-5 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full border-2 border-ink bg-card text-foreground transition after:absolute after:-inset-1 after:content-[''] hover:bg-gold hover:text-black ${isActive ? "" : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100"}`}
                    title={`Xem từ này (${hintCost})`}
                    aria-label={`Xem từ này (${hintCost})`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => reveal([k])}
                  >
                    <Eye className="size-3" />
                  </button>
                )}
              </span>
            );
          })}
        </div>
      </div>
      {result.done && translation && <p className="text-[15px] leading-relaxed text-muted">{translation}</p>}
      <p className="text-xs text-muted">
        {gained > 0 && (
          <span className="mr-1.5 inline-flex items-center gap-1 rounded-full bg-gem/15 px-2 py-0.5 font-extrabold text-gem">
            <Gem className="size-3.5" /> +{gained} điểm
          </span>
        )}
        {checked
          ? result.done
            ? onWord && "Bấm vào từ để tra nghĩa."
            : "Sửa lại các ô đỏ / vàng rồi Enter để kiểm tra lại."
          : `Gõ đúng tự sang ô sau (ae/oe/ue/ss thay ä/ö/ü/ß cũng được). Bấm ô hoặc ← → để đổi ô, ↑ ↓ để đổi câu, Space phát / dừng, Tab nghe lại, Esc thoát ô, bấm mắt để xem từ (${hintCost}).`}
      </p>

      {/* Nút chính (Kiểm tra / Câu tiếp theo) đứng trước và rộng hơn; "Hiện tất cả" (bỏ cuộc) chỉ là nút phụ cạnh bên
          — cùng một hàng để "Kiểm tra" không bị đẩy xuống dưới màn hình */}
      <div className="flex gap-2 sm:gap-3">
        <button className="btn btn-primary flex-[2] py-3.5 text-base" onClick={submit} disabled={result.done && !hasNext}>
          {result.done ? (
            <>
              Câu tiếp theo <ChevronRight className="size-5" />
            </>
          ) : (
            "Kiểm tra"
          )}
        </button>
        {result.done ? (
          <button className="btn flex-1 py-3" onClick={retry}>
            <RotateCcw className="size-4" /> Làm lại
          </button>
        ) : (
          <button className="btn flex-1 py-3" onClick={revealAll} title={`Hiện cả câu (mỗi từ chưa gõ đúng: ${hintCost})`}>
            <Eye className="size-4" /> Hiện tất cả
            {onHint && <span className="text-xs font-normal opacity-80">(−{POINTS_HINT}/từ)</span>}
          </button>
        )}
      </div>
    </div>
  );
}
