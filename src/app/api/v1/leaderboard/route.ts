import { apiUser } from "@/lib/api";
import { getLeaderboard } from "@/lib/db";

/** GET → bảng xếp hạng điểm + hạng của người đang đăng nhập */
export async function GET() {
  const user = await apiUser();
  if (user instanceof Response) return user;
  return Response.json(getLeaderboard(user.id));
}
