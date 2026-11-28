import type { NextRequest } from "next/server";
import { apiUser } from "@/lib/api";
import { listReminders } from "@/lib/reminders";

/**
 * GET ?tz=<phút, như Date.getTimezoneOffset()>[&cls=B][&state=be] → { reminders, started }: nhắc nhở học của người đang đăng nhập
 * (đang học gì, phần nào chưa xong). cls / state: hạng bằng / bang app mobile đang chọn (lưu trên máy);
 * web không gửi → lấy theo tài khoản. Chỉ đọc, không ghi gì.
 */
export async function GET(req: NextRequest) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const tz = Number(req.nextUrl.searchParams.get("tz"));
  const q = req.nextUrl.searchParams;
  return Response.json(
    listReminders(user.id, Number.isFinite(tz) && Math.abs(tz) <= 840 ? tz : 0, {
      cls: q.get("cls"),
      state: q.get("state"),
      lang: q.get("lang"),
    }),
  );
}
