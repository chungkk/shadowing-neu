"use server";

import { redirect } from "next/navigation";
import { authenticate, createSession, destroySession, envAdminEmail, hashPassword } from "@/lib/auth";
import { createUser, getUserWithHash } from "@/lib/db";

export type AuthState = { error?: string; email?: string; name?: string };

/** Chỉ cho quay lại đường dẫn nội bộ (chặn open redirect kiểu "//evil.com") */
const safeNext = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "");
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!process.env.AUTH_SECRET && !process.env.ADMIN_PASSWORD) {
    return { error: "Server chưa cấu hình AUTH_SECRET", email };
  }
  const res = await authenticate(email, password);
  if (typeof res === "string") return { error: res, email };
  await createSession(res);
  redirect(safeNext(formData.get("next")));
}

export async function register(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const back = { email, name };

  if (!process.env.AUTH_SECRET && !process.env.ADMIN_PASSWORD) {
    return { error: "Server chưa cấu hình AUTH_SECRET", ...back };
  }
  if (!name) return { error: "Nhập tên của bạn", ...back };
  if (!EMAIL_RE.test(email)) return { error: "Email không hợp lệ", ...back };
  if (password.length < 8) return { error: "Mật khẩu cần ít nhất 8 ký tự", ...back };
  // Email admin chỉ đăng nhập bằng ADMIN_PASSWORD, không cho ai đăng ký chiếm trước
  if (email === envAdminEmail() || getUserWithHash(email)) {
    return { error: "Email này đã được đăng ký", ...back };
  }

  let id: number;
  try {
    id = createUser({ email, name, passwordHash: await hashPassword(password), role: "user" });
  } catch {
    return { error: "Email này đã được đăng ký", ...back };
  }
  await createSession(id);
  redirect(safeNext(formData.get("next")));
}

export async function logout() {
  await destroySession();
  redirect("/");
}
