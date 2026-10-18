import { authenticate, createToken, getCurrentUser } from "@/lib/auth";
import { authConfigured } from "@/lib/account";
import { getUserById } from "@/lib/db";
import { body, fail, publicUser, str } from "@/lib/api";

/** POST { email, password } → { token, user } */
export async function POST(req: Request) {
  await getCurrentUser(); // đánh dấu route chạy lúc request
  if (!authConfigured()) return fail("Server chưa cấu hình AUTH_SECRET", 500);
  const b = await body<{ email: string; password: string }>(req);
  const res = await authenticate(str(b.email).trim().toLowerCase(), str(b.password));
  if (typeof res === "string") return fail(res, 401);
  const user = getUserById(res)!;
  return Response.json({ token: createToken(res), user: publicUser(user) });
}
