import "server-only";
import type { User } from "./auth";
import { createOwnLesson, getPoints } from "./db";
import { OWN_LESSON_PRICE } from "./lesson-lock";
import { prewarmPhrases } from "./phrases";
import { getYouTubeTranscript, MAX_VIDEO_SECONDS, WHISPER, type Transcript } from "./youtube";
import { whisperEnabled } from "./whisper";

/**
 * Bài học riêng: video YouTube tự dán (/watch) học thử được nhưng không lưu gì. Người dùng trả OWN_LESSON_PRICE kim cương
 * để lưu video thành bài của riêng mình — lưu tiến độ, có Chính tả (không tính kim cương), phụ đề được làm kỹ hơn bản học thử.
 */

const fmt = (n: number) => n.toLocaleString("vi-VN");

/** Giá với người này — admin tạo bài không tốn kim cương */
export const ownLessonPrice = (user: User) => (user.role === "admin" ? 0 : OWN_LESSON_PRICE);

/**
 * Phụ đề tốt nhất cho bài riêng: phụ đề người làm > Whisper (AI nghe lại cả video, chính xác hơn và có thời gian từng từ)
 * > phụ đề tự động của YouTube đã thêm dấu câu. Whisper lỗi / hết lượt trong ngày → dùng bản YouTube.
 */
async function bestTranscript(videoId: string, user: User): Promise<Transcript> {
  const opts = { whisper: true, quotaKey: `u:${user.id}`, maxSeconds: user.role === "admin" ? undefined : MAX_VIDEO_SECONDS };
  const d = await getYouTubeTranscript(videoId, undefined, opts);
  if (!d.track.auto || d.track.languageCode === WHISPER || !whisperEnabled()) return d;
  try {
    return await getYouTubeTranscript(videoId, WHISPER, opts);
  } catch {
    return d;
  }
}

/** Tạo (hoặc lấy lại) bài riêng của người này từ video → slug của bài, hoặc lỗi để hiện cho người dùng */
export async function makeOwnLesson(user: User, videoId: string): Promise<{ slug: string; points: number } | { error: string }> {
  const price = ownLessonPrice(user);
  // Kiểm tra trước khi lấy phụ đề (tốn thời gian / tiền API); trừ thật thì kiểm tra lại trong giao dịch
  const have = getPoints(user.id).total;
  if (have < price) return { error: `Cần ${fmt(price)} kim cương để lưu bài riêng (bạn đang có ${fmt(have)}). Chép chính tả đúng mỗi từ ở các bài học được +1.` };
  let t: Transcript;
  try {
    t = await bestTranscript(videoId, user);
  } catch (e) {
    return { error: (e as Error).message };
  }
  if (!t.segments.length) return { error: "Video này không có phụ đề để làm bài." };
  const r = createOwnLesson(user.id, { title: t.title.slice(0, 200) || "Video YouTube", videoId, segments: t.segments }, price);
  if (r === "points") return { error: `Cần ${fmt(price)} kim cương để lưu bài riêng.` };
  if (r.created) prewarmPhrases(t.segments); // phân tích cụm từ sẵn cho cả bài
  return { slug: r.slug, points: getPoints(user.id).total };
}
