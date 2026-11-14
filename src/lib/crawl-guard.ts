import { NextResponse, type NextRequest } from "next/server";

/**
 * Chống crawl bộ câu hỏi trên web (tab Lái xe, Leben in Deutschland) — chạy trong proxy.ts.
 * Không chặn được tuyệt đối (nội dung công khai), mục tiêu là làm việc lấy cả bộ đề tốn công:
 * 1. Chặn User-Agent của công cụ dòng lệnh / thư viện scraping / trình duyệt headless / bot AI → 403
 * 2. Giới hạn số request theo IP (phút / giờ / ngày) → 429. Người học thật làm bài ngay trong trình duyệt.
 *    - Mở trang trực tiếp (HTML — cách scraper hay dùng): chặt
 *    - Request nội bộ khi bấm link trong trang (có header next-url, gồm cả prefetch): rộng gấp 5 lần.
 *      Next xoá header rsc / next-router-prefetch trước khi tới proxy nên không tách riêng prefetch được.
 * Bot tìm kiếm (Googlebot, Bingbot…) vẫn vào được để index; robots.txt cấm riêng bot AI.
 */

const GUARDED = ["/lai-xe", "/leben-in-deutschland"];

// Công cụ / thư viện tự động, trình duyệt headless, bot AI và bot SEO hút dữ liệu
const BLOCKED_UA = [
  // dòng lệnh, thư viện HTTP
  "curl",
  "wget",
  "python-requests",
  "python-urllib",
  "python-httpx",
  "httpx",
  "aiohttp",
  "scrapy",
  "go-http-client",
  "okhttp",
  "java/",
  "apache-httpclient",
  "node-fetch",
  "axios",
  "undici",
  "libwww-perl",
  "postmanruntime",
  "insomnia",
  "httpie",
  // trình duyệt điều khiển tự động
  "headlesschrome",
  "phantomjs",
  "puppeteer",
  "playwright",
  "selenium",
  // bot AI / gom dữ liệu
  "gptbot",
  "chatgpt-user",
  "oai-searchbot",
  "ccbot",
  "claudebot",
  "claude-web",
  "anthropic-ai",
  "bytespider",
  "perplexitybot",
  "amazonbot",
  "applebot-extended",
  "meta-externalagent",
  "facebookbot",
  "cohere-ai",
  "diffbot",
  "imagesiftbot",
  "omgilibot",
  "youbot",
  "timpibot",
  "petalbot",
  // bot SEO
  "ahrefsbot",
  "semrushbot",
  "mj12bot",
  "dotbot",
  "dataforseobot",
  "blexbot",
  "serpstatbot",
];

/** Bot AI / SEO trong robots.txt (tên đúng như họ công bố) */
export const AI_BOTS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "CCBot",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "Google-Extended",
  "Applebot-Extended",
  "Bytespider",
  "PerplexityBot",
  "Amazonbot",
  "meta-externalagent",
  "FacebookBot",
  "cohere-ai",
  "Diffbot",
  "ImagesiftBot",
  "Omgilibot",
  "YouBot",
  "Timpibot",
  "PetalBot",
  "AhrefsBot",
  "SemrushBot",
  "MJ12bot",
  "DotBot",
  "DataForSeoBot",
  "BLEXBot",
  "serpstatbot",
];

// Số request tối đa / IP cho 2 phần trên (gộp chung)
const LIMITS = [
  { name: "m", windowMs: 60_000, max: 40 },
  { name: "h", windowMs: 3_600_000, max: 400 },
  { name: "d", windowMs: 86_400_000, max: 1500 },
];
const CLIENT_NAV_FACTOR = 5;

// Đề mẫu (/lai-xe/de-mau/<n>): mỗi trang là trọn 30 câu + đáp án → mỗi IP chỉ mở được SHEET_MAX đề khác nhau / giờ.
// Đếm theo số đề, không theo request: đổi chế độ Đọc/Luyện/Thi, tải lại, nộp bài trong cùng đề không bị tính thêm.
const SHEET_RE = /^\/lai-xe\/de-mau\/(\d+)\/?$/;
const SHEET_MAX = 2;
const SHEET_WINDOW_MS = 3_600_000;
const sheets = new Map<string, { ids: Set<string>; resetAt: number }>();

type Entry = { count: number; resetAt: number };
const hits = new Map<string, Entry>();

function hit(key: string, windowMs: number, now: number): Entry {
  if (hits.size > 20_000) for (const [k, e] of hits) if (now > e.resetAt) hits.delete(k);
  let e = hits.get(key);
  if (!e || now > e.resetAt) hits.set(key, (e = { count: 0, resetAt: now + windowMs }));
  e.count++;
  return e;
}

const clientIp = (req: NextRequest) => req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";

const page = (status: number, title: string, text: string, headers: Record<string, string> = {}) =>
  new NextResponse(
    `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title></head>` +
      `<body style="font-family:system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 1rem;line-height:1.5"><h1 style="font-size:1.4rem">${title}</h1><p>${text}</p><p><a href="/">Về trang chủ</a></p></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", ...headers } },
  );

/** null = cho qua; Response = chặn */
export function crawlGuard(req: NextRequest): NextResponse | null {
  const { pathname } = req.nextUrl;
  if (!GUARDED.some((p) => pathname === p || pathname.startsWith(p + "/"))) return null;
  if (process.env.NODE_ENV === "development") return null;

  const ua = (req.headers.get("user-agent") ?? "").toLowerCase().trim();
  if (!ua || BLOCKED_UA.some((b) => ua.includes(b))) return page(403, "Không truy cập được", "Trang này không cho phép truy cập tự động.");

  const ip = clientIp(req);
  const now = Date.now();

  const sheet = SHEET_RE.exec(pathname)?.[1];
  if (sheet) {
    if (sheets.size > 20_000) for (const [k, e] of sheets) if (now > e.resetAt) sheets.delete(k);
    let e = sheets.get(ip);
    if (!e || now > e.resetAt) sheets.set(ip, (e = { ids: new Set(), resetAt: now + SHEET_WINDOW_MS }));
    if (!e.ids.has(sheet)) {
      if (e.ids.size >= SHEET_MAX) {
        const wait = Math.max(1, Math.ceil((e.resetAt - now) / 1000));
        return page(429, "Đã mở đủ đề mẫu", `Mỗi giờ chỉ mở được ${SHEET_MAX} đề mẫu (đề ${[...e.ids].join(", ")} vẫn mở lại được). Đề khác thử lại sau khoảng ${Math.ceil(wait / 60)} phút.`, {
          "Retry-After": String(wait),
        });
      }
      e.ids.add(sheet);
    }
  }

  const clientNav = req.headers.has("next-url"); // chuyển trang / prefetch từ trong app
  const bucket = clientNav ? "nav" : "doc";
  for (const l of LIMITS) {
    const e = hit(`${bucket}:${l.name}:${ip}`, l.windowMs, now);
    if (e.count > l.max * (clientNav ? CLIENT_NAV_FACTOR : 1)) {
      const wait = Math.max(1, Math.ceil((e.resetAt - now) / 1000));
      const when = wait < 120 ? `${wait} giây` : wait < 7200 ? `${Math.ceil(wait / 60)} phút` : `${Math.ceil(wait / 3600)} giờ`;
      return page(429, "Bạn mở trang quá nhanh", `Để chống sao chép bộ đề tự động, mỗi người chỉ được mở một số trang nhất định. Thử lại sau khoảng ${when}.`, {
        "Retry-After": String(wait),
      });
    }
  }
  return null;
}
