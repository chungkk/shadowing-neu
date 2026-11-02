import { logoutEverywhere, tokenForApp } from "@/lib/auth";
import { apiUser } from "@/lib/api";

/** POST → { token } mới; token cũ trên mọi thiết bị khác hết hiệu lực */
export async function POST() {
  const user = await apiUser();
  if (user instanceof Response) return user;
  await logoutEverywhere(user.id);
  return Response.json({ token: await tokenForApp(user.id) });
}
