import "server-only";
import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  NEWS_DIR,
  getSetting,
  insertNewsItems,
  pruneNewsItems,
  setNewsTranslation,
  setSetting,
  untranslatedNews,
} from "./db";
import { imageType } from "./avatar";
import { chatJson, looksTranslated, translationEnabled } from "./translate";

/**
 * Trang tin (trang chủ ckk.biz):
 * - Tin tự động: lấy RSS của báo Đức, AI dịch TIÊU ĐỀ + ĐOẠN TÓM TẮT mà báo tự đưa trong RSS sang tiếng Việt, ghi rõ nguồn
 *   và link về bài gốc. Không chép / dịch nguyên bài và không dùng ảnh của báo (bản quyền).
 * - Bài do admin viết: bảng news_posts (lib/db.ts), ảnh bìa ở NEWS_DIR.
 */

export type NewsSource = { key: string; name: string; url: string; color: string; /** chỉ nhận bài có link trên host này (bỏ tin quảng bá của đài) */ host?: string };

// Báo công / đài công cộng có RSS mở. Đổi danh sách ở đây (khoá `key` lưu trong DB, đừng đổi khoá của nguồn cũ).
export const SOURCES: NewsSource[] = [
  { key: "tagesschau", name: "tagesschau", url: "https://www.tagesschau.de/index~rss2.xml", color: "#0a3d7a" },
  { key: "zdf", name: "ZDFheute", url: "https://www.zdf.de/rss/zdf/nachrichten", color: "#fa7d19", host: "www.zdfheute.de" },
  { key: "dw", name: "DW", url: "https://rss.dw.com/xml/rss-de-all", color: "#05b2fc" },
  { key: "mdr", name: "MDR", url: "https://www.mdr.de/nachrichten/index-rss.xml", color: "#0b4a8b" },
  { key: "dlf", name: "Deutschlandfunk", url: "https://www.deutschlandfunk.de/nachrichten-100.rss", color: "#8a8f98" },
];
export const sourceOf = (key: string) => SOURCES.find((s) => s.key === key);

const REFRESH_EVERY_MS = 30 * 60_000; // lấy tin mới tối đa 30 phút / lần
const PER_SOURCE = 12; // mỗi nguồn chỉ lấy các tin mới nhất
const MAX_AGE_MS = 3 * 86_400_000; // bỏ tin cũ hơn 3 ngày khi lấy
const KEEP_MS = 14 * 86_400_000; // xoá khỏi DB sau 14 ngày
const TRANSLATE_PER_RUN = 40; // giới hạn chi phí AI mỗi lần
const TRANSLATE_BATCH = 10;

// ---------- Đọc RSS (đủ cho RSS 2.0 của các báo trên, không cần thư viện) ----------

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}
const stripTags = (s: string) => s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const tag = (xml: string, name: string) => {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return m ? stripTags(decode(m[1])) : "";
};

export type FeedItem = { guid: string; url: string; title: string; summary: string; publishedAt: number };

export function parseRss(xml: string): FeedItem[] {
  const items: FeedItem[] = [];
  for (const m of xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)) {
    const it = m[0];
    const title = tag(it, "title");
    const url = tag(it, "link");
    if (!title || !/^https:\/\//.test(url)) continue;
    // Tóm tắt do báo đưa trong RSS; bỏ phần "Von <tác giả>." ở cuối, cắt cho gọn
    let summary = tag(it, "description").replace(/\s*Von [^.]{1,60}\.\s*$/, "");
    if (summary.length > 400) summary = summary.slice(0, 400).replace(/\s+\S*$/, "") + "…";
    const date = Date.parse(tag(it, "pubDate") || tag(it, "dc:date"));
    items.push({ guid: tag(it, "guid") || url, url, title, summary, publishedAt: Number.isFinite(date) ? date : Date.now() });
  }
  return items;
}

async function fetchSource(s: NewsSource): Promise<FeedItem[]> {
  const res = await fetch(s.url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; ckk.biz news)" }, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`${s.key}: HTTP ${res.status}`);
  const cutoff = Date.now() - MAX_AGE_MS;
  return parseRss(await res.text())
    // Bỏ mục không phải tin (livestream "tagesschau", trang giới thiệu…): tiêu đề quá ngắn
    .filter((i) => i.publishedAt >= cutoff && (!s.host || new URL(i.url).host === s.host) && i.title.split(/\s+/).length >= 3)
    .sort((a, b) => b.publishedAt - a.publishedAt)
    .slice(0, PER_SOURCE);
}

// ---------- Dịch ----------

const PROMPT =
  "Bạn là biên tập viên tin tức, dịch tin tiếng Đức sang tiếng Việt cho người Việt sống ở Đức. " +
  'Nhận JSON {"items": {"1": {"t": tiêu đề, "s": tóm tắt}, …}}. Dịch từng tin sang tiếng Việt tự nhiên, chính xác, giữ nguyên tên riêng ' +
  "(người, địa danh, đảng, cơ quan; có thể thêm giải thích ngắn trong ngoặc khi cần, vd. Bundestag (Quốc hội Liên bang)). " +
  "Không thêm thông tin không có trong bản gốc, không bình luận. Tóm tắt rỗng thì để rỗng. " +
  'Trả về đúng JSON {"items": {"1": {"t": "…", "s": "…"}, …}} với đủ mọi khoá của đầu vào.';

type Translated = { items: Record<string, { t: string; s: string }> };

async function translateNews(limit: number): Promise<number> {
  if (!translationEnabled()) return 0;
  let done = 0;
  const todo = untranslatedNews(limit);
  for (let i = 0; i < todo.length; i += TRANSLATE_BATCH) {
    const batch = todo.slice(i, i + TRANSLATE_BATCH);
    const input = { items: Object.fromEntries(batch.map((n, k) => [k + 1, { t: n.title, s: n.summary }])) };
    const valid = (x: unknown): x is Translated => {
      const items = (x as Translated)?.items;
      // Mô hình nhỏ đôi khi chép lại nguyên tiếng Đức → coi là sai, để nhà cung cấp kế tiếp dịch
      return (
        !!items &&
        batch.every((n, k) => {
          const r = items[k + 1];
          return typeof r?.t === "string" && looksTranslated(n.title, r.t) && (!n.summary || (typeof r.s === "string" && looksTranslated(n.summary, r.s)));
        })
      );
    };
    try {
      const out = await chatJson(PROMPT, input, valid, { prefer: "openai" });
      batch.forEach((n, k) => {
        const r = out.items[k + 1];
        setNewsTranslation(n.id, r.t.trim(), n.summary ? (r.s ?? "").trim() : "");
      });
      done += batch.length;
    } catch (e) {
      console.error("[news] dịch lỗi:", (e as Error).message);
      break; // AI đang lỗi → lần sau thử tiếp
    }
  }
  return done;
}

// ---------- Cập nhật ----------

const g = globalThis as unknown as { __newsRefreshing?: Promise<NewsRefreshResult> };
export type NewsRefreshResult = { added: number; translated: number; errors: string[] };

/**
 * Lấy tin mới + dịch. Gọi sau khi trả trang chủ (after()) — tự bỏ qua nếu vừa lấy cách đây < 30 phút.
 * force: admin bấm "Lấy tin ngay".
 */
export function refreshNews({ force = false } = {}): Promise<NewsRefreshResult> | null {
  if (g.__newsRefreshing) return g.__newsRefreshing;
  const last = getSetting<number>("news:lastFetch") ?? 0;
  if (!force && Date.now() - last < REFRESH_EVERY_MS) return null;
  setSetting("news:lastFetch", Date.now()); // ghi trước: nhiều request cùng lúc không lấy trùng
  g.__newsRefreshing = (async () => {
    const errors: string[] = [];
    let added = 0;
    const results = await Promise.allSettled(SOURCES.map(fetchSource));
    results.forEach((r, i) => {
      if (r.status === "fulfilled") added += insertNewsItems(r.value.map((it) => ({ ...it, source: SOURCES[i].key })));
      else errors.push(`${SOURCES[i].name}: ${(r.reason as Error).message}`);
    });
    pruneNewsItems(KEEP_MS);
    const translated = await translateNews(TRANSLATE_PER_RUN);
    if (errors.length) console.error("[news]", errors.join(" · "));
    return { added, translated, errors };
  })().finally(() => {
    g.__newsRefreshing = undefined;
  });
  return g.__newsRefreshing;
}

export const lastNewsFetch = () => getSetting<number>("news:lastFetch");

// ---------- Ảnh bìa bài admin ----------

export const COVER_MAX_BYTES = 4.5 * 1024 * 1024; // server action nhận tối đa 5 MB (next.config.ts)
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Lưu ảnh bìa → tên file (null = không phải JPEG/PNG/WebP) */
export function saveCover(bytes: Uint8Array): string | null {
  const type = imageType(bytes);
  if (!type) return null;
  mkdirSync(NEWS_DIR, { recursive: true });
  const name = `${Date.now().toString(36)}-${randomBytes(6).toString("hex")}.${EXT[type]}`;
  writeFileSync(path.join(NEWS_DIR, name), bytes);
  return name;
}

export function removeCover(name: string | null) {
  if (name && /^[\w-]+\.(jpg|png|webp)$/.test(name)) rmSync(path.join(NEWS_DIR, name), { force: true });
}

export function readCover(name: string): { bytes: Buffer; type: string } | null {
  if (!/^[\w-]+\.(jpg|png|webp)$/.test(name)) return null;
  try {
    const bytes = readFileSync(path.join(NEWS_DIR, name));
    const type = imageType(bytes);
    return type ? { bytes, type } : null;
  } catch {
    return null;
  }
}

export const coverUrl = (name: string | null) => (name ? `/api/v1/news/cover/${name}` : null);

// ---------- Hiển thị bài admin: chữ thường → khối ----------

export type Block = { kind: "p" | "h"; text: string } | { kind: "ul"; items: string[] };

/** Đoạn cách nhau dòng trống; "## " = tiêu đề; các dòng "- " = danh sách */
export function parseBody(body: string): Block[] {
  return body
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk): Block => {
      if (chunk.startsWith("## ")) return { kind: "h", text: chunk.slice(3).trim() };
      const lines = chunk.split("\n");
      if (lines.every((l) => /^\s*[-*] /.test(l))) return { kind: "ul", items: lines.map((l) => l.replace(/^\s*[-*] /, "")) };
      return { kind: "p", text: lines.join("\n") };
    });
}
