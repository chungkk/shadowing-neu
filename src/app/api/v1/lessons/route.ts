import { getCurrentUser } from "@/lib/auth";
import { createLesson, LEVELS, listLessons, type Level } from "@/lib/db";
import { extractVideoId, getSavedTranscript, getYouTubeTranscript } from "@/lib/youtube";
import { apiAdmin, body, fail, str } from "@/lib/api";

/** GET → danh sách bài đã đăng (admin thấy cả bản nháp), không kèm phụ đề */
export async function GET() {
  const user = await getCurrentUser();
  return Response.json({ lessons: listLessons({ includeDrafts: user?.role === "admin" }) });
}

/**
 * POST { videoId, title, level, description?, published?, dictation? } — admin thêm bài từ app.
 * Phụ đề lấy ở server: bản đã lưu (app lưu khi mở video) → không có thì tự lấy / tạo bằng Whisper.
 * → 201 { id } · 409 { error, id } nếu video đã có bài.
 */
export async function POST(req: Request) {
  const admin = await apiAdmin();
  if (admin instanceof Response) return admin;

  const b = await body<{ videoId: string; title: string; level: string; description: string; published: boolean; dictation: boolean }>(req);
  const videoId = extractVideoId(str(b.videoId));
  const title = str(b.title).trim().slice(0, 200);
  const level = str(b.level) as Level;
  if (!videoId) return fail("Link YouTube không hợp lệ");
  if (!title) return fail("Nhập tiêu đề bài học");
  if (!LEVELS.includes(level)) return fail("Cấp độ không hợp lệ");

  const existing = listLessons({ includeDrafts: true }).find((l) => l.videoId === videoId);
  if (existing) return Response.json({ error: `Video này đã có bài “${existing.title}”`, id: existing.id }, { status: 409 });

  let segments = (await getSavedTranscript(videoId))?.segments;
  if (!segments?.length) {
    try {
      segments = (await getYouTubeTranscript(videoId, undefined, { whisper: true })).segments;
    } catch (e) {
      return fail((e as Error).message, 502);
    }
  }
  if (!segments.length) return fail("Video không có phụ đề");

  const id = createLesson({
    title,
    videoId,
    description: str(b.description).trim().slice(0, 2000),
    level,
    published: b.published !== false,
    dictation: b.dictation === true,
    segments,
  });
  return Response.json({ id }, { status: 201 });
}
