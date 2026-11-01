// Tạo icon app + ảnh khởi động từ SVG, kèm favicon/icon của web (src/app) cho đồng bộ.
// Chạy: node mobile/scripts/make-icons.mjs (từ thư mục gốc repo, cần sharp của web)
import { writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(path.join(process.cwd(), "package.json"));
const sharp = require("sharp");
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "assets", "images");
const WEB_OUT = path.join(process.cwd(), "src", "app");

const BG_HI = "#1f2a24";
const BG_LO = "#070b09";

/**
 * Sóng âm trắng (giọng mẫu) + hai lớp "bóng" đỏ, vàng lệch chéo phía sau (giọng bạn nói theo — shadowing,
 * mang màu cờ Đức). Toạ độ theo khung 1024; `scale` phóng quanh tâm. Màu đặc → icon nhuộm màu / đơn sắc;
 * `"none"` ẩn lớp đó.
 */
const HEIGHTS = [0.42, 0.78, 1, 0.66, 0.36];
const BAR_W = 87, GAP = 51, MAX_H = 560, ECHO = 28;
function mark({ scale = 1, front = "url(#white)", mid = "url(#red)", back = "url(#gold)" } = {}) {
  const total = HEIGHTS.length * BAR_W + (HEIGHTS.length - 1) * GAP;
  const x0 = 512 - total / 2 - ECHO, cy = 512 - ECHO;
  const bars = (dx, fill) =>
    fill === "none"
      ? ""
      : HEIGHTS.map((h, i) => {
          const bh = MAX_H * h;
          return `<rect x="${x0 + dx + i * (BAR_W + GAP)}" y="${cy + dx - bh / 2}" width="${BAR_W}" height="${bh}" rx="${BAR_W / 2}" fill="${fill}"/>`;
        }).join("");
  return `<g transform="translate(512 512) scale(${scale}) translate(-512 -512)">
    ${bars(ECHO * 2, back)}
    ${bars(ECHO, mid)}
    ${bars(0, front)}
  </g>`;
}

const svg = (body, bg = "") => `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="bg" gradientUnits="userSpaceOnUse" cx="205" cy="102" r="1178">
      <stop offset="0" stop-color="${BG_HI}"/>
      <stop offset="1" stop-color="${BG_LO}"/>
    </radialGradient>
    <linearGradient id="white" gradientUnits="userSpaceOnUse" x1="0" y1="225" x2="0" y2="799">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#e1fceb"/>
    </linearGradient>
    <linearGradient id="red" gradientUnits="userSpaceOnUse" x1="0" y1="225" x2="0" y2="799">
      <stop offset="0" stop-color="#f43f5e"/>
      <stop offset="1" stop-color="#be123c"/>
    </linearGradient>
    <linearGradient id="gold" gradientUnits="userSpaceOnUse" x1="0" y1="225" x2="0" y2="799">
      <stop offset="0" stop-color="#fde047"/>
      <stop offset="1" stop-color="#f59e0b"/>
    </linearGradient>
  </defs>
  ${bg}
  ${body}
</svg>`;

const DARK_BG = `<rect width="1024" height="1024" fill="url(#bg)"/>`;
// Favicon web: góc bo như icon app, dấu phóng to cho dễ nhìn ở 16px
const WEB_BG = `<rect width="1024" height="1024" rx="225" fill="url(#bg)"/>`;
const WEB_MARK = mark({ scale: 1.2 });

const png = (name, s, opts = {}) => {
  let img = sharp(Buffer.from(s));
  if (opts.flatten) img = img.flatten({ background: opts.flatten }); // iOS: icon chính không được có kênh alpha
  if (opts.gray) img = img.grayscale();
  if (opts.resize) img = img.resize(opts.resize);
  return img
    .png()
    .toFile(path.resolve(OUT, name))
    .then(() => console.log("✓", name));
};

/** Gói nhiều PNG vuông vào một file .ico (định dạng ICO cho phép nhúng PNG nguyên khối). */
async function ico(file, s, sizes) {
  const pngs = await Promise.all(sizes.map((n) => sharp(Buffer.from(s)).resize(n).png().toBuffer()));
  const head = Buffer.alloc(6 + 16 * pngs.length);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(pngs.length, 4);
  let offset = head.length;
  pngs.forEach((buf, i) => {
    const e = 6 + 16 * i;
    head.writeUInt8(sizes[i] % 256, e);
    head.writeUInt8(sizes[i] % 256, e + 1);
    head.writeUInt16LE(1, e + 4);
    head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(buf.length, e + 8);
    head.writeUInt32LE(offset, e + 12);
    offset += buf.length;
  });
  await writeFile(file, Buffer.concat([head, ...pngs]));
  console.log("✓", path.relative(process.cwd(), file));
}

await Promise.all([
  // Icon chính (iOS + mặc định) 1024×1024, không trong suốt
  png("icon.png", svg(mark(), DARK_BG), { flatten: BG_LO }),
  // iOS 18+ chế độ tối: nền trong suốt (hệ thống tự phủ nền tối); nhuộm màu: ảnh xám trên nền đen
  png("icon-dark.png", svg(mark())),
  png("icon-tinted.png", svg(mark({ front: "#fff", mid: "#a0a0a0", back: "#606060" }), `<rect width="1024" height="1024" fill="#000"/>`), {
    flatten: "#000",
    gray: true,
  }),
  // Ảnh khởi động: chỉ dấu, nền trong suốt (màu nền đặt trong app.json)
  png("splash-icon.png", svg(mark({ scale: 1.5 }))),
  // Android adaptive: tiền cảnh nằm trong vùng an toàn 66%
  png("android-icon-foreground.png", svg(mark({ scale: 0.75 }))),
  png("android-icon-background.png", svg("", DARK_BG), { flatten: BG_LO }),
  png("android-icon-monochrome.png", svg(mark({ scale: 0.75, front: "#fff", mid: "none", back: "none" }))),
  png("favicon.png", svg(mark(), DARK_BG), { flatten: BG_LO, resize: 48 }),
  // Web (Next.js file conventions trong src/app)
  writeFile(path.join(WEB_OUT, "icon.svg"), svg(WEB_MARK, WEB_BG)).then(() => console.log("✓ src/app/icon.svg")),
  ico(path.join(WEB_OUT, "favicon.ico"), svg(WEB_MARK, WEB_BG), [16, 32, 48]),
  // iOS tự bo góc → nền vuông, không trong suốt
  png(path.join(WEB_OUT, "apple-icon.png"), svg(mark(), DARK_BG), { flatten: BG_LO, resize: 180 }),
]);
