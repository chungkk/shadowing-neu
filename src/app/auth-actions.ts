"use server";

import { redirect } from "next/navigation";
import { authenticate, createSession, destroySession } from "@/lib/auth";
import { authConfigured, registerUser } from "@/lib/account";

export type AuthState = { error?: string; email?: string; name?: string };

/** Chỉ cho quay lại đường dẫn nội bộ (chặn open redirect kiểu "//evil.com") */
const safeNext = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "");
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
};

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!authConfigured()) return { error: "Server chưa cấu hình AUTH_SECRET", email };
  const res = await authenticate(email, password);
  if (typeof res === "string") return { error: res, email };
  await createSession(res);
  redirect(safeNext(formData.get("next")));
}

export async function register(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const res = await registerUser({ name, email, password: String(formData.get("password") ?? "") });
  if (typeof res === "string") return { error: res, email, name };
  await createSession(res);
  redirect(safeNext(formData.get("next")));
}

export async function logout() {
  await destroySession();
  redirect("/");
}
