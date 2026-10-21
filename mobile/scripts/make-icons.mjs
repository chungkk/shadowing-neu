// Tạo icon app + ảnh khởi động từ SVG. Chạy: node mobile/scripts/make-icons.mjs (từ thư mục gốc repo, cần sharp của web)
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(path.join(process.cwd(), "package.json"));
const sharp = require("sharp");
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "assets", "images");

const BG = "#0c110e";
const GREEN = "#16a34a";
const AMBER = "#facc15";

/** Hai bong bóng: giọng gốc (vàng, phía sau) và giọng bạn nhại theo (xanh, phía trước) + sóng âm */
function mark({ front = GREEN, back = AMBER, bars = "#ffffff" } = {}) {
  const bubble = (fill) => `
    <rect x="0" y="0" width="560" height="420" rx="140" fill="${fill}"/>
    <path d="M110 360 L80 540 L250 400 Z" fill="${fill}" stroke="${fill}" stroke-width="24" stroke-linejoin="round"/>`;
  const heights = [120, 230, 310, 200, 100];
  const w = 46, gap = 32, x0 = 280 - (heights.length * w + (heights.length - 1) * gap) / 2;
  const barsSvg = heights
    .map((h, i) => `<rect x="${x0 + i * (w + gap)}" y="${210 - h / 2}" width="${w}" height="${h}" rx="${w / 2}" fill="${bars}"/>`)
    .join("");
  // Khung 632×632 (bong bóng 560 + lệch 72), căn giữa tại (316, 316)
  return `
    <g transform="translate(72,72)">${bubble(back)}</g>
    <g>${bubble(front)}${barsSvg}</g>`;
}

/** Vẽ dấu ở giữa khung `size`, chiếm `scale` chiều rộng */
function place(size, scale, inner) {
  const s = (size * scale) / 632;
  const ox = (size - 632 * s) / 2;
  const oy = (size - 612 * s) / 2; // bong bóng cao 612 (gồm đuôi), căn giữa theo chiều dọc
  return `<g transform="translate(${ox},${oy}) scale(${s})">${inner}</g>`;
}

const svg = (size, body, bg) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1d3d29"/>
      <stop offset="1" stop-color="${BG}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.3" cy="0.25" r="0.75">
      <stop offset="0" stop-color="${GREEN}" stop-opacity="0.35"/>
      <stop offset="1" stop-color="${GREEN}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  ${bg ? `<rect width="${size}" height="${size}" fill="url(#bg)"/><rect width="${size}" height="${size}" fill="url(#glow)"/>` : ""}
  ${body}
</svg>`;

const png = (name, s, opts = {}) => {
  let img = sharp(Buffer.from(s)).png();
  if (opts.flatten) img = sharp(Buffer.from(s)).flatten({ background: BG }).png(); // iOS: icon không được có kênh alpha
  if (opts.resize) img = img.resize(opts.resize);
  return img.toFile(path.join(OUT, name)).then(() => console.log("✓", name));
};

await Promise.all([
  // Icon chính (iOS + mặc định) 1024×1024, không trong suốt
  png("icon.png", svg(1024, place(1024, 0.66, mark()), true), { flatten: true }),
  // Ảnh khởi động: chỉ dấu, nền trong suốt (màu nền đặt trong app.json)
  png("splash-icon.png", svg(1024, place(1024, 1, mark()), false)),
  // Android adaptive: tiền cảnh nằm trong vùng an toàn 66%
  png("android-icon-foreground.png", svg(1024, place(1024, 0.5, mark()), false)),
  png("android-icon-background.png", svg(1024, "", true)),
  png("android-icon-monochrome.png", svg(1024, place(1024, 0.5, mark({ front: "#fff", back: "#fff", bars: "#000" })), false)),
  png("favicon.png", svg(1024, place(1024, 0.72, mark()), true), { flatten: true, resize: 48 }),
]);
