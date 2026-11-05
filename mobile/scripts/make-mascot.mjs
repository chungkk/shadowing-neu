// Tách linh vật (public/mascot.svg, các bộ phận có id m-*) thành bản chuyển động:
// - Web: public/mascot-animated.svg — SVG tự chạy bằng CSS, dùng được trong <img>
// - Web: public/mascot-loading.svg — dáng riêng lúc tải trang: mắt đảo tìm, gật theo nhạc, bong bóng "..."
// - App: assets/images/mascot-parts/*.png — mỗi bộ phận 1 lớp, ghép lại và cho chạy trong <AnimatedMascot>
// Chạy: node mobile/scripts/make-mascot.mjs (từ thư mục gốc repo, cần sharp của web)
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(path.join(process.cwd(), "package.json"));
const sharp = require("sharp");
const SOURCE = await readFile(path.join(process.cwd(), "public", "mascot.svg"), "utf8");
const PARTS_OUT = path.join(process.cwd(), "mobile", "assets", "images", "mascot-parts");
const PART_SIZE = 176;

// Tâm xoay ghi theo toạ độ trong nhóm vẽ của linh vật (trước transform của nhóm đó)
const STYLE = `<style>
#m-bar-1, #m-bar-2, #m-bar-3, #m-eye-l, #m-eye-r { transform-box: fill-box; transform-origin: center; }
#m-bar-1 { animation: m-bar 1.1s ease-in-out infinite; }
#m-bar-2 { animation: m-bar 1.1s ease-in-out -0.35s infinite; }
#m-bar-3 { animation: m-bar 1.1s ease-in-out -0.7s infinite; }
#m-leaf { transform-origin: 215px 700px; animation: m-leaf 2.6s ease-in-out infinite; }
#m-tail { transform-origin: 770px 700px; animation: m-tail 2.8s ease-in-out infinite; }
#m-body { transform-origin: 660px 740px; animation: m-breathe 2.8s ease-in-out infinite; }
#m-head { transform-origin: 590px 560px; animation: m-head 2.8s ease-in-out infinite; }
#m-mouth { transform-origin: 410px 450px; animation: m-mouth 1.1s ease-in-out infinite; }
#m-pompom { transform-origin: 672px 200px; animation: m-pompom 1.4s ease-in-out infinite; }
#m-eye-l, #m-eye-r { animation: m-blink 4.2s linear infinite; }
@keyframes m-bar { 50% { transform: scaleY(0.55); } }
@keyframes m-leaf { 50% { transform: rotate(-10deg); } }
@keyframes m-tail { 50% { transform: rotate(7deg); } }
@keyframes m-breathe { 50% { transform: scale(1.025); } }
@keyframes m-head { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(4deg) translateY(6px); } }
@keyframes m-mouth { 50% { transform: scaleY(0.82); } }
@keyframes m-pompom { 50% { transform: rotate(12deg); } }
@keyframes m-blink { 0%, 92%, 100% { transform: scaleY(1); } 96% { transform: scaleY(0.08); } }
@media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
</style>`;

await writeFile(path.join(process.cwd(), "public", "mascot-animated.svg"), SOURCE.replace("<defs>", `${STYLE}\n<defs>`));
console.log("✓ public/mascot-animated.svg");

// Dáng đang tải: mắt tắc kè đảo độc lập (đứng lại rồi liếc nhanh), mọi thứ nhún nhanh hơn, thêm bong bóng ba chấm trên đầu
const LOADING_STYLE = `<style>
#m-bar-1, #m-bar-2, #m-bar-3 { transform-box: fill-box; transform-origin: center; }
#m-bar-1 { animation: m-bar .6s ease-in-out infinite; }
#m-bar-2 { animation: m-bar .6s ease-in-out -.2s infinite; }
#m-bar-3 { animation: m-bar .6s ease-in-out -.4s infinite; }
#m-leaf { transform-origin: 215px 700px; animation: m-leaf 1.2s ease-in-out infinite; }
#m-tail { transform-origin: 770px 700px; animation: m-tail 1.2s ease-in-out infinite; }
#m-head { transform-origin: 590px 560px; animation: m-head .8s ease-in-out infinite; }
#m-pompom { transform-origin: 672px 200px; animation: m-pompom .8s ease-in-out infinite; }
#m-eye-l { animation: m-look-l 2.8s ease-in-out infinite; }
#m-eye-r { animation: m-look-r 2.8s ease-in-out infinite; }
.m-dot { animation: m-dot 1.05s ease-in-out infinite; }
.m-dot:nth-child(2) { animation-delay: .15s; }
.m-dot:nth-child(3) { animation-delay: .3s; }
@keyframes m-bar { 50% { transform: scaleY(.35); } }
@keyframes m-leaf { 50% { transform: rotate(-16deg); } }
@keyframes m-tail { 50% { transform: rotate(11deg); } }
@keyframes m-head { 0%, 100% { transform: rotate(-2deg); } 50% { transform: rotate(4deg) translateY(10px); } }
@keyframes m-pompom { 50% { transform: rotate(20deg); } }
@keyframes m-look-l { 0%, 22% { transform: translate(52px, -22px); } 30%, 55% { transform: translate(-14px, 24px); } 63%, 88% { transform: translate(48px, 26px); } 96%, 100% { transform: translate(52px, -22px); } }
@keyframes m-look-r { 0%, 14% { transform: translate(-10px, -24px); } 22%, 47% { transform: translate(54px, 20px); } 55%, 80% { transform: translate(6px, 30px); } 88%, 100% { transform: translate(-10px, -24px); } }
@keyframes m-dot { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-20px); } }
@media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
</style>`;
const BUBBLE = `<g id="m-bubble">
  <circle cx="288" cy="218" r="11" fill="#fffaf3" stroke="#55303f" stroke-width="8"/>
  <circle cx="254" cy="186" r="17" fill="#fffaf3" stroke="#55303f" stroke-width="9"/>
  <rect x="44" y="40" width="262" height="124" rx="62" fill="#fffaf3" stroke="#55303f" stroke-width="11"/>
  <g><circle class="m-dot" cx="110" cy="102" r="21" fill="#f43f5e"/><circle class="m-dot" cx="175" cy="102" r="21" fill="#fbbf24"/><circle class="m-dot" cx="240" cy="102" r="21" fill="#14b8a6"/></g>
</g>
`;
await writeFile(path.join(process.cwd(), "public", "mascot-loading.svg"), SOURCE.replace("<defs>", `${LOADING_STYLE}\n<defs>`).replace("</svg>", `${BUBBLE}</svg>`));
console.log("✓ public/mascot-loading.svg");

// Mỗi lớp = SVG gốc, ẩn hết các lớp còn lại. Mắt nằm trong đầu nên lớp "eyes" giữ đầu nhưng ẩn phần còn lại của đầu.
const TOP = ["m-waves", "m-branch", "m-tail", "m-body", "m-head", "m-legs"];
const hide = (ids) => `<style>${ids.map((id) => `#${id}`).join(", ")} { display: none; }</style>`;
const eyes = [...SOURCE.matchAll(/<g id="m-eye-[lr]">.*?<\/g>/g)].map((m) => m[0]).join("");
const group = SOURCE.match(/<g transform="[^"]+">/)[0];
const open = SOURCE.match(/^<svg[^>]*>/)[0];
const layers = {
  waves: SOURCE.replace("<defs>", `${hide(TOP.filter((id) => id !== "m-waves"))}\n<defs>`),
  branch: SOURCE.replace("<defs>", `${hide(TOP.filter((id) => id !== "m-branch"))}\n<defs>`),
  tail: SOURCE.replace("<defs>", `${hide(TOP.filter((id) => id !== "m-tail"))}\n<defs>`),
  body: SOURCE.replace("<defs>", `${hide(TOP.filter((id) => id !== "m-body"))}\n<defs>`),
  head: SOURCE.replace("<defs>", `${hide([...TOP.filter((id) => id !== "m-head"), "m-eye-l", "m-eye-r"])}\n<defs>`),
  eyes: `${open}${group}${eyes}</g></svg>`,
  legs: SOURCE.replace("<defs>", `${hide(TOP.filter((id) => id !== "m-legs"))}\n<defs>`),
};
await mkdir(PARTS_OUT, { recursive: true });
await Promise.all(
  Object.entries(layers).map(async ([name, svg]) => {
    await sharp(Buffer.from(svg)).resize(PART_SIZE).png({ compressionLevel: 9 }).toFile(path.join(PARTS_OUT, `${name}.png`));
    console.log(`✓ mascot-parts/${name}.png`);
  }),
);
