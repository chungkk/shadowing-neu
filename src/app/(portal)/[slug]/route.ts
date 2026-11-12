import { getLessonBySlug } from "@/lib/db";
import { lessonPath } from "@/lib/slug";

/**
 * Link bài học cũ ckk.biz/<slug> (trước khi bài học chuyển vào /tieng-duc) → 308 về /tieng-duc/<slug>:
 * link đã chia sẻ không gãy, Google chuyển thứ hạng sang link mới. Không phải bài học → 404.
 * Route handler thay vì page: page đang stream chỉ chuyển hướng được phía trình duyệt, không trả đúng mã 308.
 */
export async function GET(req: Request, ctx: RouteContext<"/[slug]">) {
  const lesson = getLessonBySlug((await ctx.params).slug);
  if (!lesson) return notFoundPage();
  // Location tương đối: sau proxy (Coolify) req.url có thể mang host nội bộ
  return new Response(null, { status: 308, headers: { Location: `${lessonPath(lesson.slug)}${new URL(req.url).search}` } });
}

// notFound() trong route handler chỉ trả 404 trống → tự trả 1 trang 404 gọn (cùng màu với app), có link về trang chủ
const NOT_FOUND_HTML = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Không tìm thấy trang · CKK</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#241a1c;color:#f6e9e4;font-family:system-ui,sans-serif;padding:16px}
main{max-width:420px;text-align:center;border:2px solid #55303f;border-radius:24px;padding:28px;background:#2f2226}
h1{margin:12px 0 4px;font-size:24px}p{color:#bfa9a4;margin:0 0 20px}a{display:inline-block;margin:4px;padding:10px 16px;border-radius:16px;border:2px solid #55303f;color:inherit;text-decoration:none;font-weight:700}
a.p{background:#1d8048;color:#fff}</style></head>
<body><main><img src="/mascot.svg" alt="" width="96" height="96"><h1>Không tìm thấy trang</h1><p>Seite nicht gefunden · Page not found</p>
<a class="p" href="/">Về trang tin</a><a href="/tieng-duc">Học tiếng Đức</a></main></body></html>`;

const notFoundPage = () => new Response(NOT_FOUND_HTML, { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });
