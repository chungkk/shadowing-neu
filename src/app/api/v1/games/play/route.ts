import type { NextRequest } from "next/server";
import { body, fail, str } from "@/lib/api";
import { createPlay, playAction, playState, playView } from "@/lib/play-game";
import { playActor } from "@/lib/play-guest";
import { allow } from "@/lib/rate-limit";

const CODE_RE = /^[A-Za-z0-9]{6}$/;

/**
 * Sudoku & Caro, chỉ chơi vui (không cược kim cương).
 * Người đăng nhập hoặc khách đã đặt tên tạm (POST /games/play/guest) đều gọi được.
 * GET → { active }: ván đang dở (nếu có)
 * GET ?code=ABC123 → PlayView: tình trạng 1 phòng (máy khách hỏi lại mỗi ~1,5 giây khi chơi với người)
 */
export async function GET(req: NextRequest) {
  const user = await playActor();
  if (!user) return fail("Chưa đăng nhập", 401);
  if (!allow(`play:get:${user.id}`, 1200, 10 * 60 * 1000)) return fail("Quá nhiều lượt trong thời gian ngắn, thử lại sau ít phút.", 429);
  const code = req.nextUrl.searchParams.get("code");
  if (code === null) return Response.json(playState(user.id));
  if (!CODE_RE.test(code)) return fail("Mã phòng không hợp lệ");
  const r = playView(user.id, code);
  return "error" in r ? fail(r.error, r.status) : Response.json(r);
}

/**
 * POST { action: "create", game, mode: "room" | "solo", level?, capacity? }
 *    · { action: "join" | "leave" | "start" | "resign", code } · { action: "ready", code, ready } · { action: "pause", code, paused }
 *    · { action: "progress" | "submit", code, grid: 81 số, errors } (Sudoku: lưu bàn đang điền / nộp bài) · { action: "move", code, cell } (Caro)
 * → PlayView (+ ok: bài Sudoku vừa nộp đúng hay chưa)
 */
export async function POST(req: Request) {
  const user = await playActor();
  if (!user) return fail("Chưa đăng nhập", 401);
  if (!allow(`play:post:${user.id}`, 900, 10 * 60 * 1000)) return fail("Quá nhiều lượt trong thời gian ngắn, thử lại sau ít phút.", 429);
  const b = await body<{ action: string; code: string; game: string; mode: string; level: string; capacity: number; cell: number; paused: boolean; ready: boolean; grid: unknown; errors: unknown }>(req);
  const action = str(b.action);
  if (action === "create") {
    const r = createPlay(user.id, { game: str(b.game), mode: str(b.mode), level: str(b.level), capacity: Number(b.capacity) });
    return "error" in r ? fail(r.error, r.status) : Response.json(r);
  }
  const code = str(b.code);
  if (!CODE_RE.test(code)) return fail("Mã phòng không hợp lệ");
  const r = playAction(user.id, { action, code, cell: b.cell, paused: b.paused === true, ready: b.ready === true, grid: b.grid, errors: b.errors });
  return "error" in r ? fail(r.error, r.status) : Response.json(r);
}
