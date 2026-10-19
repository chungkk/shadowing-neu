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

export async function sendMail(m: { to: string; subject: string; text: string; html: string }) {
  await transport().sendMail({
    from: process.env.MAIL_FROM || `"Deutsch Shadowing" <${process.env.SMTP_USER}>`,
    ...m,
  });
}
