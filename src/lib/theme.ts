export type Theme = "light" | "dark";

export const THEME_KEY = "ds-theme";

/** Màu thanh trình duyệt trên điện thoại, khớp --background của từng giao diện */
export const THEME_COLOR: Record<Theme, string> = { light: "#fff6e9", dark: "#241a1c" };

/** Chạy trong <head> trước khi vẽ trang. Mặc định là giao diện tối (đã đặt sẵn trên <html>), chỉ bỏ khi người dùng chọn sáng; không theo cài đặt hệ điều hành */
export const THEME_INIT_SCRIPT = `(function(){try{if(localStorage.getItem(${JSON.stringify(THEME_KEY)})==="light")document.documentElement.removeAttribute("data-theme")}catch(e){}})()`;
