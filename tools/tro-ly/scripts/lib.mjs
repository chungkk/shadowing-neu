import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Kho kiến thức nằm ở content/tro-ly/ của repo hallovn.de (đổi bằng TRO_LY_KB=…).
// Mọi script chạy với thư mục hiện tại là thư mục kho, nên các đường dẫn đều tương đối với nó.
export const START_CWD = process.cwd();
export const KB_DIR = path.resolve(process.env.TRO_LY_KB ?? path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../content/tro-ly"));
process.chdir(KB_DIR);

// Đường dẫn file lưu văn bản nguồn cho một URL (null = không lưu).
export function fileFor(url) {
  const u = new URL(url);
  if (u.hostname.endsWith("gesetze-im-internet.de")) {
    const m = u.pathname.match(/^\/([^/]+)\/([^/]+)\.html$/);
    if (m) return `laws/${m[1]}__${m[2].replace(/^_+/, "")}.md`;
    return null; // link tới cả bộ luật: quá dài, bỏ qua
  }
  return `official/${crypto.createHash("sha1").update(url).digest("hex").slice(0, 12)}.md`;
}

// Frontmatter tối giản: mỗi dòng "key: value", value có thể là JSON.
export function parseFrontmatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { meta: {}, body: md };
  const meta = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i < 0) continue;
    const k = line.slice(0, i).trim();
    const v = line.slice(i + 1).trim();
    try { meta[k] = JSON.parse(v); } catch { meta[k] = v; }
  }
  return { meta, body: md.slice(m[0].length) };
}

export function toFrontmatter(meta) {
  return `---\n${Object.entries(meta).map(([k, v]) => `${k}: ${typeof v === "string" && !/[:#\n"]/.test(v) ? v : JSON.stringify(v)}`).join("\n")}\n---\n`;
}
