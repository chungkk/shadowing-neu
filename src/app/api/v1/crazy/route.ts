import type { NextRequest } from "next/server";
import { addCrazyRep, getCrazyReps } from "@/lib/db";
import { apiUser, body, fail, str } from "@/lib/api";
import { allow } from "@/lib/rate-limit";

/** Chế độ Crazy: số lượt hét từng câu của người đang đăng nhập (giữ vĩnh viễn, đồng bộ giữa các máy) */

const SOURCE_RE = /^\/(lesson|watch)\/[\w-]{1,64}$/;

/** GET ?source=… → { reps: {"<idx>": {reps, passed}} } */
export async function GET(req: NextRequest) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const source = req.nextUrl.searchParams.get("source") ?? "";
  if (!SOURCE_RE.test(source)) return fail("source không hợp lệ");
  return Response.json({ reps: getCrazyReps(user.id, source) });
}

/** POST { source, idx, passed } → +1 lượt cho câu idx → { rep: {reps, passed} } */
export async function POST(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  if (!allow(`crazy:u:${user.id}`, 600, 10 * 60 * 1000)) return fail("Quá nhiều lượt trong thời gian ngắn, thử lại sau ít phút.", 429);
  const b = await body<{ source: string; idx: number; passed: boolean }>(req);
  const source = str(b.source);
  if (!SOURCE_RE.test(source)) return fail("source không hợp lệ");
  if (typeof b.idx !== "number" || !Number.isInteger(b.idx) || b.idx < 0 || b.idx >= 10000) return fail("idx không hợp lệ");
  return Response.json({ rep: addCrazyRep(user.id, source, b.idx, b.passed === true) });
}
