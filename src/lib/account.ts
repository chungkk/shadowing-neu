import "server-only";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { envAdminEmail, hashPassword, type User } from "./auth";
import {
  bumpEmailCodeAttempts,
  appleRefreshTokens,
  createUser,
  deleteEmailCode,
  deleteUser,
  emailTaken,
  getEmailCode,
  getOAuthUserId,
  getUserWithHash,
  linkOAuth,
  NO_PASSWORD,
  setOAuthRefreshToken,
  type OAuthProvider,
  getVocab,
  saveEmailCode,
  saveVocab,
  setUserPassword,
  updateUserProfile,
  updateVocabMeaning,
  type VocabItem,
} from "./db";
import { mailConfigured, sendMail } from "./mail";
import { allow, clientIp } from "./rate-limit";
import { appleRefreshToken, oauthEnabled, revokeApple, verifyIdToken } from "./oauth";
import { translateSentences } from "./translate";
import { translateWord } from "./word";

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

// ---- Mã xác nhận qua email (6 số, hạn 10 phút, sai tối đa 5 lần, gửi lại sau 60 giây) ----
// Dùng cho đăng ký (khoá = email) và quên mật khẩu (khoá = "reset:<email>").

const CODE_TTL = 10 * 60 * 1000;
const RESEND_MS = 60 * 1000;
const MAX_TRIES = 5;

const hashCode = (key: string, code: string) => createHash("sha256").update(`${key}:${code}`).digest();
const resetKey = (email: string) => `reset:${email}`;

type CodeMail = { subject: string; hi: string; body: string; note: string };

const MAILS = {
  signup: {
    vi: { subject: "{code} là mã xác nhận của bạn", hi: "Xin chào,", body: "Mã xác nhận đăng ký Deutsch Shadowing của bạn là:", note: "Mã có hiệu lực trong 10 phút. Nếu bạn không đăng ký, hãy bỏ qua email này." },
    de: { subject: "{code} ist dein Bestätigungscode", hi: "Hallo,", body: "dein Bestätigungscode für Deutsch Shadowing lautet:", note: "Der Code ist 10 Minuten gültig. Wenn du dich nicht registriert hast, ignoriere diese E-Mail." },
  },
  reset: {
    vi: { subject: "{code} là mã đặt lại mật khẩu", hi: "Xin chào {name},", body: "Mã để đặt mật khẩu mới cho tài khoản Deutsch Shadowing của bạn là:", note: "Mã có hiệu lực trong 10 phút. Nếu không phải bạn yêu cầu, hãy bỏ qua email này — mật khẩu của bạn vẫn giữ nguyên." },
    de: { subject: "{code} ist dein Code zum Zurücksetzen", hi: "Hallo {name},", body: "dein Code zum Festlegen eines neuen Passworts für Deutsch Shadowing lautet:", note: "Der Code ist 10 Minuten gültig. Wenn du das nicht warst, ignoriere diese E-Mail – dein Passwort bleibt unverändert." },
  },
} satisfies Record<string, Record<"vi" | "de", CodeMail>>;

// Chống spam gửi mã tới hàng loạt email khác nhau (mỗi email đã có chờ 60 giây):
// mỗi IP 10 mã / giờ, cả server 300 mã / giờ (giữ hạn mức gửi mail của Gmail / Workspace cho người thật)
const HOUR = 60 * 60 * 1000;
const TOO_MANY = "Gửi mã quá nhiều lần. Thử lại sau ít phút.";
const mailQuota = async () => allow(`mail:ip:${await clientIp()}`, 10, HOUR) && allow("mail:all", 300, HOUR);

/** Còn phải chờ bao nhiêu giây mới được gửi mã mới cho khoá này (0 = gửi được) */
function resendWait(key: string): number {
  const prev = getEmailCode(key);
  return prev ? Math.max(0, Math.ceil((prev.sentAt + RESEND_MS - Date.now()) / 1000)) : 0;
}

/** Tạo mã, gửi email rồi lưu bản băm. Trả về lỗi hoặc null */
async function issueCode(
  key: string,
  to: string,
  kind: keyof typeof MAILS,
  lang: string | null | undefined,
  name = "",
): Promise<string | null> {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  if (mailConfigured()) {
    const esc = (v: string) => v.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
    const m = MAILS[kind][lang === "de" ? "de" : "vi"];
    const hi = m.hi.replace("{name}", name).replace(" ,", ",");
    try {
      await sendMail({
        to,
        subject: m.subject.replace("{code}", code),
        text: `${hi}\n\n${m.body}\n\n${code}\n\n${m.note}`,
        html: `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:420px;margin:0 auto;padding:24px;color:#111">
  <p>${esc(hi)}</p><p>${m.body}</p>
  <p style="font-size:34px;font-weight:800;letter-spacing:8px;margin:24px 0;color:#16a34a">${code}</p>
  <p style="color:#555">${m.note}</p></div>`,
      });
    } catch (e) {
      console.error("[mail] gửi mã thất bại:", e);
      return "Không gửi được email. Thử lại sau.";
    }
  } else if (process.env.NODE_ENV === "production") {
    return "Server chưa cấu hình gửi email (SMTP_USER, SMTP_PASS)";
  } else {
    console.log(`[mail] (dev, chưa cấu hình SMTP) mã ${kind} cho ${to}: ${code}`);
  }
  saveEmailCode(key, hashCode(key, code).toString("hex"), Date.now() + CODE_TTL);
  return null;
}

/** Kiểm tra mã người dùng nhập. Trả về lỗi hoặc null */
function verifyCode(key: string, code: string): string | null {
  const rec = getEmailCode(key);
  if (!rec || rec.expiresAt < Date.now()) return "Mã xác nhận đã hết hạn. Hãy gửi mã mới.";
  if (rec.attempts >= MAX_TRIES) return "Nhập sai quá nhiều lần. Hãy gửi mã mới.";
  const ok = /^\d{6}$/.test(code) && timingSafeEqual(hashCode(key, code), Buffer.from(rec.codeHash, "hex"));
  if (!ok) {
    bumpEmailCodeAttempts(key);
    return "Mã xác nhận không đúng";
  }
  return null;
}

// ---- Đăng ký ----

/** Gửi mã xác nhận tới email đăng ký. Trả về lỗi hoặc null */
export async function sendSignupCode(input: SignupInput): Promise<string | null> {
  const error = checkSignup(input);
  if (error) return error;
  const email = input.email.trim().toLowerCase();
  const wait = resendWait(email);
  if (wait > 0) return `Chờ ${wait} giây rồi gửi lại mã`;
  if (!(await mailQuota())) return TOO_MANY;
  return issueCode(email, email, "signup", input.lang);
}

/** Tạo tài khoản sau khi đã nhập đúng mã gửi về email. Trả về id người dùng hoặc lỗi */
export async function registerUser(input: SignupInput & { code: string }): Promise<number | string> {
  const error = checkSignup(input);
  if (error) return error;
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const codeError = verifyCode(email, input.code.trim());
  if (codeError) return codeError;
  try {
    const id = createUser({ email, name, passwordHash: await hashPassword(input.password), role: "user", lang: input.lang });
    deleteEmailCode(email);
    return id;
  } catch {
    return "Email này đã được đăng ký";
  }
}

// ---- Quên mật khẩu: gửi mã về email → nhập mã + mật khẩu mới ----

/**
 * Gửi mã đặt lại mật khẩu. Không cho biết email có tài khoản hay không:
 * email lạ vẫn trả "đã gửi" (và vẫn tính thời gian chờ 60 giây như thật) nhưng không gửi gì.
 */
export async function sendPasswordReset(input: { email: string; lang?: string | null }): Promise<string | null> {
  const email = input.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return "Email không hợp lệ";
  if (!mailConfigured() && process.env.NODE_ENV === "production") return "Server chưa cấu hình gửi email (SMTP_USER, SMTP_PASS)";
  const key = resetKey(email);
  const wait = resendWait(key);
  if (wait > 0) return `Chờ ${wait} giây rồi gửi lại mã`;
  if (!(await mailQuota())) return TOO_MANY; // tính cả email lạ → không lộ email nào có tài khoản

  const user = getUserWithHash({ email });
  if (!user || email === envAdminEmail()) {
    // Mã ngẫu nhiên không ai biết — chỉ để thời gian chờ giống hệt email có tài khoản
    saveEmailCode(key, randomBytes(32).toString("hex"), Date.now() + CODE_TTL);
    return null;
  }
  return issueCode(key, email, "reset", input.lang, user.name);
}

/** Đặt mật khẩu mới bằng mã đã gửi. Trả về id người dùng (để đăng nhập luôn) hoặc lỗi */
export async function resetPasswordWithCode(input: { email: string; code: string; password: string }): Promise<number | string> {
  const email = input.email.trim().toLowerCase();
  if (input.password.length < 8) return "Mật khẩu mới cần ít nhất 8 ký tự";
  const key = resetKey(email);
  const codeError = verifyCode(key, input.code.trim());
  if (codeError) return codeError;
  const user = getUserWithHash({ email });
  if (!user || email === envAdminEmail()) return "Mã xác nhận không đúng";
  setUserPassword(user.id, await hashPassword(input.password)); // mọi phiên cũ trên các thiết bị hết hiệu lực
  deleteEmailCode(key);
  return user.id;
}

// ---- Đăng nhập bằng Google / Apple ----

/**
 * Đăng nhập (tự tạo tài khoản lần đầu) bằng ID token của Google / Apple. Trả về id người dùng hoặc lỗi.
 * Chưa liên kết mà email đã có tài khoản → gắn vào tài khoản đó (chỉ khi Google / Apple xác nhận email).
 * Apple chỉ gửi tên ở lần đầu, qua app (không nằm trong token) → `name` do app gửi kèm.
 */
export async function oauthSignIn(input: {
  provider: OAuthProvider;
  idToken: string;
  name?: string;
  authorizationCode?: string;
  lang?: string | null;
}): Promise<number | string> {
  const { provider } = input;
  if (!oauthEnabled(provider)) return `Server chưa cấu hình đăng nhập bằng ${provider === "google" ? "Google" : "Apple"}`;
  const profile = await verifyIdToken(provider, input.idToken);
  if (typeof profile === "string") return profile;

  let userId = getOAuthUserId(provider, profile.subject);
  if (userId === null) {
    if (!profile.emailVerified) return "Tài khoản này không có email đã xác minh.";
    const email = profile.email;
    // Email admin chỉ đăng nhập bằng ADMIN_PASSWORD
    if (email === envAdminEmail()) return "Tài khoản admin chính chỉ đăng nhập bằng mật khẩu.";
    const existing = getUserWithHash({ email });
    if (existing) userId = existing.id;
    else {
      const name = (input.name?.trim() || profile.name || email.split("@")[0]).slice(0, 60);
      try {
        userId = createUser({
          email,
          name,
          passwordHash: NO_PASSWORD + randomBytes(32).toString("hex"),
          role: "user",
          lang: input.lang,
        });
      } catch {
        // Cùng lúc vừa tạo bằng request khác (bấm 2 lần) → dùng tài khoản đó
        const again = getUserWithHash({ email });
        if (!again) return "Không tạo được tài khoản, thử lại.";
        userId = again.id;
      }
    }
    linkOAuth(provider, profile.subject, userId, email);
  }
  if (provider === "apple" && input.authorizationCode) {
    const refresh = await appleRefreshToken(input.authorizationCode);
    if (refresh) setOAuthRefreshToken("apple", profile.subject, refresh);
  }
  return userId;
}

/** Xoá tài khoản + toàn bộ dữ liệu; có Sign in with Apple → thu hồi quyền phía Apple (App Store bắt buộc) */
export async function removeAccount(userId: number) {
  const apple = appleRefreshTokens(userId);
  deleteUser(userId);
  await Promise.all(apple.map(revokeApple));
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

/** Lưu từ vựng; chỉ nhận link nguồn nội bộ (/lesson/…, /watch/…). Trả về mục vừa lưu hoặc lỗi */
export function addWord(
  user: User,
  input: { word: string; context?: string; sourceUrl?: string | null; sourceTitle?: string },
): VocabItem | string {
  // Có khoảng trắng = lưu nguyên câu (đánh dấu sao trong app) → cho dài hơn 1 từ
  const word = input.word.trim().slice(0, input.word.trim().includes(" ") ? 500 : 80);
  if (!word) return "Từ trống";
  const sourceUrl = input.sourceUrl && /^\/(lesson|watch)\/[\w-]+$/.test(input.sourceUrl) ? input.sourceUrl : null;
  return saveVocab(user.id, {
    word,
    context: (input.context ?? "").slice(0, 500),
    sourceUrl,
    sourceTitle: (input.sourceTitle ?? "").slice(0, 200),
  });
}

/**
 * Nhờ AI ghi nghĩa cho 1 mục trong sổ từ vựng rồi lưu luôn.
 * Từ → nghĩa theo câu ví dụ (theo ngôn ngữ giao diện); câu (có khoảng trắng) → bản dịch tiếng Việt.
 */
export async function aiWordMeaning(user: User, id: number): Promise<{ meaning: string } | { error: string }> {
  const v = getVocab(user.id, id);
  if (!v) return { error: "Không tìm thấy từ" };
  const meaning = v.word.includes(" ")
    ? (await translateSentences([v.word]))[0]
    : (await translateWord(v.word, v.context || v.word, user.lang === "de" ? "de" : "vi")).meaning;
  if (!meaning) return { error: "Không dịch được lúc này." };
  updateVocabMeaning(user.id, id, meaning.slice(0, 500));
  return { meaning };
}
