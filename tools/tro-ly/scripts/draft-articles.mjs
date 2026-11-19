// Bước 3: Dùng Claude viết BÀI MỚI bằng tiếng Việt cho từng chủ đề, chỉ dựa trên
// văn bản luật và trang chính thức đã tải ở bước 2 (không đưa câu chữ của Ankommly vào).
// Mỗi bài được lưu với status: draft. Người của hallovn đọc lại, sửa, rồi đổi thành
// status: reviewed. Chatbot chỉ dùng bài reviewed (trừ khi bật ALLOW_DRAFTS=1).
//
// Dùng:
//   node scripts/draft-articles.mjs                 # viết các bài còn thiếu
//   node scripts/draft-articles.mjs anmeldung krank # chỉ viết vài chủ đề
//   node scripts/draft-articles.mjs --limit 3       # thử 3 bài trước
import fs from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { fileFor, parseFrontmatter, toFrontmatter } from "./lib.mjs";

const MODEL = process.env.DRAFT_MODEL ?? "claude-opus-5-5";
const args = process.argv.slice(2);
const limitIdx = args.indexOf("--limit");
const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : Infinity;
const only = args.filter((a, i) => !a.startsWith("--") && i !== limitIdx + 1);
const force = args.includes("--force");

const client = new Anthropic();
const topics = JSON.parse(fs.readFileSync("topics.json", "utf8"));
const today = new Date().toISOString().slice(0, 10);

const SYSTEM = `Bạn là biên tập viên của hallovn.de, cộng đồng người Việt ở Đức. Bạn viết bài hướng dẫn thủ tục bằng tiếng Việt cho thành viên: du học sinh, người học nghề (Azubi), người đi làm và gia đình họ.

Nguyên tắc:
- Chỉ dựa trên các tài liệu nguồn được cung cấp trong <sources>. Không thêm số tiền, thời hạn, điều kiện nào mà nguồn không nêu. Điều gì nguồn không đủ để khẳng định thì ghi vào "uncertain", đừng đoán.
- Viết bằng lời của bạn, giọng thân thiện, rõ ràng, câu ngắn. Giữ nguyên thuật ngữ tiếng Đức quan trọng (Anmeldung, Ausländerbehörde, Aufenthaltserlaubnis…) và giải thích nghĩa ở lần đầu xuất hiện.
- Dẫn điều luật dạng "§ 17 Abs. 1 BMG" ngay cạnh câu dùng nó.
- Nêu rõ khi quy định khác nhau theo bang hoặc thành phố.
- Đây là thông tin chung, không phải tư vấn pháp lý cho từng trường hợp.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "summary", "body", "keywords", "laws", "uncertain"],
  properties: {
    title: { type: "string", description: "Tiêu đề ngắn bằng tiếng Việt, có thể kèm thuật ngữ tiếng Đức" },
    summary: { type: "string", description: "1–2 câu tóm tắt điều quan trọng nhất" },
    body: { type: "string", description: "Nội dung Markdown, dùng ## cho các mục" },
    keywords: { type: "array", items: { type: "string" }, description: "8–20 từ khóa người dùng hay gõ khi hỏi, cả tiếng Việt có dấu, không dấu và tiếng Đức" },
    laws: { type: "array", items: { type: "string" }, description: "Các điều luật thực sự được dùng trong bài" },
    uncertain: { type: "array", items: { type: "string" }, description: "Những điểm nguồn chưa đủ để khẳng định, cần người biên tập kiểm tra" },
  },
};

function loadSource(url) {
  const f = fileFor(url);
  if (!f || !fs.existsSync(f)) return null;
  const { meta, body } = parseFrontmatter(fs.readFileSync(f, "utf8"));
  const cap = f.startsWith("laws/") ? 8000 : 12000;
  return { url, title: meta.title ?? url, text: body.slice(0, cap) };
}

async function draft(topic) {
  const sources = topic.sources.map((s) => loadSource(s.url)).filter(Boolean);
  if (sources.length === 0) throw new Error("không có tài liệu nguồn nào tải được");
  const sourcesXml = sources
    .map((s, i) => `<source index="${i + 1}" url="${s.url}">\n<title>${s.title}</title>\n${s.text}\n</source>`)
    .join("\n");
  const task =
    topic.kind === "guide"
      ? `Viết một bài hướng dẫn đầy đủ (khoảng 500–900 từ) về chủ đề: "${topic.hint}". Gồm các mục: Ai cần làm / khi nào; Hồ sơ cần chuẩn bị; Các bước; Thời hạn và chi phí; Lưu ý hay gặp; Hỏi ở đâu.`
      : `Viết một câu trả lời ngắn (80–250 từ) cho câu hỏi thành viên hay hỏi: "${topic.hint}". Đặt chính câu hỏi (viết lại theo lời bạn) làm title. Trả lời thẳng vào ý chính ở câu đầu.`;

  const res = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
    system: SYSTEM,
    messages: [{ role: "user", content: `<sources>\n${sourcesXml}\n</sources>\n\nHôm nay là ${today}.\n\n${task}` }],
  });
  if (res.stop_reason === "refusal") throw new Error("mô hình từ chối");
  if (res.stop_reason === "max_tokens") throw new Error("bị cắt do max_tokens");
  const text = res.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  return { data: JSON.parse(text), sources, usage: res.usage };
}

fs.mkdirSync("articles", { recursive: true });
let todo = topics.filter((t) => (only.length ? only.includes(t.id) : true));
todo = todo.filter((t) => force || !fs.existsSync(`articles/${t.id}.md`)).slice(0, limit);
console.log(`Sẽ viết ${todo.length} bài bằng ${MODEL}…`);

let inTok = 0, outTok = 0;
for (const t of todo) {
  try {
    const { data, sources, usage } = await draft(t);
    inTok += usage.input_tokens; outTok += usage.output_tokens;
    const meta = {
      id: t.id,
      kind: t.kind,
      title: data.title,
      summary: data.summary,
      status: "draft",
      reviewed_by: "",
      updated: today,
      keywords: [...new Set([...data.keywords, ...t.keywords])],
      laws: data.laws,
      sources: sources.map((s) => ({ url: s.url, title: s.title })),
    };
    const uncertain = data.uncertain.length
      ? `\n\n<!-- CẦN KIỂM TRA (xoá khối này sau khi biên tập):\n${data.uncertain.map((u) => `- ${u}`).join("\n")}\n-->\n`
      : "\n";
    fs.writeFileSync(`articles/${t.id}.md`, `${toFrontmatter(meta)}\n# ${data.title}\n\n${data.body.trim()}${uncertain}`);
    console.log(`  ✓ ${t.id}`);
  } catch (e) {
    console.warn(`  ✗ ${t.id}: ${e.message}`);
  }
}
// Giá tham khảo Opus 5.5: $4 / 1M token vào, $20 / 1M token ra.
console.log(`Token: ${inTok} vào, ${outTok} ra ≈ $${((inTok * 4 + outTok * 20) / 1e6).toFixed(2)}`);
