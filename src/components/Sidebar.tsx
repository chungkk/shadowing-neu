"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookMarked, Captions, Car, ChevronDown, Gamepad2, House, Landmark, Languages, Layers, ListVideo, LogOut, MessageSquare, MonitorPlay, Settings, Trophy, Users } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { logout } from "@/app/(app)/auth-actions";
import Avatar, { type AvatarUser } from "./Avatar";

type Item = { href: string; label: string; short?: string; icon: ComponentType<{ className?: string }> }; // short: nhãn ở thanh dưới đáy
type NavUser = AvatarUser & { role: string };

// Các phần lớn của HalloVN (tab trên cùng / thanh dưới đáy). "/" = Trang chủ (trang giới thiệu tĩnh — chỉ khớp đúng "/");
// "Tiếng Đức" sáng cho mọi trang không thuộc phần nào khác (bài học hallovn.de/<slug>, /watch, /vocab…) — xem useCurrent
const ITEMS: Item[] = [
  { href: "/", label: "Trang chủ", icon: House },
  { href: "/tieng-duc", label: "Tiếng Đức", icon: Languages },
  { href: "/lai-xe", label: "Lái xe", icon: Car },
  { href: "/leben-in-deutschland", label: "Leben in DE", short: "LiD", icon: Landmark },
  { href: "/games", label: "Game", icon: Gamepad2 },
];
const REVIEW: Item = { href: "/vocab/notebook", label: "Ôn tập", icon: Layers }; // sổ từ; có từ đến hạn → vào thẳng buổi ôn
// Các trang con của phần Tiếng Đức (hàng tab nhỏ dưới thanh trên cùng — DeutschSubnav)
const DEUTSCH: Item[] = [
  { href: "/tieng-duc", label: "Bài học", icon: MonitorPlay }, // bài học video — trụ cột của phần tiếng Đức
  { href: "/vocab", label: "Từ vựng", icon: BookMarked }, // kho bộ từ xem được khi chưa đăng nhập
  REVIEW,
  { href: "/leaderboard", label: "Xếp hạng", icon: Trophy },
];
// Thanh dưới đáy (tối đa 6 ô): khách thấy đủ các phần; đã đăng nhập thì Ôn tập (có chấm đỏ số từ đến hạn) thay Trang chủ
// — trang chủ chỉ là trang giới thiệu, logo ở thanh trên cùng vẫn dẫn về đó.
// Luyện nói (/sprechen) chưa ra mắt → không có trong menu nào
// Tab Game đã ẩn khỏi thanh dưới đáy (và thanh trên cùng) — trang /games vẫn mở được, còn trong menu avatar
const GUEST_BAR: Item[] = ITEMS.filter((it) => it.href !== "/games");
const USER_BAR: Item[] = [ITEMS[1], REVIEW, ITEMS[2], ITEMS[3]];
const USER_ITEMS: Item[] = [
  { href: "/stats", label: "Thành tích", icon: BarChart3 },
  { href: "/settings", label: "Hồ sơ & cài đặt", icon: Settings },
];
const ADMIN_ITEMS: Item[] = [
  { href: "/admin", label: "Quản lý bài học", short: "Admin", icon: ListVideo },
  { href: "/admin/transcripts", label: "Phụ đề đã lưu", icon: Captions },
  { href: "/admin/users", label: "Người dùng", icon: Users },
  { href: "/admin/feedback", label: "Góp ý", icon: MessageSquare },
];

// Trang không thuộc phần Tiếng Đức (các trang khác không khớp mục nào thì coi là bài học → sáng "Tiếng Đức")
// Trang thông tin chung (src/app/(app)/(info)): giới thiệu, hỗ trợ, pháp lý, trang sản phẩm
const INFO_PAGES = ["about", "shadowing", "support", "privacy", "terms", "impressum", "refund", "calendar", "deutsch-redewendung"];
const NOT_DEUTSCH = new Set(["login", "register", "forgot-password", "admin", "settings", "stats", "deutsch-shadowing", ...INFO_PAGES]);

/** href của mục đang chọn — mục khớp dài nhất (/admin/users → "Người dùng", không phải "Quản lý bài học") */
function useCurrent(items: Item[]) {
  const pathname = usePathname();
  // "/" (Trang chủ) chỉ khớp đúng trang chủ. Trang không thuộc mục nào (/watch/…) → "Tiếng Đức"
  const matches = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/"));
  const best = items.filter((it) => matches(it.href)).sort((a, b) => b.href.length - a.href.length)[0]?.href;
  if (best) return best;
  const first = pathname.split("/")[1] ?? "";
  if (!first) return undefined; // trang chủ khi danh sách không có mục "/" (thanh trên cùng máy tính)
  return items.some((it) => it.href === "/tieng-duc") && !NOT_DEUTSCH.has(first) ? "/tieng-duc" : undefined;
}

/**
 * Thanh icon dưới đáy — chỉ trên điện thoại (máy tính dùng menu thả xuống ở avatar). Chỉ giữ các trang chính:
 * Cài đặt + Đăng xuất nằm ở avatar → /settings, Đăng nhập là nút ở thanh trên cùng, trang con admin có nút trong /admin.
 */
/** Số từ đến hạn ôn: chấm đỏ trên mục "Từ vựng" — bấm vào là vào thẳng buổi ôn */
function DueBadge({ due, className = "" }: { due: number; className?: string }) {
  if (!due) return null;
  return (
    <span className={`flex h-5 min-w-5 items-center justify-center rounded-full bg-red px-1 text-[11px] ring-2 ring-card leading-none font-extrabold text-white tabular-nums ${className}`}>
      {due > 99 ? "99+" : due}
    </span>
  );
}
const reviewHref = (href: string, due: number) => (href === REVIEW.href && due ? "/vocab/notebook?review=1" : href);

export default function Sidebar({ user, due = 0 }: { user: NavUser | null; due?: number }) {
  const items = [...(user ? USER_BAR : GUEST_BAR), ...(user?.role === "admin" ? ADMIN_ITEMS.slice(0, 1) : [])];
  const current = useCurrent([...ITEMS, ...items, ...USER_ITEMS]); // ITEMS, USER_ITEMS: ở /games, /settings… không sáng nhầm "Trang chủ"

  return (
    <SidebarFrame>
      {items.map((it) => (
        <Link
          key={it.href}
          href={reviewHref(it.href, due)}
          aria-label={`${it.short && it.short !== it.label ? `${it.short} – ${it.label}` : it.label}${it.href === REVIEW.href && due ? ` — ${due} từ đến hạn ôn` : ""}`}
          aria-current={it.href === current ? "page" : undefined}
          className={`group relative flex h-14 min-w-15 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 transition-colors ${
            it.href === current ? "text-accent-text" : "text-muted active:text-foreground"
          }`}
        >
          <span
            className={`flex h-8 w-14 items-center justify-center rounded-full transition-all duration-200 ease-[var(--ease-spring)] motion-reduce:transition-none ${
              it.href === current ? "bg-accent-soft scale-100" : "scale-90 group-active:scale-95 group-active:bg-foreground/5"
            }`}
          >
            <it.icon className="size-[22px]" />
          </span>
          <span className={`text-[11px] leading-none ${it.href === current ? "font-extrabold" : "font-bold"}`}>{it.short ?? it.label}</span>
          {it.href === REVIEW.href && <DueBadge due={due} className="absolute top-0 left-1/2 ml-2" />}
        </Link>
      ))}
    </SidebarFrame>
  );
}

function SidebarFrame({ children }: { children?: ReactNode }) {
  return (
    // bottom-nav: màn học (.lesson) ẩn thanh này, thay bằng thanh điều khiển của trình phát (globals.css)
    <nav className="bottom-nav fixed inset-x-0 bottom-0 z-40 flex h-[calc(4rem+env(safe-area-inset-bottom))] items-center justify-around gap-0.5 overflow-x-auto border-t border-line bg-card/90 px-1.5 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_24px_-12px_rgb(var(--shadow-color)/0.18)] backdrop-blur-xl backdrop-saturate-150 *:shrink-0 md:hidden">
      {children}
    </nav>
  );
}

/** Khung trống hiện trong lúc chờ đọc phiên đăng nhập (không dùng usePathname → được prerender) */
export function SidebarSkeleton() {
  return <SidebarFrame />;
}

// Máy tính: logo đã là nút về trang chủ → thanh trên cùng bắt đầu từ "Tiếng Đức"; ẩn tab Game (vẫn còn ở thanh dưới đáy điện thoại)
const HEADER_ITEMS = ITEMS.slice(1).filter((it) => it.href !== "/games");

/** Lối tắt ở thanh trên cùng — chỉ trên máy tính (điện thoại đã có ở thanh dưới đáy). Ôn tập là nút riêng ở góc phải (ReviewPill) */
export function HeaderNav() {
  // Truyền đủ ITEMS: ở /games khớp mục Game (không hiện trên thanh) → không sáng nhầm "Tiếng Đức"
  return <HeaderNavFrame current={useCurrent([...ITEMS, REVIEW, ...USER_ITEMS])} />;
}

/** Máy tính: nút "Ôn N" ở góc phải thanh trên cùng — chỉ hiện khi có từ đến hạn, bấm là vào thẳng buổi ôn */
export function ReviewPill({ due }: { due: number }) {
  if (!due) return null;
  return (
    <Link href="/vocab/notebook?review=1" title={`${due} từ đến hạn ôn — bấm để ôn ngay`} className="btn gap-1.5 max-md:hidden">
      <Layers className="size-4" /> Ôn
      <DueBadge due={due} />
    </Link>
  );
}

/** Chỉ hiện phần con khi đang ở phần Tiếng Đức (bài học, từ vựng, ôn tập, xếp hạng) — nút "Ôn N" và kim cương là của riêng phần này.
 *  Ẩn bằng CSS chứ không gỡ ra: huy hiệu kim cương giữ nguyên số điểm đang đếm khi chuyển qua lại giữa các phần */
export function DeutschOnly({ children }: { children: ReactNode }) {
  const current = useCurrent([...ITEMS, REVIEW, ...USER_ITEMS]);
  return <div className={current === "/tieng-duc" || current === REVIEW.href ? "contents" : "hidden"}>{children}</div>;
}

/** Bản không tô sáng mục đang chọn — hiện trong lúc chờ (không dùng usePathname → được prerender) */
export function HeaderNavFrame({ current }: { current?: string }) {
  return (
    <nav aria-label="Các phần chính" className="flex items-center gap-1 max-md:hidden">
      {HEADER_ITEMS.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          aria-current={it.href === current ? "page" : undefined}
          className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-bold transition-colors lg:px-4 ${
            it.href === current ? "bg-accent-soft text-accent-text" : "text-foreground/80 hover:bg-foreground/[0.06] hover:text-foreground"
          }`}
        >
          <it.icon className={`size-[18px] ${it.href === current ? "" : "text-muted"}`} />
          {it.label}
        </Link>
      ))}
    </nav>
  );
}

// Lời chào theo giờ máy người dùng. Server không biết giờ địa phương → render "Xin chào", lên client mới đổi (khỏi lệch hydrate)
function greetingNow() {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return "Chào buổi sáng";
  if (h >= 11 && h < 13) return "Chào buổi trưa";
  if (h >= 13 && h < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}
const subscribeMinute = (cb: () => void) => {
  const id = setInterval(cb, 60_000);
  return () => clearInterval(id);
};
function useGreeting() {
  return useSyncExternalStore(subscribeMinute, greetingNow, () => "Xin chào");
}

/**
 * Góc phải thanh trên cùng: avatar + tên. Máy tính: rê chuột (hoặc bấm — màn cảm ứng) để mở menu các trang.
 * Điện thoại: chỉ là link tới Cài đặt (trang chính đã có ở thanh dưới đáy, Đăng xuất nằm trong Cài đặt).
 */
export function UserDropdown({ user }: { user: NavUser }) {
  const admin = user.role === "admin";
  const greeting = useGreeting();
  const current = useCurrent([...ITEMS, REVIEW, ...USER_ITEMS, ...(admin ? ADMIN_ITEMS : [])]);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Rời chuột một chút mới đóng — khỏi tắt khi chuột lướt qua khe giữa avatar và menu
  const show = () => {
    clearTimeout(timer.current);
    setOpen(true);
  };
  const hide = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(false), 150);
  };

  // Chuyển trang thì đóng menu
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const trigger = (
    <>
      <span className="flex flex-col items-end leading-tight max-sm:hidden">
        <span className="text-xs font-semibold text-muted">{greeting}</span>
        <span className="max-w-40 truncate font-bold">{user.name}</span>
      </span>
      <Avatar user={user} className="size-9 text-lg sm:size-10" />
    </>
  );

  const item = (it: Item) => (
    <Link
      key={it.href}
      href={it.href}
      role="menuitem"
      aria-current={it.href === current ? "page" : undefined}
      className="menu-item"
    >
      <it.icon className={`size-[18px] ${it.href === current ? "" : "text-muted"}`} />
      {it.label}
    </Link>
  );

  return (
    <>
      <Link href="/stats" title="Thành tích & cài đặt" className="flex items-center gap-3 rounded-full p-0.5 transition hover:bg-foreground/5 md:hidden">
        {trigger}
      </Link>
      <div ref={box} className="relative max-md:hidden" onPointerEnter={(e) => e.pointerType === "mouse" && show()} onPointerLeave={(e) => e.pointerType === "mouse" && hide()}>
        <button
          className={`flex cursor-pointer items-center gap-2.5 rounded-full py-1 pr-2.5 pl-3 transition-colors hover:bg-foreground/[0.06] ${open ? "bg-foreground/[0.06]" : ""}`}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {trigger}
          <ChevronDown className={`size-4 text-muted transition ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          // pt-2: khe trong suốt vẫn thuộc vùng rê chuột
          <div className="absolute top-full right-0 z-50 w-64 pt-2">
            <div role="menu" className="popover flex max-h-[calc(100dvh-6rem)] flex-col gap-0.5 overflow-y-auto">
              <div className="hero mb-1 flex items-center gap-3 rounded-[14px] px-3 py-3">
                <Avatar user={user} className="size-11 text-lg ring-2 ring-card" />
                <div className="min-w-0">
                  <p className="truncate font-display text-base leading-tight font-extrabold">{user.name}</p>
                  <p className={`badge mt-1 ${admin ? "badge-gold" : "badge-accent"}`}>{admin ? "Quản trị viên" : "Học viên"}</p>
                </div>
              </div>
              {[...ITEMS, REVIEW, ...USER_ITEMS].map(item)}
              {admin && (
                <>
                  <div className="menu-sep" />
                  <p className="menu-label">Quản trị</p>
                  {ADMIN_ITEMS.map(item)}
                </>
              )}
              <div className="menu-sep" />
              <form action={logout}>
                <button
                  role="menuitem"
                  className="menu-item text-red-400 hover:bg-red-soft focus-visible:bg-red-soft"
                >
                  <LogOut className="size-[18px]" /> Đăng xuất
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/** Trang thuộc phần Tiếng Đức có hàng tab con (không hiện ở màn học /watch, /<slug> — màn đó cần chỗ cho trình phát) */
const showDeutschSubnav = (p: string) => p === "/tieng-duc" || p === "/vocab" || p.startsWith("/vocab/") || p === "/leaderboard";

/** Hàng tab con của phần Tiếng Đức: Bài học · Từ vựng · Ôn tập · Xếp hạng */
export function DeutschSubnav() {
  const pathname = usePathname();
  const current = DEUTSCH.filter((it) => pathname === it.href || pathname.startsWith(it.href + "/")).sort(
    (a, b) => b.href.length - a.href.length,
  )[0]?.href;
  if (!showDeutschSubnav(pathname)) return null;
  return (
    <nav aria-label="Tiếng Đức" className="scroll-row mx-auto flex w-full max-w-6xl gap-2 px-4 pt-4 md:px-6 md:pt-5">
      {DEUTSCH.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          aria-current={it.href === current ? "page" : undefined}
          className="chip"
        >
          <it.icon className={`size-4 ${it.href === current ? "" : "text-muted"}`} />
          {it.label}
        </Link>
      ))}
    </nav>
  );
}
