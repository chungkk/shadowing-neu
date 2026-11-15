#!/usr/bin/env node
// Đóng gói ảnh câu hỏi Lái xe + Leben in Deutschland vào app (chạy lại sau mỗi lần cập nhật bộ câu hỏi ở ../src/content):
//   node scripts/import-quiz-media.mjs [thư mục ảnh webp của app lái xe cũ]
// - Lái xe: ảnh webp đã nén sẵn của DrivingTheoryApp (tên = tên file gốc, "." → "_"). Ảnh chưa có bản webp
//   (chủ yếu khung hình đầu video) app tải từ URL gốc rồi giữ trong bộ nhớ đệm.
// - LiD: ảnh trong ../public/lid (đường dẫn "/lid/…" của bộ câu hỏi).
// Kết quả: assets/quiz/{laixe,lid}/ + src/lib/quiz/media-map.ts (URL → require ảnh trong app).

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.resolve(here, "..");
const web = path.resolve(app, "..");
const srcWebp = path.resolve(process.argv[2] ?? path.join(process.env.APPS_DIR ?? path.join(os.homedir(), "Code"), "fuehrerschein-app/DrivingTheoryApp/assets/images"));

const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const fresh = (dir) => {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
};

// ---- Lái xe ----
const fsData = read(path.join(web, "src/content/fuehrerschein/questions.json"));
const urls = new Set();
for (const q of fsData.questions) for (const u of [...q.images, q.poster]) if (u) urls.add(u);

const laixeDir = path.join(app, "assets/quiz/laixe");
fresh(laixeDir);
const laixe = [];
for (const url of [...urls].sort()) {
  const name = path.basename(new URL(url).pathname).replace(/\.[^.]+$/, "").replace(/\./g, "_") + ".webp";
  const from = path.join(srcWebp, name);
  if (!fs.existsSync(from)) continue;
  fs.copyFileSync(from, path.join(laixeDir, name));
  laixe.push([url, `@/assets/quiz/laixe/${name}`]);
}

// ---- LiD ----
const lidData = read(path.join(web, "src/content/lid/questions.json"));
const lidPaths = new Set();
for (const q of [...lidData.general, ...Object.values(lidData.state).flat()]) if (q.image) lidPaths.add(q.image);

const lidDir = path.join(app, "assets/quiz/lid");
fresh(lidDir);
const lid = [];
const lidMissing = [];
for (const p of [...lidPaths].sort()) {
  const from = path.join(web, "public", p);
  if (!fs.existsSync(from)) {
    lidMissing.push(p);
    continue;
  }
  const name = path.basename(p);
  fs.copyFileSync(from, path.join(lidDir, name));
  lid.push([p, `@/assets/quiz/lid/${name}`]);
}

const entries = (list) => list.map(([k, v]) => `  ${JSON.stringify(k)}: require(${JSON.stringify(v)}),`).join("\n");
fs.writeFileSync(
  path.join(app, "src/lib/quiz/media-map.ts"),
  `// Tạo bằng scripts/import-quiz-media.mjs — không sửa tay.

/** Ảnh câu hỏi lái xe đóng gói trong app, theo URL gốc trong bộ câu hỏi */
export const LAIXE_IMAGES: Record<string, number> = {
${entries(laixe)}
};

/** Ảnh câu hỏi LiD đóng gói trong app, theo đường dẫn "/lid/…" trong bộ câu hỏi */
export const LID_IMAGES: Record<string, number> = {
${entries(lid)}
};
`,
);

const size = (dir) => fs.readdirSync(dir).reduce((n, f) => n + fs.statSync(path.join(dir, f)).size, 0);
console.log(`Lái xe: ${laixe.length}/${urls.size} ảnh trong app (${(size(laixeDir) / 1e6).toFixed(1)} MB), còn lại tải từ mạng`);
console.log(`LiD: ${lid.length}/${lidPaths.size} ảnh (${(size(lidDir) / 1e6).toFixed(1)} MB)${lidMissing.length ? ` · thiếu: ${lidMissing.join(", ")}` : ""}`);
