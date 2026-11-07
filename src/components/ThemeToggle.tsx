"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import { Candy, Moon, Sun } from "lucide-react";
import { CANDY_ENABLED, THEME_COLOR, THEME_KEY, THEME_NEXT, type Theme } from "@/lib/theme";

const listeners = new Set<() => void>();

function readStored(): Theme {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === "light" || (t === "candy" && CANDY_ENABLED) ? t : "dark";
  } catch {
    return "dark"; // Trình duyệt chặn lưu trữ: vẫn đổi được trong lần xem này
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
  return t === "dark" || t === "candy" ? t : "light";
};

const LABEL: Record<Theme, string> = {
  light: "Chuyển sang giao diện sáng",
  candy: "Chuyển sang giao diện kẹo",
  dark: "Chuyển sang giao diện tối ấm",
};

/** Nút chọn giao diện tối ấm → sáng → kẹo ở thanh trên cùng; lựa chọn được ghi nhớ trên thiết bị này */
export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, current, (): Theme => "dark");
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
    <button type="button" onClick={toggle} title={label} aria-label={label} className="btn size-10 shrink-0 rounded-full p-0">
      {next === "light" ? <Sun className="size-5 text-amber" /> : next === "candy" ? <Candy className="size-5 text-red" /> : <Moon className="size-5" />}
    </button>
  );
}
