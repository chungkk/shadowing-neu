import { apiUser, body, fail, str } from "@/lib/api";
import { listOwnLessons, ownLessonOfVideo } from "@/lib/db";
import { makeOwnLesson } from "@/lib/own-lesson";
import { allow } from "@/lib/rate-limit";
import { extractVideoId } from "@/lib/youtube-id";

/** GET → { lessons } danh sách bài học riêng của người dùng đang đăng nhập */
export async function GET() {
  const user = await apiUser();
  if (user instanceof Response) return user;
  return Response.json({ lessons: listOwnLessons(user.id) });
}

/** POST { videoId } → tạo (hoặc lấy lại) bài học riêng từ video YouTube → { id, slug, points } */
export async function POST(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  if (!allow(`own-lesson:u:${user.id}`, 10, 60 * 60_000)) {
    return fail("Bạn tạo bài học riêng quá nhanh, thử lại sau nhé.", 429);
  }
  const b = await body<{ videoId?: unknown }>(req);
  const videoId = extractVideoId(str(b.videoId));
  if (!videoId) return fail("Link YouTube không hợp lệ");
  const res = await makeOwnLesson(user, videoId);
  if ("error" in res) return fail(res.error);
  const own = ownLessonOfVideo(user.id, videoId);
  return Response.json({ id: own?.id ?? null, slug: res.slug, points: res.points });
}
