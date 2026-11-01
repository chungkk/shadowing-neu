"use client";

import { useEffect, useId, useRef, useState } from "react";
import { POINTS_EVENT, type PointsEvent } from "@/lib/points";

/** Kim cương điểm (xanh, có mặt cắt, vệt sáng và 1 tia lấp lánh) — dùng ở huy hiệu, kim cương bay và hiệu ứng +1.
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

type Flyer = { id: number; from: { x: number; y: number } };
const FLIGHT_MS = 720;
const FLIGHT_DELAY = 380; // chờ "+1" trong ô chính tả bật lên xong mới bay

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Tổng điểm chính tả ở thanh trên cùng. Được điểm (emitPoints) → kim cương bay từ ô chính tả vào đây,
 * bay tới thì huy hiệu nảy lên và số mới lăn vào. Huy hiệu khuất màn hình / giảm chuyển động → chỉ đổi số.
 */
export default function PointsBadge({ initial }: { initial: number }) {
  const [total, setTotal] = useState(initial); // số điểm (tạm tính ngay khi làm đúng, server trả về thì sửa lại)
  const [shown, setShown] = useState(initial); // số đang hiện — chỉ đổi khi không còn kim cương đang bay
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const [bump, setBump] = useState(0); // đổi → chạy lại hiệu ứng nảy
  const coinRef = useRef<HTMLSpanElement>(null);
  const nextId = useRef(0);

  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<PointsEvent>).detail;
      if (d.total !== undefined) setTotal(d.total);
      if (!d.delta) return;
      setTotal((t) => t + d.delta!);
      const r = coinRef.current?.getBoundingClientRect();
      const visible = r && r.bottom > 0 && r.top < window.innerHeight && r.width > 0;
      if (d.from && visible && !reducedMotion()) setFlyers((f) => [...f, { id: nextId.current++, from: d.from! }]);
    };
    window.addEventListener(POINTS_EVENT, on);
    return () => window.removeEventListener(POINTS_EVENT, on);
  }, []);

  // Không còn xu đang bay → số hiện đuổi theo số thật (tăng thì nảy)
  if (!flyers.length && shown !== total) {
    if (total > shown) setBump((b) => b + 1);
    setShown(total);
  }

  /** Bay theo đường cong: lên cao rồi rơi vào huy hiệu, nhỏ dần */
  const launch = (el: HTMLSpanElement | null, f: Flyer) => {
    if (!el || el.dataset.launched) return;
    el.dataset.launched = "1";
    const to = coinRef.current!.getBoundingClientRect();
    const dx = to.left + to.width / 2 - f.from.x;
    const dy = to.top + to.height / 2 - f.from.y;
    const lift = Math.min(-60, dy * 0.35);
    const anim = el.animate(
      [
        { transform: "translate(-50%, -50%) scale(0.6)", opacity: 0 },
        { transform: "translate(-50%, -50%) scale(1.25)", opacity: 1, offset: 0.12 },
        { transform: `translate(calc(-50% + ${dx * 0.45}px), calc(-50% + ${dy * 0.35 + lift}px)) scale(1.05) rotate(200deg)`, offset: 0.55 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.7) rotate(360deg)`, opacity: 1 },
      ],
      { duration: FLIGHT_MS, delay: FLIGHT_DELAY, easing: "cubic-bezier(0.45, 0, 0.25, 1)", fill: "both" },
    );
    anim.onfinish = () => setFlyers((all) => all.filter((x) => x.id !== f.id));
  };

  return (
    <>
      <span
        title="Điểm chính tả — mỗi câu chép đúng hết +1"
        className="relative inline-flex h-9 items-center gap-1.5 rounded-full border border-gem/35 bg-gem/10 pr-3 pl-1.5 font-extrabold text-gem tabular-nums select-none sm:h-10"
      >
        <span key={`c${bump}`} ref={coinRef} className={bump ? "points-bump" : undefined}>
          <Gem className="size-6 sm:size-7" />
        </span>
        <span className="relative overflow-hidden leading-none">
          <span key={`n${shown}`} className={`block ${bump ? "points-roll" : ""}`}>
            {shown.toLocaleString("vi-VN")}
          </span>
        </span>
        {bump > 0 && <span key={`g${bump}`} className="points-glow pointer-events-none absolute inset-0 rounded-full" />}
      </span>
      {flyers.map((f) => (
        <span
          key={f.id}
          ref={(el) => launch(el, f)}
          className="pointer-events-none fixed z-[70] drop-shadow-[0_4px_12px_rgba(56,189,248,0.6)]"
          style={{ left: f.from.x, top: f.from.y, opacity: 0 }}
        >
          <Gem className="size-8" />
        </span>
      ))}
    </>
  );
}
