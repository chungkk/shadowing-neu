import { Layers } from "lucide-react";
import type { DeckSummary } from "@/lib/decks";

/** Màu bìa theo nhóm trình độ — như LevelBadge (A xanh lá · B xanh dương · C tím) */
const COLORS: Record<string, string> = {
  A: "bg-emerald-200 text-emerald-900",
  B: "bg-sky-200 text-sky-900",
  C: "bg-violet-200 text-violet-900",
};

/** Bìa bộ từ: ảnh admin đặt (public/decks/…), chưa có ảnh thì vẽ bìa theo màu trình độ */
export default function DeckCover({ deck, big, className = "" }: { deck: Pick<DeckSummary, "cover" | "level" | "title">; big?: boolean; className?: string }) {
  const box = `relative aspect-[16/10] overflow-hidden ${big ? "rounded-2xl" : "rounded-xl"} ${className}`;
  if (deck.cover)
    return (
      <div className={box}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={deck.cover} alt="" loading="lazy" className="size-full object-cover transition group-hover:scale-105" />
      </div>
    );
  return (
    <div className={`${box} flex flex-col justify-between ${big ? "p-5" : "p-3 sm:p-4"} ${COLORS[deck.level[0]] ?? COLORS.A}`}>
      {/* Thẻ xếp chồng mờ ở góc — gợi "bộ thẻ" */}
      <Layers className={`absolute -rotate-12 opacity-15 ${big ? "-right-4 -bottom-6 size-48" : "-right-5 -bottom-6 size-32"}`} strokeWidth={1.5} />
      <span className={`font-black tracking-tighter ${big ? "text-5xl" : "text-3xl sm:text-4xl"}`}>{deck.level || "Aa"}</span>
      <span className={`line-clamp-2 font-extrabold opacity-85 ${big ? "text-lg" : "text-sm"}`}>{deck.title}</span>
    </div>
  );
}
