import "server-only";
import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  NEWS_DIR,
  deleteNewsItemsOf,
  getSetting,
  insertNewsItems,
  pruneNewsItems,
  setNewsTranslation,
  setSetting,
  untranslatedNews,
} from "./db";
import { imageType } from "./avatar";
import { slugify } from "./slug";
import { chatJson, looksTranslated, translationEnabled } from "./translate";

/**
 * Mục "Tin tức" (/tin-tuc):
 * - Tin tự động: lấy RSS / Atom của các nguồn admin chọn (/admin/news), AI dịch TIÊU ĐỀ + ĐOẠN TÓM TẮT mà nguồn tự đưa trong feed
 *   sang tiếng Việt, ghi rõ nguồn và link về bài gốc. Không chép / dịch nguyên bài và không dùng ảnh của báo (bản quyền).
 * - Bài do admin viết: bảng news_posts (lib/db.ts), ảnh bìa ở NEWS_DIR.
 */

export type NewsSource = {
  key: string; // lưu trong news_items.source — không đổi sau khi tạo
  name: string;
  url: string; // địa chỉ feed RSS / Atom
  color: string;
  /** chỉ nhận bài có link trên host này (bỏ tin quảng bá của đài) */
  host?: string;
  enabled: boolean; // tắt = ngừng lấy và ẩn tin của nguồn này
};

// Nguồn mặc định (báo công / đài công cộng Đức có RSS mở) — dùng tới khi admin sửa danh sách ở /admin/news
const DEFAULT_SOURCES: NewsSource[] = [
  { key: "tagesschau", name: "tagesschau", url: "https://www.tagesschau.de/index~rss2.xml", color: "#0a3d7a", enabled: true },
  { key: "zdf", name: "ZDFheute", url: "https://www.zdf.de/rss/zdf/nachrichten", color: "#fa7d19", host: "www.zdfheute.de", enabled: true },
  { key: "dw", name: "DW", url: "https://rss.dw.com/xml/rss-de-all", color: "#05b2fc", enabled: true },
  { key: "mdr", name: "MDR", url: "https://www.mdr.de/nachrichten/index-rss.xml", color: "#0b4a8b", enabled: true },
  { key: "dlf", name: "Deutschlandfunk", url: "https://www.deutschlandfunk.de/nachrichten-100.rss", color: "#8a8f98", enabled: true },
];
const SOURCES_KEY = "news:sources";
const COLORS = ["#e4572e", "#17bebb", "#ffc914", "#76b041", "#8f3985", "#2e86ab", "#f18f01", "#c73e1d"];

/** Mọi nguồn admin đã chọn (kể cả nguồn đang tắt) */
export function newsSources(): NewsSource[] {
  return getSetting<NewsSource[]>(SOURCES_KEY) ?? DEFAULT_SOURCES;
}
/** Nguồn đang bật: được lấy tin và hiện ra trang */
export const activeSources = () => newsSources().filter((s) => s.enabled);
export const sourceOf = (key: string) => newsSources().find((s) => s.key === key);

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

/** Link bài trong Atom: <link rel="alternate" href="…"/> (không có rel cũng là alternate) */
function atomLink(entry: string): string {
  const links = [...entry.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);
  const pick = links.find((l) => /rel=["']alternate["']/i.test(l)) ?? links.find((l) => !/rel=/i.test(l));
  return decode(pick?.match(/href=["']([^"']+)["']/i)?.[1] ?? "");
}

/** Đọc feed RSS 2.0 (<item>) hoặc Atom (<entry>) */
export function parseRss(xml: string): FeedItem[] {
  const items: FeedItem[] = [];
  for (const m of xml.matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)) {
    const it = m[0];
    const atom = m[1].toLowerCase() === "entry";
    const title = tag(it, "title");
    const url = atom ? atomLink(it) : tag(it, "link");
    if (!title || !/^https:\/\//.test(url)) continue;
    // Tóm tắt do báo đưa trong feed; bỏ phần "Von <tác giả>." ở cuối, cắt cho gọn
    let summary = (atom ? tag(it, "summary") || tag(it, "content") : tag(it, "description")).replace(/\s*Von [^.]{1,60}\.\s*$/, "");
    if (summary.length > 400) summary = summary.slice(0, 400).replace(/\s+\S*$/, "") + "…";
    const date = Date.parse(atom ? tag(it, "published") || tag(it, "updated") : tag(it, "pubDate") || tag(it, "dc:date"));
    items.push({ guid: tag(it, atom ? "id" : "guid") || url, url, title, summary, publishedAt: Number.isFinite(date) ? date : Date.now() });
  }
  return items;
}

async function fetchFeed(url: string): Promise<FeedItem[]> {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; ckk.biz news)" }, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseRss(await res.text());
}

async function fetchSource(s: NewsSource): Promise<FeedItem[]> {
  const cutoff = Date.now() - MAX_AGE_MS;
  return (await fetchFeed(s.url))
    // Bỏ mục không phải tin (livestream "tagesschau", trang giới thiệu…): tiêu đề quá ngắn
    .filter((i) => i.publishedAt >= cutoff && (!s.host || new URL(i.url).host === s.host) && i.title.split(/\s+/).length >= 3)
    .sort((a, b) => b.publishedAt - a.publishedAt)
    .slice(0, PER_SOURCE);
}

// ---------- Admin chọn nguồn ----------

/** Thêm nguồn: thử đọc feed trước, không đọc được tin nào thì báo lỗi chứ không lưu */
export async function addNewsSource(name: string, url: string): Promise<{ error?: string; found?: number }> {
  if (!name) return { error: "Cần có tên nguồn" };
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { error: "Địa chỉ feed không hợp lệ" };
  }
  if (parsed.protocol !== "https:") return { error: "Địa chỉ feed phải bắt đầu bằng https://" };
  const all = newsSources();
  if (all.some((s) => s.url === parsed.href)) return { error: "Nguồn này đã có trong danh sách" };
  let found: number;
  try {
    found = (await fetchFeed(parsed.href)).length;
  } catch (e) {
    return { error: `Không tải được feed (${(e as Error).message})` };
  }
  if (!found) return { error: "Không đọc được tin nào — địa chỉ này có phải feed RSS / Atom không?" };
  const base = slugify(name) || "nguon";
  let key = base;
  for (let n = 2; all.some((s) => s.key === key); n++) key = `${base}-${n}`;
  setSetting(SOURCES_KEY, [...all, { key, name, url: parsed.href, color: COLORS[all.length % COLORS.length], enabled: true }]);
  return { found };
}

export function setNewsSourceEnabled(key: string, enabled: boolean) {
  setSetting(SOURCES_KEY, newsSources().map((s) => (s.key === key ? { ...s, enabled } : s)));
}

/** Bỏ nguồn và xoá luôn tin đã lấy của nguồn đó */
export function removeNewsSource(key: string) {
  setSetting(SOURCES_KEY, newsSources().filter((s) => s.key !== key));
  deleteNewsItemsOf(key);
}

// ---------- Dịch ----------

const PROMPT =
  "Bạn là biên tập viên tin tức, dịch tin (thường là tiếng Đức, có thể là ngôn ngữ khác) sang tiếng Việt cho người Việt sống ở Đức. " +
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
 * Lấy tin mới + dịch. Gọi sau khi trả trang /tin-tuc (after()) — tự bỏ qua nếu vừa lấy cách đây < 30 phút.
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
    const sources = activeSources();
    const results = await Promise.allSettled(sources.map(fetchSource));
    results.forEach((r, i) => {
      if (r.status === "fulfilled") added += insertNewsItems(r.value.map((it) => ({ ...it, source: sources[i].key })));
      else errors.push(`${sources[i].name}: ${(r.reason as Error).message}`);
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
