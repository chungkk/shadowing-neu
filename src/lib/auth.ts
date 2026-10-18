import "server-only";
import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getUserWithHash, setUserPassword, upsertEnvAdmin, type User } from "./db";

export type { User };

const COOKIE = "session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 ngày

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

const secret = () => process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD || "";
const sign = (value: string) => createHmac("sha256", secret()).update(value).digest("base64url");

/** Email admin cố định (biến môi trường), luôn đăng nhập bằng ADMIN_PASSWORD */
export const envAdminEmail = () => process.env.ADMIN_EMAIL?.trim().toLowerCase() || null;

// ---- Mật khẩu ----

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scryptAsync(password, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(expected, actual);
}

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(sign(a));
  const y = Buffer.from(sign(b));
  return timingSafeEqual(x, y);
};

// Chống dò mật khẩu: sai 5 lần → khoá email đó 10 phút (lưu trong RAM, đủ cho 1 server)
const failures = new Map<string, { count: number; until: number }>();
const MAX_FAILS = 5;
const LOCK_MS = 10 * 60 * 1000;

/**
 * Kiểm tra email + mật khẩu. Trả về id người dùng, hoặc chuỗi lỗi.
 * Email trùng ADMIN_EMAIL → so với ADMIN_PASSWORD và tự tạo / cập nhật tài khoản admin.
 */
export async function authenticate(email: string, password: string): Promise<number | string> {
  const f = failures.get(email);
  if (f && f.count >= MAX_FAILS && f.until > Date.now()) {
    return "Đăng nhập sai quá nhiều lần. Thử lại sau 10 phút.";
  }

  let userId: number | null = null;
  if (email === envAdminEmail()) {
    const expected = process.env.ADMIN_PASSWORD;
    if (expected && safeEqual(password, expected)) {
      // Chỉ băm lại khi ADMIN_PASSWORD đổi (băm lại = đổi chữ ký → đăng xuất các thiết bị khác)
      const u = getUserWithHash({ email });
      userId =
        u?.role === "admin" && (await verifyPassword(password, u.passwordHash))
          ? u.id
          : upsertEnvAdmin(email, await hashPassword(password));
    }
  } else {
    const u = getUserWithHash({ email });
    // Không có user vẫn băm 1 lần để thời gian phản hồi như nhau
    const ok = await verifyPassword(password, u?.passwordHash ?? `${"0".repeat(32)}:${"0".repeat(128)}`);
    if (u && ok) userId = u.id;
  }

  if (userId === null) {
    const prev = f && f.until > Date.now() ? f.count : 0;
    failures.set(email, { count: prev + 1, until: Date.now() + LOCK_MS });
    return "Sai email hoặc mật khẩu";
  }
  failures.delete(email);
  return userId;
}

// ---- Phiên đăng nhập ----
// Cookie "<userId>.<hết hạn>.<chữ ký>"; chữ ký gồm cả password_hash
// → đổi mật khẩu thì mọi phiên cũ (thiết bị khác) tự hết hiệu lực.

const sessionSig = (payload: string, passwordHash: string) => sign(`${payload}.${passwordHash}`);

export async function createSession(userId: number) {
  const user = getUserWithHash({ id: userId });
  if (!user) return;
  const payload = `${userId}.${Date.now() + MAX_AGE * 1000}`;
  (await cookies()).set(COOKIE, `${payload}.${sessionSig(payload, user.passwordHash)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

/** Người dùng đang đăng nhập (đọc lại từ DB để quyền / xoá tài khoản có hiệu lực ngay), hoặc null. */
export async function getCurrentUser(): Promise<User | null> {
  await connection(); // chỉ chạy lúc request (dùng Date.now() để kiểm tra hạn)
  if (!secret()) return null;
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return null;
  const [id, exp, sig] = value.split(".");
  if (!id || !exp || !sig || Number(exp) < Date.now()) return null;
  const user = getUserWithHash({ id: Number(id) });
  if (!user) return null;
  const expected = Buffer.from(sessionSig(`${id}.${exp}`, user.passwordHash));
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  const { passwordHash, ...rest } = user;
  void passwordHash;
  return rest;
}

/** Đổi mật khẩu (không áp dụng cho admin cố định — mật khẩu lấy từ ADMIN_PASSWORD) */
export async function changePassword(user: User, current: string, next: string): Promise<string | null> {
  if (user.email === envAdminEmail()) return "Mật khẩu admin chính lấy từ biến ADMIN_PASSWORD trên server.";
  const u = getUserWithHash({ id: user.id });
  if (!u || !(await verifyPassword(current, u.passwordHash))) return "Mật khẩu hiện tại không đúng";
  if (next.length < 8) return "Mật khẩu mới cần ít nhất 8 ký tự";
  setUserPassword(user.id, await hashPassword(next));
  await createSession(user.id); // phiên hiện tại ký lại bằng mật khẩu mới, các thiết bị khác bị đăng xuất
  return null;
}

export async function isAdmin(): Promise<boolean> {
  return (await getCurrentUser())?.role === "admin";
}

/** Bắt buộc đăng nhập; chưa đăng nhập → chuyển tới /login rồi quay lại `next` */
export async function requireUser(next = "/"): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

/** Dùng ở đầu mọi trang / server action của admin */
export async function requireAdmin(): Promise<User> {
  const user = await requireUser("/admin");
  if (user.role !== "admin") redirect("/");
  return user;
}
