import "server-only";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { envAdminEmail, hashPassword, type User } from "./auth";
import {
  bumpEmailCodeAttempts,
  createUser,
  deleteEmailCode,
  emailTaken,
  getEmailCode,
  saveEmailCode,
  saveVocab,
  updateUserProfile,
} from "./db";
import { mailConfigured, sendMail } from "./mail";

/**
 * Nghiệp vụ tài khoản dùng chung cho form web (server actions) và API của app.
 * Trả về chuỗi lỗi (tiếng Việt) hoặc kết quả.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const authConfigured = () => !!(process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD);

type SignupInput = { name: string; email: string; password: string; lang?: string | null };

/** Kiểm tra thông tin đăng ký (trước khi gửi mã và lúc tạo tài khoản). Trả về lỗi hoặc null */
function checkSignup(input: SignupInput): string | null {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (!authConfigured()) return "Server chưa cấu hình AUTH_SECRET";
  if (!name) return "Nhập tên của bạn";
  if (name.length > 60) return "Tên tối đa 60 ký tự";
  if (!EMAIL_RE.test(email)) return "Email không hợp lệ";
  if (input.password.length < 8) return "Mật khẩu cần ít nhất 8 ký tự";
  // Email admin chỉ đăng nhập bằng ADMIN_PASSWORD, không cho ai đăng ký chiếm trước
  if (email === envAdminEmail() || emailTaken(email)) return "Email này đã được đăng ký";
  return null;
}

// ---- Mã xác nhận email (6 số, hạn 10 phút, sai tối đa 5 lần, gửi lại sau 60 giây) ----

const CODE_TTL = 10 * 60 * 1000;
const RESEND_MS = 60 * 1000;
const MAX_TRIES = 5;

const hashCode = (email: string, code: string) => createHash("sha256").update(`${email}:${code}`).digest();

/** Gửi mã xác nhận tới email đăng ký. Trả về lỗi hoặc null */
export async function sendSignupCode(input: SignupInput): Promise<string | null> {
  const error = checkSignup(input);
  if (error) return error;
  const email = input.email.trim().toLowerCase();

  const prev = getEmailCode(email);
  const wait = prev ? Math.ceil((prev.sentAt + RESEND_MS - Date.now()) / 1000) : 0;
  if (wait > 0) return `Chờ ${wait} giây rồi gửi lại mã`;

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  if (mailConfigured()) {
    const de = input.lang === "de";
    const subject = de ? `${code} ist dein Bestätigungscode` : `${code} là mã xác nhận của bạn`;
    const lines = de
      ? ["Hallo,", "dein Bestätigungscode für Deutsch Shadowing lautet:", "Der Code ist 10 Minuten gültig.", "Wenn du dich nicht registriert hast, ignoriere diese E-Mail."]
      : ["Xin chào,", "Mã xác nhận đăng ký Deutsch Shadowing của bạn là:", "Mã có hiệu lực trong 10 phút.", "Nếu bạn không đăng ký, hãy bỏ qua email này."];
    try {
      await sendMail({
        to: email,
        subject,
        text: `${lines[0]}\n\n${lines[1]}\n\n${code}\n\n${lines[2]}\n${lines[3]}`,
        html: `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:420px;margin:0 auto;padding:24px;color:#111">
  <p>${lines[0]}</p><p>${lines[1]}</p>
  <p style="font-size:34px;font-weight:800;letter-spacing:8px;margin:24px 0;color:#16a34a">${code}</p>
  <p style="color:#555">${lines[2]}<br>${lines[3]}</p></div>`,
      });
    } catch (e) {
      console.error("[mail] gửi mã thất bại:", e);
      return "Không gửi được email. Thử lại sau.";
    }
  } else if (process.env.NODE_ENV === "production") {
    return "Server chưa cấu hình gửi email (SMTP_USER, SMTP_PASS)";
  } else {
    console.log(`[mail] (dev, chưa cấu hình SMTP) mã đăng ký cho ${email}: ${code}`);
  }
  saveEmailCode(email, hashCode(email, code).toString("hex"), Date.now() + CODE_TTL);
  return null;
}

/** Kiểm tra mã người dùng nhập. Trả về lỗi hoặc null */
function verifySignupCode(email: string, code: string): string | null {
  const rec = getEmailCode(email);
  if (!rec || rec.expiresAt < Date.now()) return "Mã xác nhận đã hết hạn. Hãy gửi mã mới.";
  if (rec.attempts >= MAX_TRIES) return "Nhập sai quá nhiều lần. Hãy gửi mã mới.";
  const ok = /^\d{6}$/.test(code) && timingSafeEqual(hashCode(email, code), Buffer.from(rec.codeHash, "hex"));
  if (!ok) {
    bumpEmailCodeAttempts(email);
    return "Mã xác nhận không đúng";
  }
  return null;
}

/** Tạo tài khoản sau khi đã nhập đúng mã gửi về email. Trả về id người dùng hoặc lỗi */
export async function registerUser(input: SignupInput & { code: string }): Promise<number | string> {
  const error = checkSignup(input);
  if (error) return error;
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const codeError = verifySignupCode(email, input.code.trim());
  if (codeError) return codeError;
  try {
    const id = createUser({ email, name, passwordHash: await hashPassword(input.password), role: "user", lang: input.lang });
    deleteEmailCode(email);
    return id;
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
