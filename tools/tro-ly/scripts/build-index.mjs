// Bước 4: Gom các bài đã duyệt (và bài nháp nếu ALLOW_DRAFTS=1) thành index.json
// cho server tìm kiếm. Chạy lại mỗi khi sửa bài.
import fs from "node:fs";
import { fileFor, parseFrontmatter } from "./lib.mjs";

const allowDrafts = process.env.ALLOW_DRAFTS === "1";
const docs = [];
let skipped = 0;
for (const f of fs.readdirSync("articles").filter((x) => x.endsWith(".md")).sort()) {
  const { meta, body } = parseFrontmatter(fs.readFileSync(`articles/${f}`, "utf8"));
  if (meta.status !== "reviewed" && !allowDrafts) { skipped++; continue; }
  const clean = body.replace(/<!--[\s\S]*?-->/g, "").trim();
  // Kèm nguyên văn điều luật mà bài dẫn, để bot trích chính xác khi được hỏi sâu.
  const laws = (meta.sources ?? [])
    .map((s) => fileFor(s.url))
    .filter((p) => p?.startsWith("laws/") && fs.existsSync(p))
    .map((p) => {
      const { meta: lm, body: lb } = parseFrontmatter(fs.readFileSync(p, "utf8"));
      return { title: lm.title, url: lm.url, text: lb.trim().slice(0, 3000) };
    });
  docs.push({
    id: meta.id,
    kind: meta.kind,
    status: meta.status,
    title: meta.title,
    summary: meta.summary ?? "",
    keywords: meta.keywords ?? [],
    updated: meta.updated ?? "",
    sources: meta.sources ?? [],
    body: clean,
    laws,
  });
}
fs.writeFileSync("index.json", JSON.stringify({ built: new Date().toISOString(), docs }));
console.log(`index.json: ${docs.length} bài${allowDrafts ? " (gồm bài nháp)" : ""}, bỏ qua ${skipped} bài chưa duyệt.`);
