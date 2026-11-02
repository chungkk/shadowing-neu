import { confirmEmailChange } from "@/lib/account";
import { getUserById } from "@/lib/db";
import { apiUser, body, fail, publicUser, str } from "@/lib/api";

/** POST { email, code } → đổi email bằng mã gửi qua /me/email/code, trả { user } */
export async function POST(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const b = await body<{ email: string; code: string }>(req);
  const error = confirmEmailChange(user, { email: str(b.email), code: str(b.code) });
  if (error) return fail(error);
  return Response.json({ user: publicUser(getUserById(user.id)!) });
}
