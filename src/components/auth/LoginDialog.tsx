"use client";

import { useSyncExternalStore, type ComponentProps } from "react";
import Link from "next/link";
import AuthForm from "./AuthForm";

// Trạng thái popup dùng chung cả trang: nút nào cũng mở được, không cần bọc provider
let current = false;
const listeners = new Set<() => void>();
const setOpen = (open: boolean) => {
  current = open;
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Popup đăng nhập / đăng ký đè lên trang đang xem (URL giữ nguyên); đăng nhập xong thì đóng, trang tự cập nhật */
export function LoginDialog({ social }: { social: { google: string | null; apple: string | null } }) {
  const open = useSyncExternalStore(subscribe, () => current, () => false);
  if (!open) return null;
  return <AuthForm next="/" social={social} onClose={() => setOpen(false)} />;
}

/** Link tới /login nhưng bấm thì mở popup tại chỗ (mở tab mới / popup chưa sẵn sàng → vẫn sang trang riêng) */
export function LoginLink({ onClick, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || !listeners.size) return;
        e.preventDefault();
        setOpen(true);
      }}
    />
  );
}
