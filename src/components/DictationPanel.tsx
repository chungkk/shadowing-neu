"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ChevronRight, Eye, RotateCcw } from "lucide-react";
import { checkDictation, hintFor, type DictationLevel, type WordState } from "@/lib/dictation";
import { emitPoints } from "@/lib/points";
import { Coin } from "./PointsBadge";

const BOX: Record<WordState | "hint", string> = {
  correct: "border-accent bg-accent/15 text-foreground",
  close: "border-amber bg-amber/10 text-amber",
  wrong: "border-red bg-red/10 text-red-400",
  missing: "border-red/60 text-muted",
  revealed: "border-amber/60 bg-amber/5 text-amber",
  hint: "border-border bg-background/60 text-muted",
};

/** Tia lấp lánh quanh "+1": góc · độ xa · màu */
const SPARKS = Array.from({ length: 12 }, (_, k) => ({
  a: `${k * 30 + (k % 2 ? 12 : 0)}deg`,
  d: `${k % 2 ? 46 : 72}px`,
  c: k % 3 === 0 ? "var(--accent)" : k % 3 === 1 ? "var(--amber)" : "#fff7d6",
}));

/** Hiệu ứng +1 điểm: vòng sáng lan ra, tia lấp lánh, "+1" bật lên rồi bay lên mờ dần (globals.css) */
function PointBurst({ onEnd }: { onEnd: () => void }) {
  return (
    <div className="pt-burst top-1/2 left-1/2 z-10" aria-hidden>
      <span className="pt-ring" />
      <span className="pt-ring pt-ring-2" />
      {SPARKS.map((p, k) => (
        <span key={k} className="pt-spark" style={{ "--a": p.a, "--d": p.d, "--spark": p.c } as CSSProperties} />
      ))}
      <span className="pt-plus" onAnimationEnd={onEnd}>
        <Coin className="size-8" />
        +1
      </span>
    </div>
  );
}

/** Bản nháp 1 câu: chữ đã gõ + các từ đã bấm xem — giữ lại khi chuyển sang câu khác rồi quay về */
export type DictDraft = { input: string; revealed: number[] };

/**
 * Nghe chép chính tả 1 câu. Gõ đúng từ nào hiện từ đó ngay; bấm "Kiểm tra" để xem từ sai / thiếu.
 * Remount theo câu (key); dựng lại từ `draft` (nháp lần trước) hoặc `saved` (câu đã làm xong → hiện đủ câu + điểm).
 * Câu đã xong: bấm vào từ để tra nghĩa (`onWord`), có bản dịch câu nếu đang bật dịch.
 * `onDone` trả về true = câu này được +1 điểm (chép đúng hết lần đầu) → hiệu ứng +1, đồng xu bay lên huy hiệu điểm.
 */
export default function DictationPanel({
  text,
  level,
  onReplay,
  onNext,
  onDone,
  hasNext,
  draft,
  saved,
  onDraft,
  onWord,
  translation,
}: {
  text: string;
  level: DictationLevel;
  onReplay: () => void;
  onNext: () => void;
  onDone: (correct: number, total: number) => boolean | void; // true = được +1 điểm
  hasNext: boolean;
  draft?: DictDraft;
  saved?: { correct: number; total: number };
  onDraft: (d: DictDraft | null) => void;
  onWord?: (word: string) => void; // câu đã xong: bấm vào từ → bảng tra từ
  translation?: string; // bản dịch câu (chỉ hiện khi đã xong)
}) {
  const [input, setInput] = useState(() => draft?.input ?? (saved ? text : ""));
  const [revealed, setRevealed] = useState<Set<number>>(() => new Set(draft?.revealed ?? []));
  const [checked, setChecked] = useState(() => !!saved || (!!draft && checkDictation(text, draft.input, new Set(draft.revealed)).done));
  const [reported, setReported] = useState(!!saved);
  const [score, setScore] = useState(saved); // điểm lần làm này, hoặc điểm đã lưu
  const result = useMemo(() => checkDictation(text, input, revealed), [text, input, revealed]);
  const [won, setWon] = useState(false); // vừa được +1 điểm ở câu này → các ô từ nảy, chữ báo điểm
  const [burst, setBurst] = useState(false); // hiệu ứng +1 đang chạy
  const wordsRef = useRef<HTMLDivElement>(null);
  // Mở câu → con trỏ vào ô gõ luôn, nhưng không cuộn trang (autoFocus kéo cả trang tới ô gõ, các phần khác nhảy theo)
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => inputRef.current?.focus({ preventScroll: true }), []);
  // Số từ phải bấm xem — không tính từ đã gõ đúng ("Hiện tất cả" thêm cả chúng vào `revealed`)
  const revealedCount = result.words.filter((w) => w.state === "revealed").length;

  const finish = (r = result) => {
    if (!reported) {
      setReported(true);
      setScore({ correct: r.correct, total: r.total });
      if (onDone(r.correct, r.total) === true) {
        setWon(true);
        setBurst(true);
        // Đồng xu bay từ giữa hàng ô từ lên huy hiệu điểm
        const b = wordsRef.current?.getBoundingClientRect();
        emitPoints({ delta: 1, from: b && { x: b.left + b.width / 2, y: b.top + b.height / 2 } });
      }
    }
  };
  /** Cập nhật câu gõ / từ đã xem; đúng hết thì tự tính là xong */
  const change = (nextInput: string, nextRevealed: Set<number>) => {
    setInput(nextInput);
    setRevealed(nextRevealed);
    onDraft({ input: nextInput, revealed: [...nextRevealed] });
    const r = checkDictation(text, nextInput, nextRevealed);
    setChecked(r.done);
    if (r.done) finish(r);
  };
  const check = () => {
    setChecked(true);
    if (result.done) finish();
  };
  const submit = () => (result.done ? onNext() : check());
  const revealAll = () => change(input, new Set(result.words.map((_, k) => k)));
  /** Làm lại câu này từ đầu (kết quả mới ghi đè khi làm xong) */
  const retry = () => {
    setInput("");
    setRevealed(new Set());
    setChecked(false);
    setReported(false);
    setScore(undefined);
    setWon(false);
    onDraft(null);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl border border-border bg-background/60 p-3 sm:p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="label text-link">Gõ những gì bạn nghe</span>
          <button
            className="inline-flex cursor-pointer items-center gap-1 text-xs font-bold text-link hover:underline"
            onClick={onReplay}
          >
            <RotateCcw className="size-3.5" /> Nghe lại <span className="max-md:hidden">(Tab)</span>
          </button>
        </div>
        <textarea
          ref={inputRef}
          rows={3}
          value={input}
          onChange={(e) => change(e.target.value, revealed)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            } else if (e.key === "Tab") {
              e.preventDefault();
              onReplay();
            }
          }}
          placeholder="Gõ câu tiếng Đức… (ae/oe/ue/ss thay cho ä/ö/ü/ß cũng được)"
          className="w-full resize-none bg-transparent text-lg outline-none placeholder:text-muted/70"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
        />
      </div>

      {/* Ô từng từ: đúng → hiện từ; chưa đúng → gợi ý theo mức độ, bấm vào ô để xem (tính là lỗi); xong → bấm để tra từ.
          Bấm thẳng vào ô như app — không đặt nút xem riêng phía trên ô (mỗi dòng ô cao gấp đôi) */}
      <div ref={wordsRef} className="relative flex flex-wrap gap-2">
        {burst && <PointBurst onEnd={() => setBurst(false)} />}
        {result.words.map((w, k) => {
          const shown = w.state === "correct" || w.state === "revealed";
          const state = shown || checked ? w.state : "hint";
          const box = `min-w-10 rounded-lg border-2 px-2 py-1 text-center font-mono text-base font-bold ${BOX[state]} ${won ? "dict-win" : ""}`;
          if (result.done && onWord)
            return (
              <button
                key={k}
                className={`${box} cursor-pointer transition hover:brightness-125`}
                style={{ "--i": k } as CSSProperties}
                title="Tra nghĩa từ này"
                onClick={() => onWord(w.text)}
              >
                {w.text}
              </button>
            );
          if (shown)
            return (
              <span key={k} className={box}>
                {w.text}
              </span>
            );
          const hint = checked && w.typed ? w.typed : hintFor(w.text, level);
          return (
            <button
              key={k}
              className={`${box} cursor-pointer transition hover:border-amber hover:text-amber`}
              title={`${checked && w.typed ? `Bạn gõ: ${w.typed} · ` : ""}Bấm để xem từ này (tính là lỗi)`}
              onClick={() => change(input, new Set(revealed).add(k))}
            >
              {hint || <Eye className="mx-auto size-4" />}
            </button>
          );
        })}
      </div>
      {checked && result.extra.length > 0 && <p className="text-sm text-red-400">Từ thừa: {result.extra.join(", ")}</p>}
      {result.done && translation && <p className="text-[15px] leading-relaxed text-muted">{translation}</p>}
      <p className="text-xs text-muted">
        {won && (
          <span className="mr-1.5 inline-flex items-center gap-1 rounded-full bg-amber/15 px-2 py-0.5 font-extrabold text-amber">
            <Coin className="size-3.5" /> +1 điểm
          </span>
        )}
        {checked
          ? result.done
            ? `🎉 Xong! Đúng ${score?.correct ?? result.correct}/${score?.total ?? result.total} từ${revealedCount ? ` · xem ${revealedCount} từ` : ""}.${onWord ? " Bấm vào từ để tra nghĩa." : ""}`
            : `Đúng ${result.correct}/${result.total} từ — sửa lại các ô đỏ / vàng rồi Enter để kiểm tra lại.`
          : "Bấm vào ô để xem từ (tính là lỗi). Enter hoặc nút Kiểm tra để chấm."}
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
          <button className="btn flex-1 py-3" onClick={revealAll} title="Hiện cả câu (các từ chưa gõ đúng tính là lỗi)">
            <Eye className="size-4" /> Hiện tất cả
          </button>
        )}
      </div>
    </div>
  );
}
