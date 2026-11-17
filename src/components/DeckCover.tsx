import type { DeckSummary } from "@/lib/decks";

/** Màu bìa theo nhóm trình độ (token, như LevelBadge): A xanh lá · B xanh lam · C tím */
const COLORS: Record<string, { cover: string; spine: string }> = {
  A: { cover: "bg-ok-soft", spine: "bg-ok" },
  B: { cover: "bg-accent-soft", spine: "bg-accent" },
  C: { cover: "bg-grape-soft", spine: "bg-grape" },
};

/**
 * Bìa bộ từ dáng một cuốn vở (DESIGN.md "Nhãn vở"): bìa màu phẳng + gáy băng dính đậm bên trái + nhãn vở trắng ghi trình độ,
 * xếp chồng lên một tờ giấy lộ ra ở mép phải / dưới (chiều sâu = lớp phẳng dán chồng, không gradient / bóng).
 * Admin đặt ảnh (public/decks/…) thì ảnh thay cho bìa vẽ.
 */
export default function DeckCover({ deck, big, className = "" }: { deck: Pick<DeckSummary, "cover" | "level">; big?: boolean; className?: string }) {
  const color = COLORS[deck.level[0]] ?? COLORS.A;
  const r = big ? "rounded-l-md rounded-r-2xl" : "rounded-l-sm rounded-r-xl";
  return (
    <div className={`relative aspect-[16/10] ${className}`}>
      {/* Tờ giấy lót phía sau lộ ra bên phải & dưới */}
      <div className={`absolute inset-0 top-1.5 left-1.5 border border-line bg-card ${r}`} />
      <div className={`absolute inset-0 right-1.5 bottom-1.5 overflow-hidden ${r} ${deck.cover ? "bg-card-2" : color.cover}`}>
        {deck.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={deck.cover} alt="" loading="lazy" className="size-full object-cover transition duration-300 group-hover:scale-105 motion-reduce:transition-none dark:brightness-[.85]" />
        ) : (
          <div className={`flex size-full items-center justify-center ${big ? "pl-7" : "pl-4"}`}>
            {/* Nhãn vở ghi trình độ */}
            <span
              className={`nhan flex flex-col items-center leading-none ${big ? "min-w-28 px-6 py-3" : "min-w-[4.5rem] px-3.5 py-2 sm:min-w-20"}`}
            >
              <span className={`font-display font-extrabold tracking-[-0.035em] ${big ? "text-5xl" : "text-2xl sm:text-3xl"}`}>{deck.level || "Aa"}</span>
            </span>
          </div>
        )}
        {/* Gáy vở: băng dính màu đậm dọc mép trái */}
        <div className={`absolute inset-y-0 left-0 ${big ? "w-5" : "w-3"} ${deck.cover ? "bg-black/25" : color.spine}`} />
      </div>
    </div>
  );
}
