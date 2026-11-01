import { apiUser, fail } from "@/lib/api";
import { exportUserData } from "@/lib/db";
import { mailConfigured, sendMail } from "@/lib/mail";
import { allow } from "@/lib/rate-limit";

const DAY = 24 * 60 * 60 * 1000;

const MAIL = {
  vi: {
    subject: "Bản sao dữ liệu Deutsch Shadowing của bạn",
    body: "Theo yêu cầu của bạn, đính kèm là bản sao toàn bộ dữ liệu tài khoản Deutsch Shadowing (định dạng JSON): thông tin tài khoản, sổ từ vựng, tiến độ học, lịch sử ôn tập và điểm.",
    note: "Nếu không phải bạn yêu cầu, hãy đổi mật khẩu trong app.",
  },
  de: {
    subject: "Deine Daten von Deutsch Shadowing",
    body: "wie angefordert findest du im Anhang eine Kopie aller Daten deines Deutsch-Shadowing-Kontos (JSON): Kontodaten, Vokabelheft, Lernfortschritt, Wiederholungsverlauf und Punkte.",
    note: "Wenn du das nicht angefordert hast, ändere bitte dein Passwort in der App.",
  },
};

/** POST → gửi bản sao toàn bộ dữ liệu của tài khoản (JSON đính kèm) về email tài khoản. Tối đa 3 lần / ngày */
export async function POST() {
  const user = await apiUser();
  if (user instanceof Response) return user;
  if (!mailConfigured()) return fail("Server chưa cấu hình gửi email (SMTP_USER, SMTP_PASS)", 503);
  if (!allow(`export:u:${user.id}`, 3, DAY)) return fail("Bạn đã yêu cầu nhiều lần hôm nay, thử lại vào ngày mai.", 429);
  const data = exportUserData(user.id);
  if (!data) return fail("Không tìm thấy tài khoản", 404);

  const m = MAIL[user.lang === "de" ? "de" : "vi"];
  const hi = user.lang === "de" ? `Hallo ${user.name},` : `Xin chào ${user.name},`;
  const esc = (v: string) => v.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  try {
    await sendMail({
      to: user.email,
      subject: m.subject,
      text: `${hi}\n\n${m.body}\n\n${m.note}`,
      html: `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111">
  <p>${esc(hi)}</p><p>${m.body}</p><p style="color:#555">${m.note}</p></div>`,
      attachments: [
        {
          filename: `deutsch-shadowing-${new Date().toISOString().slice(0, 10)}.json`,
          content: JSON.stringify(data, null, 2),
          contentType: "application/json",
        },
      ],
    });
  } catch (e) {
    console.error("[mail] gửi bản sao dữ liệu thất bại:", e);
    return fail("Không gửi được email. Thử lại sau.", 502);
  }
  return Response.json({ ok: true, email: user.email });
}
