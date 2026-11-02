import { createSession } from "@/lib/auth";
import { apiUser } from "@/lib/api";

/** POST → gia hạn cookie đăng nhập của web thêm 30 ngày (xem SessionRenew) */
export async function POST() {
  const user = await apiUser();
  if (user instanceof Response) return user;
  await createSession(user.id);
  return Response.json({ ok: true });
}
