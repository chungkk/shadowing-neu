import { getCurrentUser } from "@/lib/auth";
import { sendSignupCode } from "@/lib/account";
import { appLang, body, fail, str } from "@/lib/api";

/** POST { name, email, password, lang? } → kiểm tra thông tin rồi gửi mã xác nhận 6 số về email */
export async function POST(req: Request) {
  await getCurrentUser(); // đánh dấu route chạy lúc request
  const b = await body<{ name: string; email: string; password: string; lang: string }>(req);
  const error = await sendSignupCode({ name: str(b.name), email: str(b.email), password: str(b.password), lang: appLang(b.lang) });
  if (error) return fail(error);
  return Response.json({ ok: true });
}
