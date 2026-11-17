"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Captions, ListVideo, MessageSquare, ShieldCheck, Users } from "lucide-react";

const TABS = [
  { href: "/admin", label: "Bài học", icon: ListVideo },
  { href: "/admin/transcripts", label: "Phụ đề đã lưu", icon: Captions },
  { href: "/admin/users", label: "Người dùng", icon: Users },
  { href: "/admin/feedback", label: "Góp ý", icon: MessageSquare },
];

/** Điều hướng phụ khu quản trị (tab gạch chân). "Bài học" gồm cả /admin/new và /admin/[id] */
export default function AdminNav() {
  const pathname = usePathname();
  const current =
    TABS.slice(1).find((t) => pathname === t.href || pathname.startsWith(`${t.href}/`))?.href ?? "/admin";
  return (
    <nav aria-label="Quản trị" data-sec="ink" className="flex items-end gap-3">
      {/* Mẩu nhãn mực đánh dấu khu quản trị — gọn, không trang trí (Operate mode) */}
      <span className="mb-1.5 inline-flex shrink-0 items-center gap-1.5 rounded-md bg-sec px-2 py-1 text-xs font-semibold text-on-sec max-sm:hidden">
        <ShieldCheck className="size-3.5" aria-hidden /> Quản trị
      </span>
      <div className="tabs-line min-w-0 flex-1">
        {TABS.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="tab" aria-current={href === current ? "page" : undefined}>
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
