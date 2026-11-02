"use client";

import { useEffect } from "react";
import { clientApi } from "@/lib/client-api";

/** Cookie đăng nhập sắp hết hạn → gia hạn ngầm, để người dùng thường xuyên không bị đăng xuất (lỗi thì lần sau thử lại) */
export default function SessionRenew() {
  useEffect(() => {
    clientApi("/me/session", { method: "POST" }).catch(() => {});
  }, []);
  return null;
}
