"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookMarked, Captions, House, ListVideo, LogIn, LogOut, Settings, Users } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { logout } from "@/app/auth-actions";
import { LoginLink } from "./LoginDialog";

/** short: nhãn dưới icon khi thanh hẹp (md) — label đầy đủ hiện khi thanh rộng (lg) */
type Item = { href: string; label: string; short: string; icon: ComponentType<{ className?: string }> };

const ITEMS: Item[] = [
  { href: "/", label: "Trang chủ", short: "Trang chủ", icon: House },
];
const USER_ITEMS: Item[] = [
  { href: "/vocab", label: "Sổ từ vựng", short: "Từ vựng", icon: BookMarked },
  { href: "/settings", label: "Cài đặt tài khoản", short: "Cài đặt", icon: Settings },
];
const ADMIN_ITEMS: Item[] = [
  { href: "/admin", label: "Quản lý bài học", short: "Bài học", icon: ListVideo },
  { href: "/admin/transcripts", label: "Phụ đề đã lưu", short: "Phụ đề", icon: Captions },
  { href: "/admin/users", label: "Người dùng", short: "Người dùng", icon: Users },
];

/**
 * Thanh điều hướng: điện thoại — hàng icon dưới đáy · md — cột icon có nhãn nhỏ · lg — thanh rộng icon + chữ, chia nhóm.
 */
export default function Sidebar({ user }: { user: { name: string; role: string } | null }) {
  const pathname = usePathname();
  const admin = user?.role === "admin";
  const items = [...ITEMS, ...(user ? USER_ITEMS : []), ...(admin ? ADMIN_ITEMS : [])];
  // Mục khớp dài nhất là mục đang chọn (/admin/users → "Người dùng", không phải "Quản lý bài học")
  const matches = (href: string) =>
    href === "/" ? pathname === "/" || /^\/(lesson|watch)\//.test(pathname) : pathname === href || pathname.startsWith(href + "/");
  const current = items.filter((it) => matches(it.href)).sort((a, b) => b.href.length - a.href.length)[0]?.href;

  const link = (it: Item) => {
    const As = it.href === "/login" ? LoginLink : Link; // đăng nhập: mở popup tại trang đang xem
    const on = it.href === current;
    return (
      <As
        key={it.href}
        href={it.href}
        title={it.label}
        aria-current={on ? "page" : undefined}
        className={`relative flex size-11 items-center justify-center rounded-2xl transition md:size-auto md:w-16 md:flex-col md:gap-1 md:rounded-xl md:py-2 lg:w-full lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:py-2.5 ${
          on
            ? "bg-accent text-white shadow-[0_4px_0_var(--accent-dark)] md:bg-accent/15 md:text-accent md:shadow-none lg:before:absolute lg:before:-left-3 lg:before:h-6 lg:before:w-1 lg:before:rounded-r-full lg:before:bg-accent"
            : "text-link hover:bg-white/10 md:text-muted md:hover:bg-white/5 md:hover:text-foreground"
        }`}
      >
        <it.icon className="size-6 shrink-0 md:size-5" />
        <span className="hidden text-[11px] leading-none font-bold md:block lg:hidden">{it.short}</span>
        <span className="hidden truncate text-sm font-bold lg:block">{it.label}</span>
      </As>
    );
  };

  return (
    <SidebarFrame>
      {items.filter((it) => !ADMIN_ITEMS.includes(it)).map(link)}
      {admin && (
        <>
          <p className="hidden px-3 pt-4 pb-1 text-[11px] font-extrabold tracking-wider text-muted uppercase lg:block">Quản trị</p>
          <div className="my-1 hidden h-px w-10 bg-border md:block lg:hidden" />
          {ADMIN_ITEMS.map(link)}
        </>
      )}
      <div className="hidden flex-1 md:block" />
      {user ? (
        <div className="flex items-center md:flex-col-reverse md:gap-2 lg:flex-row lg:gap-3 lg:rounded-2xl lg:border lg:border-border lg:bg-card lg:p-2">
          <div
            title={user.name}
            className="hidden size-10 shrink-0 items-center justify-center rounded-full bg-amber text-lg font-extrabold text-sidebar md:flex"
          >
            {user.name.trim()[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="hidden min-w-0 flex-1 lg:block">
            <p className="truncate text-sm font-bold">{user.name}</p>
            <p className="text-xs text-muted">{admin ? "Quản trị viên" : "Học viên"}</p>
          </div>
          <form action={logout}>
            <button
              title="Đăng xuất"
              className="flex size-11 cursor-pointer items-center justify-center rounded-2xl text-red-400 hover:bg-white/10 md:size-10 md:rounded-xl md:text-muted md:hover:bg-red/15 md:hover:text-red-400"
            >
              <LogOut className="size-6 md:size-5" />
            </button>
          </form>
        </div>
      ) : (
        link({ href: "/login", label: "Đăng nhập", short: "Đăng nhập", icon: LogIn })
      )}
    </SidebarFrame>
  );
}

const NAV_CLASS =
  "fixed inset-x-0 bottom-0 z-40 flex h-[calc(4rem+env(safe-area-inset-bottom))] items-center justify-around gap-1 overflow-x-auto border-t border-border bg-sidebar px-2 pb-[env(safe-area-inset-bottom)] *:shrink-0 md:sticky md:top-0 md:h-screen md:w-20 md:flex-col md:justify-start md:gap-1.5 md:border-t-0 md:border-r md:pt-0 md:pb-4 lg:w-60 lg:items-stretch lg:px-3";

function SidebarFrame({ children }: { children?: ReactNode }) {
  return (
    <nav className={NAV_CLASS}>
      {/* Cao bằng thanh trên cùng (h-16) để 2 bên thẳng hàng */}
      <Link href="/" title="Deutsch Shadowing" className="mb-2 hidden h-16 items-center gap-2.5 md:flex lg:px-2">
        <span className="text-3xl">🇩🇪</span>
        <span className="hidden text-base font-extrabold whitespace-nowrap lg:block">Deutsch Shadowing</span>
      </Link>
      {children}
    </nav>
  );
}

/** Khung trống hiện trong lúc chờ đọc phiên đăng nhập (không dùng usePathname → được prerender) */
export function SidebarSkeleton() {
  return <SidebarFrame />;
}
