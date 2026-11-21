/** light: nền sáng trung tính (mặc định) · dark: than tối sạch */
export type Theme = "light" | "dark";

/** Chủ đề mùa vụ toàn trang ("noel" | null). Đặt về null để tắt giao diện mùa lễ sau Giáng Sinh. */
export type Season = "noel" | null;
export const SEASONAL_THEME: Season = "noel";

export const THEME_KEY = "ds-theme";

/** Thứ tự khi bấm nút đổi giao diện */
export const THEME_NEXT: Record<Theme, Theme> = { dark: "light", light: "dark" };

/** Màu thanh trình duyệt trên điện thoại, khớp --background của từng giao diện */
export const THEME_COLOR: Record<Theme, string> =
  SEASONAL_THEME === "noel"
    ? { light: "#faf7f2", dark: "#0c1117" }
    : { light: "#f8fafc", dark: "#0b0d12" };

/** Chạy trong <head> trước khi vẽ trang. Mặc định giao diện sáng; chỉ bật tối khi người dùng đã chọn (không theo hệ điều hành) */
export const THEME_INIT_SCRIPT = `(function(){try{if(localStorage.getItem(${JSON.stringify(THEME_KEY)})==="dark")document.documentElement.setAttribute("data-theme","dark")}catch(e){}})()`;
