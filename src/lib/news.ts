import "server-only";
import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import {
  NEWS_DIR,
  type ArticleBlock,
  type NewsArticle,
  deleteNewsItemsOf,
  getNewsArticle,
  newsWithoutBody,
  setNewsBody,
  setNewsBodyVi,
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
 * - Tin tự động: lấy RSS / Atom của các nguồn admin chọn (/admin/news), AI dịch tiêu đề + tóm tắt trong feed sang tiếng Việt.
 *   Nội dung bài: tải trang bài gốc, bóc phần chữ bằng Readability (chế độ đọc của Firefox), dịch từng đoạn → đọc ở /tin-tuc/bao/<id>,
 *   ghi rõ nguồn + link bài gốc. Không lấy ảnh / video của báo. Trang đọc để noindex (bản quyền thuộc về báo gốc).
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
const BODY_PER_RUN = 12; // số bài lấy + dịch nội dung mỗi lần cập nhật (bài khác: dịch khi có người mở)
const BODY_MAX_BLOCKS = 80;
const BODY_CHUNK_CHARS = 3500; // mỗi lần gọi AI dịch tối đa ~3500 ký tự (các phần chạy song song)

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

// ---------- Nội dung bài ----------

/** Đoạn không phải nội dung: dòng ngày giờ, tác giả, chú thích audio/video, lời mời xem chương trình… */
const NOISE =
  /^(stand:|audio:|video:|bildunterschrift|to view this video|diese nachricht wurde am|dieses thema im programm|über dieses thema berichtete|quelle:|mehr zum thema|sehen sie hier|hören sie hier|\d{1,2}\.\d{1,2}\.\d{4}\b[^a-zäöü]*(uhr)?$)/i;
/** Tiêu đề mở phần "đọc thêm" cuối bài → bỏ từ đó trở đi */
const TAIL = /^(mehr zum thema|mehr dazu|mehr bei|mehr aus|weitere informationen|das könnte sie auch interessieren|auch interessant|weitere nachrichten|zum weiterlesen)\b/i;
const AUTHOR = /^(von|ein (kommentar|bericht|interview) von)\s[^.!?]{1,80}$/i;

/** HTML trang bài → các khối chữ (tiêu đề phụ, đoạn, gạch đầu dòng). Rỗng = không bóc được */
export function extractArticle(html: string): ArticleBlock[] {
  const { document } = parseHTML(html);
  const article = new Readability(document as unknown as Document, { charThreshold: 300 }).parse();
  if (!article?.content) return [];
  const { document: doc } = parseHTML(`<!doctype html><html><body>${article.content}</body></html>`);
  const blocks: ArticleBlock[] = [];
  const seen = new Set<string>();
  for (const el of doc.querySelectorAll("h2, h3, h4, p, li")) {
    const tagName = el.tagName.toLowerCase();
    if (tagName === "p" && el.closest("li")) continue;
    if (el.closest("figure, figcaption, aside, nav")) continue;
    const t = (el.textContent ?? "").replace(/\s+/g, " ").trim();
    if (!t || seen.has(t)) continue;
    const k: ArticleBlock["k"] = tagName === "p" ? "p" : tagName === "li" ? "li" : "h";
    if (k === "h" && TAIL.test(t)) break;
    // Gạch đầu dòng lẻ loi thường là link "tin liên quan" chèn giữa bài
    if (k === "li" && (el.parentElement?.querySelectorAll(":scope > li").length ?? 0) < 2) continue;
    if (NOISE.test(t) || AUTHOR.test(t)) continue;
    if (k === "p" && t.split(" ").length < 4 && !/[.!?:"“”]$/.test(t)) continue;
    seen.add(t);
    blocks.push({ k, t });
    if (blocks.length >= BODY_MAX_BLOCKS) break;
  }
  // Bỏ tiêu đề phụ cuối bài không còn đoạn nào theo sau
  while (blocks.length && blocks[blocks.length - 1].k === "h") blocks.pop();
  return blocks.filter((b) => b.k !== "p").length === blocks.length ? [] : blocks;
}

async function fetchArticle(url: string): Promise<ArticleBlock[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; ckk.biz news)", Accept: "text/html" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  return extractArticle(html.length > 3_000_000 ? html.slice(0, 3_000_000) : html);
}

const BODY_PROMPT =
  "Bạn là biên tập viên tin tức, dịch bài báo (thường là tiếng Đức, có thể là ngôn ngữ khác) sang tiếng Việt cho người Việt sống ở Đức. " +
  'Nhận JSON {"title": tiêu đề bài (chỉ để hiểu ngữ cảnh), "p": {"1": đoạn 1, "2": đoạn 2, …}} là các đoạn liên tiếp của bài. ' +
  "Dịch TỪNG đoạn sang tiếng Việt tự nhiên, chính xác, đầy đủ ý (không tóm tắt, không bỏ câu), giữ nguyên tên riêng " +
  "(người, địa danh, đảng, cơ quan). Chỉ với cơ quan / khái niệm riêng của Đức mà người Việt khó hiểu mới thêm giải thích ngắn trong ngoặc ở lần đầu xuất hiện, " +
  "vd. Bundestag (Quốc hội Liên bang); không giải thích lặp lại điều câu đã nói rõ (chức danh, quốc gia…). " +
  "Giữ nguyên dấu ngoặc kép của câu trích dẫn. Không thêm thông tin, không bình luận, không gộp hay tách đoạn. " +
  'Trả về đúng JSON {"t": {"1": "…", "2": "…", …}} với đủ mọi khoá của đầu vào.';

type BodyOut = { t: Record<string, string> };

/** Dịch các khối của bài, chia phần ~3500 ký tự chạy song song. Lỗi → ném lỗi (lần sau mở bài thử lại) */
async function translateBody(title: string, blocks: ArticleBlock[]): Promise<string[]> {
  const chunks: number[][] = [[]];
  let size = 0;
  blocks.forEach((b, i) => {
    if (size + b.t.length > BODY_CHUNK_CHARS && chunks[chunks.length - 1].length) {
      chunks.push([]);
      size = 0;
    }
    chunks[chunks.length - 1].push(i);
    size += b.t.length;
  });
  const out: string[] = blocks.map(() => "");
  await Promise.all(
    chunks.map(async (idx) => {
      const valid = (x: unknown): x is BodyOut => {
        const t = (x as BodyOut)?.t;
        if (!t || typeof t !== "object") return false;
        const bad = idx.filter((i, k) => typeof t[k + 1] !== "string" || !looksTranslated(blocks[i].t, t[k + 1])).length;
        // Cho phép lọt 1 đoạn chưa dịch (câu trích tiếng Anh, tên chương trình…) nếu phần còn lại đã dịch
        return bad === 0 || (bad === 1 && idx.length >= 6);
      };
      const r = await chatJson(BODY_PROMPT, { title, p: Object.fromEntries(idx.map((i, k) => [k + 1, blocks[i].t])) }, valid, {
        prefer: "openai",
        timeoutMs: 90_000,
      });
      idx.forEach((i, k) => (out[i] = (r.t[k + 1] ?? "").trim() || blocks[i].t));
    }),
  );
  return out;
}

const inflight = globalThis as unknown as { __newsArticle?: Map<number, Promise<NewsArticle | null>> };

/**
 * Bảo đảm tin có nội dung bài đã dịch: chưa lấy → tải trang báo + bóc chữ; chưa dịch → dịch.
 * Nhiều người cùng mở 1 bài chỉ chạy 1 lần. Trả về tin (bodyState -1 = không lấy được nội dung, chỉ có tóm tắt).
 */
export function ensureArticle(id: number): Promise<NewsArticle | null> {
  const map = (inflight.__newsArticle ??= new Map());
  const running = map.get(id);
  if (running) return running;
  const job = (async () => {
    let a = getNewsArticle(id);
    if (!a) return null;
    if (a.bodyState === 0) {
      try {
        // Bỏ khối trùng tiêu đề bài (trang báo hay lặp lại tiêu đề trong phần nội dung)
        const same = (x: string) => x.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
        const body = (await fetchArticle(a.url)).filter((b) => same(b.t) !== same(a!.title));
        setNewsBody(id, body, body.length ? 1 : -1);
        if (!body.length) console.error(`[news] không bóc được nội dung: ${a.url}`);
      } catch (e) {
        console.error(`[news] tải bài lỗi ${a.url}:`, (e as Error).message);
        setNewsBody(id, [], -1);
      }
      a = getNewsArticle(id)!;
    }
    if (a.bodyState === 1 && a.bodyVi.length !== a.body.length && translationEnabled()) {
      try {
        setNewsBodyVi(id, await translateBody(a.title, a.body));
        a = getNewsArticle(id)!;
      } catch (e) {
        console.error(`[news] dịch bài ${id} lỗi:`, (e as Error).message);
      }
    }
    return a;
  })().finally(() => map.delete(id));
  map.set(id, job);
  return job;
}

/** Lấy + dịch nội dung các tin mới nhất chưa có (chạy 3 bài một lúc) */
async function fillBodies(limit: number): Promise<number> {
  const ids = newsWithoutBody(limit);
  let done = 0;
  for (let i = 0; i < ids.length; i += 3) {
    const res = await Promise.all(ids.slice(i, i + 3).map((id) => ensureArticle(id).catch(() => null)));
    done += res.filter((a) => a && a.bodyState === 1 && a.bodyVi.length === a.body.length).length;
  }
  return done;
}

// ---------- Cập nhật ----------

const g = globalThis as unknown as { __newsRefreshing?: Promise<NewsRefreshResult> };
export type NewsRefreshResult = { added: number; translated: number; bodies: number; errors: string[] };

/**
 * Lấy tin mới + dịch tiêu đề / tóm tắt + lấy và dịch nội dung vài bài mới nhất. Gọi sau khi trả trang /tin-tuc (after()) — tự bỏ qua nếu vừa lấy cách đây < 30 phút.
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
    const bodies = translationEnabled() ? await fillBodies(BODY_PER_RUN) : 0;
    if (errors.length) console.error("[news]", errors.join(" · "));
    return { added, translated, bodies, errors };
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
