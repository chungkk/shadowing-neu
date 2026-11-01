// CSV (cột: word, plural, meaning, example — có dòng tiêu đề) → khung JSON bộ từ cho src/content/decks/
// Dùng: node scripts/csv-to-deck.mjs words.csv > src/content/decks/<slug>.json   (rồi sửa slug / title / category / level)
import { readFileSync } from "node:fs";
import path from "node:path";

const file = process.argv[2];
if (!file) {
  console.error("Dùng: node scripts/csv-to-deck.mjs <file.csv>");
  process.exit(1);
}

/** Tách CSV có ngoặc kép ("a, b" · "" = dấu ngoặc kép), tự nhận dấu phẩy / chấm phẩy / tab */
function parse(text) {
  const sep = [",", ";", "\t"].sort((a, b) => text.split("\n")[0].split(b).length - text.split("\n")[0].split(a).length)[0];
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += c;
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((x) => x.trim()));
}

const [head, ...rows] = parse(readFileSync(file, "utf8").replace(/^﻿/, ""));
const col = (name) => head.findIndex((h) => h.trim().toLowerCase() === name);
const idx = { word: col("word"), plural: col("plural"), meaning: col("meaning"), example: col("example") };
if (idx.word < 0 || idx.meaning < 0) {
  console.error("CSV cần ít nhất cột word và meaning");
  process.exit(1);
}

const slug = path.basename(file, path.extname(file));
const words = rows
  .map((r) => {
    const get = (k) => (idx[k] >= 0 ? (r[idx[k]] ?? "").trim() : "");
    const w = { word: get("word"), meaning: get("meaning") };
    if (get("plural")) w.plural = get("plural");
    if (get("example")) w.example = get("example");
    return w;
  })
  .filter((w) => w.word);

console.log(JSON.stringify({ slug, title: slug, description: "", category: "Trình độ A1", level: "A1", order: 100, words }, null, 2));
