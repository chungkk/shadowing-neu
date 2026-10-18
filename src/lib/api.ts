import "server-only";
import { getCurrentUser, type User } from "./auth";

/** Tiện ích cho API JSON của app di động (/api/v1/…). Lỗi luôn có dạng { error: "…" }. */

export const fail = (error: string, status = 400) => Response.json({ error }, { status });

/** Đọc body JSON; sai định dạng → {} (để từng route tự báo thiếu trường) */
export async function body<T extends object>(req: Request): Promise<Partial<T>> {
  try {
    const data = await req.json();
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

export const str = (v: unknown) => (typeof v === "string" ? v : "");

/** Bắt buộc đăng nhập (header Authorization: Bearer <token>) */
export async function apiUser(): Promise<User | Response> {
  return (await getCurrentUser()) ?? fail("Chưa đăng nhập", 401);
}

/** Dữ liệu người dùng trả cho app (không bao giờ có mật khẩu) */
export const publicUser = (u: User) => ({ id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt });
