#!/usr/bin/env node
// Nhập dữ liệu cho tab "Lái xe" và "Leben in Deutschland" từ các repo khác trong ~/Code/ckk.
// Chạy lại khi bộ câu hỏi bên đó đổi:   node scripts/import-portal-content.mjs
//   - Lái xe:  ../ckk-biz/data/laixe/catalog (bộ hạng B mà app iOS đang dùng) + bản dịch tiếng Việt
//   - LiD:     ../lid-app/src/data/lebenInDeutschland.ts + ảnh ../lid-app/assets/images/lid → public/lid
// Kết quả: src/content/fuehrerschein/klasse-b.json, src/content/lid/questions.json (gọn, chỉ giữ tiếng Đức + tiếng Việt)
//   + content/laixe/{catalog,catalog_all}: bản sao nguyên catalog mà /api/fuehrerschein/* phục vụ cho app iOS/Android
//     (vẫn tạo/publish bằng scripts của ckk-biz: npm run catalog:publish, rồi chạy script này và deploy)
import { copyFileSync, cpSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const ckk = path.resolve(root, "..");
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const write = (p, data) => {
  mkdirSync(path.dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(data));
  console.log(`✔ ${path.relative(root, p)} (${(JSON.stringify(data).length / 1024).toFixed(0)} KB)`);
};

// ---------- Catalog cho API của app lái xe ----------
for (const dir of ["catalog", "catalog_all"]) {
  const from = path.join(ckk, "ckk-biz/data/laixe", dir);
  cpSync(from, path.join(root, "content/laixe", dir), { recursive: true, filter: (f) => !path.basename(f).startsWith(".") });
  console.log(`✔ content/laixe/${dir}`);
}

// ---------- Lái xe (Führerschein Klasse B) ----------
{
  const dir = path.join(ckk, "ckk-biz/data/laixe/catalog");
  const manifest = readJson(path.join(dir, "manifest.json"));
  const { questions } = readJson(path.join(dir, `${manifest.version}.json`));
  const vi = readJson(path.join(dir, `${manifest.translations.vi.version}.json`)).translations;
  const strip = (s) => s.replace(/\.$/, ""); // "A." → "A"
  const out = questions.map((q) => {
    const t = vi[q.question_id];
    return {
      id: q.question_id,
      theme: q.theme_number.replace(/^Thema\s*|\.$/g, ""), // "1.1"
      themeName: q.theme_name,
      chapter: q.chapter_number.replace(/\s*Kapitel$/, ""), // "1.1.01"
      chapterName: q.chapter_name,
      points: Number.parseInt(q.points, 10) || 0,
      q: q.question_text,
      qVi: t?.question_text ?? "",
      // Không có lựa chọn = câu điền số (đáp án nằm ở correct_answers[0].letter)
      options: q.options.map((o, i) => ({ key: strip(o.letter), text: o.text, textVi: t?.options[i]?.text ?? "" })),
      answer: q.options.length ? q.correct_answers.map((a) => strip(a.letter)) : [q.correct_answers[0]?.letter ?? ""],
      explain: q.comment,
      explainVi: t?.comment ?? "",
      images: q.video_urls.length ? [] : q.image_urls, // video: ảnh là khung đầu, không cần hiện riêng
      video: q.video_urls[0] ?? null,
    };
  });
  write(path.join(root, "src/content/fuehrerschein/klasse-b.json"), { version: manifest.version, date: manifest.date, questions: out });
}

// ---------- Leben in Deutschland ----------
{
  const src = readFileSync(path.join(ckk, "lid-app/src/data/lebenInDeutschland.ts"), "utf8");
  const between = (start, end, open) => {
    const a = src.indexOf(open, src.indexOf(start));
    return JSON.parse(src.slice(a, src.indexOf(end)).trim().replace(/;$/, ""));
  };
  // Danh sách bang viết kiểu JS ({ code: "bw", … }), không phải JSON → thêm ngoặc kép cho tên khoá
  const statesSrc = src.slice(src.indexOf("[", src.indexOf("export const bundeslaender")), src.indexOf("export const generalQuestions"));
  const states = JSON.parse(statesSrc.trim().replace(/;$/, "").replace(/(\w+):/g, '"$1":'));
  const general = between("export const generalQuestions", "export const stateQuestions", "[");
  const byState = between("export const stateQuestions", "export const testConfig", "{");
  const imgDir = path.join(ckk, "lid-app/assets/images/lid");
  const available = new Set(readdirSync(imgDir));
  const pub = path.join(root, "public/lid");
  mkdirSync(pub, { recursive: true });
  const image = (img) => {
    if (!img) return null;
    const name = path.basename(img);
    if (!available.has(name)) {
      console.warn(`  ⚠ thiếu ảnh ${name}`);
      return null;
    }
    copyFileSync(path.join(imgDir, name), path.join(pub, name));
    return `/lid/${name}`;
  };
  const conv = (q, id) => ({
    id,
    q: q.q,
    qVi: q.vi?.q ?? "",
    options: q.o.map((text, i) => ({ key: String(i), text, textVi: q.vi?.o?.[i] ?? "" })),
    answer: [String(q.a)],
    image: image(q.img),
  });
  write(path.join(root, "src/content/lid/questions.json"), {
    states,
    general: general.map((q) => conv(q, `g${q.id}`)),
    state: Object.fromEntries(Object.entries(byState).map(([code, qs]) => [code, qs.map((q) => conv(q, `${code}${q.id}`))])),
  });
}
