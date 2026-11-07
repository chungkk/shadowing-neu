/** dark: tối ấm (mặc định) · light: sáng · candy: hộp kẹo bạc hà (như solo.ckk.pro) */
export type Theme = "light" | "dark" | "candy";

export const THEME_KEY = "ds-theme";

/** Thứ tự khi bấm nút đổi giao diện */
export const THEME_NEXT: Record<Theme, Theme> = { dark: "light", light: "candy", candy: "dark" };

/** Màu thanh trình duyệt trên điện thoại, khớp --background của từng giao diện */
export const THEME_COLOR: Record<Theme, string> = { light: "#fff6e9", dark: "#241a1c", candy: "#a9ecd8" };

/** Chạy trong <head> trước khi vẽ trang. Mặc định là giao diện tối (đã đặt sẵn trên <html>); không theo cài đặt hệ điều hành */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)}),d=document.documentElement;if(t==="light")d.removeAttribute("data-theme");else if(t==="candy")d.setAttribute("data-theme","candy")}catch(e){}})()`;
