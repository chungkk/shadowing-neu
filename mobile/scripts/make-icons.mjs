// Tạo icon app + ảnh khởi động từ SVG, kèm favicon/icon của web (src/app) cho đồng bộ.
// Chạy: node mobile/scripts/make-icons.mjs (từ thư mục gốc repo, cần sharp của web)
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(path.join(process.cwd(), "package.json"));
const sharp = require("sharp");
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "assets", "images");
const WEB_OUT = path.join(process.cwd(), "src", "app");

// Nền kem như giao diện web/app
const BG_HI = "#fffdf9";
const BG_LO = "#ffedd6";

// Linh vật tắc kè đeo tai nghe (nền trong suốt, khung 1024); tâm hình nằm ở CX, CY.
const MASCOT = (await readFile(path.join(OUT, "mascot.svg"), "utf8")).replace(/^<svg[^>]*>|<\/svg>\s*$/g, "");
const CX = 473.5, CY = 503.5;
/** Cả nhân vật canh giữa khung; `scale` phóng quanh tâm. */
function mark({ scale = 1 } = {}) {
  return `<g transform="translate(512 512) scale(${scale}) translate(${-CX} ${-CY})">${MASCOT}</g>`;
}
/** Phần đầu nhân vật cho favicon: cả cảnh không đọc được ở 16–32px. */
function headMark() {
  return `<g clip-path="url(#round)"><g transform="scale(${1024 / 600}) translate(-225 -100)">${MASCOT}</g></g>`;
}

const svg = (body, bg = "") => `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="bg" gradientUnits="userSpaceOnUse" cx="205" cy="102" r="1178">
      <stop offset="0" stop-color="${BG_HI}"/>
      <stop offset="1" stop-color="${BG_LO}"/>
    </radialGradient>
    <clipPath id="round"><rect width="1024" height="1024" rx="225"/></clipPath>
  </defs>
  ${bg}
  ${body}
</svg>`;

const DARK_BG = `<rect width="1024" height="1024" fill="url(#bg)"/>`;
// Favicon web: góc bo như icon app
const WEB_BG = `<rect width="1024" height="1024" rx="225" fill="url(#bg)"/>`;
const WEB_MARK = headMark();

/** Giữ lại nét sáng làm độ đục: icon đơn sắc vẫn thấy mặt thay vì một khối đặc. */
async function monochrome(name, s) {
  const { data, info } = await sharp(Buffer.from(s)).flatten({ background: "#000" }).grayscale().raw().toBuffer({ resolveWithObject: true });
  const white = Buffer.alloc(info.width * info.height, 255);
  await sharp(white, { raw: { width: info.width, height: info.height, channels: 1 } })
    .toColourspace("srgb")
    .joinChannel(data, { raw: { width: info.width, height: info.height, channels: 1 } })
    .png()
    .toFile(path.resolve(OUT, name));
  console.log("✓", name);
}

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
  png("icon-tinted.png", svg(mark(), `<rect width="1024" height="1024" fill="#000"/>`), {
    flatten: "#000",
    gray: true,
  }),
  // Ảnh khởi động: chỉ dấu, nền trong suốt (màu nền đặt trong app.json)
  png("splash-icon.png", svg(mark())),
  // Android adaptive: tiền cảnh nằm trong vùng an toàn 66%
  png("android-icon-foreground.png", svg(mark({ scale: 0.72 }))),
  png("android-icon-background.png", svg("", DARK_BG), { flatten: BG_LO }),
  monochrome("android-icon-monochrome.png", svg(mark({ scale: 0.72 }))),
  png("favicon.png", svg(WEB_MARK, WEB_BG), { resize: 48 }),
  // Web (Next.js file conventions trong src/app)
  writeFile(path.join(WEB_OUT, "icon.svg"), svg(WEB_MARK, WEB_BG)).then(() => console.log("✓ src/app/icon.svg")),
  ico(path.join(WEB_OUT, "favicon.ico"), svg(WEB_MARK, WEB_BG), [16, 32, 48]),
  // iOS tự bo góc → nền vuông, không trong suốt
  png(path.join(WEB_OUT, "apple-icon.png"), svg(mark(), DARK_BG), { flatten: BG_LO, resize: 180 }),
]);
