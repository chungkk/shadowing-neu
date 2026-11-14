#!/usr/bin/env node
// Nhập dữ liệu cho tab "Lái xe" và "Leben in Deutschland" từ các repo khác trong ~/Code/ckk.
// Chạy lại khi bộ câu hỏi bên đó đổi:   node scripts/import-portal-content.mjs
//   - Lái xe:  content/laixe/catalog_all (mọi hạng + bản dịch tiếng Việt) + dữ liệu hạng/đề mẫu từ ../fuehrerschein-app/DrivingTheoryApp
//   - LiD:     ../lid-app/src/data/lebenInDeutschland.ts + ảnh ../lid-app/assets/images/lid → public/lid
// Kết quả: src/content/fuehrerschein/questions.json, src/content/lid/questions.json (gọn, chỉ giữ tiếng Đức + tiếng Việt)
// content/laixe/{catalog,catalog_all} là nguồn chính trong repo này (không chép từ ckk-biz nữa);
// sửa bản dịch bằng scripts/patch-laixe-vi.mjs rồi chạy lại script này.
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const ckk = path.resolve(root, "..");
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const write = (p, data) => {
  mkdirSync(path.dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(data));
  console.log(`✔ ${path.relative(root, p)} (${(JSON.stringify(data).length / 1024).toFixed(0)} KB)`);
};

// ---------- Lái xe (mọi hạng bằng, giống app iOS/Android) ----------
// Nguồn: catalog_all (1746 câu + bản dịch vi) + từ app DrivingTheoryApp: classes.json (câu theo hạng),
// answer_stems.json (phần đầu chung của đáp án), musterboegen.ts (99 đề mẫu hạng B). Tên chương: scripts/laixe-chapters.json
{
  const dir = path.join(root, "content/laixe/catalog_all");
  const app = path.join(ckk, "fuehrerschein-app/DrivingTheoryApp");
  const names = readJson(path.join(root, "scripts/laixe-chapters.json"));
  const manifest = readJson(path.join(dir, "manifest.json"));
  const { questions } = readJson(path.join(dir, `${manifest.version}.json`));
  const classes = readJson(path.join(app, "assets/data/classes.json")).classes;
  const stems = readJson(path.join(app, "assets/data/answer_stems.json"));
  const bogenSrc = readFileSync(path.join(app, "src/data/musterboegen.ts"), "utf8");
  const musterboegen = [...bogenSrc.matchAll(/\{ id: (\d+), name: '[^']*', questionIds: (\[[^\]]*\]) \}/g)].map((m) => JSON.parse(m[2]));
  const known = new Set(questions.map((q) => q.question_id));
  if (musterboegen.length !== 99 || musterboegen.some((b) => b.length !== 30 || b.some((id) => !known.has(id)))) throw new Error("Đề mẫu không hợp lệ");

  // Làm sạch chữ như app (utils/helpers.ts)
  const formula = (t) => (t.includes("{") ? t.replace(/\{([^{}]+)\}\/\{([^{}]+)\}/g, "$1 ÷ $2").replace(/ [x×] /g, " × ") : t);
  const cleanOption = (t = "") => formula(t.replace(/^[-–—]\s*/, "").replace(/[[\]]/g, "").trim());
  const cleanText = (t = "") => formula(t.replace(/[[\]]/g, "").trim());
  const cleanQuestion = (t = "") => {
    const clean = cleanText(t);
    const list = clean.match(/^(.*?[:：])\s+-\s+(.+)$/s);
    if (!list) return clean;
    const items = list[2].split(/\s+-\s+/);
    const last = items.pop()?.match(/^(.*?\d\s*(?:kg|кг|كغ|كجم))\.?\s+(\S.*)$/s);
    if (!last) return clean;
    return [list[1], ...[...items, last[1]].map((x) => `• ${x}`), last[2]].join("\n");
  };
  const strip = (s) => s.replace(/\.$/, ""); // "A." → "A"
  const optionImages = (q) => q.options.length > 0 && q.image_urls.length === q.options.length && q.image_urls.every((u, i) => new RegExp(`_a${i + 1}\\.[a-z]+$`, "i").test(u));
  // "1.1.02-050-M" → khoá sắp xếp theo số (giống compareQuestionNumbers của app)
  const orderKey = (id) => {
    const m = id.match(/^(\d+)\.(\d+)\.(\d+)-(\d+)(.*)$/);
    return m ? [+m[1], +m[2], +m[3], +m[4], m[5]] : [99, 0, 0, 0, id];
  };
  const cmp = (a, b) => {
    const x = orderKey(a), y = orderKey(b);
    for (let i = 0; i < 4; i++) if (x[i] !== y[i]) return x[i] - y[i];
    return x[4] < y[4] ? -1 : x[4] > y[4] ? 1 : 0;
  };
  const tr = (lang) => {
    const t = readJson(path.join(dir, `${manifest.translations[lang].version}.json`)).translations;
    return (id) => {
      const x = t[id];
      return x ? { q: cleanQuestion(x.question_text), o: (x.options ?? []).map((o) => cleanOption(o.text)), c: cleanText(x.comment ?? "") } : null;
    };
  };
  const vi = tr("vi");
  const order = ["B", "A", "A2", "A1", "AM", "Mofa", "C", "CE", "C1", "D", "D1", "L", "T"];
  const inClass = Object.fromEntries(order.map((c) => [c, new Set(classes[c].questionIds)]));

  const missing = new Set();
  const out = [...questions]
    .sort((a, b) => cmp(a.question_id, b.question_id))
    .map((q) => {
      const id = q.question_id;
      const chapter = q.chapter_number.replace(/\s*Kapitel$/, "");
      if (!names.chapters[chapter]) missing.add(chapter);
      const optImg = optionImages(q);
      const isVideo = q.video_urls.length > 0;
      const stem = q.options.length ? stems[id] : null;
      return {
        id,
        theme: q.theme_number.replace(/^Thema\s*|\.$/g, ""), // "1.1"
        chapter, // "1.1.01"
        points: Number.parseInt(q.points, 10) || 0,
        cls: order.filter((c) => inClass[c].has(id)).join(","),
        q: cleanQuestion(q.question_text),
        stem: stem ? (/[:.?!]$/.test(stem) ? stem : `${stem} …`) : null,
        // Không có lựa chọn = câu điền số (đáp án nằm ở correct_answers[0].letter)
        options: q.options.map((o) => ({ key: strip(o.letter), text: cleanOption(o.text) })),
        answer: q.options.length ? q.correct_answers.map((a) => strip(a.letter)) : [q.correct_answers[0]?.letter ?? ""],
        explain: cleanText(q.comment),
        images: isVideo ? [] : q.image_urls, // optionImages = mỗi ảnh là 1 lựa chọn
        optionImages: optImg,
        poster: isVideo ? (q.image_urls[0] ?? null) : null, // video: khung hình hiện ở bước trả lời
        video: q.video_urls[0] ?? null,
        vi: vi(id),
      };
    });
  if (missing.size) console.warn(`  ⚠ thiếu tên chương: ${[...missing].join(", ")}`);
  const classInfo = Object.fromEntries(
    order.map((c) => {
      const r = classes[c];
      return [c, { name: r.name, description: r.description.replace(/\s+/g, " ").trim(), vi: names.classes[c]?.vi ?? "", exam: { questions: r.exam.questions ?? 30, grundstoff: r.exam.grundstoff ?? 20, maxErrorPoints: r.exam.maxFehlerpunkte, minutes: 45 } }];
    }),
  );
  write(path.join(root, "src/content/fuehrerschein/questions.json"), {
    version: manifest.version,
    date: manifest.date,
    themes: names.themes,
    chapters: names.chapters,
    classOrder: order,
    classes: classInfo,
    musterboegen,
    questions: out,
  });
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
