import { getCurrentUser } from "@/lib/auth";
import { sendPasswordReset } from "@/lib/account";
import { appLang, body, fail, str } from "@/lib/api";

/** POST { email, lang? } → gửi link đặt lại mật khẩu (luôn ok nếu email hợp lệ, không lộ email có tài khoản hay không) */
export async function POST(req: Request) {
  await getCurrentUser(); // đánh dấu route chạy lúc request
  const b = await body<{ email: string; lang: string }>(req);
  const error = await sendPasswordReset({ email: str(b.email), lang: appLang(b.lang) });
  if (error) return fail(error);
  return Response.json({ ok: true });
}
