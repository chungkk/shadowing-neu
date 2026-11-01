"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import { Check, ChevronLeft, Delete, Play, RotateCcw } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { StudyWord } from "@/lib/deck-study";

/** Phần dùng chung của các game từ vựng (/games): tiêu đề, màn chọn bộ từ, bàn phím trên màn hình */

export type DeckOption = { slug: string; title: string; level: string; wordCount: number; topicCount: number };
export type GameWord = StudyWord & { topic: string };
export type Topic = { id: string; title: string; icon: string };
/** Màu chủ đạo của từng game */
export type Tone = "cyan" | "amber";

const TONE = {
  cyan: {
    text: "text-cyan-300/80",
    icon: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
    banner: "border-cyan-400/20 bg-cyan-400/5",
    selected: "border-cyan-400 bg-cyan-400/10 shadow-[0_4px_0_rgba(34,211,238,0.35)]",
    hover: "hover:border-cyan-400/50",
    badge: "bg-cyan-400 text-black",
    bar: "bg-cyan-400",
    button: "border-cyan-400 bg-cyan-500 text-white shadow-[0_4px_0_#0e7490] active:shadow-[0_2px_0_#0e7490]",
  },
  amber: {
    text: "text-amber/80",
    icon: "border-amber/30 bg-amber/10 text-amber",
    banner: "border-amber/20 bg-amber/5",
    selected: "border-amber bg-amber/10 shadow-[0_4px_0_rgba(250,204,21,0.35)]",
    hover: "hover:border-amber/50",
    badge: "bg-amber text-black",
    bar: "bg-amber",
    button: "border-amber bg-amber text-black shadow-[0_4px_0_#a16207] active:shadow-[0_2px_0_#a16207]",
  },
} satisfies Record<Tone, Record<string, string>>;

/** Nút bấm chính kiểu "nổi" theo màu game */
export const toneButton = (tone: Tone) =>
  `btn px-5 py-2.5 tracking-wide uppercase hover:brightness-110 active:translate-y-0.5 ${TONE[tone].button}`;

/** Bàn phím không có umlaut: gõ a/o/u/s thay ä/ö/ü/ß (key: chữ thường) */
const BASE: Record<string, string> = { ä: "a", ö: "o", ü: "u", ß: "s" };
export const sameLetter = (key: string, want: string) => key === want.toLowerCase() || BASE[want.toLowerCase()] === key;

/** Ô bộ từ: màu theo nhóm trình độ (như DeckCover) */
const LEVEL_TILE: Record<string, string> = { A: "bg-emerald-200 text-emerald-900", B: "bg-sky-200 text-sky-900", C: "bg-violet-200 text-violet-900" };

export function LevelTile({ level }: { level: string }) {
  return (
    <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl text-lg font-black shadow-[0_3px_0_rgba(0,0,0,0.35)] ${LEVEL_TILE[level[0]] ?? LEVEL_TILE.A}`}>
      {level || "Aa"}
    </span>
  );
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
    <header className="flex items-center gap-3">
      {onBack ? (
        <button title="Chọn bộ từ" className="btn-icon" onClick={onBack}>
          {back}
        </button>
      ) : (
        <Link href="/games" title="Game" className="btn-icon">
          {back}
        </Link>
      )}
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl border ${TONE[tone].icon}`}>
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h1 className="text-lg leading-tight font-extrabold md:text-xl">{title}</h1>
        <p className={`truncate text-xs md:text-sm ${TONE[tone].text}`}>{subtitle}</p>
      </div>
      {right}
    </header>
  );
}

/** Thẻ bộ từ ở màn chọn — kèm số mốc đã qua (lưu trong trình duyệt ở progressKey) */
function DeckCard({ deck, tone, progressKey, selected, onSelect }: { deck: DeckOption; tone: Tone; progressKey: string; selected: boolean; onSelect: () => void }) {
  const [cleared] = useLocalStorage(progressKey, 0);
  const total = Math.max(deck.topicCount, 1);
  const t = TONE[tone];
  return (
    <button
      onClick={onSelect}
      className={`relative flex cursor-pointer flex-col gap-3 rounded-2xl border-2 p-3.5 text-left transition hover:-translate-y-0.5 ${
        selected ? t.selected : `border-border bg-card ${t.hover}`
      }`}
    >
      {selected && (
        <span className={`absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full ${t.badge}`}>
          <Check className="size-4" strokeWidth={3} />
        </span>
      )}
      <LevelTile level={deck.level} />
      <span className="flex flex-col gap-0.5">
        <span className="font-extrabold">{deck.title}</span>
        <span className={`text-sm ${t.text}`}>
          {deck.wordCount} từ · {total} mốc
        </span>
      </span>
      {cleared > 0 && (
        <span className="flex items-center gap-2 text-xs font-bold text-muted">
          <span className="h-1.5 flex-1 rounded-full bg-card-2">
            <span className={`block h-full rounded-full ${t.bar}`} style={{ width: `${Math.min(cleared / total, 1) * 100}%` }} />
          </span>
          {Math.min(cleared, total)}/{total}
        </span>
      )}
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
}) {
  const t = TONE[tone];
  const total = Math.max(current?.topicCount ?? 1, 1);
  const from = cleared < total ? cleared : 0;
  return (
    <>
      <div className={`flex items-center gap-4 rounded-2xl border p-4 ${t.banner}`}>
        <span className={`flex size-12 shrink-0 items-center justify-center rounded-xl border ${t.icon}`}>
          <Icon className="size-6" />
        </span>
        <div>
          <p className="font-extrabold">Chọn bộ từ</p>
          <p className={`text-sm ${t.text}`}>{intro}</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {decks.map((d) => (
          <DeckCard key={d.slug} deck={d} tone={tone} progressKey={progressKey(d.slug)} selected={d.slug === current?.slug} onSelect={() => onSelect(d.slug)} />
        ))}
      </div>
      {!decks.length && <p className="text-center text-sm text-muted">Chưa có bộ từ nào.</p>}
      {error && <p className="text-center text-sm text-red-400">{error}</p>}

      {/* Thanh bắt đầu dính đáy (điện thoại: nằm trên thanh điều hướng) */}
      {current && (
        <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] mt-2 flex items-center gap-3 rounded-2xl border border-border bg-card/95 p-3 shadow-2xl shadow-black/60 backdrop-blur md:bottom-4">
          <LevelTile level={current.level} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-extrabold">{current.title}</p>
            <p className={`text-xs ${t.text}`}>
              {current.wordCount} từ · {from ? `tiếp tục mốc ${from + 1}/${total}` : `${total} mốc`}
              {best > 0 && ` · kỷ lục ${best}`}
            </p>
          </div>
          {from > 0 && (
            <button className="btn max-sm:hidden" disabled={loading} onClick={() => onStart(0)}>
              <RotateCcw className="size-4" /> Từ đầu
            </button>
          )}
          <button className={toneButton(tone)} disabled={loading} onClick={() => onStart(from)}>
            <Play className="size-4 fill-current" /> {loading ? "Đang tải…" : "Bắt đầu"}
          </button>
        </div>
      )}
    </>
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
            <button className="btn h-11 flex-[1.5] px-0" disabled={disabled} onClick={() => onKey("Backspace")} title="Xoá">
              <Delete className="size-5" />
            </button>
          )}
          {[...row].map((ch) => (
            <button key={ch} className="btn h-11 max-w-12 flex-1 px-0 text-base" disabled={disabled} onClick={() => onKey(ch)}>
              {ch}
            </button>
          ))}
          {r === 2 && (
            <button className={`btn h-11 flex-[1.5] px-0 text-xs ${enter.className ?? ""}`} disabled={disabled} onClick={() => onKey("Enter")} title={enter.title}>
              {enter.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
