import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getLesson } from "@/lib/db";
import { fail } from "@/lib/api";

/** GET → 1 bài kèm phụ đề (segments thô; app tự gộp câu như web) */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/v1/lessons/[id]">) {
  const user = await getCurrentUser();
  const lesson = getLesson(Number((await ctx.params).id));
  if (!lesson || (!lesson.published && user?.role !== "admin")) return fail("Không tìm thấy bài học", 404);
  return Response.json({ lesson });
}
