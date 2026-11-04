"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ChevronRight, Eye, RotateCcw } from "lucide-react";
import { checkSlots, hintFor, isOpenWord, nextOpenSlot, POINTS_HINT, slotForTyped, slotsFromInput, splitWords, type DictationLevel, type WordState } from "@/lib/dictation";
import { emitPoints } from "@/lib/points";
import { Gem } from "./PointsBadge";

const BOX: Record<WordState | "hint", string> = {
  correct: "border-accent bg-accent/15 text-foreground",
  close: "border-amber bg-amber/10 text-amber",
  wrong: "border-red bg-red/10 text-red-400",
  missing: "border-red/60 text-muted",
  revealed: "border-amber/60 bg-amber/5 text-amber",
  hint: "border-border bg-background/60 text-muted",
};

/** Bản nháp 1 câu: chữ đã gõ + các từ đã bấm xem — giữ lại khi chuyển sang câu khác rồi quay về */
export type DictDraft = { input: string; revealed: number[] };

/**
 * Nghe chép chính tả 1 câu. Mỗi từ là 1 ô, gõ thẳng vào ô đang chọn (ô nhập thật ẩn đi); gõ đúng thì tự nhảy ô — không cần dấu cách,
 * Space chỉ phát / dừng video. Từ sai thì bấm ô khác hoặc ← → để đổi ô, ↑ ↓ để đổi câu; bấm "Kiểm tra" để xem từ sai / thiếu.
 * Remount theo câu (key); dựng lại từ `draft` (nháp lần trước) hoặc `saved` (câu đã làm xong → hiện đủ câu + điểm).
 * Câu đã xong: bấm vào từ để tra nghĩa (`onWord`), có bản dịch câu nếu đang bật dịch.
 * `onEarn` gọi mỗi lần gõ, trả về số điểm vừa được (+1 mỗi từ đúng mới) → huy hiệu điểm trên thanh trên cùng hiện "+N"; xong câu có điểm thì các ô từ nảy.
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
  const [gained, setGained] = useState(0); // điểm vừa được ở câu này → chữ báo điểm, xong câu thì các ô từ nảy
  const won = gained > 0 && result.done;
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
    const gain = onEarn?.(r.correct, r.total, nextInput, r.words.flatMap((w, k) => (w.state === "revealed" ? [k] : []))) ?? 0;
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
    setActive(r.words[at].state === "correct" ? nextOpenSlot(r.words, at) : at);
  };
  const check = () => {
    setChecked(true);
    if (result.done) finish();
    else setActive(nextOpenSlot(result.words, result.words.length - 1));
  };
  const submit = () => (result.done ? onNext() : check());
  /** Bấm xem các từ ks (bỏ qua từ đã gõ đúng / đã xem) → hiện từ, trừ điểm */
  const reveal = (ks: number[]) => {
    const fresh = ks.filter((k) => !revealed.has(k) && result.words[k].state !== "correct");
    if (!fresh.length) return;
    const r = change(slots, new Set([...revealed, ...fresh]));
    if (!isOpenWord(r.words[active])) setActive(nextOpenSlot(r.words, active));
    onHint?.(fresh.length);
  };
  const revealAll = () => reveal(result.words.map((_, k) => k));
  /** Làm lại câu này từ đầu (kết quả mới ghi đè khi làm xong) */
  const retry = () => {
    setSlots(refWords.map(() => ""));
    setActive(0);
    setRevealed(new Set());
    setChecked(false);
    setReported(false);
    setScore(undefined);
    setGained(0);
    onDraft(null);
    focusInput();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl border border-border bg-background/60 p-3 sm:p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="label text-link">Gõ những gì bạn nghe</span>
          <button
            className="inline-flex cursor-pointer items-center gap-1 text-xs font-bold text-link hover:underline"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onReplay();
              focusInput();
            }}
          >
            <RotateCcw className="size-3.5" /> Nghe lại <span className="max-md:hidden">(Tab)</span>
          </button>
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
              } else if (e.key === "Tab") {
                e.preventDefault();
                onReplay();
              } else if (e.code === "Space") {
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
                for (let k = active - 1; k >= 0; k--) {
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
            const shown = w.state === "correct" || w.state === "revealed";
            const state = shown || checked ? w.state : "hint";
            const isActive = k === active && !result.done;
            const box = `min-h-9 min-w-10 max-w-full break-all rounded-lg border-2 px-2 py-1 text-center font-mono text-base font-bold ${BOX[state]} ${won ? "dict-win" : ""} ${isActive ? "ring-2 ring-link/40" : ""}`;
            if (result.done && onWord)
              return (
                <button
                  key={k}
                  className={`${box} cursor-pointer transition hover:brightness-125`}
                  style={{ "--i": k } as CSSProperties}
                  title="Tra nghĩa từ này"
                  onClick={(e) => {
                    e.stopPropagation();
                    onWord(w.text);
                  }}
                >
                  {w.text}
                </button>
              );
            if (w.state === "revealed" || result.done)
              return (
                <span key={k} className={box}>
                  {w.text}
                </span>
              );
            const typed = slots[k];
            const caret = isActive && focused && <span className="ml-px inline-block h-4 w-0.5 translate-y-0.5 animate-pulse bg-link" />;
            return (
              <span key={k} className="relative max-w-full">
                <button
                  className={`${box} cursor-text ${typed && state === "hint" ? "text-foreground" : ""}`}
                  title={`Bấm để gõ vào ô này${checked && typed ? ` · Bạn gõ: ${typed}` : ""}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setActive(k)}
                >
                  {/* Chưa gõ: con trỏ đứng trước gợi ý (phải gõ cả chữ cái đầu); ô đang chọn vẫn giữ gợi ý */}
                  {!typed && caret}
                  {w.state === "correct" ? w.text : typed || hintFor(w.text, level)}
                  {!!typed && caret}
                </button>
                {w.state !== "correct" && (
                  <button
                    className="absolute -top-3 left-1/2 flex size-5 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-muted transition after:absolute after:-inset-1 after:content-[''] hover:border-amber hover:text-amber"
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
            ? `🎉 Xong! Đúng ${score?.correct ?? result.correct}/${score?.total ?? result.total} từ${revealedCount ? ` · xem ${revealedCount} từ` : ""}.${onWord ? " Bấm vào từ để tra nghĩa." : ""}`
            : `Đúng ${result.correct}/${result.total} từ — sửa lại các ô đỏ / vàng rồi Enter để kiểm tra lại.`
          : `Gõ đúng tự sang ô sau (ae/oe/ue/ss thay ä/ö/ü/ß cũng được). Bấm ô hoặc ← → để đổi ô, ↑ ↓ để đổi câu, Space phát / dừng, bấm mắt để xem từ (${hintCost}).`}
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
          </button>
        )}
      </div>
    </div>
  );
}
