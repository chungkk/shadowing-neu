import type { CSSProperties } from "react";
import { SEASONAL_THEME } from "@/lib/theme";

type Flake = {
  x: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
  opacity: number;
  soft?: boolean;
  desktopOnly?: boolean;
};

/** 28 hạt tuyết rơi chậm, phân bố cố định (không dùng Math.random để tránh lệch SSR/CSR) */
const FLAKES: Flake[] = [
  { x: 4, size: 2.5, duration: 19, delay: -3, drift: 18, opacity: 0.42 },
  { x: 9, size: 4, duration: 24, delay: -14, drift: -22, opacity: 0.24, soft: true, desktopOnly: true },
  { x: 14, size: 2, duration: 16, delay: -7, drift: 14, opacity: 0.36 },
  { x: 19, size: 3, duration: 22, delay: -18, drift: -16, opacity: 0.48, desktopOnly: true },
  { x: 24, size: 2.5, duration: 20, delay: -5, drift: 20, opacity: 0.34 },
  { x: 29, size: 5, duration: 28, delay: -11, drift: -24, opacity: 0.18, soft: true, desktopOnly: true },
  { x: 34, size: 2, duration: 17, delay: -9, drift: 15, opacity: 0.4 },
  { x: 39, size: 3, duration: 23, delay: -21, drift: -18, opacity: 0.38, desktopOnly: true },
  { x: 44, size: 2.5, duration: 18, delay: -2, drift: 16, opacity: 0.44 },
  { x: 49, size: 3.5, duration: 25, delay: -16, drift: -14, opacity: 0.3, desktopOnly: true },
  { x: 54, size: 2, duration: 15, delay: -12, drift: 22, opacity: 0.36 },
  { x: 59, size: 4.5, duration: 27, delay: -6, drift: -20, opacity: 0.2, soft: true, desktopOnly: true },
  { x: 64, size: 2.5, duration: 21, delay: -19, drift: 14, opacity: 0.45 },
  { x: 69, size: 2, duration: 16, delay: -4, drift: -16, opacity: 0.34, desktopOnly: true },
  { x: 74, size: 3, duration: 23, delay: -13, drift: 19, opacity: 0.42 },
  { x: 79, size: 5, duration: 29, delay: -8, drift: -22, opacity: 0.19, soft: true, desktopOnly: true },
  { x: 84, size: 2.5, duration: 18, delay: -15, drift: 16, opacity: 0.4 },
  { x: 89, size: 3, duration: 22, delay: -1, drift: -18, opacity: 0.46, desktopOnly: true },
  { x: 94, size: 2, duration: 17, delay: -10, drift: 14, opacity: 0.35 },
  { x: 11, size: 2, duration: 21, delay: -20, drift: 12, opacity: 0.3, desktopOnly: true },
  { x: 27, size: 3, duration: 19, delay: -8, drift: -15, opacity: 0.38 },
  { x: 42, size: 2, duration: 24, delay: -17, drift: 18, opacity: 0.28, desktopOnly: true },
  { x: 57, size: 2.5, duration: 20, delay: -3, drift: -16, opacity: 0.42 },
  { x: 71, size: 3.5, duration: 26, delay: -22, drift: 20, opacity: 0.24, soft: true, desktopOnly: true },
  { x: 86, size: 2, duration: 16, delay: -11, drift: -14, opacity: 0.36 },
  { x: 6, size: 3, duration: 25, delay: -16, drift: 22, opacity: 0.32, desktopOnly: true },
  { x: 62, size: 2, duration: 18, delay: -7, drift: 13, opacity: 0.34, desktopOnly: true },
  { x: 97, size: 2.5, duration: 21, delay: -14, drift: -15, opacity: 0.38 },
];

type Bulb = { cx: number; cy: number; warm?: boolean; delay: number; dur: number };

/** Chuỗi bóng đèn nhỏ ấm áp treo nhẹ dọc mép dưới thanh điều hướng */
const HEADER_BULBS: Bulb[] = [
  { cx: 60, cy: 5.5, warm: true, delay: 0.2, dur: 4.8 },
  { cx: 155, cy: 8, delay: 1.4, dur: 5.6 },
  { cx: 250, cy: 4.8, warm: true, delay: 2.7, dur: 4.4 },
  { cx: 345, cy: 8.5, warm: true, delay: 0.8, dur: 5.2 },
  { cx: 440, cy: 5.2, delay: 2.1, dur: 6.0 },
  { cx: 535, cy: 8.2, warm: true, delay: 3.3, dur: 4.6 },
  { cx: 630, cy: 4.8, delay: 1.1, dur: 5.4 },
  { cx: 725, cy: 8.2, warm: true, delay: 2.5, dur: 4.9 },
  { cx: 820, cy: 5.2, warm: true, delay: 0.5, dur: 5.8 },
  { cx: 915, cy: 8.5, delay: 1.9, dur: 4.7 },
  { cx: 1010, cy: 4.8, warm: true, delay: 3.1, dur: 5.3 },
  { cx: 1105, cy: 8, delay: 0.9, dur: 5.1 },
  { cx: 1190, cy: 5.5, warm: true, delay: 2.2, dur: 4.5 },
];

/** Hiệu ứng không khí Noel toàn trang: ánh đèn chiếu nhẹ từ trên xuống và tuyết rơi tĩnh lặng. */
export default function NoelAtmosphere() {
  if (SEASONAL_THEME !== "noel") return null;

  return (
    <>
      <div className="noel-spotlights" aria-hidden="true">
        <span className="noel-beam noel-beam-main" />
        <span className="noel-beam noel-beam-side" />
        <span className="noel-hearth" />
      </div>
      <div className="noel-snow" aria-hidden="true">
        {FLAKES.map((f, i) => (
          <span
            key={i}
            className={`noel-flake${f.soft ? " noel-flake-soft" : ""}${f.desktopOnly ? " noel-flake-desktop" : ""}`}
            style={
              {
                "--x": `${f.x}%`,
                "--s": `${f.size}px`,
                "--d": `${f.duration}s`,
                "--delay": `${f.delay}s`,
                "--drift": `${f.drift}px`,
                "--o": f.opacity,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </>
  );
}

/** Dây đèn nhỏ ánh sáng vàng ấm & trắng tuyết treo tinh tế dưới mép header. */
export function NoelHeaderLights() {
  if (SEASONAL_THEME !== "noel") return null;

  return (
    <div className="noel-header-lights" aria-hidden="true">
      <svg viewBox="0 0 1250 22" preserveAspectRatio="xMidYMin slice" className="h-[22px] w-full overflow-visible">
        <path
          d="M0,1 Q155,11 250,2.5 Q345,11.5 440,3 Q535,11 630,2.5 Q725,11 820,3 Q915,11.5 1010,2.5 Q1105,11 1250,1"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.85"
          className="noel-wire"
        />
        {HEADER_BULBS.map((b, i) => (
          <g key={i} className="noel-bulb" style={{ "--delay": `${b.delay}s`, "--dur": `${b.dur}s` } as CSSProperties}>
            <circle cx={b.cx} cy={b.cy} r={b.warm ? 6 : 5} className={b.warm ? "noel-bulb-halo-warm" : "noel-bulb-halo-white"} />
            <circle cx={b.cx} cy={b.cy} r={b.warm ? 1.9 : 1.5} className={b.warm ? "noel-bulb-core-warm" : "noel-bulb-core-white"} />
          </g>
        ))}
      </svg>
    </div>
  );
}

/** Luồng ánh đèn chiếu ấm áp trên vùng Hero trang chủ. */
export function NoelHeroBeams() {
  if (SEASONAL_THEME !== "noel") return null;

  return (
    <div className="noel-hero-beams" aria-hidden="true">
      <span className="noel-hero-source" />
      <span className="noel-hero-cone noel-hero-cone-left" />
      <span className="noel-hero-cone noel-hero-cone-right" />
    </div>
  );
}
