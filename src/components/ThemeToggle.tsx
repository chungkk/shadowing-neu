"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { THEME_COLOR, THEME_KEY, THEME_NEXT, type Theme } from "@/lib/theme";

const listeners = new Set<() => void>();

function readStored(): Theme {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === "dark" ? t : "light"; // chưa chọn (hoặc giá trị cũ) → sáng
  } catch {
    return "light"; // Trình duyệt chặn lưu trữ: vẫn đổi được trong lần xem này
  }
}

function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === "light") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
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

const current = (): Theme => {
  const t = document.documentElement.getAttribute("data-theme");
  return t === "dark" ? t : "light";
};

const LABEL: Record<Theme, string> = {
  light: "Chuyển sang giao diện sáng",
  dark: "Chuyển sang giao diện tối",
};

/** Nút chọn giao diện sáng ↔ tối ở thanh trên cùng; lựa chọn được ghi nhớ trên thiết bị này */
export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, current, (): Theme => "light");
  const next = THEME_NEXT[theme];

  // Script trong <head> không đặt được màu thanh trình duyệt; bản dev của React còn xoá data-theme khi remount
  useLayoutEffect(() => {
    apply(readStored());
  }, []);

  const toggle = () => {
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

  const label = LABEL[next];
  return (
    <button type="button" onClick={toggle} title={label} aria-label={label} className="btn-icon hit-44">
      {next === "light" ? <Sun className="size-[18px] text-amber" /> : <Moon className="size-[18px] text-muted" />}
    </button>
  );
}
