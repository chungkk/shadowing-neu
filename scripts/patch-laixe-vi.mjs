#!/usr/bin/env node
// Sửa bản dịch tiếng Việt của catalog Lái xe (content/laixe/{catalog,catalog_all}) từ một file sửa lỗi:
//   node scripts/patch-laixe-vi.mjs content/laixe/corrections/<file>.json
// File sửa lỗi: { "options": { "<question_id>": { "A.": "<chữ mới>" } } }
// Tạo gói dịch vi mới (bất biến, theo hash) rồi đổi manifest. Câu không có trong một catalog thì bỏ qua ở catalog đó.
// Sau đó chạy lại: node scripts/import-portal-content.mjs (để web/mobile nhận bản dịch mới)
import fs from "node:fs";
import path from "node:path";
import { CATALOG_ALL_DIR, CATALOG_DIR, publishCatalog, readManifest, readTranslationPack } from "../src/biz/lib/drivingCatalog.mjs";

const file = process.argv[2];
if (!file) throw new Error("Dùng: node scripts/patch-laixe-vi.mjs <file sửa lỗi>");
const { options = {} } = JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));
const date = new Date().toISOString().slice(0, 10);
const used = new Set();

for (const directory of [CATALOG_DIR, CATALOG_ALL_DIR]) {
  const manifest = readManifest(directory);
  const current = readTranslationPack("vi", manifest.translations.vi.version, directory);
  const translations = structuredClone(current.translations);
  let changed = 0;
  for (const [id, byLetter] of Object.entries(options)) {
    const t = translations[id];
    if (!t) continue;
    for (const [letter, text] of Object.entries(byLetter)) {
      const o = t.options.find((x) => x.letter === letter);
      if (!o) throw new Error(`${id}: không có phương án ${letter}`);
      if (o.text !== text) {
        o.text = text;
        changed++;
      }
    }
    used.add(id);
  }
  if (!changed) {
    console.log(`= ${path.basename(directory)}: không có gì đổi`);
    continue;
  }
  const { manifest: next } = publishCatalog({ directory, translations: { vi: translations }, date });
  console.log(`✔ ${path.basename(directory)}: sửa ${changed} phương án → ${next.translations.vi.version}`);
}
const unknown = Object.keys(options).filter((id) => !used.has(id));
if (unknown.length) throw new Error(`Không tìm thấy câu: ${unknown.join(", ")}`);
