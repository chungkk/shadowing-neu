"use server";

import { redirect } from "next/navigation";
import { authenticate, createSession, destroySession } from "@/lib/auth";
import { authConfigured, lookupEmail, oauthSignIn, registerUser, resetPasswordWithCode, sendPasswordReset, sendSignupCode } from "@/lib/account";
import { allow, clientIp } from "@/lib/rate-limit";
import { safeNext } from "@/lib/safe-next";

export type AuthState = { error?: string; email?: string; name?: string; ok?: boolean };

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!authConfigured()) return { error: "Server chưa cấu hình AUTH_SECRET", email };
  const res = await authenticate(email, password);
  if (typeof res === "string") return { error: res, email };
  await createSession(res);
  if (formData.get("stay")) return { ok: true }; // popup: ở lại trang đang xem (đặt cookie → trang tự render lại)
  redirect(safeNext(formData.get("next")));
}

/**
 * Đăng nhập / tự tạo tài khoản bằng Google hoặc Apple trên web: nút của Google / Apple trả ID token ngay trên trình duyệt,
 * server kiểm tra (như app, xem lib/oauth.ts) rồi đặt cookie phiên. Trả về lỗi; thành công thì chuyển tới `next`
 * (`stay` = đăng nhập trong popup → trả "" và ở lại trang đang xem).
 */
export async function oauthLogin(input: {
  provider: "google" | "apple";
  idToken: string;
  name?: string; // Apple chỉ gửi tên ở lần đăng nhập đầu
  code?: string; // Apple: authorization code để thu hồi quyền khi xoá tài khoản
  next?: string;
  stay?: boolean;
}): Promise<string> {
  if (!authConfigured()) return "Server chưa cấu hình AUTH_SECRET";
  if (input.provider !== "google" && input.provider !== "apple") return "Cách đăng nhập không hợp lệ";
  if (!allow(`oauth:ip:${await clientIp()}`, 30, 10 * 60 * 1000)) return "Thử quá nhiều lần, chờ ít phút.";
  let res: number | string;
  try {
    res = await oauthSignIn({
      provider: input.provider,
      idToken: String(input.idToken ?? ""),
      name: String(input.name ?? ""),
      authorizationCode: String(input.code ?? ""),
      web: true,
    });
  } catch (e) {
    console.error("[oauth]", e);
    return "Không kết nối được Google / Apple, thử lại.";
  }
  if (typeof res === "string") return res;
  await createSession(res);
  if (input.stay) return "";
  redirect(safeNext(input.next ?? null));
}

/** Form email: email này đã có tài khoản chưa (→ nhập mật khẩu / → đăng ký) */
export async function checkEmail(email: string): Promise<{ exists: boolean } | { error: string }> {
  return lookupEmail(String(email ?? ""));
}

/** Bước 1 đăng ký: kiểm tra thông tin rồi gửi mã xác nhận về email. Trả về lỗi hoặc null */
export async function requestSignupCode(input: { name: string; email: string; password: string }): Promise<string | null> {
  return sendSignupCode(input);
}

/** Bước 2 đăng ký: nhập đúng mã → tạo tài khoản */
export async function register(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const res = await registerUser({
    name,
    email,
    password: String(formData.get("password") ?? ""),
    code: String(formData.get("code") ?? ""),
  });
  if (typeof res === "string") return { error: res, email, name };
  await createSession(res);
  if (formData.get("stay")) return { ok: true };
  redirect(safeNext(formData.get("next")));
}

/** Quên mật khẩu bước 1: gửi mã 6 số về email. Trả về lỗi hoặc null */
export async function requestPasswordReset(email: string): Promise<string | null> {
  return sendPasswordReset({ email });
}

export type ResetState = { error?: string };

/** Quên mật khẩu bước 2: nhập mã + mật khẩu mới → đăng nhập luôn */
export async function resetPasswordAction(_: ResetState, formData: FormData): Promise<ResetState> {
  const password = String(formData.get("password") ?? "");
  if (password !== String(formData.get("confirm") ?? "")) return { error: "Hai mật khẩu không khớp" };
  const res = await resetPasswordWithCode({
    email: String(formData.get("email") ?? ""),
    code: String(formData.get("code") ?? ""),
    password,
  });
  if (typeof res === "string") return { error: res };
  await createSession(res);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/");
}
