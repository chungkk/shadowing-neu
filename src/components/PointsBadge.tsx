"use client";

import { useEffect, useId, useRef, useState } from "react";
import { POINTS_EVENT, type PointsEvent } from "@/lib/points";

/** Đồng xu điểm (vàng, ngôi sao giữa) — dùng ở huy hiệu, đồng xu bay và hiệu ứng +1 */
export function Coin({ className = "size-5" }: { className?: string }) {
  const id = useId(); // mỗi đồng xu 1 id gradient riêng
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fef08a" />
          <stop offset="0.55" stopColor="#facc15" />
          <stop offset="1" stopColor="#d97706" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="11" fill="#a16207" />
      <circle cx="12" cy="11.4" r="10.2" fill={`url(#${id})`} />
      <circle cx="12" cy="11.4" r="7.6" fill="none" stroke="#fffbeb" strokeOpacity="0.55" strokeWidth="1" />
      <path d="M12 6.6l1.5 3.1 3.4.5-2.5 2.4.6 3.4-3-1.6-3 1.6.6-3.4-2.5-2.4 3.4-.5z" fill="#fffbeb" />
    </svg>
  );
}

type Flyer = { id: number; from: { x: number; y: number } };
const FLIGHT_MS = 720;
const FLIGHT_DELAY = 380; // chờ "+1" trong ô chính tả bật lên xong mới bay

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Tổng điểm chính tả ở thanh trên cùng. Được điểm (emitPoints) → đồng xu bay từ ô chính tả vào đây,
 * chạm tới thì huy hiệu nảy lên và số mới lăn vào. Huy hiệu khuất màn hình / giảm chuyển động → chỉ đổi số.
 */
export default function PointsBadge({ initial }: { initial: number }) {
  const [total, setTotal] = useState(initial); // số điểm (tạm tính ngay khi làm đúng, server trả về thì sửa lại)
  const [shown, setShown] = useState(initial); // số đang hiện — chỉ đổi khi không còn đồng xu đang bay
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
        className="relative inline-flex h-9 items-center gap-1.5 rounded-full border border-amber/35 bg-amber/10 pr-3 pl-1.5 font-extrabold text-amber tabular-nums select-none sm:h-10"
      >
        <span key={`c${bump}`} ref={coinRef} className={bump ? "points-bump" : undefined}>
          <Coin className="size-6 sm:size-7" />
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
          className="pointer-events-none fixed z-[70] drop-shadow-[0_4px_12px_rgba(250,204,21,0.55)]"
          style={{ left: f.from.x, top: f.from.y, opacity: 0 }}
        >
          <Coin className="size-8" />
        </span>
      ))}
    </>
  );
}
