import { getCurrentUser } from "@/lib/auth";
import { createLesson, LEVELS, listLessons, type Level } from "@/lib/db";
import { extractVideoId, getSavedTranscript, getYouTubeTranscript } from "@/lib/youtube";
import { apiAdmin, body, fail, str } from "@/lib/api";
import { prewarmPhrases } from "@/lib/phrases";
import { accessOf, lessonsFor, lockInfo } from "@/lib/access";

/**
 * GET → danh sách bài đã đăng + bài ẩn người này đã trả để mở (admin thấy cả bản nháp), không kèm phụ đề.
 * Không phải admin → luôn published: true để app không gắn nhãn "Nháp" lên bài ẩn đã mua.
 * Mỗi bài kèm access ("open" | "free" | "unlocked" | "locked") · lock: lượt chọn miễn phí còn lại, giá mở khoá, điểm hiện có
 */
export async function GET() {
  const user = await getCurrentUser();
  const access = accessOf(user);
  const lessons = user?.role === "admin" ? listLessons({ includeDrafts: true }) : lessonsFor(user?.id ?? null).map((l) => ({ ...l, published: true }));
  return Response.json({
    lessons: lessons.map((l) => ({ ...l, access: access(l.id) })),
    lock: lockInfo(user),
  });
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
  prewarmPhrases(segments); // phân tích sẵn cụm từ → mở bài là có tô sáng ngay
  return Response.json({ id }, { status: 201 });
}
