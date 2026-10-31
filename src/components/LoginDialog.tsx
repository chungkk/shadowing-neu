"use client";

import { useSyncExternalStore, type ComponentProps } from "react";
import Link from "next/link";
import AuthForm from "./AuthForm";

type Mode = "login" | "register";

// Trạng thái popup dùng chung cả trang: nút nào cũng mở được, không cần bọc provider
let current: Mode | null = null;
const listeners = new Set<() => void>();
const setMode = (m: Mode | null) => {
  current = m;
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Popup đăng nhập / đăng ký đè lên trang đang xem (URL giữ nguyên); đăng nhập xong thì đóng, trang tự cập nhật */
export function LoginDialog({ social }: { social: { google: string | null; apple: string | null } }) {
  const mode = useSyncExternalStore(subscribe, () => current, () => null);
  if (!mode) return null;
  return (
    <AuthForm
      key={mode}
      mode={mode}
      next="/"
      social={social}
      onClose={() => setMode(null)}
      onSwitch={() => setMode(mode === "login" ? "register" : "login")}
    />
  );
}

/** Link tới /login, /register nhưng bấm thì mở popup tại chỗ (mở tab mới / popup chưa sẵn sàng → vẫn sang trang riêng) */
export function LoginLink({ mode = "login", onClick, ...props }: ComponentProps<typeof Link> & { mode?: Mode }) {
  return (
    <Link
      {...props}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || !listeners.size) return;
        e.preventDefault();
        setMode(mode);
      }}
    />
  );
}
