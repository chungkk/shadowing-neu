import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteLesson, getLesson, LEVELS, updateLesson, type Level } from "@/lib/db";
import { apiAdmin, body, fail, str } from "@/lib/api";

/** GET → 1 bài kèm phụ đề (segments thô; app tự gộp câu như web) */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/v1/lessons/[id]">) {
  const user = await getCurrentUser();
  const lesson = getLesson(Number((await ctx.params).id));
  if (!lesson || (!lesson.published && user?.role !== "admin")) return fail("Không tìm thấy bài học", 404);
  return Response.json({ lesson });
}

/** PATCH { title?, level?, description?, published? } — admin sửa thông tin bài (phụ đề giữ nguyên) */
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/v1/lessons/[id]">) {
  const admin = await apiAdmin();
  if (admin instanceof Response) return admin;
  const lesson = getLesson(Number((await ctx.params).id));
  if (!lesson) return fail("Không tìm thấy bài học", 404);

  const b = await body<{ title: string; level: string; description: string; published: boolean }>(req);
  const title = b.title === undefined ? lesson.title : str(b.title).trim().slice(0, 200);
  const level = (b.level === undefined ? lesson.level : str(b.level)) as Level;
  if (!title) return fail("Nhập tiêu đề bài học");
  if (!LEVELS.includes(level)) return fail("Cấp độ không hợp lệ");
  updateLesson(lesson.id, {
    title,
    level,
    videoId: lesson.videoId,
    segments: lesson.segments,
    description: b.description === undefined ? lesson.description : str(b.description).trim().slice(0, 2000),
    published: typeof b.published === "boolean" ? b.published : lesson.published,
  });
  const { segments, ...summary } = getLesson(lesson.id)!;
  return Response.json({ lesson: { ...summary, segmentCount: segments.length } });
}

/** DELETE — admin xoá bài */
export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/v1/lessons/[id]">) {
  const admin = await apiAdmin();
  if (admin instanceof Response) return admin;
  const lesson = getLesson(Number((await ctx.params).id));
  if (!lesson) return fail("Không tìm thấy bài học", 404);
  deleteLesson(lesson.id);
  return Response.json({ ok: true });
}
