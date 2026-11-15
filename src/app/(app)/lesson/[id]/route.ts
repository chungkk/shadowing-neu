import { getLesson } from "@/lib/db";
import { lessonPath } from "@/lib/slug";

/**
 * Link cũ /lesson/<id> → 308 về hallovn.de/tieng-duc/<slug> (Google chuyển thứ hạng sang link mới; link đã chia sẻ, link nguồn
 * trong sổ từ vựng vẫn mở được). Route handler thay vì page: page đang stream chỉ chuyển hướng được phía trình duyệt.
 */
export async function GET(req: Request, ctx: RouteContext<"/lesson/[id]">) {
  const lesson = getLesson(Number((await ctx.params).id));
  if (!lesson) return new Response("Không tìm thấy bài học", { status: 404 });
  // Location tương đối: sau proxy (Coolify) req.url có thể mang host nội bộ
  return new Response(null, { status: 308, headers: { Location: `${lessonPath(lesson.slug)}${new URL(req.url).search}` } });
}
