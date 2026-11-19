// Bước 2: Tải văn bản gốc từ các nguồn được viện dẫn.
//  - Điều luật (gesetze-im-internet.de) → laws/   (văn bản luật không có bản quyền, § 5 UrhG)
//  - Trang cơ quan nhà nước / tư vấn → official/  (chỉ dùng làm tài liệu đầu vào để viết bài mới, không đăng lại)
// Tải lại an toàn: file đã có thì bỏ qua. Thêm --force để tải lại hết.
import fs from "node:fs";
import { fileFor } from "./lib.mjs";

const force = process.argv.includes("--force");
const topics = JSON.parse(fs.readFileSync("topics.json", "utf8"));
const urls = [...new Set(topics.flatMap((t) => t.sources.map((s) => s.url)))];
const UA = "hallovn-chatbot-kb/0.1 (+https://hallovn.de)";

const decodeEntities = (s) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

const htmlToText = (html) =>
  decodeEntities(
    html
      .replace(/<(script|style|noscript|svg|nav|footer|header|form)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<\/(p|div|li|h[1-6]|tr|br|dd|dt)>|<br\s*\/?>/gi, "\n")
      .replace(/<li[^>]*>/gi, "- ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();

async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html" }, redirect: "follow", signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const ctype = res.headers.get("content-type") ?? "";
  if (!ctype.includes("html")) throw new Error(`bỏ qua loại nội dung ${ctype}`);
  let charset = ctype.match(/charset=([\w-]+)/i)?.[1];
  if (!charset) charset = buf.subarray(0, 2000).toString("latin1").match(/charset=["']?([\w-]+)/i)?.[1] ?? "utf-8";
  return new TextDecoder(charset.toLowerCase()).decode(buf);
}

function lawToMarkdown(html, url) {
  const h1 = html.match(/<h1>([\s\S]*?)<\/h1>/i)?.[1] ?? "";
  const [lawName, para] = h1.split(/<br\s*\/?>/i).map((x) => htmlToText(x));
  const body = html.match(/<div class="jnhtml">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/i)?.[1] ?? html.match(/<div class="jnhtml">([\s\S]*)/i)?.[1] ?? "";
  const text = htmlToText(body.replace(/<div class="jurAbsatz">/g, "\n"));
  return `---\nurl: ${url}\ntitle: ${JSON.stringify(`${para ?? ""} ${lawName ?? ""}`.trim())}\nfetched: ${new Date().toISOString().slice(0, 10)}\n---\n\n${text}\n`;
}

function pageToMarkdown(html, url) {
  const title = htmlToText(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  const main = html.match(/<main[\s\S]*?<\/main>/i)?.[0] ?? html.match(/<body[\s\S]*<\/body>/i)?.[0] ?? html;
  const text = htmlToText(main).slice(0, 40000);
  return `---\nurl: ${url}\ntitle: ${JSON.stringify(title)}\nfetched: ${new Date().toISOString().slice(0, 10)}\n---\n\n${text}\n`;
}

fs.mkdirSync("laws", { recursive: true });
fs.mkdirSync("official", { recursive: true });
let ok = 0, skip = 0, fail = 0;
for (const url of urls) {
  const file = fileFor(url);
  if (!file || (!force && fs.existsSync(file))) { skip++; continue; }
  try {
    const html = await fetchText(url);
    fs.writeFileSync(file, file.startsWith("laws/") ? lawToMarkdown(html, url) : pageToMarkdown(html, url));
    ok++;
  } catch (e) {
    fail++;
    console.warn(`  ✗ ${url}: ${e.message}`);
  }
  await new Promise((r) => setTimeout(r, 400)); // lịch sự với máy chủ nguồn
}
console.log(`Tải xong: ${ok} mới, ${skip} bỏ qua, ${fail} lỗi.`);
