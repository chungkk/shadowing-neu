import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * Gửi email qua SMTP (mặc định Gmail: SMTP_USER = địa chỉ Gmail, SMTP_PASS = "Mật khẩu ứng dụng" 16 ký tự).
 * Dịch vụ khác: đặt thêm SMTP_HOST / SMTP_PORT.
 */

export const mailConfigured = () => !!(process.env.SMTP_USER && process.env.SMTP_PASS);

const g = globalThis as unknown as { __mail?: Transporter };

function transport(): Transporter {
  const port = Number(process.env.SMTP_PORT || 465);
  return (g.__mail ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  }));
}

/** Email liên hệ hiển thị cho người dùng (trang Chính sách / Điều khoản) — mặc định là địa chỉ gửi mail của app */
export const contactEmail = () => process.env.CONTACT_EMAIL || process.env.SMTP_USER || "";

/** Báo mật khẩu vừa đổi để chủ tài khoản biết nếu không phải họ làm — gửi nền, lỗi chỉ ghi log */
export function notifyPasswordChanged(user: { email: string; name: string; lang: string | null }) {
  if (!mailConfigured()) return;
  const m =
    user.lang === "de"
      ? { subject: "Dein Passwort wurde geändert", text: `Hallo ${user.name},\n\ndas Passwort deines Deutsch-Shadowing-Kontos wurde gerade geändert. Wenn du das nicht warst, setze es über „Passwort vergessen?“ zurück und antworte auf diese E-Mail.` }
      : { subject: "Mật khẩu của bạn vừa được đổi", text: `Xin chào ${user.name},\n\nMật khẩu tài khoản Deutsch Shadowing của bạn vừa được đổi. Nếu không phải bạn, hãy đặt lại bằng mục "Quên mật khẩu?" và trả lời email này.` };
  const html = m.text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!).replace(/\n/g, "<br>");
  sendMail({ to: user.email, replyTo: contactEmail() || undefined, ...m, html }).catch((e) => console.error("[mail] báo đổi mật khẩu thất bại:", e));
}

export async function sendMail(m: {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
  attachments?: { filename: string; content: string; contentType: string }[];
}) {
  await transport().sendMail({
    from: process.env.MAIL_FROM || `"Deutsch Shadowing" <${process.env.SMTP_USER}>`,
    ...m,
  });
}
