import type { DeckSummary } from "@/lib/decks";

/** Màu bìa theo nhóm trình độ (token): A xanh lá · B xanh dương · C hồng */
const COLORS: Record<string, { cover: string; ribbon: string }> = {
  A: { cover: "bg-accent-soft text-accent-text", ribbon: "bg-accent" },
  B: { cover: "bg-link-soft text-link", ribbon: "bg-link" },
  C: { cover: "bg-candy/30 text-red-400", ribbon: "bg-candy" },
};

/** Bìa bộ từ dáng một cuốn sách (gáy · mép giấy · dây đánh dấu): ảnh admin đặt (public/decks/…), chưa có ảnh thì vẽ bìa theo màu trình độ */
export default function DeckCover({ deck, big, className = "" }: { deck: Pick<DeckSummary, "cover" | "level">; big?: boolean; className?: string }) {
  const color = COLORS[deck.level[0]] ?? COLORS.A;
  const r = big ? "rounded-l-md rounded-r-2xl" : "rounded-l-sm rounded-r-xl";
  return (
    <div className={`relative aspect-[16/10] ${className}`}>
      {/* Mép giấy lộ ra bên phải & dưới */}
      <div className={`absolute inset-0 top-1.5 left-1.5 bg-line-strong/60 ${r}`} />
      <div className={`absolute inset-0 top-0.75 left-0.75 right-0.75 bottom-0.75 border-r-2 border-b-2 border-line bg-card ${r}`} />
      <div className={`absolute inset-0 right-1.5 bottom-1.5 overflow-hidden shadow-soft ${r} ${deck.cover ? "" : color.cover}`}>
        {deck.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={deck.cover} alt="" loading="lazy" className="size-full object-cover transition duration-300 group-hover:scale-105 motion-reduce:transition-none dark:brightness-[.85]" />
        ) : (
          <div className={`flex size-full flex-col justify-between ${big ? "py-5 pr-5 pl-9" : "py-3 pr-3 pl-6 sm:py-4 sm:pr-4 sm:pl-7"}`}>
            {/* Dây đánh dấu trang */}
            <div className={`absolute top-0 ${big ? "right-8 h-14 w-5" : "right-5 h-9 w-3.5"} ${color.ribbon} [clip-path:polygon(0_0,100%_0,100%_100%,50%_78%,0_100%)]`} />
            <span className={`font-display font-black tracking-tighter ${big ? "text-5xl" : "text-3xl sm:text-4xl"}`}>{deck.level || "Aa"}</span>
          </div>
        )}
        {/* Gáy sách: dải tối + nếp gấp sáng */}
        <div className={`absolute inset-y-0 left-0 ${big ? "w-5" : "w-3.5"} bg-gradient-to-r from-black/25 via-black/10 to-black/5`} />
        <div className={`absolute inset-y-0 ${big ? "left-5" : "left-3.5"} w-px bg-white/40`} />
      </div>
    </div>
  );
}
