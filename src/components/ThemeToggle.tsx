"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { THEME_COLOR, THEME_KEY, type Theme } from "@/lib/theme";

const listeners = new Set<() => void>();

function readStored(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark"; // Trình duyệt chặn lưu trữ: vẫn đổi được trong lần xem này
  }
}

function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") root.setAttribute("data-theme", "dark");
  else root.removeAttribute("data-theme");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[theme]);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Đổi giao diện ở tab khác thì tab này đổi theo
  const onStorage = (e: StorageEvent) => e.key === THEME_KEY && apply(readStored());
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const isDark = () => document.documentElement.getAttribute("data-theme") === "dark";

/** Nút chọn giao diện sáng / tối ấm ở thanh trên cùng; lựa chọn được ghi nhớ trên thiết bị này */
export default function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, isDark, () => true);

  // Script trong <head> không đặt được màu thanh trình duyệt; bản dev của React còn xoá data-theme khi remount
  useLayoutEffect(() => {
    apply(readStored());
  }, []);

  const toggle = () => {
    const next: Theme = isDark() ? "light" : "dark";
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
    // Chuyển màu mờ dần như bật tắt đèn
    if (document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.startViewTransition(() => apply(next));
    } else {
      apply(next);
    }
  };

  const label = dark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối ấm";
  return (
    <button type="button" onClick={toggle} title={label} aria-label={label} className="btn size-10 shrink-0 rounded-full p-0">
      {dark ? <Sun className="size-5 text-amber" /> : <Moon className="size-5" />}
    </button>
  );
}
