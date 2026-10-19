import { createToken, getCurrentUser } from "@/lib/auth";
import { registerUser } from "@/lib/account";
import { getUserById } from "@/lib/db";
import { appLang, body, fail, publicUser, str } from "@/lib/api";

/** POST { name, email, password, code, lang? } → { token, user } (code: mã gửi qua /auth/register/code) */
export async function POST(req: Request) {
  await getCurrentUser(); // đánh dấu route chạy lúc request
  const b = await body<{ name: string; email: string; password: string; code: string; lang: string }>(req);
  const res = await registerUser({
    name: str(b.name),
    email: str(b.email),
    password: str(b.password),
    code: str(b.code),
    lang: appLang(b.lang),
  });
  if (typeof res === "string") return fail(res);
  return Response.json({ token: createToken(res), user: publicUser(getUserById(res)!) }, { status: 201 });
}
