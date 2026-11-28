import type { NextRequest } from "next/server";
import { apiUser } from "@/lib/api";
import { getStats, listProgress } from "@/lib/db";

/** GET ?tz=<phút, như Date.getTimezoneOffset()> → thống kê học tập của người đang đăng nhập (số liệu thật từ lịch sử ôn) */
export async function GET(req: NextRequest) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const tz = Number(req.nextUrl.searchParams.get("tz"));
  const stats = getStats(user.id, Number.isFinite(tz) && Math.abs(tz) <= 840 ? tz : 0);
  const progress = listProgress(user.id);
  return Response.json({
    ...stats,
    lessons: progress.length,
    sentences: progress.reduce((n, p) => n + Object.keys(p.dictDone).length, 0),
  });
}
