// Bước 1: Lấy từ dữ liệu crawl CHỈ những dữ kiện không có bản quyền:
// danh sách chủ đề, điều luật được viện dẫn và đường link nguồn chính thức.
// Không sao chép câu chữ (lead, steps, notes, answer) của Ankommly.
//
// Dùng: node scripts/extract-sources.mjs <thư mục crawl>
import fs from "node:fs";
import path from "node:path";
import { START_CWD } from "./lib.mjs";

if (!process.argv[2]) {
  console.error("Thiếu đường dẫn thư mục crawl. Ví dụ: node tools/tro-ly/scripts/extract-sources.mjs ~/ankommly-crawl");
  process.exit(1);
}
const crawlDir = path.resolve(START_CWD, process.argv[2]);
const guides = JSON.parse(fs.readFileSync(path.join(crawlDir, "guides.json"), "utf8"));
const faq = JSON.parse(fs.readFileSync(path.join(crawlDir, "faq.json"), "utf8"));

const topics = new Map();
const addSource = (t, s) => {
  if (!s?.url || t.sources.some((x) => x.url === s.url)) return;
  t.sources.push({ url: s.url, title: s.title ?? "", tier: s.tier ?? "" });
};

// Cẩm nang: lấy bản tiếng Đức làm gốc cho điều luật, bản tiếng Việt chỉ để lấy tên chủ đề (gợi ý nội bộ).
for (const g of guides) {
  const [, , , lang, , slug] = g.url.split("/");
  if (!slug) continue;
  const t = topics.get(slug) ?? { id: slug, kind: "guide", hint: "", laws: [], sources: [], keywords: [] };
  if (lang === "vi") t.hint = g.h1;
  if (lang === "de") {
    for (const step of g.steps ?? []) for (const l of step.law ?? []) if (!t.laws.includes(l)) t.laws.push(l);
    for (const s of g.sources ?? []) addSource(t, s);
  }
  topics.set(slug, t);
}

// FAQ: mỗi câu thành một chủ đề hỏi đáp ngắn. Câu hỏi chỉ dùng làm gợi ý; câu trả lời sẽ được viết mới.
for (const q of faq) {
  const t = { id: `faq-${q.id}`, kind: "faq", group: q.topic, hint: q.question?.vi ?? "", laws: [...(q.law ?? [])], sources: [], keywords: q.keywords ?? [] };
  for (const s of q.sources ?? []) addSource(t, s);
  topics.set(t.id, t);
}

const out = [...topics.values()];
fs.writeFileSync("topics.json", JSON.stringify(out, null, 2));
const nSrc = new Set(out.flatMap((t) => t.sources.map((s) => s.url))).size;
console.log(`Đã ghi topics.json: ${out.filter((t) => t.kind === "guide").length} cẩm nang, ${out.filter((t) => t.kind === "faq").length} hỏi đáp, ${nSrc} nguồn khác nhau.`);
