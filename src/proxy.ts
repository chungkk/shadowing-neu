import { NextResponse, type NextRequest } from "next/server";
import { fuehrerscheinGuard } from "@/lib/laixe/guard";
import { crawlGuard } from "@/lib/crawl-guard";
import { LID_BASE, LID_PAGES, LID_PRIVATE, LID_SET_IDS } from "@/lib/lid/routes";

// Tên miền chính thức: hallovn.de. ckk.pro (tên cũ) chỉ còn trỏ về app này để link cũ và app di động bản cũ không gãy.
// ckk.biz KHÔNG còn thuộc HalloVN: là dự án riêng (API) của 2 app Führerschein / Leben in Deutschland.
// - www.hallovn.de → hallovn.de, cùng đường dẫn
// - Trang cũ của 2 app trên hallovn.de (/fuehrerschein, /lid, …/privacy, …/support, /delete-account) → ckk.biz, cùng đường dẫn
// - ckk.pro → hallovn.de, cùng đường dẫn. Riêng /api/* KHÔNG chuyển (mọi tên miền cũ): app di động đã phát hành
//   gọi thẳng ckk.pro/api/v1 hoặc ckk.biz/api/v1 kèm Bearer token — chuyển hướng sang tên miền khác thì iOS bỏ header Authorization.
//   Link pháp lý cũ của app (ckk.pro/privacy, /terms, …/de) → trang chính sách của HalloVN trên hallovn.de.
// - /api/fuehrerschein/*: CORS, chặn bot, App Key, giới hạn tần suất (như ckk-biz trước đây)
// - /lai-xe, /leben-in-deutschland: chống crawl bộ câu hỏi (lib/crawl-guard.ts)
// - /leben-in-deutschland: đường dẫn lạ → 404 thật, trang cá nhân chưa đăng nhập → 307 sang /login. Làm ở đây vì trang
//   render trong <Suspense> đã gửi 200 trước khi notFound() / redirect() chạy (chỉ còn noindex + chuyển trang phía trình duyệt).

const MAIN_HOST = "hallovn.de";
const OLD_HOSTS = new Set(["www.hallovn.de", "ckk.pro", "www.ckk.pro"]);
const CKK_BIZ = "ckk.biz";
const CKK_BIZ_HOSTS = new Set([CKK_BIZ, "www.ckk.biz"]);
/** Trang của 2 app riêng (đã chuyển sang ckk.biz) */
const MOVED_TO_CKK_BIZ = /^\/(?:(?:fuehrerschein|lid)(?:\/(?:privacy|support))?|delete-account)\/?$/;
const OLD_LEGAL = /^\/(privacy|terms)(\/de)?\/?$/;

const LID_KNOWN = new Set<string>([...LID_SET_IDS, ...LID_PAGES]);

/** null = cho qua */
function lidRoute(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith(LID_BASE + "/")) return null;
  const parts = pathname.slice(LID_BASE.length + 1).split("/").filter(Boolean);
  const ok =
    parts.length === 0 ||
    (parts.length === 1 && (LID_KNOWN.has(parts[0]) || parts[0].startsWith("opengraph-image"))) || // ảnh OG: "opengraph-image-<mã>"
    (parts.length === 2 && parts[0] === "thi-thu" && (parts[1] === "lam-bai" || /^\d{1,10}$/.test(parts[1])));
  // Đường dẫn không khớp route nào → Next tự trả trang 404 chung với HTTP 404
  if (!ok) return NextResponse.rewrite(new URL(`${LID_BASE}/hoc/khong-co`, request.url));
  if (LID_PRIVATE.test(pathname) && !request.cookies.has("session")) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login, 307);
  }
  return null;
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();

  if (OLD_HOSTS.has(host) && !pathname.startsWith("/api/")) {
    // Trang chủ cũ của ckk.pro là bài học tiếng Đức (trang chủ hiện là trang giới thiệu)
    if (host.endsWith("ckk.pro") && pathname === "/") return NextResponse.redirect(`https://${MAIN_HOST}/tieng-duc${search}`, 308);
    const path = host.endsWith("ckk.pro") && OLD_LEGAL.test(pathname) ? `/deutsch-shadowing${pathname.replace(/\/$/, "")}` : pathname;
    return NextResponse.redirect(`https://${MAIN_HOST}${path}${search}`, 308);
  }

  // Chỉ chuyển khi không phải chính ckk.biz gọi tới (lúc DNS ckk.biz còn trỏ về đây) — tránh vòng lặp chuyển hướng
  if (MOVED_TO_CKK_BIZ.test(pathname) && !CKK_BIZ_HOSTS.has(host)) {
    return NextResponse.redirect(`https://${CKK_BIZ}${pathname.replace(/\/$/, "")}${search}`, 308);
  }

  if (pathname.startsWith("/api/fuehrerschein")) return fuehrerscheinGuard(request);
  return (await crawlGuard(request)) ?? lidRoute(request) ?? NextResponse.next();
}

export const config = {
  // Bỏ qua file tĩnh của Next (đã có hash, không cần chuyển hướng) để proxy không chạy cho từng file JS/CSS
  matcher: ["/((?!_next/static|_next/image).*)"],
};
