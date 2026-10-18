"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookMarked, FileAudio, House, LogIn, LogOut, Settings, UserCog, Users } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { logout } from "@/app/auth-actions";

type Item = { href: string; label: string; icon: ComponentType<{ className?: string }> };

const ITEMS: Item[] = [
  { href: "/", label: "Trang chủ", icon: House },
  { href: "/local", label: "File trên máy", icon: FileAudio },
];
const USER_ITEMS: Item[] = [
  { href: "/vocab", label: "Sổ từ vựng", icon: BookMarked },
  { href: "/settings", label: "Cài đặt tài khoản", icon: UserCog },
];
const ADMIN_ITEMS: Item[] = [
  { href: "/admin", label: "Quản trị bài học", icon: Settings },
  { href: "/admin/users", label: "Người dùng", icon: Users },
];

/** Thanh icon bên trái (máy tính) / thanh dưới đáy (điện thoại) */
export default function Sidebar({ user }: { user: { name: string; role: string } | null }) {
  const pathname = usePathname();
  const items = [...ITEMS, ...(user ? USER_ITEMS : []), ...(user?.role === "admin" ? ADMIN_ITEMS : [])];
  // Mục khớp dài nhất là mục đang chọn (/admin/users → "Người dùng", không phải "Quản trị")
  const matches = (href: string) =>
    href === "/" ? pathname === "/" || /^\/(lesson|watch)\//.test(pathname) : pathname === href || pathname.startsWith(href + "/");
  const current = items.filter((it) => matches(it.href)).sort((a, b) => b.href.length - a.href.length)[0]?.href;
  const active = (href: string) => href === current;

  const link = (it: Item) => (
    <Link
      key={it.href}
      href={it.href}
      title={it.label}
      className={`flex size-12 items-center justify-center rounded-2xl transition ${
        active(it.href) ? "bg-accent text-white shadow-[0_4px_0_var(--accent-dark)]" : "text-link hover:bg-white/10"
      }`}
    >
      <it.icon className="size-6" />
    </Link>
  );

  return (
    <SidebarFrame>
      {items.map(link)}
      <div className="hidden flex-1 md:block" />
      {user ? (
        <>
          <form action={logout}>
            <button title="Đăng xuất" className="flex size-12 cursor-pointer items-center justify-center rounded-2xl text-red-400 hover:bg-white/10">
              <LogOut className="size-6" />
            </button>
          </form>
          <div
            title={user.name}
            className="hidden size-11 items-center justify-center rounded-full bg-amber text-lg font-extrabold text-sidebar md:flex"
          >
            {user.name.trim()[0]?.toUpperCase() ?? "?"}
          </div>
        </>
      ) : (
        link({ href: "/login", label: "Đăng nhập", icon: LogIn })
      )}
    </SidebarFrame>
  );
}

const NAV_CLASS =
  "fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-border bg-sidebar px-2 md:sticky md:top-0 md:h-screen md:w-20 md:flex-col md:justify-start md:gap-3 md:border-t-0 md:border-r md:py-4";

function SidebarFrame({ children }: { children?: ReactNode }) {
  return (
    <nav className={NAV_CLASS}>
      <Link href="/" title="Deutsch Shadowing" className="hidden text-3xl md:mb-4 md:block">
        🇩🇪
      </Link>
      {children}
    </nav>
  );
}

/** Khung trống hiện trong lúc chờ đọc phiên đăng nhập (không dùng usePathname → được prerender) */
export function SidebarSkeleton() {
  return <SidebarFrame />;
}
