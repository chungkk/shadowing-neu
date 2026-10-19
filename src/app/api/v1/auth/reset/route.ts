import { createToken, getCurrentUser } from "@/lib/auth";
import { resetPasswordWithCode } from "@/lib/account";
import { getUserById } from "@/lib/db";
import { body, fail, publicUser, str } from "@/lib/api";

/** POST { email, code, password } → đặt mật khẩu mới bằng mã gửi qua /auth/forgot, trả { token, user } (đăng nhập luôn) */
export async function POST(req: Request) {
  await getCurrentUser(); // đánh dấu route chạy lúc request
  const b = await body<{ email: string; code: string; password: string }>(req);
  const res = await resetPasswordWithCode({ email: str(b.email), code: str(b.code), password: str(b.password) });
  if (typeof res === "string") return fail(res);
  return Response.json({ token: createToken(res), user: publicUser(getUserById(res)!) });
}
