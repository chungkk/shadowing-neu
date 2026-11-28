import { getCurrentUser } from "@/lib/auth";
import { getLeaderboard } from "@/lib/db";

/** GET → bảng xếp hạng điểm + hạng của người đang đăng nhập (khách vẫn xem được danh sách top) */
export async function GET() {
  const user = await getCurrentUser();
  return Response.json(getLeaderboard(user?.id ?? 0));
}
