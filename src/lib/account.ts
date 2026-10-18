import "server-only";
import { envAdminEmail, hashPassword, type User } from "./auth";
import { createUser, emailTaken, saveVocab, updateUserProfile } from "./db";

/**
 * Nghiệp vụ tài khoản dùng chung cho form web (server actions) và API của app.
 * Trả về chuỗi lỗi (tiếng Việt) hoặc kết quả.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const authConfigured = () => !!(process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD);

export async function registerUser(input: { name: string; email: string; password: string }): Promise<number | string> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (!authConfigured()) return "Server chưa cấu hình AUTH_SECRET";
  if (!name) return "Nhập tên của bạn";
  if (name.length > 60) return "Tên tối đa 60 ký tự";
  if (!EMAIL_RE.test(email)) return "Email không hợp lệ";
  if (input.password.length < 8) return "Mật khẩu cần ít nhất 8 ký tự";
  // Email admin chỉ đăng nhập bằng ADMIN_PASSWORD, không cho ai đăng ký chiếm trước
  if (email === envAdminEmail() || emailTaken(email)) return "Email này đã được đăng ký";
  try {
    return createUser({ email, name, passwordHash: await hashPassword(input.password), role: "user" });
  } catch {
    return "Email này đã được đăng ký";
  }
}

export function editProfile(user: User, input: { name: string; email?: string }): string | null {
  const name = input.name.trim();
  const fixedAdmin = user.email === envAdminEmail();
  const email = fixedAdmin ? user.email : (input.email ?? user.email).trim().toLowerCase();
  if (!name) return "Nhập tên của bạn";
  if (name.length > 60) return "Tên tối đa 60 ký tự";
  if (!fixedAdmin) {
    if (!EMAIL_RE.test(email)) return "Email không hợp lệ";
    if (email === envAdminEmail() || emailTaken(email, user.id)) return "Email này đã được dùng";
  }
  updateUserProfile(user.id, { name, email });
  return null;
}

/** Lưu từ vựng; chỉ nhận link nguồn nội bộ (/lesson/…, /watch/…) */
export function addWord(
  user: User,
  input: { word: string; context?: string; sourceUrl?: string | null; sourceTitle?: string },
): string | null {
  const word = input.word.trim().slice(0, 80);
  if (!word) return "Từ trống";
  const sourceUrl = input.sourceUrl && /^\/(lesson|watch)\/[\w-]+$/.test(input.sourceUrl) ? input.sourceUrl : null;
  saveVocab(user.id, {
    word,
    context: (input.context ?? "").slice(0, 500),
    sourceUrl,
    sourceTitle: (input.sourceTitle ?? "").slice(0, 200),
  });
  return null;
}
