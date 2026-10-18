import { editProfile } from "@/lib/account";
import { getUserById } from "@/lib/db";
import { apiUser, body, fail, publicUser, str } from "@/lib/api";

/** GET → thông tin tài khoản */
export async function GET() {
  const user = await apiUser();
  if (user instanceof Response) return user;
  return Response.json({ user: publicUser(user) });
}

/** PATCH { name, email? } → sửa thông tin */
export async function PATCH(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const b = await body<{ name: string; email: string }>(req);
  const error = editProfile(user, { name: str(b.name) || user.name, email: str(b.email) || undefined });
  if (error) return fail(error);
  return Response.json({ user: publicUser(getUserById(user.id)!) });
}
