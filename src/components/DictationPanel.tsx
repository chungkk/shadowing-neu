"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Eye, RotateCcw } from "lucide-react";
import { checkDictation, hintFor, type DictationLevel, type WordState } from "@/lib/dictation";

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
 * Nghe chép chính tả 1 câu. Gõ đúng từ nào hiện từ đó ngay; bấm "Kiểm tra" để xem từ sai / thiếu.
 * Remount theo câu (key); dựng lại từ `draft` (nháp lần trước) hoặc `saved` (câu đã làm xong → hiện đủ câu + điểm).
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
}: {
  text: string;
  level: DictationLevel;
  onReplay: () => void;
  onNext: () => void;
  onDone: (correct: number, total: number) => void;
  hasNext: boolean;
  draft?: DictDraft;
  saved?: { correct: number; total: number };
  onDraft: (d: DictDraft | null) => void;
}) {
  const [input, setInput] = useState(() => draft?.input ?? (saved ? text : ""));
  const [revealed, setRevealed] = useState<Set<number>>(() => new Set(draft?.revealed ?? []));
  const [checked, setChecked] = useState(() => !!saved || (!!draft && checkDictation(text, draft.input, new Set(draft.revealed)).done));
  const [reported, setReported] = useState(!!saved);
  const [score, setScore] = useState(saved); // điểm lần làm này, hoặc điểm đã lưu
  const result = useMemo(() => checkDictation(text, input, revealed), [text, input, revealed]);

  const finish = (r = result) => {
    if (!reported) {
      setReported(true);
      setScore({ correct: r.correct, total: r.total });
      onDone(r.correct, r.total);
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
    onDraft(null);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl border border-border bg-background/60 p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="label text-link">Gõ những gì bạn nghe</span>
          <button
            className="inline-flex cursor-pointer items-center gap-1 text-xs font-bold text-link hover:underline"
            onClick={onReplay}
          >
            <RotateCcw className="size-3.5" /> Nghe lại (Tab)
          </button>
        </div>
        <textarea
          autoFocus
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

      {/* Ô từng từ: đúng → hiện từ; chưa đúng → gợi ý theo mức độ; 👁 để xem (tính là lỗi) */}
      <div className="flex flex-wrap gap-2">
        {result.words.map((w, k) => {
          const shown = w.state === "correct" || w.state === "revealed";
          const state = shown || checked ? w.state : "hint";
          return (
            <div key={k} className="flex flex-col items-center gap-1">
              {!shown && (
                <button
                  title="Xem từ này (tính là lỗi)"
                  className="cursor-pointer text-muted hover:text-amber"
                  onClick={() => change(input, new Set(revealed).add(k))}
                >
                  <Eye className="size-4" />
                </button>
              )}
              <span
                className={`min-w-10 rounded-lg border-2 px-2 py-1 text-center font-mono text-base font-bold ${BOX[state]} ${
                  shown ? "mt-5" : ""
                }`}
                title={checked && w.typed && !shown ? `Bạn gõ: ${w.typed}` : undefined}
              >
                {shown ? w.text : checked && w.typed ? w.typed : hintFor(w.text, level) || "   "}
              </span>
            </div>
          );
        })}
      </div>
      {checked && result.extra.length > 0 && <p className="text-sm text-red-400">Từ thừa: {result.extra.join(", ")}</p>}
      <p className="text-xs text-muted">
        {checked
          ? result.done
            ? `🎉 Xong! Đúng ${score?.correct ?? result.correct}/${score?.total ?? result.total} từ${revealed.size ? ` · xem ${revealed.size} từ` : ""}.`
            : `Đúng ${result.correct}/${result.total} từ — sửa lại các ô đỏ / vàng rồi Enter để kiểm tra lại.`
          : "Từ đã xem sẽ bị tính là lỗi. Enter để kiểm tra."}
      </p>

      {result.done ? (
        <button className="btn py-3" onClick={retry}>
          <RotateCcw className="size-4" /> Làm lại câu này
        </button>
      ) : (
        <button className="btn btn-amber py-3" onClick={revealAll}>
          Hiện tất cả
        </button>
      )}
      <button className="btn btn-primary py-3.5 text-base" onClick={submit} disabled={result.done && !hasNext}>
        {result.done ? (
          <>
            Câu tiếp theo <ChevronRight className="size-5" />
          </>
        ) : (
          "Kiểm tra"
        )}
      </button>
    </div>
  );
}
