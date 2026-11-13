import { NextResponse, type NextRequest } from "next/server";
import { fuehrerscheinGuard } from "@/biz/fuehrerschein-guard";
import { crawlGuard } from "@/lib/crawl-guard";

// Tên miền duy nhất: ckk.biz. ckk.pro (tên cũ của Deutsch Shadowing) không dùng nữa — chỉ giữ trỏ về app này
// để link cũ và app di động bản cũ không gãy; khi gần như mọi người đã cập nhật app (gọi ckk.biz) thì bỏ hẳn.
// - www.ckk.biz → ckk.biz
// - ckk.pro → ckk.biz, cùng đường dẫn. Riêng /api/* KHÔNG chuyển: app di động (bản đã phát hành) gọi thẳng
//   ckk.pro/api/v1 kèm Bearer token — chuyển hướng sang tên miền khác thì iOS bỏ header Authorization.
//   Link pháp lý cũ của app (ckk.pro/privacy, /terms, …/de) → trang chính sách của Deutsch Shadowing trên ckk.biz.
// - /api/fuehrerschein/*: CORS, chặn bot, App Key, giới hạn tần suất (như ckk-biz trước đây)
// - /lai-xe, /leben-in-deutschland: chống crawl bộ câu hỏi (lib/crawl-guard.ts)

const MAIN_HOST = "ckk.biz";
const OLD_HOSTS = new Set(["ckk.pro", "www.ckk.pro", "www.ckk.biz"]);
const OLD_LEGAL = /^\/(privacy|terms)(\/de)?\/?$/;

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();

  if (OLD_HOSTS.has(host) && !pathname.startsWith("/api/")) {
    // Trang chủ cũ của ckk.pro là bài học tiếng Đức (trang chủ ckk.biz giờ là trang giới thiệu)
    if (host.endsWith("ckk.pro") && pathname === "/") return NextResponse.redirect(`https://${MAIN_HOST}/tieng-duc${search}`, 308);
    const path = host.endsWith("ckk.pro") && OLD_LEGAL.test(pathname) ? `/deutsch-shadowing${pathname.replace(/\/$/, "")}` : pathname;
    return NextResponse.redirect(`https://${MAIN_HOST}${path}${search}`, 308);
  }

  if (pathname.startsWith("/api/fuehrerschein")) return fuehrerscheinGuard(request);
  return crawlGuard(request) ?? NextResponse.next();
}

export const config = {
  // Bỏ qua file tĩnh của Next (đã có hash, không cần chuyển hướng) để proxy không chạy cho từng file JS/CSS
  matcher: ["/((?!_next/static|_next/image).*)"],
};
