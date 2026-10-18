import { changePassword, createToken } from "@/lib/auth";
import { apiUser, body, fail, str } from "@/lib/api";

/** POST { current, next } → { token } mới (token cũ trên mọi thiết bị hết hiệu lực) */
export async function POST(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const b = await body<{ current: string; next: string }>(req);
  const error = await changePassword(user, str(b.current), str(b.next));
  if (error) return fail(error);
  return Response.json({ token: createToken(user.id) });
}
