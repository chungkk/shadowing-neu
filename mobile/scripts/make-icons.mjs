// Tạo icon app + ảnh khởi động từ SVG. Chạy: node mobile/scripts/make-icons.mjs (từ thư mục gốc repo, cần sharp của web)
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(path.join(process.cwd(), "package.json"));
const sharp = require("sharp");
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "assets", "images");

const GREEN_HI = "#28dc6e";
const GREEN = "#16a34a";
const GREEN_LO = "#042c19";

/**
 * Sóng âm trắng (giọng mẫu) + "bóng" vàng lệch chéo phía sau (giọng bạn nói theo — shadowing).
 * Toạ độ theo khung 1024; `scale` phóng quanh tâm. `plain` → màu đặc (icon nhuộm màu / đơn sắc).
 */
const HEIGHTS = [0.42, 0.78, 1, 0.66, 0.36];
const BAR_W = 87, GAP = 51, MAX_H = 573, ECHO = 29;
function mark({ scale = 1, front = "url(#white)", back = "url(#gold)", shadow = true } = {}) {
  const total = HEIGHTS.length * BAR_W + (HEIGHTS.length - 1) * GAP;
  const x0 = 512 - total / 2 - ECHO / 2, cy = 512 - ECHO / 2;
  const bars = (dx, fill, extra = "") =>
    HEIGHTS.map((h, i) => {
      const bh = MAX_H * h;
      return `<rect x="${x0 + dx + i * (BAR_W + GAP)}" y="${cy + dx - bh / 2}" width="${BAR_W}" height="${bh}" rx="${BAR_W / 2}" fill="${fill}"${extra}/>`;
    }).join("");
  return `<g transform="translate(512 512) scale(${scale}) translate(-512 -512)">
    ${shadow ? `<g filter="url(#soft)" transform="translate(10 26)">${bars(ECHO, "#00190c", ' fill-opacity="0.5"')}</g>` : ""}
    ${bars(ECHO, back)}
    ${bars(0, front)}
  </g>`;
}

const svg = (body, bg = "") => `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="bg" gradientUnits="userSpaceOnUse" cx="205" cy="102" r="1178">
      <stop offset="0" stop-color="${GREEN}"/>
      <stop offset="1" stop-color="${GREEN_LO}"/>
    </radialGradient>
    <radialGradient id="glow" gradientUnits="userSpaceOnUse" cx="184" cy="82" r="614">
      <stop offset="0" stop-color="${GREEN_HI}" stop-opacity="0.5"/>
      <stop offset="1" stop-color="${GREEN_HI}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="white" gradientUnits="userSpaceOnUse" x1="0" y1="225" x2="0" y2="799">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#e1fceb"/>
    </linearGradient>
    <linearGradient id="gold" gradientUnits="userSpaceOnUse" x1="0" y1="225" x2="0" y2="799">
      <stop offset="0" stop-color="#fde047"/>
      <stop offset="1" stop-color="#f59e0b"/>
    </linearGradient>
    <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="12"/></filter>
  </defs>
  ${bg}
  ${body}
</svg>`;

const GREEN_BG = `<rect width="1024" height="1024" fill="url(#bg)"/><rect width="1024" height="1024" fill="url(#glow)"/>`;

const png = (name, s, opts = {}) => {
  let img = sharp(Buffer.from(s));
  if (opts.flatten) img = img.flatten({ background: opts.flatten }); // iOS: icon chính không được có kênh alpha
  if (opts.gray) img = img.grayscale();
  if (opts.resize) img = img.resize(opts.resize);
  return img
    .png()
    .toFile(path.join(OUT, name))
    .then(() => console.log("✓", name));
};

await Promise.all([
  // Icon chính (iOS + mặc định) 1024×1024, không trong suốt
  png("icon.png", svg(mark(), GREEN_BG), { flatten: GREEN_LO }),
  // iOS 18+ chế độ tối: nền trong suốt (hệ thống tự phủ nền tối); nhuộm màu: ảnh xám trên nền đen
  png("icon-dark.png", svg(mark({ shadow: false }))),
  png("icon-tinted.png", svg(mark({ front: "#fff", back: "#808080", shadow: false }), `<rect width="1024" height="1024" fill="#000"/>`), {
    flatten: "#000",
    gray: true,
  }),
  // Ảnh khởi động: chỉ dấu, nền trong suốt (màu nền đặt trong app.json)
  png("splash-icon.png", svg(mark({ scale: 1.5, shadow: false }))),
  // Android adaptive: tiền cảnh nằm trong vùng an toàn 66%
  png("android-icon-foreground.png", svg(mark({ scale: 0.75 }))),
  png("android-icon-background.png", svg("", GREEN_BG), { flatten: GREEN_LO }),
  png("android-icon-monochrome.png", svg(mark({ scale: 0.75, front: "#fff", back: "#fff", shadow: false }))),
  png("favicon.png", svg(mark(), GREEN_BG), { flatten: GREEN_LO, resize: 48 }),
]);
