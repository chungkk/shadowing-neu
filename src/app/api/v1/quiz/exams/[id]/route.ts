import type { NextRequest } from "next/server";
import { apiUser, fail } from "@/lib/api";
import { getQuizExam } from "@/lib/db";

/** GET ?module=lid|fuehrerschein → { exam } (kèm danh sách câu trả lời để xem lại bài thi trên web/app) */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return fail("Mã bài thi không hợp lệ");
  const mod = req.nextUrl.searchParams.get("module") === "lid" ? "lid" : "fuehrerschein";
  const exam = getQuizExam(user.id, mod, id);
  if (!exam) return fail("Không tìm thấy bài thi", 404);
  return Response.json({ exam });
}
