import * as SecureStore from "expo-secure-store";
import * as SystemUI from "expo-system-ui";
import { Appearance } from "react-native";
import { useSyncExternalStore } from "react";

export type Scheme = "light" | "dark";

/** Màu giống bản web (src/app/globals.css): nền kem · viền nâu mận (ink) · xanh lá (chính) · vàng tai nghe (nhấn) · đỏ kẹo (ghi âm / xoá) */
const LIGHT = {
  background: "#fff6e9",
  card: "#fffdf9",
  card2: "#ffedd6",
  bar: "#fffdf9", // thanh trên cùng
  border: "#ecd3bb",
  ink: "#55303f",
  inkLine: "#55303f", // viền mảnh của ô nhập (dùng với alpha)
  text: "#43232f",
  muted: "#7a5a65",
  link: "#0f766e",
  accent: "#17803f", // nền nút, chữ trắng
  accentDark: "#0e5a2b",
  accentText: "#17803f", // chữ, biểu tượng màu xanh
  amber: "#a85605", // đủ đậm để làm chữ trên nền kem; nền nút dùng gold
  onAmber: "#ffffff",
  gold: "#fbbf24",
  phrase: "#0369a1", // cụm từ cố định AI tìm thấy
  gem: "#0369a1", // điểm chính tả (kim cương)
  gemFill: "#0369a1", // nền nút xanh dương, chữ trắng
  gemDark: "#075985",
  red: "#e8384f",
  redText: "#c81e3a",
  // Màu nhấn của dòng đang học trong transcript
  candy: "#ffb3bd",
  sun: "#ffd15c",
  leaf: "#93e4a8",
  aqua: "#a5e1f5",
};

/** Giao diện tối ấm: nâu ca cao lấy từ viền linh vật, như bàn học dưới ánh đèn vàng buổi tối */
const DARK: typeof LIGHT = {
  background: "#241a1c",
  card: "#32252a",
  card2: "#3f2f33",
  bar: "#1c1416",
  border: "#4e3b40",
  ink: "#5c4248",
  inkLine: "#b49a9f",
  text: "#f9ecdf",
  muted: "#cdb7aa",
  link: "#83d8cc",
  accent: "#1d8048",
  accentDark: "#0f4f2b",
  accentText: "#8adea6",
  amber: "#f6c26b",
  onAmber: "#2b1520",
  gold: "#f5b93c",
  phrase: "#93d2f7",
  gem: "#93d2f7",
  gemFill: "#2c6f95",
  gemDark: "#1d4f6d",
  red: "#cf3a4e",
  redText: "#ff9ca7",
  candy: "#ffb3bd",
  sun: "#ffd15c",
  leaf: "#93e4a8",
  aqua: "#a5e1f5",
};

export const PALETTE: Record<Scheme, typeof LIGHT> = { light: LIGHT, dark: DARK };

const STORE_KEY = "ds-theme"; // cùng tên khoá với web

/** Mặc định sáng như web, không theo cài đặt hệ điều hành; đọc đồng bộ để màn đầu tiên đã đúng màu */
function readStored(): Scheme {
  try {
    return SecureStore.getItem(STORE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

let scheme = readStored();
const listeners = new Set<() => void>();

/** Thanh tab, thanh tiêu đề, bàn phím, hộp thoại hệ thống đi theo giao diện của app */
function applyNative() {
  Appearance.setColorScheme(scheme);
  SystemUI.setBackgroundColorAsync(PALETTE[scheme].background).catch(() => {});
}
applyNative();

export const isDark = () => scheme === "dark";
export const getScheme = () => scheme;

export function setScheme(next: Scheme) {
  if (next === scheme) return;
  scheme = next;
  applyNative();
  SecureStore.setItemAsync(STORE_KEY, next).catch(() => {});
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};
export const useScheme = () => useSyncExternalStore(subscribe, getScheme);

/**
 * Giá trị đọc theo giao diện hiện tại, dùng như một object thường (kể cả ở cấp module).
 * Đổi giao diện thì cây màn hình được dựng lại (ThemeRoot) nên mọi chỗ đọc đều lấy màu mới.
 */
export function themed<T extends object>(make: () => T): T {
  const cache: Partial<Record<Scheme, T>> = {};
  const cur = () => (cache[scheme] ??= make());
  return new Proxy({} as T, {
    get: (_, k) => Reflect.get(cur(), k),
    has: (_, k) => Reflect.has(cur(), k),
    ownKeys: () => Reflect.ownKeys(cur()),
    getOwnPropertyDescriptor: (_, k) => {
      const d = Reflect.getOwnPropertyDescriptor(cur(), k);
      return d && { ...d, configurable: true };
    },
  });
}

export const C = themed(() => PALETTE[scheme]);

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** Màu #rrggbb với độ trong suốt */
export function alpha(hex: string, a: number) {
  const [r, g, b] = rgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/** Nền dòng đang học: màu nhấn pha vào nền thẻ (tối pha ít hơn để chữ sáng vẫn đủ tương phản) */
export function stageBg(hex: string) {
  const a = isDark() ? 0.25 : 0.45;
  const base = rgb(C.card);
  const [r, g, b] = rgb(hex).map((v, i) => Math.round(v * a + base[i] * (1 - a)));
  return `rgb(${r},${g},${b})`;
}

/** Màn chơi game: vẽ riêng cho nền đêm nên giữ bảng màu tối (như .theme-night trên web); giao diện tối thì khung cùng tông ca cao */
const NIGHT_BASE = {
  background: "#0c110e",
  card: "#131b16",
  card2: "#1b261f",
  border: "#26362c",
  text: "#eef5ef",
  muted: "#8ea395",
  accent: "#16a34a",
  accentDark: "#14532d",
  amber: "#facc15",
  phrase: "#38bdf8",
  red: "#dc2626",
  redText: "#f87171",
};
export const NIGHT = themed(() =>
  isDark() ? { ...NIGHT_BASE, background: "#1c1416", card: "#2a1f23", card2: "#32252a", border: "#4e3b40", text: "#f9ecdf", muted: "#cdb7aa" } : NIGHT_BASE,
);

/** Viền + bóng cứng kiểu sticker như .card / .btn của web */
export const STICKER = themed(() => ({ borderWidth: 2, borderColor: C.ink, boxShadow: `0 4px 0 ${C.ink}` }));

export const LEVEL_COLORS: Record<string, { bg: string; fg: string }> = {
  A: { bg: "#a7f3d0", fg: "#064e3b" },
  B: { bg: "#bae6fd", fg: "#0c4a6e" },
  C: { bg: "#ddd6fe", fg: "#4c1d95" },
};

export const LEVELS = [
  { level: "A1", name: "Mới bắt đầu" },
  { level: "A2", name: "Sơ cấp" },
  { level: "B1", name: "Trung cấp" },
  { level: "B2", name: "Trung cấp cao" },
  { level: "C1", name: "Nâng cao" },
  { level: "C2", name: "Thành thạo" },
] as const;
