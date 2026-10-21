"use client";

import { useEffect, useState } from "react";
import { ArrowLeftRight, Check, RotateCcw, X } from "lucide-react";
import type { VocabItem } from "@/lib/db";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Câu ví dụ: che từ (khi hỏi) hoặc tô đậm (khi đã lật) */
function Context({ text, word, hide }: { text: string; word: string; hide: boolean }) {
  const i = text.toLowerCase().indexOf(word.toLowerCase());
  if (i === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      {hide ? (
        <span className="rounded bg-white/10 px-1 tracking-widest">{"_".repeat(Math.min(word.length, 12))}</span>
      ) : (
        <mark className="rounded bg-amber/20 px-0.5 text-amber">{text.slice(i, i + word.length)}</mark>
      )}
      {text.slice(i + word.length)}
    </>
  );
}

/**
 * Ôn từ dạng thẻ lật: xem mặt trước → lật → tự chấm "Đã nhớ" / "Chưa nhớ".
 * Hết lượt thì ôn lại những từ chưa nhớ cho tới khi thuộc hết.
 */
export default function VocabReview({ title, items, onClose }: { title: string; items: VocabItem[]; onClose: () => void }) {
  // Việt → Đức chỉ áp dụng cho từ đã ghi nghĩa
  const [reverse, setReverse] = useState(false);
  const pool = reverse ? items.filter((v) => v.meaning) : items;
  const [queue, setQueue] = useState(() => shuffle(items));
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [missed, setMissed] = useState<VocabItem[]>([]);
  const [round, setRound] = useState(1);
  const [knownTotal, setKnownTotal] = useState(0);

  const card = queue[pos];
  const done = !card;

  const restart = (list: VocabItem[], nextRound: number) => {
    setQueue(shuffle(list));
    setPos(0);
    setFlipped(false);
    setMissed([]);
    setRound(nextRound);
  };
  const toggleDirection = () => {
    const next = !reverse;
    setReverse(next);
    setKnownTotal(0);
    restart(next ? items.filter((v) => v.meaning) : items, 1);
  };
  const grade = (known: boolean) => {
    if (!known) setMissed((m) => [...m, card]);
    else setKnownTotal((n) => n + 1);
    setFlipped(false);
    setPos((p) => p + 1);
  };

  // Phím tắt: Space/Enter lật thẻ, ← chưa nhớ, → đã nhớ, Esc đóng
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onClose();
      if (done) return;
      if (!flipped && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setFlipped(true);
      } else if (flipped && (e.key === "ArrowLeft" || e.key === "1")) grade(false);
      else if (flipped && (e.key === "ArrowRight" || e.key === "2")) grade(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Khoá cuộn trang phía sau
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const front = reverse ? card?.meaning : card?.word;
  const back = reverse ? card?.word : card?.meaning;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="card flex max-h-full w-full max-w-lg flex-col gap-4 overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="label truncate">Ôn tập · {title}</p>
            <p className="text-xs text-muted">
              {done ? "Hoàn thành lượt" : `Thẻ ${pos + 1}/${queue.length}`}
              {round > 1 && ` · lượt ${round}`}
            </p>
          </div>
          <button
            title={reverse ? "Đang hỏi nghĩa → từ" : "Đang hỏi từ → nghĩa"}
            className="btn shrink-0 px-2.5 py-1.5 text-xs"
            onClick={toggleDirection}
            disabled={!reverse && !items.some((v) => v.meaning)}
          >
            <ArrowLeftRight className="size-3.5" /> {reverse ? "Nghĩa → Từ" : "Từ → Nghĩa"}
          </button>
          <button title="Đóng (Esc)" className="btn-icon size-8 shrink-0" onClick={onClose}>
            <X className="size-4" />
          </button>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-background">
          <div className="h-full bg-accent transition-all" style={{ width: `${queue.length ? (pos / queue.length) * 100 : 100}%` }} />
        </div>

        {!pool.length ? (
          <p className="py-10 text-center text-sm text-muted">Chưa có từ nào được ghi nghĩa để ôn theo chiều này.</p>
        ) : done ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            {missed.length ? (
              <>
                <p className="text-lg font-extrabold">Còn {missed.length} từ chưa nhớ</p>
                <p className="text-sm text-muted">{missed.map((v) => v.word).join(", ")}</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <button className="btn btn-primary" onClick={() => restart(missed, round + 1)}>
                    <RotateCcw className="size-4" /> Ôn lại từ chưa nhớ
                  </button>
                  <button className="btn" onClick={() => restart(pool, round + 1)}>
                    Ôn lại tất cả
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-4xl">🎉</p>
                <p className="text-lg font-extrabold">Đã nhớ hết {pool.length} từ!</p>
                <p className="text-sm text-muted">
                  {round === 1 ? "Thuộc ngay từ lượt đầu." : `Sau ${round} lượt · ${knownTotal} lần chấm “Đã nhớ”.`}
                </p>
                <div className="flex gap-2">
                  <button className="btn" onClick={() => restart(pool, 1)}>
                    <RotateCcw className="size-4" /> Ôn lại
                  </button>
                  <button className="btn btn-primary" onClick={onClose}>
                    Xong
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            <button
              className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-background/60 p-5 text-center"
              onClick={() => setFlipped(true)}
              disabled={flipped}
            >
              <p className="text-3xl font-extrabold wrap-anywhere">{front}</p>
              {flipped ? (
                <p className={`wrap-anywhere ${back ? "text-xl font-bold text-amber" : "text-sm text-muted italic"}`}>
                  {back || "Chưa ghi nghĩa"}
                </p>
              ) : (
                <p className="text-xs text-muted">Bấm thẻ hoặc phím Space để lật</p>
              )}
              {card.context && (
                <p className="text-sm leading-relaxed text-muted wrap-anywhere">
                  <Context text={card.context} word={card.word} hide={reverse && !flipped} />
                </p>
              )}
            </button>
            {flipped ? (
              <div className="grid grid-cols-2 gap-3">
                <button className="btn btn-red" onClick={() => grade(false)}>
                  <X className="size-4" /> Chưa nhớ
                </button>
                <button className="btn btn-primary" onClick={() => grade(true)}>
                  <Check className="size-4" /> Đã nhớ
                </button>
              </div>
            ) : (
              <button className="btn btn-amber" onClick={() => setFlipped(true)}>
                Lật thẻ
              </button>
            )}
            <p className="hidden text-center text-xs text-muted sm:block">Space: lật · ←: chưa nhớ · →: đã nhớ · Esc: đóng</p>
          </>
        )}
      </div>
    </div>
  );
}
