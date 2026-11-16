"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import { Check, ChevronLeft, Delete, Play, RotateCcw } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
export { sameLetter, type GameWord, type Topic } from "@/lib/games/falling-words";

/** Phần dùng chung của các game từ vựng (/games): tiêu đề, màn chọn bộ từ, bàn phím trên màn hình */

export type DeckOption = { slug: string; title: string; level: string; wordCount: number; topicCount: number };
/** Màu chủ đạo của từng game (class .g-tone-* trong styles/games.css đặt --tone / --tone-soft / --tone-text) */
export type Tone = "cyan" | "amber";

const TONE_CLASS: Record<Tone, string> = { cyan: "g-tone-cyan", amber: "g-tone-amber" };

/** Ô bộ từ: màu theo nhóm trình độ (như DeckCover) */
const LEVEL_TILE: Record<string, string> = { A: "g-level-a", B: "g-level-b", C: "g-level-c" };

export function LevelTile({ level }: { level: string }) {
  return <span className={`g-level ${LEVEL_TILE[level[0]] ?? LEVEL_TILE.A}`}>{level || "Aa"}</span>;
}

/** Tiêu đề game: nút quay lại (link về /games, hoặc onBack khi đang chơi) · biểu tượng · tên · mô tả · nút bên phải */
export function GameHeader({
  icon: Icon,
  tone,
  title,
  subtitle,
  onBack,
  right,
}: {
  icon: ComponentType<{ className?: string }>;
  tone: Tone;
  title: string;
  subtitle: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  const back = <ChevronLeft className="size-6" />;
  return (
    <header className={`flex items-center gap-3 ${TONE_CLASS[tone]}`}>
      {onBack ? (
        <button title="Chọn bộ từ" aria-label="Chọn bộ từ" className="btn-icon -ml-2" onClick={onBack}>
          {back}
        </button>
      ) : (
        <Link href="/games" title="Game" aria-label="Game" className="btn-icon -ml-2">
          {back}
        </Link>
      )}
      <span className="g-icon">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h1 className="page-title truncate">{title}</h1>
        <p className="truncate text-xs font-semibold text-muted md:text-sm">{subtitle}</p>
      </div>
      {right}
    </header>
  );
}

/** Thẻ bộ từ ở màn chọn — kèm số mốc đã qua (lưu trong trình duyệt ở progressKey) */
function DeckCard({ deck, progressKey, selected, disabled, extra, onSelect }: { deck: DeckOption; progressKey: string; selected: boolean; disabled: boolean; extra?: ReactNode; onSelect: () => void }) {
  const [cleared] = useLocalStorage(progressKey, 0);
  const total = Math.max(deck.topicCount, 1);
  return (
    <button onClick={onSelect} disabled={disabled} aria-pressed={selected} className="g-deck">
      {selected && (
        <span className="g-check" aria-hidden>
          <Check className="size-4" strokeWidth={3} />
        </span>
      )}
      <span className="flex items-center gap-3">
        <LevelTile level={deck.level} />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="font-extrabold leading-snug">{deck.title}</span>
          <span className="text-sm font-semibold text-muted">
            {deck.wordCount} từ · {total} mốc
          </span>
        </span>
      </span>
      {cleared > 0 && (
        <span className="flex items-center gap-2 text-xs font-bold text-muted tabular-nums">
          <span className="g-bar">
            <span style={{ width: `${Math.min(cleared / total, 1) * 100}%` }} />
          </span>
          {Math.min(cleared, total)}/{total}
        </span>
      )}
      {extra}
    </button>
  );
}

/**
 * Màn chọn bộ từ: lời giới thiệu · lưới bộ từ · thanh "Bắt đầu" dính đáy.
 * cleared = số mốc đã qua của bộ đang chọn → nút tiếp tục từ mốc đó (kèm "Từ đầu")
 */
export function DeckMenu({
  tone,
  icon: Icon,
  intro,
  decks,
  current,
  onSelect,
  progressKey,
  cleared,
  best,
  loading,
  error,
  onStart,
  deckExtra,
  notice,
}: {
  tone: Tone;
  icon: ComponentType<{ className?: string }>;
  intro: ReactNode;
  decks: DeckOption[];
  current: DeckOption | undefined;
  onSelect: (slug: string) => void;
  progressKey: (slug: string) => string;
  cleared: number;
  best: number;
  loading: boolean;
  error: string;
  onStart: (from: number) => void;
  deckExtra?: (deck: DeckOption) => ReactNode; // dòng thêm ở cuối thẻ bộ từ
  notice?: ReactNode; // dòng thêm dưới lời giới thiệu (vd. tên tạm của khách)
}) {
  const total = Math.max(current?.topicCount ?? 1, 1);
  const from = cleared < total ? cleared : 0;
  return (
    <div className={`flex flex-col gap-5 ${TONE_CLASS[tone]}`}>
      <div className="card hero flex items-start gap-4" style={{ ["--hero" as string]: tone === "amber" ? "var(--gold)" : "var(--aqua)" }}>
        <span className="g-icon size-12">
          <Icon className="size-6" />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="section-title">Chọn bộ từ</p>
          <p className="text-sm leading-relaxed text-muted">{intro}</p>
        </div>
      </div>
      {notice}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {decks.map((d) => (
          <DeckCard key={d.slug} deck={d} progressKey={progressKey(d.slug)} selected={d.slug === current?.slug} disabled={loading} extra={deckExtra?.(d)} onSelect={() => onSelect(d.slug)} />
        ))}
      </div>
      {!decks.length && <p className="card empty">Chưa có bộ từ nào.</p>}
      {error && (
        <p role="alert" className="alert alert-err">
          {error}
        </p>
      )}

      {/* Thanh bắt đầu dính đáy (điện thoại: nằm trên thanh điều hướng) */}
      {current && (
        <div className="g-startbar">
          <LevelTile level={current.level} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-extrabold">{current.title}</p>
            <p className="truncate text-xs font-semibold text-muted">
              {current.wordCount} từ · {from ? `tiếp tục mốc ${from + 1}/${total}` : `${total} mốc`}
              {best > 0 && <span className="text-amber"> · kỷ lục {best}</span>}
            </p>
          </div>
          {from > 0 && (
            <button className="btn btn-lg max-sm:px-3" title="Từ đầu" aria-label="Từ đầu" disabled={loading} onClick={() => onStart(0)}>
              <RotateCcw className="size-4" /> <span className="max-sm:hidden">Từ đầu</span>
            </button>
          )}
          <button className="btn btn-amber btn-lg max-sm:px-4" disabled={loading} onClick={() => onStart(from)}>
            <Play className="size-4 fill-current" /> {loading ? "Đang tải…" : "Bắt đầu"}
          </button>
        </div>
      )}
    </div>
  );
}

/** Màn cảm ứng? — mặc định bật bàn phím trên màn hình (bàn phím hệ thống che mất nửa màn hình) */
export function useCoarsePointer() {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const mq = matchMedia("(pointer: coarse)");
    const sync = () => setCoarse(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return coarse;
}

const OSK_ROWS = ["qwertzuiopü", "asdfghjklöä", "yxcvbnmß"];

/** Bàn phím QWERTZ trên màn hình — onKey nhận chữ thường, "Backspace", "Enter" */
export function ScreenKeyboard({ onKey, disabled, enter }: { onKey: (key: string) => void; disabled?: boolean; enter: { label: ReactNode; title: string; className?: string } }) {
  return (
    <div className="flex flex-col gap-1.5 select-none" onPointerDown={(e) => e.preventDefault()}>
      {OSK_ROWS.map((row, r) => (
        <div key={row} className="flex justify-center gap-1">
          {r === 2 && (
            <button className="g-key flex-[1.5]" disabled={disabled} onClick={() => onKey("Backspace")} title="Xoá" aria-label="Xoá">
              <Delete className="size-5" />
            </button>
          )}
          {[...row].map((ch) => (
            <button key={ch} className="g-key max-w-12" disabled={disabled} onClick={() => onKey(ch)}>
              {ch}
            </button>
          ))}
          {r === 2 && (
            <button className={`g-key flex-[1.5] text-xs ${enter.className ?? ""}`} disabled={disabled} onClick={() => onKey("Enter")} title={enter.title}>
              {enter.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
