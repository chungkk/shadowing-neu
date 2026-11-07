import { body, fail } from "@/lib/api";
import { cleanGuestName, saveGuest } from "@/lib/play-guest";
import { allow, clientIp } from "@/lib/rate-limit";

/**
 * Khách (chưa đăng nhập) đặt tên tạm để chơi Sudoku / Caro.
 * POST { name } → { name }: tạo khách mới (cookie play_guest) hoặc đổi tên khách hiện tại
 */
export async function POST(req: Request) {
  if (!allow(`play:guest:${await clientIp()}`, 60, 60 * 60 * 1000)) return fail("Quá nhiều lượt trong thời gian ngắn, thử lại sau ít phút.", 429);
  const name = cleanGuestName((await body<{ name: string }>(req)).name);
  if (!name) return fail("Nhập tên tạm để chơi nhé");
  const g = await saveGuest(name);
  return Response.json({ name: g.name });
}
