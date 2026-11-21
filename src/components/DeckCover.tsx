import type { DeckSummary } from "@/lib/decks";

/** Màu nền nhạt và thanh nhấn theo nhóm trình độ: A xanh lá (cơ bản) · B xanh lam (trung cấp) · C tím chàm (cao cấp) */
const COLORS: Record<string, { bg: string; bar: string; badge: string }> = {
  A: { bg: "bg-ok-soft", bar: "bg-ok", badge: "text-ok-text" },
  B: { bg: "bg-accent-soft", bar: "bg-accent", badge: "text-accent-text" },
  C: { bg: "bg-grape-soft", bar: "bg-grape", badge: "text-grape-text" },
};

/**
 * Bìa bộ từ tối giản: tỷ lệ 16:10 phẳng, thanh nhấn màu mỏng ở mép trên, chữ trình độ sắc nét ở trung tâm.
 * Nếu admin đặt ảnh (public/decks/…) thì hiển thị ảnh phủ kín khung.
 */
export default function DeckCover({ deck, big, className = "" }: { deck: Pick<DeckSummary, "cover" | "level">; big?: boolean; className?: string }) {
  const color = COLORS[deck.level[0]] ?? COLORS.B;
  return (
    <div className={`relative aspect-[16/10] overflow-hidden rounded-[var(--radius)] border border-line ${deck.cover ? "bg-card-2" : color.bg} ${className}`}>
      {deck.cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={deck.cover}
          alt=""
          loading="lazy"
          className="size-full object-cover transition duration-300 group-hover:scale-[1.03] motion-reduce:transition-none dark:brightness-[.88]"
        />
      ) : (
        <>
          <div className={`absolute inset-x-0 top-0 h-1 ${color.bar}`} aria-hidden />
          <div className="flex size-full flex-col items-center justify-center gap-1">
            <span className={`font-display leading-none font-bold tracking-[-0.03em] ${color.badge} ${big ? "text-5xl" : "text-2xl sm:text-3xl"}`}>
              {deck.level || "Aa"}
            </span>
            <span className="text-[11px] font-medium tracking-wider text-muted uppercase">Wortschatz</span>
          </div>
        </>
      )}
    </div>
  );
}
