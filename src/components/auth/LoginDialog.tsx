"use client";

import { useSyncExternalStore, type ComponentProps } from "react";
import Link from "next/link";
import AuthForm from "./AuthForm";

// Trạng thái popup dùng chung cả trang: null = đóng, chuỗi = nextUrl sau xác thực / quên mật khẩu
let currentNext: string | null = null;
const listeners = new Set<() => void>();
const setPopupNext = (next: string | null) => {
  currentNext = next;
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

const AUTH_PATHS = new Set(["/login", "/register", "/forgot-password"]);
const isSafeLocal = (u: string | null): u is string => !!u && u.startsWith("/") && !u.startsWith("//");

function extractNext(href: ComponentProps<typeof Link>["href"]): string {
  try {
    if (typeof href === "string") {
      const parsed = new URL(href, window.location.origin);
      const fromHref = parsed.searchParams.get("next");
      if (isSafeLocal(fromHref)) return fromHref;
    } else if (href && typeof href === "object" && "query" in href && href.query && typeof href.query === "object") {
      const q = (href.query as Record<string, unknown>).next;
      if (typeof q === "string" && isSafeLocal(q)) return q;
    }
  } catch {}
  const here = window.location.pathname + window.location.search;
  return AUTH_PATHS.has(window.location.pathname) ? "/" : here || "/";
}

/** Popup đăng nhập / đăng ký đè lên trang đang xem (URL giữ nguyên); đăng nhập xong thì đóng, trang tự cập nhật */
export function LoginDialog({ social }: { social: { google: string | null; apple: string | null } }) {
  const nextUrl = useSyncExternalStore(subscribe, () => currentNext, () => null);
  if (nextUrl === null) return null;
  return <AuthForm next={nextUrl} social={social} onClose={() => setPopupNext(null)} />;
}

/** Link tới /login nhưng bấm thì mở popup tại chỗ (mở tab mới / popup chưa sẵn sàng → vẫn sang trang riêng) */
export function LoginLink({ onClick, href, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      href={href}
      {...props}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || !listeners.size) return;
        e.preventDefault();
        setPopupNext(extractNext(href));
      }}
    />
  );
}
