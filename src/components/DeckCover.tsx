import type { DeckSummary } from "@/lib/decks";
import { levelPop } from "./LevelBadge";
import Mascot from "./Mascot";

/** Bìa bộ từ dáng một cuốn sách (gáy sọc kẹo · mép giấy · dây đánh dấu): ảnh admin đặt (public/decks/…), chưa có ảnh thì vẽ bìa theo màu trình độ, linh vật ló lên ở góc */
export default function DeckCover({ deck, big, className = "" }: { deck: Pick<DeckSummary, "cover" | "level">; big?: boolean; className?: string }) {
  const r = big ? "rounded-l-md rounded-r-2xl" : "rounded-l-sm rounded-r-xl";
  return (
    <div className={`deck-cover relative aspect-[16/10] ${levelPop(deck.level)} ${className}`}>
      {/* Mép giấy lộ ra bên phải & dưới */}
      <div className={`absolute inset-0 top-1.5 left-1.5 border-2 border-ink bg-[#fffaf3] ${r}`} />
      <div className={`absolute inset-0 right-1.5 bottom-1.5 overflow-hidden border-2 border-ink ${r} ${deck.cover ? "" : "bg-[var(--pop)]"}`}>
        {deck.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={deck.cover} alt="" loading="lazy" className="size-full object-cover transition group-hover:scale-105" />
        ) : (
          <>
            <span className={`absolute font-display leading-none font-extrabold text-[#2b1520] ${big ? "top-5 left-9 text-6xl" : "top-3 left-7 text-4xl sm:top-4 sm:left-8 sm:text-5xl"}`}>{deck.level || "Aa"}</span>
            {/* Dây đánh dấu trang */}
            <div className={`absolute top-0 ${big ? "right-8 h-14 w-5" : "right-4 h-8 w-3.5"} bg-red [clip-path:polygon(0_0,100%_0,100%_100%,50%_78%,0_100%)]`} />
            {/* Linh vật ngồi ló ở góc, rê chuột thì nhô lên */}
            <Mascot className={`absolute right-[2%] bottom-0 w-[52%] translate-y-[52%] transition-transform duration-300 ease-out group-hover:translate-y-[14%] group-hover:-rotate-3 motion-reduce:transform-none`} />
          </>
        )}
        {/* Gáy sách sọc kẹo */}
        <div className={`candy-bar absolute inset-y-0 left-0 border-r-2 border-ink ${big ? "w-5" : "w-3.5"}`} />
      </div>
    </div>
  );
}
