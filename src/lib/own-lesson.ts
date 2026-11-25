import "server-only";
import type { User } from "./auth";
import { createOwnLesson, getPoints } from "./db";
import { prewarmPhrases } from "./phrases";
import { defaultWhisper, getYouTubeTranscript, isWhisper, MAX_VIDEO_SECONDS, type Transcript } from "./youtube";
import { whisperEnabled } from "./whisper";

/**
 * Bài học riêng: video YouTube tự dán (/watch) học thử được nhưng không lưu gì. Người dùng đã đăng nhập có thể lưu miễn phí
 * thành bài của riêng mình — lưu tiến độ, có Chính tả (không tính kim cương xếp hạng), phụ đề được làm kỹ hơn bản học thử.
 */

export const ownLessonPrice = (_user: User) => {
  void _user;
  return 0;
};

/**
 * Phụ đề tốt nhất cho bài riêng: phụ đề người làm > Whisper (AI nghe lại cả video, chính xác hơn và có thời gian từng từ)
 * > phụ đề tự động của YouTube đã thêm dấu câu. Whisper lỗi / hết lượt trong ngày → dùng bản YouTube.
 */
async function bestTranscript(videoId: string, user: User): Promise<Transcript> {
  const opts = { whisper: true, quotaKey: `u:${user.id}`, maxSeconds: user.role === "admin" ? undefined : MAX_VIDEO_SECONDS };
  const d = await getYouTubeTranscript(videoId, undefined, opts);
  if (!d.track.auto || isWhisper(d.track.languageCode) || !whisperEnabled()) return d;
  try {
    return await getYouTubeTranscript(videoId, defaultWhisper(), opts);
  } catch {
    return d;
  }
}

/** Tạo (hoặc lấy lại) bài riêng của người này từ video → slug của bài, hoặc lỗi để hiện cho người dùng */
export async function makeOwnLesson(user: User, videoId: string): Promise<{ slug: string; points: number } | { error: string }> {
  let t: Transcript;
  try {
    t = await bestTranscript(videoId, user);
  } catch (e) {
    return { error: (e as Error).message };
  }
  if (!t.segments.length) return { error: "Video này không có phụ đề để làm bài." };
  const r = createOwnLesson(user.id, { title: t.title.slice(0, 200) || "Video YouTube", videoId, segments: t.segments }, 0);
  if (r === "points") return { error: "Không thể lưu bài học riêng lúc này." };
  if (r.created) prewarmPhrases(t.segments); // phân tích cụm từ sẵn cho cả bài
  return { slug: r.slug, points: getPoints(user.id).total };
}
