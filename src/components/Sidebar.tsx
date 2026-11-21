"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookMarked, Captions, Car, ChevronDown, Gamepad2, House, Landmark, Languages, Layers, ListVideo, LogOut, MessageSquare, MonitorPlay, Settings, Trophy, Users } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { logout } from "@/app/(app)/auth-actions";
import Avatar, { type AvatarUser } from "./Avatar";

type Item = { href: string; label: string; short?: string; icon: ComponentType<{ className?: string }> };

/** Màu nhận diện khu vực (data-sec → --sec trong globals.css) */
export function secOf(href: string): string | undefined {
  if (href.startsWith("/lai-xe")) return "laixe";
  if (href.startsWith("/leben-in-deutschland")) return "lid";
  if (href.startsWith("/games")) return "game";
  if (href.startsWith("/admin") || href === "/stats" || href === "/settings") return "ink";
  if (href === "/") return undefined;
  return "de";
}
type NavUser = AvatarUser & { role: string };

const ITEMS: Item[] = [
  { href: "/", label: "Trang chủ", icon: House },
  { href: "/tieng-duc", label: "Tiếng Đức", icon: Languages },
  { href: "/lai-xe", label: "Lái xe", icon: Car },
  { href: "/leben-in-deutschland", label: "Leben in DE", short: "LiD", icon: Landmark },
  { href: "/games", label: "Trò chơi", short: "Game", icon: Gamepad2 },
];
const REVIEW: Item = { href: "/vocab/notebook", label: "Ôn tập", icon: Layers };
const DEUTSCH: Item[] = [
  { href: "/tieng-duc", label: "Bài học", icon: MonitorPlay },
  { href: "/vocab", label: "Từ vựng", icon: BookMarked },
  REVIEW,
  { href: "/leaderboard", label: "Xếp hạng", icon: Trophy },
];
const GUEST_BAR: Item[] = ITEMS.filter((it) => it.href !== "/games");
const USER_BAR: Item[] = [ITEMS[1], REVIEW, ITEMS[2], ITEMS[3]];
const USER_ITEMS: Item[] = [
  { href: "/stats", label: "Tiến độ & thành tích", icon: BarChart3 },
  { href: "/settings", label: "Hồ sơ & cài đặt", icon: Settings },
];
const LEARN_QUICK: Item[] = [
  { href: "/vocab/notebook", label: "Sổ từ & ôn tập", icon: Layers },
  { href: "/vocab", label: "Kho từ vựng", icon: BookMarked },
  { href: "/leaderboard", label: "Bảng xếp hạng", icon: Trophy },
];
const ADMIN_ITEMS: Item[] = [
  { href: "/admin", label: "Quản lý bài học", short: "Admin", icon: ListVideo },
  { href: "/admin/transcripts", label: "Phụ đề đã lưu", icon: Captions },
  { href: "/admin/users", label: "Người dùng", icon: Users },
  { href: "/admin/feedback", label: "Góp ý", icon: MessageSquare },
];

const INFO_PAGES = ["about", "shadowing", "support", "privacy", "terms", "impressum", "refund", "calendar", "deutsch-redewendung"];
const NOT_DEUTSCH = new Set(["login", "register", "forgot-password", "admin", "settings", "stats", "deutsch-shadowing", ...INFO_PAGES]);

function useCurrent(items: Item[]) {
  const pathname = usePathname();
  const matches = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/"));
  const best = items.filter((it) => matches(it.href)).sort((a, b) => b.href.length - a.href.length)[0]?.href;
  if (best) return best;
  const first = pathname.split("/")[1] ?? "";
  if (!first) return undefined;
  return items.some((it) => it.href === "/tieng-duc") && !NOT_DEUTSCH.has(first) ? "/tieng-duc" : undefined;
}

function DueBadge({ due, className = "" }: { due: number; className?: string }) {
  if (!due) return null;
  return (
    <span className={`flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red px-1 text-[10px] leading-none font-bold text-white tabular-nums ring-2 ring-card ${className}`}>
      {due > 99 ? "99+" : due}
    </span>
  );
}
const reviewHref = (href: string, due: number) => (href === REVIEW.href && due ? "/vocab/notebook?review=1" : href);

export default function Sidebar({ user, due = 0 }: { user: NavUser | null; due?: number }) {
  const items = [...(user ? USER_BAR : GUEST_BAR), ...(user?.role === "admin" ? ADMIN_ITEMS.slice(0, 1) : [])];
  const current = useCurrent([...ITEMS, ...items, ...USER_ITEMS]);

  return (
    <SidebarFrame>
      {items.map((it) => {
        const active = it.href === current;
        return (
          <Link
            key={it.href}
            href={reviewHref(it.href, due)}
            data-sec={secOf(it.href)}
            aria-label={`${it.short && it.short !== it.label ? `${it.short} – ${it.label}` : it.label}${it.href === REVIEW.href && due ? ` — ${due} từ đến hạn ôn` : ""}`}
            aria-current={active ? "page" : undefined}
            className={`group relative flex h-14 min-w-14 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 transition-colors ${active ? "text-foreground" : "text-muted active:text-foreground"
              }`}
          >
            <span
              className={`flex h-7 w-12 items-center justify-center rounded-lg transition-colors duration-150 ${active ? "bg-sec-soft text-sec-text" : "group-active:bg-card-2"
                }`}
            >
              <it.icon className="size-5" />
            </span>
            <span className={`text-[11px] leading-none ${active ? "font-semibold text-foreground" : "font-medium"}`}>{it.short ?? it.label}</span>
            {it.href === REVIEW.href && <DueBadge due={due} className="absolute top-1 left-1/2 ml-1.5" />}
          </Link>
        );
      })}
    </SidebarFrame>
  );
}

function SidebarFrame({ children }: { children?: ReactNode }) {
  return (
    <nav className="bottom-nav fixed inset-x-0 bottom-0 z-40 flex h-[calc(4rem+env(safe-area-inset-bottom))] items-center justify-around gap-0.5 overflow-x-auto border-t border-line bg-card/95 px-1.5 pb-[env(safe-area-inset-bottom)] backdrop-blur-md *:shrink-0 md:hidden dark:bg-sidebar/95">
      {children}
    </nav>
  );
}

export function SidebarSkeleton() {
  return <SidebarFrame />;
}

const HEADER_ITEMS = ITEMS.slice(1);

export function HeaderNav() {
  return <HeaderNavFrame current={useCurrent([...ITEMS, REVIEW, ...USER_ITEMS])} />;
}

export function ReviewPill({ due }: { due: number }) {
  if (!due) return null;
  return (
    <Link href="/vocab/notebook?review=1" title={`${due} từ đến hạn ôn — bấm để ôn ngay`} className="btn btn-sm gap-1.5 max-md:hidden">
      <Layers className="size-3.5 text-muted" /> Ôn tập
      <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red px-1 text-[10px] leading-none font-bold text-white tabular-nums">
        {due > 99 ? "99+" : due}
      </span>
    </Link>
  );
}

export function DeutschOnly({ children }: { children: ReactNode }) {
  const current = useCurrent([...ITEMS, REVIEW, ...USER_ITEMS]);
  return <div className={current === "/tieng-duc" || current === REVIEW.href ? "contents" : "hidden"}>{children}</div>;
}

export function HeaderNavFrame({ current }: { current?: string }) {
  return (
    <nav aria-label="Các phần chính" className="flex items-center gap-1 max-md:hidden">
      {HEADER_ITEMS.map((it) => {
        const on = it.href === current;
        return (
          <Link
            key={it.href}
            href={it.href}
            data-sec={secOf(it.href)}
            aria-current={on ? "page" : undefined}
            className={`group relative flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm transition-colors duration-150 ${on ? "bg-sec-soft font-semibold text-sec-text" : "font-medium text-muted hover:bg-card-2 hover:text-foreground"
              }`}
          >
            <it.icon className={`size-4 ${on ? "text-sec-text" : "text-muted group-hover:text-foreground"}`} />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}

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

export function UserDropdown({ user }: { user: NavUser }) {
  const admin = user.role === "admin";
  const greeting = useGreeting();
  const current = useCurrent([...ITEMS, ...LEARN_QUICK, ...USER_ITEMS, ...(admin ? ADMIN_ITEMS : [])]);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = () => {
    clearTimeout(timer.current);
    setOpen(true);
  };
  const hide = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(false), 150);
  };

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
        <span className="text-[11px] text-muted">{greeting}</span>
        <span className="max-w-36 truncate text-sm font-semibold">{user.name}</span>
      </span>
      <Avatar user={user} className="size-8 text-sm sm:size-9" />
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
      <it.icon className={`size-4 ${it.href === current ? "" : "text-muted"}`} />
      {it.label}
    </Link>
  );

  return (
    <>
      <Link href="/stats" title="Thành tích & cài đặt" className="flex items-center gap-2 rounded-lg p-1 transition hover:bg-card-2 md:hidden">
        {trigger}
      </Link>
      <div ref={box} className="relative max-md:hidden" onPointerEnter={(e) => e.pointerType === "mouse" && show()} onPointerLeave={(e) => e.pointerType === "mouse" && hide()}>
        <button
          className={`flex cursor-pointer items-center gap-2 rounded-lg py-1 pr-2 pl-2.5 transition-colors hover:bg-card-2 ${open ? "bg-card-2" : ""}`}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {trigger}
          <ChevronDown className={`size-3.5 text-muted transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <div className="absolute top-full right-0 z-50 w-64 pt-1.5">
            <div role="menu" className="popover flex max-h-[calc(100dvh-6rem)] flex-col gap-0.5 overflow-y-auto">
              <div className="mb-1 flex items-center gap-2.5 rounded-lg bg-card-2 px-3 py-2.5">
                <Avatar user={user} className="size-10 text-base ring-1 ring-line" />
                <div className="min-w-0">
                  <p className="truncate text-sm leading-tight font-semibold">{user.name}</p>
                  <p className={`badge mt-1 ${admin ? "badge-gold" : "badge-accent"}`}>{admin ? "Quản trị viên" : "Học viên"}</p>
                </div>
              </div>
              <p className="menu-label">Cá nhân</p>
              {USER_ITEMS.map(item)}
              <div className="menu-sep" />
              <p className="menu-label">Học tập & ôn tập</p>
              {LEARN_QUICK.map(item)}
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
                  <LogOut className="size-4" /> Đăng xuất
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const showDeutschSubnav = (p: string) =>
  p === "/tieng-duc" || p.startsWith("/tieng-duc/trinh-do/") || p === "/vocab" || p.startsWith("/vocab/") || p === "/leaderboard";

/** Hàng tab con của khu Tiếng Đức: gạch chân gọn gàng dưới thanh đầu trang */
export function DeutschSubnav() {
  const pathname = usePathname();
  const current = pathname.startsWith("/tieng-duc/trinh-do/")
    ? "/tieng-duc"
    : DEUTSCH.filter((it) => pathname === it.href || pathname.startsWith(it.href + "/")).sort((a, b) => b.href.length - a.href.length)[0]?.href;
  if (!showDeutschSubnav(pathname)) return null;
  return (
    <div data-sec="de" className="border-b border-line bg-card/70 dark:bg-sidebar/70">
      <nav aria-label="Tiếng Đức" className="tabs-line mx-auto w-full max-w-6xl border-b-0 px-4 md:px-6">
        {DEUTSCH.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            aria-current={it.href === current ? "page" : undefined}
            className="tab py-2.5 text-sm"
          >
            <it.icon className={`size-4 ${it.href === current ? "text-sec-text" : "text-muted"}`} />
            {it.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
