"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { POINTS_EVENT, type PointsEvent } from "@/lib/points";

/** Kim cương điểm (xanh, có mặt cắt, vệt sáng và 1 tia lấp lánh) — dùng ở huy hiệu và các chỗ hiện điểm.
 *  Bản app dùng cùng hình: mobile/assets/images/gem.svg */
export function Gem({ className = "size-5" }: { className?: string }) {
  const id = useId(); // mỗi viên 1 id gradient riêng
  const outline = "M7.2 3.5h9.6l4.7 5.6L12 21 2.5 9.1z";
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7dd3fc" />
          <stop offset="1" stopColor="#0ea5e9" />
        </linearGradient>
      </defs>
      <path d={outline} fill={`url(#${id})`} />
      <path d="M7.2 3.5h9.6l4.7 5.6H2.5z" fill="#bae6fd" />
      <path d="M9.6 9.1 12 3.5l2.4 5.6z" fill="#f0f9ff" />
      <path d="M9.6 9.1h4.8L12 21z" fill="#7dd3fc" />
      <path d="M14.4 9.1h7.1L12 21z" fill="#0284c7" fillOpacity="0.45" />
      <path d={outline} fill="none" stroke="#0369a1" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M5.6 8.2 7.7 5.6" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M20.6 1.2c.25 1.1.6 1.45 1.7 1.7-1.1.25-1.45.6-1.7 1.7-.25-1.1-.6-1.45-1.7-1.7 1.1-.25 1.45-.6 1.7-1.7z" fill="#fff" />
    </svg>
  );
}

/** Tia lấp lánh quanh kim cương khi được điểm: góc · độ xa · màu */
const SPARKS = Array.from({ length: 8 }, (_, k) => ({
  a: `${k * 45 + 22}deg`,
  d: `${k % 2 ? 18 : 26}px`,
  c: k % 3 === 0 ? "var(--gem)" : k % 3 === 1 ? "#f9a8d4" : "#f0f9ff",
}));

/**
 * Tổng điểm chính tả ở thanh trên cùng. Được điểm (emitPoints với earned) → kim cương nảy, tia lấp lánh,
 * "+N" bật lên ngay cạnh kim cương rồi mờ dần, số mới lăn vào. Giảm chuyển động → chỉ "+N" hiện rồi mờ.
 */
export default function PointsBadge({ initial }: { initial: number }) {
  const [total, setTotal] = useState(initial); // số điểm (tạm tính ngay khi làm đúng, server trả về thì sửa lại)
  const [shown, setShown] = useState(initial); // số đã hiện — để biết số vừa tăng hay giảm
  const [pop, setPop] = useState<{ id: number; n: number } | null>(null); // "+N" đang hiện
  const [bump, setBump] = useState(0); // đổi → chạy lại hiệu ứng nảy
  const nextId = useRef(0);

  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<PointsEvent>).detail;
      if (d.total !== undefined) setTotal(d.total);
      if (!d.delta) return;
      setTotal((t) => t + d.delta!);
      if (d.earned) setPop({ id: nextId.current++, n: d.delta });
    };
    window.addEventListener(POINTS_EVENT, on);
    return () => window.removeEventListener(POINTS_EVENT, on);
  }, []);

  // Số hiện đuổi theo số thật (tăng thì nảy)
  if (shown !== total) {
    if (total > shown) setBump((b) => b + 1);
    setShown(total);
  }

  return (
    <span
      title="Điểm chính tả — mỗi câu chép đúng hết +2, mỗi từ bấm xem −1"
      className="relative inline-flex h-9 items-center gap-1.5 rounded-full border border-gem/35 bg-gem/10 pr-3 pl-1.5 font-extrabold text-gem tabular-nums select-none sm:h-10"
    >
      <span className="relative inline-flex">
        <span key={`c${bump}`} className={bump ? "points-bump" : undefined}>
          <Gem className="size-6 sm:size-7" />
        </span>
        {pop && (
          <span key={pop.id} className="pt-burst top-1/2 left-1/2" aria-hidden>
            {SPARKS.map((p, k) => (
              <span key={k} className="pt-spark" style={{ "--a": p.a, "--d": p.d, "--spark": p.c } as CSSProperties} />
            ))}
          </span>
        )}
      </span>
      <span className="relative overflow-hidden leading-none">
        <span key={`n${shown}`} className={`block ${bump ? "points-roll" : ""}`}>
          {shown.toLocaleString("vi-VN")}
        </span>
      </span>
      {bump > 0 && <span key={`g${bump}`} className="points-glow pointer-events-none absolute inset-0 rounded-full" />}
      {pop && (
        <span key={`p${pop.id}`} className="pt-plus" aria-hidden onAnimationEnd={() => setPop(null)}>
          +{pop.n}
        </span>
      )}
    </span>
  );
}
