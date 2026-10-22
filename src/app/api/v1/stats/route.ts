import type { NextRequest } from "next/server";
import { apiUser } from "@/lib/api";
import { getStats } from "@/lib/db";

/** GET ?tz=<phút, như Date.getTimezoneOffset()> → thống kê học tập của người đang đăng nhập (số liệu thật từ lịch sử ôn) */
export async function GET(req: NextRequest) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const tz = Number(req.nextUrl.searchParams.get("tz"));
  return Response.json(getStats(user.id, Number.isFinite(tz) && Math.abs(tz) <= 840 ? tz : 0));
}
