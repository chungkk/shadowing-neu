"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Captions, ListVideo, MessageSquare, Users } from "lucide-react";

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
    <nav aria-label="Quản trị" className="flex flex-col gap-1">
      <span className="eyebrow">Quản trị</span>
      <div className="tabs-line">
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
