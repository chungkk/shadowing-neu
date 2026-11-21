/** light: nền sáng trung tính (mặc định) · dark: than tối sạch */
export type Theme = "light" | "dark";

/** Chủ đề mùa vụ toàn trang ("noel" | null). Đặt về null để tắt giao diện mùa lễ sau Giáng Sinh. */
export type Season = "noel" | null;
export const SEASONAL_THEME: Season = "noel";

export const THEME_KEY = "ds-theme";

/** Tạm thời chỉ dùng giao diện tối: ẩn nút đổi giao diện, luôn đặt data-theme="dark". Đặt về false để bật lại giao diện sáng. */
export const FORCE_DARK = true;

/** Giao diện mặc định (dùng cho màu thanh trình duyệt, manifest) */
export const DEFAULT_THEME: Theme = FORCE_DARK ? "dark" : "light";

/** Thứ tự khi bấm nút đổi giao diện */
export const THEME_NEXT: Record<Theme, Theme> = { dark: "light", light: "dark" };

/** Màu thanh trình duyệt trên điện thoại, khớp --background của từng giao diện */
export const THEME_COLOR: Record<Theme, string> =
  SEASONAL_THEME === "noel"
    ? { light: "#faf9f6", dark: "#060607" }
    : { light: "#f8fafc", dark: "#090b10" };

/** Chạy trong <head> trước khi vẽ trang. Mặc định giao diện sáng; chỉ bật tối khi người dùng đã chọn (không theo hệ điều hành) */
export const THEME_INIT_SCRIPT = FORCE_DARK
  ? `document.documentElement.setAttribute("data-theme","dark")`
  : `(function(){try{if(localStorage.getItem(${JSON.stringify(THEME_KEY)})==="dark")document.documentElement.setAttribute("data-theme","dark")}catch(e){}})()`;
