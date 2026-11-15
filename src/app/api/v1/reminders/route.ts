import type { NextRequest } from "next/server";
import { apiUser } from "@/lib/api";
import { listReminders } from "@/lib/reminders";

/** GET ?tz=<phút, như Date.getTimezoneOffset()> → { reminders } nhắc nhở học của người đang đăng nhập (đang học gì, phần nào chưa xong) */
export async function GET(req: NextRequest) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const tz = Number(req.nextUrl.searchParams.get("tz"));
  return Response.json({ reminders: await listReminders(user.id, Number.isFinite(tz) && Math.abs(tz) <= 840 ? tz : 0) });
}
