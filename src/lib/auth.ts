import "server-only";
import { createHmac, randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";
import { promisify } from "node:util";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { bumpSessionVersion, getUserWithHash, setUserPassword, upsertEnvAdmin, type User } from "./db";
import { notifyPasswordChanged } from "./mail";
import { allow, clientIp } from "./rate-limit";

export type { User };

const COOKIE = "session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 ngày
const RENEW_BEFORE_MS = 15 * 24 * 60 * 60 * 1000; // cookie web còn dưới 15 ngày → gia hạn

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number, options: ScryptOptions) => Promise<Buffer>;

// Hash mới "v2:<salt>:<hash>" (mức OWASP khuyến nghị); hash cũ "<salt>:<hash>" vẫn đọc được.
// Không băm lại lúc đăng nhập: đổi hash = đổi chữ ký phiên → các thiết bị khác bị đăng xuất
const SCRYPT_V1: ScryptOptions = { N: 2 ** 14, r: 8, p: 1 };
const SCRYPT_V2: ScryptOptions = { N: 2 ** 15, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
// Không có mật khẩu để so vẫn băm 1 lần, để thời gian phản hồi như nhau
const DUMMY_HASH = `v2:${"0".repeat(32)}:${"0".repeat(128)}`;

const secret = () => process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD || "";
const sign = (value: string) => createHmac("sha256", secret()).update(value).digest("base64url");

/** Email admin cố định (biến môi trường), luôn đăng nhập bằng ADMIN_PASSWORD */
export const envAdminEmail = () => process.env.ADMIN_EMAIL?.trim().toLowerCase() || null;

// ---- Mật khẩu ----

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64, SCRYPT_V2);
  return `v2:${salt.toString("hex")}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  const v2 = parts[0] === "v2";
  const [saltHex, hashHex] = v2 ? parts.slice(1) : parts;
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scryptAsync(password, Buffer.from(saltHex, "hex"), expected.length, v2 ? SCRYPT_V2 : SCRYPT_V1);
  return timingSafeEqual(expected, actual);
}

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(sign(a));
  const y = Buffer.from(sign(b));
  return timingSafeEqual(x, y);
};

// Chống dò mật khẩu (lưu trong RAM, đủ cho 1 server; để ở globalThis → dùng chung giữa các route):
// - mỗi IP 30 lần thử / 10 phút, bất kể email nào (chặn thử 1 mật khẩu trên nhiều email, spam băm tốn CPU)
// - sai 5 lần từ cùng IP → khoá cặp email + IP đó, người khác không khoá được chủ tài khoản đang ở IP khác
// - sai 50 lần trên 1 email từ mọi IP cộng lại → khoá email đó (dò mật khẩu từ nhiều IP)
const g = globalThis as unknown as { __loginFailures?: Map<string, { count: number; until: number }> };
const failures = (g.__loginFailures ??= new Map());
const MAX_IP_TRIES = 30;
const MAX_PAIR_FAILS = 5;
const MAX_EMAIL_FAILS = 50;
const LOCK_MS = 10 * 60 * 1000;

/**
 * Kiểm tra email + mật khẩu. Trả về id người dùng, hoặc chuỗi lỗi.
 * Email trùng ADMIN_EMAIL → so với ADMIN_PASSWORD và tự tạo / cập nhật tài khoản admin.
 */
export async function authenticate(email: string, password: string): Promise<number | string> {
  if (email.length > 254) return "Sai email hoặc mật khẩu"; // email thật không dài hơn → không giữ khoá rác trong RAM
  const ip = await clientIp();
  if (!allow(`login:ip:${ip}`, MAX_IP_TRIES, LOCK_MS)) return "Thử quá nhiều lần, chờ ít phút.";
  const now = Date.now();
  const pair = `${email}|${ip}`;
  const counters = [
    { key: pair, max: MAX_PAIR_FAILS },
    { key: email, max: MAX_EMAIL_FAILS },
  ].map((c) => {
    const f = failures.get(c.key);
    return { ...c, prev: f && f.until > now ? f.count : 0 };
  });
  if (counters.some((c) => c.prev >= c.max)) return "Đăng nhập sai quá nhiều lần. Thử lại sau 10 phút.";
  // Tính lần thử TRƯỚC khi băm (await): gửi song song nhiều request cũng không vượt giới hạn
  for (const c of counters) failures.set(c.key, { count: c.prev + 1, until: now + LOCK_MS });
  if (failures.size > 10_000) for (const [k, v] of failures) if (v.until < now) failures.delete(k);

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
    const ok = await verifyPassword(password, u?.hasPassword ? u.passwordHash : DUMMY_HASH);
    if (u && ok) userId = u.id;
  }

  if (userId === null) return "Sai email hoặc mật khẩu";
  failures.delete(pair);
  return userId;
}

// ---- Phiên đăng nhập ----
// Cookie "<userId>.<hết hạn>.<chữ ký>"; chữ ký gồm cả password_hash
// → đổi mật khẩu thì mọi phiên cũ (thiết bị khác) tự hết hiệu lực. Chữ ký gồm cả session_version
// → "đăng xuất mọi thiết bị" chỉ cần tăng số này (bằng 0 thì không đưa vào, token đã cấp từ trước vẫn dùng được).

const sessionSig = (payload: string, u: { passwordHash: string; sessionVersion: number }) =>
  sign(`${payload}.${u.passwordHash}${u.sessionVersion ? `.${u.sessionVersion}` : ""}`);

/** Token đăng nhập "<userId>.<hết hạn>.<chữ ký>" — dùng làm cookie (web) và Bearer token (app) */
export function createToken(userId: number): string | null {
  const user = getUserWithHash({ id: userId });
  if (!user) return null;
  const payload = `${userId}.${Date.now() + MAX_AGE * 1000}`;
  return `${payload}.${sessionSig(payload, user)}`;
}

export async function createSession(userId: number) {
  const token = createToken(userId);
  if (!token) return;
  (await cookies()).set(COOKIE, token, {
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

function userFromToken(token: string): User | null {
  const [id, exp, sig] = token.split(".");
  if (!id || !exp || !sig || Number(exp) < Date.now()) return null;
  const user = getUserWithHash({ id: Number(id) });
  if (!user) return null;
  const expected = Buffer.from(sessionSig(`${id}.${exp}`, user));
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  const { passwordHash, sessionVersion, ...rest } = user;
  void passwordHash;
  void sessionVersion;
  return rest;
}

/**
 * Người dùng đang đăng nhập (đọc lại từ DB để quyền / xoá tài khoản có hiệu lực ngay), hoặc null.
 * App gửi "Authorization: Bearer <token>", web dùng cookie.
 */
export async function getCurrentUser(): Promise<User | null> {
  await connection(); // chỉ chạy lúc request (dùng Date.now() để kiểm tra hạn)
  if (!secret()) return null;
  const bearer = (await headers()).get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  const token = bearer ?? (await cookies()).get(COOKIE)?.value;
  return token ? userFromToken(token) : null;
}

/** Token mới để trả trong JSON, chỉ cho app (gửi Bearer). Web dùng cookie httpOnly: không để script trên trang đọc được token */
export async function tokenForApp(userId: number): Promise<string | null | undefined> {
  return (await headers()).has("authorization") ? createToken(userId) : undefined;
}

/** Cookie đăng nhập của web có sắp hết hạn không */
export async function sessionExpiresSoon(): Promise<boolean> {
  const exp = Number((await cookies()).get(COOKIE)?.value.split(".")[1]);
  return exp - Date.now() < RENEW_BEFORE_MS;
}

/** Thu hồi mọi phiên của người dùng trên mọi thiết bị; phiên hiện tại được ký lại để không bị đăng xuất */
export async function logoutEverywhere(userId: number) {
  bumpSessionVersion(userId);
  await createSession(userId);
}

/** Đổi mật khẩu (không áp dụng cho admin cố định — mật khẩu lấy từ ADMIN_PASSWORD) */
export async function changePassword(user: User, current: string, next: string): Promise<string | null> {
  if (user.email === envAdminEmail()) return "Mật khẩu admin chính lấy từ biến ADMIN_PASSWORD trên server.";
  const u = getUserWithHash({ id: user.id });
  // Tài khoản Google / Apple chưa có mật khẩu → đặt mật khẩu lần đầu, không cần mật khẩu cũ
  if (!u || (u.hasPassword && !(await verifyPassword(current, u.passwordHash)))) return "Mật khẩu hiện tại không đúng";
  if (next.length < 8) return "Mật khẩu mới cần ít nhất 8 ký tự";
  setUserPassword(user.id, await hashPassword(next));
  await createSession(user.id); // phiên hiện tại ký lại bằng mật khẩu mới, các thiết bị khác bị đăng xuất
  notifyPasswordChanged(user);
  return null;
}

/**
 * Admin đặt mật khẩu mới cho người khác (không cần mật khẩu cũ; người gọi tự kiểm tra quyền + không phải chính mình / admin cố định).
 * Phiên ký bằng mật khẩu → người đó bị đăng xuất trên mọi thiết bị. Trả về lỗi hoặc null.
 */
export async function adminSetPassword(userId: number, next: string): Promise<string | null> {
  if (next.length < 8) return "Mật khẩu mới cần ít nhất 8 ký tự";
  setUserPassword(userId, await hashPassword(next));
  const target = getUserWithHash({ id: userId });
  if (target) notifyPasswordChanged(target);
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
