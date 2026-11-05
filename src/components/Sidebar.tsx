"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookMarked, Captions, ChevronDown, Gamepad2, House, ListVideo, LogOut, MessageSquare, Mic, Settings, Trophy, Users } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { logout } from "@/app/auth-actions";
import Avatar, { type AvatarUser } from "./Avatar";

type Item = { href: string; label: string; icon: ComponentType<{ className?: string }> };
type NavUser = AvatarUser & { role: string };

const ITEMS: Item[] = [
  { href: "/", label: "Trang chủ", icon: House },
  { href: "/vocab", label: "Từ vựng", icon: BookMarked }, // kho bộ từ xem được khi chưa đăng nhập
  { href: "/sprechen", label: "Luyện nói", icon: Mic },
  { href: "/games", label: "Game", icon: Gamepad2 },
  { href: "/leaderboard", label: "Xếp hạng", icon: Trophy },
];
const BAR_ITEMS = ITEMS.filter((it) => it.href !== "/sprechen"); // thanh dưới đáy không có Luyện nói (chưa ra mắt)
const USER_ITEMS: Item[] = [
  { href: "/settings", label: "Cài đặt tài khoản", icon: Settings },
];
const ADMIN_ITEMS: Item[] = [
  { href: "/admin", label: "Quản lý bài học", icon: ListVideo },
  { href: "/admin/transcripts", label: "Phụ đề đã lưu", icon: Captions },
  { href: "/admin/users", label: "Người dùng", icon: Users },
  { href: "/admin/feedback", label: "Góp ý", icon: MessageSquare },
];

/** href của mục đang chọn — mục khớp dài nhất (/admin/users → "Người dùng", không phải "Quản lý bài học") */
function useCurrent(items: Item[]) {
  const pathname = usePathname();
  // "/" khớp mọi trang (dự phòng) → trang bài học ckk.pro/<slug>, /watch/… vẫn sáng "Trang chủ"
  const matches = (href: string) => href === "/" || pathname === href || pathname.startsWith(href + "/");
  return items.filter((it) => matches(it.href)).sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

/**
 * Thanh icon dưới đáy — chỉ trên điện thoại (máy tính dùng menu thả xuống ở avatar). Chỉ giữ các trang chính:
 * Cài đặt + Đăng xuất nằm ở avatar → /settings, Đăng nhập là nút ở thanh trên cùng, trang con admin có nút trong /admin.
 */
export default function Sidebar({ user }: { user: NavUser | null }) {
  const items = [...BAR_ITEMS, ...(user?.role === "admin" ? ADMIN_ITEMS.slice(0, 1) : [])];
  const current = useCurrent([...ITEMS, ...items, ...USER_ITEMS]); // ITEMS, USER_ITEMS: ở /games, /settings… không sáng nhầm "Trang chủ"

  return (
    <SidebarFrame>
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          title={it.label}
          aria-current={it.href === current ? "page" : undefined}
          className={`flex size-11 items-center justify-center rounded-2xl transition ${
            it.href === current ? "bg-accent text-white shadow-[0_4px_0_var(--accent-dark)]" : "text-foreground hover:bg-foreground/10"
          }`}
        >
          <it.icon className="size-6" />
        </Link>
      ))}
    </SidebarFrame>
  );
}

function SidebarFrame({ children }: { children?: ReactNode }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-[calc(4rem+env(safe-area-inset-bottom))] items-center justify-around gap-1 overflow-x-auto border-t-2 border-ink bg-card px-2 pb-[env(safe-area-inset-bottom)] *:shrink-0 md:hidden">
      {children}
    </nav>
  );
}

/** Khung trống hiện trong lúc chờ đọc phiên đăng nhập (không dùng usePathname → được prerender) */
export function SidebarSkeleton() {
  return <SidebarFrame />;
}

const HEADER_ITEMS = ITEMS.filter((it) => it.href === "/vocab" || it.href === "/games" || it.href === "/leaderboard");

/** Lối tắt ở thanh trên cùng — chỉ trên máy tính (điện thoại đã có ở thanh dưới đáy) */
export function HeaderNav() {
  return <HeaderNavFrame current={useCurrent(HEADER_ITEMS)} />;
}

/** Bản không tô sáng mục đang chọn — hiện trong lúc chờ (không dùng usePathname → được prerender) */
export function HeaderNavFrame({ current }: { current?: string }) {
  return (
    <nav className="flex items-center gap-1 max-md:hidden">
      {HEADER_ITEMS.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition ${
            it.href === current ? "bg-accent/15 text-accent" : "text-foreground/85 hover:bg-foreground/5 hover:text-foreground"
          }`}
        >
          <it.icon className={`size-[18px] ${it.href === current ? "" : "text-muted"}`} />
          {it.label}
        </Link>
      ))}
    </nav>
  );
}

/**
 * Góc phải thanh trên cùng: avatar + tên. Máy tính: rê chuột (hoặc bấm — màn cảm ứng) để mở menu các trang.
 * Điện thoại: chỉ là link tới Cài đặt (trang chính đã có ở thanh dưới đáy, Đăng xuất nằm trong Cài đặt).
 */
export function UserDropdown({ user }: { user: NavUser }) {
  const admin = user.role === "admin";
  const current = useCurrent([...ITEMS, ...USER_ITEMS, ...(admin ? ADMIN_ITEMS : [])]);
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
      {admin && <span className="pill bg-amber/15 text-amber max-sm:hidden">ADMIN</span>}
      <span className="max-w-40 truncate font-bold max-sm:max-w-28 max-[380px]:hidden">{user.name}</span>
      <Avatar user={user} className="size-9 text-lg sm:size-10" />
    </>
  );

  const item = (it: Item) => (
    <Link
      key={it.href}
      href={it.href}
      role="menuitem"
      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold transition ${
        it.href === current ? "bg-accent/15 text-accent" : "text-foreground/85 hover:bg-foreground/5 hover:text-foreground"
      }`}
    >
      <it.icon className={`size-[18px] ${it.href === current ? "" : "text-muted"}`} />
      {it.label}
    </Link>
  );

  return (
    <>
      <Link href="/settings" title="Cài đặt tài khoản" className="flex items-center gap-3 rounded-xl px-2 py-1 hover:bg-foreground/5 md:hidden">
        {trigger}
      </Link>
      <div ref={box} className="relative max-md:hidden" onPointerEnter={(e) => e.pointerType === "mouse" && show()} onPointerLeave={(e) => e.pointerType === "mouse" && hide()}>
        <button
          className={`flex cursor-pointer items-center gap-3 rounded-xl px-2 py-1 transition hover:bg-foreground/5 ${open ? "bg-foreground/5" : ""}`}
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
            <div role="menu" className="sheet-fade flex flex-col gap-0.5 rounded-2xl border-2 border-ink bg-card p-2 shadow-[0_4px_0_var(--ink)]">
              <div className="mb-1 flex items-center gap-3 border-b border-border px-2 pt-1 pb-3">
                <Avatar user={user} className="size-10 text-lg" />
                <div className="min-w-0">
                  <p className="truncate font-bold">{user.name}</p>
                  <p className="text-xs text-muted">{admin ? "Quản trị viên" : "Học viên"}</p>
                </div>
              </div>
              {[...ITEMS, ...USER_ITEMS].map(item)}
              {admin && (
                <>
                  <p className="px-3 pt-3 pb-1 text-[11px] font-extrabold tracking-wider text-muted uppercase">Quản trị</p>
                  {ADMIN_ITEMS.map(item)}
                </>
              )}
              <div className="my-1 h-px bg-border" />
              <form action={logout}>
                <button
                  role="menuitem"
                  className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold text-red-400 transition hover:bg-red/15"
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
