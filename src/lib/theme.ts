/** light: giấy trắng (mặc định) · dark: mực đêm */
export type Theme = "light" | "dark";

export const THEME_KEY = "ds-theme";

/** Thứ tự khi bấm nút đổi giao diện */
export const THEME_NEXT: Record<Theme, Theme> = { dark: "light", light: "dark" };

/** Màu thanh trình duyệt trên điện thoại, khớp --background của từng giao diện */
export const THEME_COLOR: Record<Theme, string> = { light: "#fbfaf7", dark: "#0e1424" };

/** Chạy trong <head> trước khi vẽ trang. Mặc định giao diện sáng; chỉ bật tối khi người dùng đã chọn (không theo hệ điều hành) */
export const THEME_INIT_SCRIPT = `(function(){try{if(localStorage.getItem(${JSON.stringify(THEME_KEY)})==="dark")document.documentElement.setAttribute("data-theme","dark")}catch(e){}})()`;
