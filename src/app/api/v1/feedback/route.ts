import { getCurrentUser, envAdminEmail } from "@/lib/auth";
import { body, fail, str } from "@/lib/api";
import { FEEDBACK_KINDS, saveFeedback, type FeedbackKind } from "@/lib/db";
import { mailConfigured, sendMail } from "@/lib/mail";
import { allow, clientIp } from "@/lib/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HOUR = 60 * 60 * 1000;

const KIND_LABEL: Record<FeedbackKind, string> = { idea: "Góp ý", bug: "Báo lỗi", content: "Nội dung bài học", other: "Khác" };

/**
 * POST { kind, message, email?, device? } → lưu góp ý / báo lỗi + báo qua email cho admin (ADMIN_EMAIL).
 * Khách chưa đăng nhập cũng gửi được; email để trả lời: email tài khoản, hoặc khách tự nhập (không bắt buộc).
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  // Chống spam: mỗi IP 10 lần / giờ, mỗi tài khoản 10 lần / giờ
  if (!allow(`feedback:ip:${await clientIp()}`, 10, HOUR) || (user && !allow(`feedback:u:${user.id}`, 10, HOUR)))
    return fail("Bạn đã gửi khá nhiều trong thời gian ngắn, thử lại sau ít phút.", 429);

  const b = await body<{ kind: string; message: string; email: string; device: string }>(req);
  const kind = (FEEDBACK_KINDS as readonly string[]).includes(str(b.kind)) ? (b.kind as FeedbackKind) : "other";
  const message = str(b.message).trim();
  if (message.length < 5) return fail("Viết thêm một chút để chúng tôi hiểu rõ hơn nhé.");
  if (message.length > 5000) return fail("Nội dung tối đa 5000 ký tự");
  const typed = str(b.email).trim().toLowerCase();
  if (typed && !EMAIL_RE.test(typed)) return fail("Email không hợp lệ");
  const email = user?.email ?? typed;
  const device = str(b.device).slice(0, 200);

  const id = saveFeedback({ userId: user?.id ?? null, kind, message, email, device });

  const admin = envAdminEmail();
  if (admin && mailConfigured()) {
    const esc = (v: string) => v.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
    const from = user ? `${user.name} <${user.email}>` : email || "Khách (không để lại email)";
    const meta = [`Từ: ${from}`, device && `Thiết bị: ${device}`, `Mã: #${id}`].filter(Boolean) as string[];
    // Gửi nền: lỗi gửi mail không làm hỏng việc lưu góp ý
    sendMail({
      to: admin,
      replyTo: email || undefined,
      subject: `[${KIND_LABEL[kind]}] ${message.replace(/\s+/g, " ").slice(0, 60)}`,
      text: `${message}\n\n—\n${meta.join("\n")}`,
      html: `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;color:#111">
  <p style="white-space:pre-wrap">${esc(message)}</p>
  <hr style="border:none;border-top:1px solid #ddd"><p style="color:#555;font-size:13px">${meta.map(esc).join("<br>")}</p></div>`,
    }).catch((e) => console.error("[mail] gửi góp ý thất bại:", e));
  }
  return Response.json({ ok: true, id });
}
