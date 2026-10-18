import { createToken, getCurrentUser } from "@/lib/auth";
import { registerUser } from "@/lib/account";
import { getUserById } from "@/lib/db";
import { body, fail, publicUser, str } from "@/lib/api";

/** POST { name, email, password } → { token, user } */
export async function POST(req: Request) {
  await getCurrentUser(); // đánh dấu route chạy lúc request
  const b = await body<{ name: string; email: string; password: string }>(req);
  const res = await registerUser({ name: str(b.name), email: str(b.email), password: str(b.password) });
  if (typeof res === "string") return fail(res);
  return Response.json({ token: createToken(res), user: publicUser(getUserById(res)!) }, { status: 201 });
}
