import { sendEmailChangeCode } from "@/lib/account";
import { apiUser, body, fail, str } from "@/lib/api";

/** POST { email, password } → kiểm tra mật khẩu (tài khoản Google / Apple chưa có mật khẩu thì bỏ qua) rồi gửi mã 6 số tới email mới */
export async function POST(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const b = await body<{ email: string; password: string }>(req);
  const error = await sendEmailChangeCode(user, { email: str(b.email), password: str(b.password) });
  if (error) return fail(error);
  return Response.json({ ok: true });
}
