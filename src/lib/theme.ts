/** light: nền sáng trung tính · dark: Dark EdTech mặc định (#0B0F14) */
export type Theme = "light" | "dark";

/** Chủ đề mùa vụ toàn trang ("noel" | null). Đặt về null cho giao diện Dark EdTech chuẩn. */
export type Season = "noel" | null;
export const SEASONAL_THEME: Season = null;

export const THEME_KEY = "ds-theme";

/** Giao diện tối là mặc định toàn nền tảng HalloVN. */
export const FORCE_DARK = true;

/** Giao diện mặc định (dùng cho màu thanh trình duyệt, manifest) */
export const DEFAULT_THEME: Theme = FORCE_DARK ? "dark" : "light";

/** Thứ tự khi bấm nút đổi giao diện */
export const THEME_NEXT: Record<Theme, Theme> = { dark: "light", light: "dark" };

/** Màu thanh trình duyệt trên điện thoại, khớp --background của từng giao diện */
export const THEME_COLOR: Record<Theme, string> =
  SEASONAL_THEME === "noel"
    ? { light: "#faf9f6", dark: "#060607" }
    : { light: "#f8fafc", dark: "#0B0F14" };

/** Chạy trong <head> trước khi vẽ trang để tránh chớp sáng khi tải */
export const THEME_INIT_SCRIPT = FORCE_DARK
  ? `document.documentElement.setAttribute("data-theme","dark")`
  : `(function(){try{if(localStorage.getItem(${JSON.stringify(THEME_KEY)})!=="light")document.documentElement.setAttribute("data-theme","dark")}catch(e){}})()`;
