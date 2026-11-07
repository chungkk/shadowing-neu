import Link from "next/link";
import { useId, type CSSProperties, type ReactNode } from "react";

/** Các mảnh của giao diện Kẹo (như solo.ckk.pro) · Quân Caro kiểu kẹo: X là kẹo đỏ có dấu nhân, O là kẹo xanh có vòng tròn — khác cả hình lẫn màu */

const gloss = <path d="M9 15C10 11 13 8.5 17 8" fill="none" stroke="#fff" strokeOpacity=".65" strokeWidth="2.6" strokeLinecap="round" />;

export function CandyX({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={className}>
      <circle cx="20" cy="20" r="17.5" fill="#d92c45" stroke="#55303f" strokeWidth="3" />
      <path d="M13.5 13.5 26.5 26.5M26.5 13.5 13.5 26.5" stroke="#fffaf3" strokeWidth="5" strokeLinecap="round" />
      {gloss}
    </svg>
  );
}

export function CandyO({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={className}>
      <circle cx="20" cy="20" r="17.5" fill="#0b7f73" stroke="#55303f" strokeWidth="3" />
      <circle cx="20" cy="20" r="8" fill="none" stroke="#fffaf3" strokeWidth="5" />
      {gloss}
    </svg>
  );
}

export const CandyPiece = ({ p, className = "" }: { p: "X" | "O"; className?: string }) =>
  p === "X" ? <CandyX className={className} /> : <CandyO className={className} />;

/** Tên trò chơi chữ kẹo + link quay lại (đầu trang Caro) */
export function CandyTitle({ title, back, backLabel, right, small = false }: { title: string; back: string; backLabel: string; right?: ReactNode; small?: boolean }) {
  return (
    <header className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <Link href={back} className="inline-flex items-center gap-1 font-bold underline decoration-[3px] underline-offset-4 hover:decoration-red">
          ‹ {backLabel}
        </Link>
        <h1 className={`title-candy mt-1 ${small ? "text-[clamp(2.25rem,10vw,3rem)]" : "text-[clamp(2.75rem,13vw,4.25rem)]"}`}>{title}</h1>
      </div>
      {right}
    </header>
  );
}

const RAIN = ["#d92c45", "#ffd24d", "#0b7f73", "#ff9db0", "#fffaf3"];

/** Mưa giấy gói kẹo khi thắng (CSS: .candy-rain trong globals.css) */
export function WrapperRain() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden>
      {Array.from({ length: 22 }, (_, i) => (
        <span
          key={i}
          className="candy-rain absolute top-0 block h-3 w-6 rounded-sm border-2 border-[#55303f]"
          style={
            {
              left: `${(i * 47) % 100}%`,
              backgroundColor: RAIN[i % RAIN.length],
              animationDuration: `${1.8 + (i % 5) * 0.28}s`,
              animationDelay: `${(i % 7) * 0.09}s`,
              "--spin": `${(i % 2 ? 1 : -1) * (240 + i * 18)}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

/** Mái che sọc đỏ trắng của hiệu kẹo, nằm dưới thanh trên cùng ở giao diện Kẹo */
export function Awning({ className = "" }: { className?: string }) {
  const id = `awning${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg width="100%" height="42" aria-hidden="true" className={`block ${className}`}>
      <defs>
        <pattern id={id} width="72" height="42" patternUnits="userSpaceOnUse">
          <path d="M0 -2H36V28a18 12 0 0 1-36 0Z" fill="#d92c45" stroke="#55303f" strokeWidth="3" />
          <path d="M36 -2H72V28a18 12 0 0 1-36 0Z" fill="#fffaf3" stroke="#55303f" strokeWidth="3" />
        </pattern>
      </defs>
      <rect width="100%" height="42" fill={`url(#${id})`} />
    </svg>
  );
}
