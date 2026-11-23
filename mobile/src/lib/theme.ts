import * as SecureStore from "expo-secure-store";
import * as SystemUI from "expo-system-ui";
import { Appearance } from "react-native";
import { useSyncExternalStore } from "react";

export type Scheme = "light" | "dark";

/**
 * Design system "Nhãn vở" — cùng token với web (src/app/(app)/globals.css, DESIGN.md).
 * Mỗi màu một việc: xanh lam = thương hiệu / hành động chính / khu Tiếng Đức · vàng = Lái xe, thưởng ·
 * coral = Leben in Deutschland, ghi âm · tím = trình độ C · ok (xanh lá) = ĐÚNG / đã xong · đỏ = SAI / xoá · gem = kim cương.
 * Tên khoá cũ (ink, inkLine, card2, bar…) giữ nguyên để mọi màn vẫn chạy; nghĩa mới ghi bên cạnh.
 */
const LIGHT = {
  background: "#fbfaf7", // giấy trắng ấm
  card: "#ffffff",
  card2: "#f3f1ea", // bề mặt phụ, nền nhóm
  bar: "#ffffff", // thanh trên cùng
  border: "#e3e0d7", // viền mặc định của khung
  line: "#ebe8e0", // đường kẻ phân cách hàng
  ink: "#16203a", // mực đậm — viền của thứ đang chọn / đang làm
  inkLine: "#16203a", // dùng với alpha cho viền mảnh của ô nhập
  text: "#16203a",
  muted: "#5a6175",
  link: "#1d3bb8",
  accent: "#2a4fe0", // xanh lam vở: nền nút chính, chữ trắng
  accentDark: "#1d3bb8",
  accentText: "#1d3bb8", // chữ, biểu tượng màu thương hiệu
  accentSoft: "#e8edff",
  amber: "#8a5b00", // chữ vàng đậm đọc được trên nền sáng; nền nút dùng gold
  onAmber: "#16203a",
  gold: "#ffc93a",
  goldDark: "#e0a300",
  goldSoft: "#fff4d2",
  coral: "#ff6b55",
  coralDark: "#d9452f",
  coralSoft: "#ffe9e4",
  coralText: "#b5311b",
  grape: "#6a4ae0",
  grapeDark: "#4f33bd",
  grapeSoft: "#efeaff",
  grapeText: "#5236c4",
  ok: "#1a7f45", // đúng / thành công — không dùng làm nút chính
  okSoft: "#e3f5ea",
  okText: "#136136",
  phrase: "#0b7aa6", // cụm từ cố định AI tìm thấy
  gem: "#0b7aa6", // kim cương
  gemFill: "#0b7aa6",
  gemDark: "#075a7b",
  gemSoft: "#e1f3fa",
  red: "#d92d35",
  redText: "#c4242b",
  redSoft: "#fde7e7",
  // Màu nhạt của bước học trong transcript (nền, chữ mực ở trên)
  candy: "#ffb4a8", // nói
  sun: "#ffe08a", // chép chính tả
  leaf: "#a6e6be", // đúng / so sánh
  aqua: "#b9ccff", // nghe
};

/** Tối: "mực xanh đêm" — trang vở dưới đèn bàn (như [data-theme="dark"] của web) */
const DARK: typeof LIGHT = {
  background: "#0e1424",
  card: "#151c2f",
  card2: "#1c2540",
  bar: "#0b101d",
  border: "#2a3552",
  line: "#222c45",
  ink: "#e9edf7",
  inkLine: "#e9edf7",
  text: "#e9edf7",
  muted: "#a3adc6",
  link: "#8ea6ff",
  accent: "#3d5ef0",
  accentDark: "#2c48c9",
  accentText: "#8ea6ff",
  accentSoft: "#1c2a5c",
  amber: "#ffd36a",
  onAmber: "#16203a",
  gold: "#ffd36a",
  goldDark: "#c99a1e",
  goldSoft: "#3a3017",
  coral: "#ff8f7e",
  coralDark: "#d9654f",
  coralSoft: "#3f2420",
  coralText: "#ffa596",
  grape: "#8f74ff",
  grapeDark: "#6a4ae0",
  grapeSoft: "#2a2350",
  grapeText: "#bfaeff",
  ok: "#2f9e5e",
  okSoft: "#173326",
  okText: "#6fdc9c",
  phrase: "#7fd3f0",
  gem: "#7fd3f0",
  gemFill: "#2f86a8",
  gemDark: "#13304a",
  gemSoft: "#13304a",
  red: "#e5484d",
  redText: "#ff8a8f",
  redSoft: "#3a1c22",
  candy: "#8a4a42",
  sun: "#6b5520",
  leaf: "#245c3d",
  aqua: "#2c3f80",
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

/** Khung phẳng như .card của web: nền trắng + viền 1px, không bóng (chiều sâu = lớp màu dán chồng) */
export const STICKER = themed(() => ({ borderWidth: 1, borderColor: C.border }));

/** Bóng mềm — chỉ cho thứ thật sự nổi (popover, sheet, toast, nút nổi) */
export const FLOAT = themed(() => ({ boxShadow: isDark() ? "0 8px 24px rgba(0,0,0,0.45)" : "0 8px 24px rgba(22,32,58,0.12)" }));

/** Bo góc chung: khung 16 · ô / nút 12 · nhỏ 8 */
export const R = { sm: 8, md: 12, lg: 16, xl: 24 } as const;

/** Màu bìa theo khu vực (data-sec của web): de xanh lam · laixe vàng · lid coral · dub tím · ink tài khoản / thông tin */
export type Sec = "de" | "laixe" | "lid" | "dub" | "ink";
export type SecColors = { sec: string; secDark: string; secSoft: string; secText: string; onSec: string };
export const SEC = themed((): Record<Sec, SecColors> => ({
  de: { sec: C.accent, secDark: C.accentDark, secSoft: C.accentSoft, secText: C.accentText, onSec: "#ffffff" },
  laixe: { sec: C.gold, secDark: C.goldDark, secSoft: C.goldSoft, secText: C.amber, onSec: "#16203a" },
  lid: { sec: C.coral, secDark: C.coralDark, secSoft: C.coralSoft, secText: C.coralText, onSec: "#16203a" },
  dub: { sec: C.grape, secDark: C.grapeDark, secSoft: C.grapeSoft, secText: C.grapeText, onSec: "#ffffff" },
  ink: isDark()
    ? { sec: "#26314f", secDark: "#1a233d", secSoft: C.card2, secText: C.text, onSec: "#ffffff" }
    : { sec: "#16203a", secDark: "#0b1226", secSoft: C.card2, secText: C.text, onSec: "#ffffff" },
}));

/** Nhãn trình độ: A xanh lá · B xanh lam · C tím — tông nhạt, chữ đậm (như .badge của web) */
export const LEVEL_COLORS: Record<string, { bg: string; fg: string }> = {
  A: { bg: "#d6f2e0", fg: "#0f5130" },
  B: { bg: "#dbe3ff", fg: "#1a2f99" },
  C: { bg: "#e6defe", fg: "#3f2a9c" },
};

export const LEVELS = [
  { level: "A1", name: "Mới bắt đầu" },
  { level: "A2", name: "Sơ cấp" },
  { level: "B1", name: "Trung cấp" },
  { level: "B2", name: "Trung cấp cao" },
  { level: "C1", name: "Nâng cao" },
  { level: "C2", name: "Thành thạo" },
] as const;
