"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  BookOpenCheck,
  Captions,
  LayoutDashboard,
  ListVideo,
  Lock,
  Menu,
  MessageSquare,
  Server,
  ShieldCheck,
  Tv,
  Users,
  X,
} from "lucide-react";
import type { ComponentType } from "react";

export type SidebarCounts = {
  draftLessons: number;
  openFeedback: number;
  lockEnabled: boolean;
};

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  match?: (pathname: string) => boolean;
  badge?: (c: SidebarCounts) => { text: string; tone: "warn" | "red" | "ok" | "muted" } | null;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const GROUPS: NavGroup[] = [
  {
    title: "Tổng quan",
    items: [
      {
        href: "/admin",
        label: "Bảng điều khiển",
        icon: LayoutDashboard,
        match: (p) => p === "/admin",
      },
    ],
  },
  {
    title: "Nội dung học tập",
    items: [
      {
        href: "/admin/lessons",
        label: "Bài học Tiếng Đức",
        icon: ListVideo,
        match: (p) =>
          p === "/admin/lessons" ||
          p.startsWith("/admin/lessons/") ||
          p === "/admin/new" ||
          /^\/admin\/\d+$/.test(p),
        badge: (c) => (c.draftLessons > 0 ? { text: `${c.draftLessons}`, tone: "warn" } : null),
      },
      {
        href: "/admin/channels",
        label: "Kênh YouTube",
        icon: Tv,
      },
      {
        href: "/admin/transcripts",
        label: "Kho phụ đề",
        icon: Captions,
      },
      {
        href: "/admin/catalog",
        label: "Kho nội dung chuẩn",
        icon: BookOpenCheck,
      },
    ],
  },
  {
    title: "Người dùng & Cộng đồng",
    items: [
      {
        href: "/admin/users",
        label: "Người dùng",
        icon: Users,
      },
      {
        href: "/admin/feedback",
        label: "Góp ý & Báo lỗi",
        icon: MessageSquare,
        badge: (c) => (c.openFeedback > 0 ? { text: `${c.openFeedback}`, tone: "red" } : null),
      },
    ],
  },
  {
    title: "Vận hành & Hệ thống",
    items: [
      {
        href: "/admin/access",
        label: "Khoá bài & Kim cương",
        icon: Lock,
        badge: (c) => (c.lockEnabled ? { text: "Bật", tone: "ok" } : { text: "Tắt", tone: "muted" }),
      },
      {
        href: "/admin/system",
        label: "Hệ thống & Cache",
        icon: Server,
      },
    ],
  },
];

const BADGE_CLASS = {
  warn: "bg-gold-soft text-amber border border-gold/25",
  red: "bg-red-soft text-red-400 border border-red/25",
  ok: "bg-ok-soft text-ok-text border border-ok/25",
  muted: "bg-card-2 text-muted border border-line",
} as const;

function isActive(item: NavItem, pathname: string): boolean {
  if (item.match) return item.match(pathname);
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function currentLabel(pathname: string): string {
  for (const g of GROUPS) {
    for (const it of g.items) {
      if (isActive(it, pathname)) return it.label;
    }
  }
  return "Quản trị";
}

function NavList({
  pathname,
  counts,
  onNavigate,
}: {
  pathname: string;
  counts: SidebarCounts;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
      {GROUPS.map((group) => (
        <div key={group.title} className="flex flex-col gap-1">
          <p className="px-2.5 pb-1 text-[11px] font-semibold tracking-[0.07em] text-muted uppercase">{group.title}</p>
          {group.items.map((item) => {
            const active = isActive(item, pathname);
            const badge = item.badge?.(counts) ?? null;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`group relative flex min-h-10 items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                  active
                    ? "bg-sec-soft font-semibold text-sec-text"
                    : "font-medium text-muted hover:bg-card-2 hover:text-foreground"
                }`}
              >
                {active && <span aria-hidden className="absolute top-2 bottom-2 left-0 w-[3px] rounded-r-full bg-sec" />}
                <item.icon className={`size-4 shrink-0 ${active ? "text-sec-text" : "text-muted group-hover:text-foreground"}`} />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {badge && (
                  <span className={`shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[11px] leading-none font-semibold tabular-nums ${BADGE_CLASS[badge.tone]}`}>
                    {badge.text}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function AdminSidebar({ counts }: { counts: SidebarCounts }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const title = currentLabel(pathname);

  return (
    <>
      {/* Mobile / Tablet sticky admin bar (< lg) */}
      <div className="sticky top-14 z-20 flex items-center gap-2 border-b border-line bg-sidebar/95 px-4 py-2.5 backdrop-blur-sm sm:top-15 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn btn-sm gap-2 px-2.5"
          aria-expanded={open}
          aria-controls="admin-drawer"
        >
          <Menu className="size-4" aria-hidden />
          Danh mục
        </button>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <ShieldCheck className="size-4 text-sec-text" aria-hidden />
          <span className="truncate">{title}</span>
        </span>
        {counts.openFeedback > 0 && (
          <Link
            href="/admin/feedback"
            className="ml-auto inline-flex items-center gap-1 rounded-md border border-red/25 bg-red-soft px-2 py-1 font-mono text-xs font-semibold text-red-400 tabular-nums"
          >
            <MessageSquare className="size-3" aria-hidden />
            {counts.openFeedback}
          </Link>
        )}
      </div>

      {/* Mobile Drawer */}
      {open && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Điều hướng quản trị" id="admin-drawer">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-[1px]" onClick={() => setOpen(false)} />
          <aside className="relative z-10 flex w-72 max-w-[85vw] flex-col border-r border-line bg-sidebar">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="inline-flex items-center gap-2 text-sm font-bold text-foreground">
                <span className="flex size-7 items-center justify-center rounded-lg bg-sec-soft text-sec-text">
                  <ShieldCheck className="size-4" aria-hidden />
                </span>
                HalloVN Admin
              </span>
              <button type="button" onClick={() => setOpen(false)} className="btn-icon size-9 rounded-lg text-muted hover:text-foreground" aria-label="Đóng menu">
                <X className="size-4" />
              </button>
            </div>
            <NavList pathname={pathname} counts={counts} onNavigate={() => setOpen(false)} />
            <div className="border-t border-line p-3">
              <Link href="/" onClick={() => setOpen(false)} className="flex min-h-10 items-center gap-2 rounded-lg px-2.5 text-sm font-medium text-muted transition-colors hover:bg-card-2 hover:text-foreground">
                <ArrowLeft className="size-4" aria-hidden /> Về trang học HalloVN
              </Link>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Left Sidebar (lg+) */}
      <aside
        aria-label="Điều hướng khu quản trị"
        className="hidden w-60 shrink-0 flex-col border-r border-line bg-sidebar lg:sticky lg:top-15 lg:flex lg:h-[calc(100dvh-3.75rem)]"
      >
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-3.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sec-soft text-sec-text">
            <ShieldCheck className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm leading-tight font-bold text-foreground">Quản trị viên</p>
            <p className="truncate text-[11px] text-muted">HalloVN Control Center</p>
          </div>
        </div>
        <NavList pathname={pathname} counts={counts} />
        <div className="border-t border-line p-3">
          <Link
            href="/"
            className="flex min-h-9 items-center gap-2 rounded-lg px-2.5 text-xs font-medium text-muted transition-colors hover:bg-card-2 hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" aria-hidden /> Về trang học HalloVN
          </Link>
        </div>
      </aside>
    </>
  );
}

export function AdminSidebarSkeleton() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-line bg-sidebar p-4 lg:block" aria-hidden>
      <div className="h-9 rounded-lg bg-card-2" />
      <div className="mt-6 flex flex-col gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-8 rounded-lg bg-card-2/70" />
        ))}
      </div>
    </aside>
  );
}
