/** dark: tối ấm (mặc định) · light: sáng */
export type Theme = "light" | "dark";

export const THEME_KEY = "ds-theme";

/** Thứ tự khi bấm nút đổi giao diện */
export const THEME_NEXT: Record<Theme, Theme> = { dark: "light", light: "dark" };

/** Màu thanh trình duyệt trên điện thoại, khớp --background của từng giao diện */
export const THEME_COLOR: Record<Theme, string> = { light: "#fff6e9", dark: "#241a1c" };

/** Chạy trong <head> trước khi vẽ trang. Mặc định là giao diện tối (đã đặt sẵn trên <html>); không theo cài đặt hệ điều hành */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)}),d=document.documentElement;if(t==="light")d.removeAttribute("data-theme")}catch(e){}})()`;
