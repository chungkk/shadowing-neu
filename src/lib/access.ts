import "server-only";
import type { User } from "./auth";
import {
  addLessonUnlock,
  getLesson,
  getPoints,
  getSetting,
  lessonPicksUsed,
  listLessons,
  paidLessonIds,
  publishedLessonsByVideo,
  setSetting,
  unlockedLessonIds,
  unlockLessonsWithProgress,
} from "./db";
import { POINTS_CORRECT } from "./dictation";
import { mergeIntoSentences } from "./subtitles";
import { FREE_PICKS, LESSON_PRICE, type LessonAccess, type LockInfo } from "./lesson-lock";

/** Quyền học từng bài khi admin bật khoá bài (quy tắc: lib/lesson-lock.ts) */

export type LockSettings = { enabled: boolean; free: number[] }; // free: id các bài miễn phí
const KEY = "lesson_lock";

export const lockSettings = (): LockSettings => getSetting<LockSettings>(KEY) ?? { enabled: false, free: [] };

export function saveLockSettings(s: LockSettings) {
  // Vừa bật khoá / bỏ miễn phí 1 bài khi đang khoá → bài ai đang học dở vẫn học tiếp được
  const old = lockSettings();
  if (s.enabled && !old.enabled) unlockLessonsWithProgress();
  else if (s.enabled) old.free.filter((id) => !s.free.includes(id)).forEach((id) => unlockLessonsWithProgress(id));
  setSetting(KEY, { enabled: s.enabled, free: [...new Set(s.free)] });
}

/**
 * Số kim cương tối đa ai cũng kiếm được từ các bài miễn phí (chỉ bài đã đăng có bật Chính tả mới có điểm).
 * Dưới LESSON_PRICE → người học có thể không bao giờ đủ để mở bài đầu tiên.
 */
export function earnableFreePoints(): number {
  const free = new Set(lockSettings().free);
  return listLessons()
    .filter((l) => l.dictation && free.has(l.id))
    .reduce((n, l) => n + (l.wordCount ?? 0) * POINTS_CORRECT, 0);
}

/**
 * Bài ẩn (bản nháp) chỉ admin xem được, trừ người đã trả để mở: họ vẫn học tiếp và thấy bài trong danh sách.
 * Hoàn kim cương / lượt chọn chỉ khi xoá bài (deleteLesson) — ẩn bài, đổi sang miễn phí, tắt khoá đều không hoàn.
 */
export function canViewLesson(user: User | null, lesson: { id: number; published: boolean }): boolean {
  return lesson.published || user?.role === "admin" || (!!user && paidLessonIds(user.id).has(lesson.id));
}

/** Danh sách bài của 1 người: bài đã đăng + bài ẩn người này đã trả để mở */
export function lessonsFor(userId: number | null) {
  const paid = userId === null ? new Set<number>() : paidLessonIds(userId);
  return listLessons({ includeDrafts: true }).filter((l) => l.published || paid.has(l.id));
}

/** Câu idx (sau khi gộp, như màn học) của bài có bật Chính tả mà người này được xem — null = không có. Để server chấm lại trước khi cộng điểm */
export function dictationSentenceFor(user: User, lessonId: number, idx: number): string | null {
  const l = getLesson(lessonId);
  return l?.dictation && canViewLesson(user, l) ? (mergeIntoSentences(l.segments)[idx]?.text ?? null) : null;
}

/** Hàm tra quyền từng bài của 1 người (đọc DB 1 lần — dùng cho cả danh sách bài) */
export function accessOf(user: User | null): (lessonId: number) => LessonAccess {
  const s = lockSettings();
  if (!s.enabled || user?.role === "admin") return () => "open";
  const free = new Set(s.free);
  const unlocked = user ? unlockedLessonIds(user.id) : new Set<number>();
  return (id) => (free.has(id) ? "free" : unlocked.has(id) ? "unlocked" : "locked");
}

export function lockInfo(user: User | null): LockInfo {
  const enabled = lockSettings().enabled && user?.role !== "admin";
  return {
    enabled,
    loggedIn: !!user,
    picksLeft: user && enabled ? Math.max(0, FREE_PICKS - lessonPicksUsed(user.id)) : 0,
    price: LESSON_PRICE,
    points: user ? getPoints(user.id).total : 0,
  };
}

/**
 * Video YouTube là video của bài đang khoá với người này (mọi bài dùng video đó đều khoá) → bài để chuyển sang mở khoá.
 * Không thì null (video tự do luôn mở). Chặn lách khoá bằng cách dán link video vào /watch.
 */
export function lockedLessonOfVideo(user: User | null, videoId: string): { id: number; slug: string } | null {
  const lessons = publishedLessonsByVideo(videoId);
  const access = accessOf(user);
  return lessons.length > 0 && lessons.every((l) => access(l.id) === "locked") ? lessons[0] : null;
}

/** Bài học / video của bài đang bị khoá với người này → không lưu tiến độ / điểm */
export function lockedSource(user: User | null, source: string): boolean {
  const [, kind, id] = source.split("/");
  if (kind === "lesson") return /^\d+$/.test(id) && accessOf(user)(Number(id)) === "locked";
  return kind === "watch" && !!lockedLessonOfVideo(user, id);
}

/**
 * Mở khoá 1 bài: còn lượt chọn miễn phí thì dùng lượt, hết thì trừ LESSON_PRICE kim cương.
 * Bài đã mở / miễn phí → không tốn gì. Gọi đồng bộ (node:sqlite) nên 2 request cùng lúc không trừ điểm 2 lần.
 * expected: cách mở người dùng đã thấy trên màn hình — "pick" mà hết lượt (màn hình cũ, vừa dùng lượt ở máy khác) → 409, không tự trừ kim cương.
 */
export function unlockLesson(user: User, lessonId: number, expected?: unknown): { error: string; status: number } | { kind: "pick" | "buy" | null; info: LockInfo } {
  const lesson = getLesson(lessonId);
  if (!lesson || !lesson.published) return { error: "Không tìm thấy bài học", status: 404 };
  if (accessOf(user)(lessonId) !== "locked") return { kind: null, info: lockInfo(user) };
  const info = lockInfo(user);
  if (info.picksLeft > 0) {
    addLessonUnlock(user.id, lessonId, "pick", 0);
    return { kind: "pick", info: lockInfo(user) };
  }
  if (expected === "pick") return { error: "Bạn đã hết lượt chọn miễn phí (có thể vừa dùng ở thiết bị khác). Chưa trừ kim cương nào — xem lại rồi mở lại nếu muốn.", status: 409 };
  if (info.points < LESSON_PRICE)
    return {
      error: `Cần ${LESSON_PRICE.toLocaleString("vi-VN")} kim cương để mở bài này (bạn đang có ${info.points.toLocaleString("vi-VN")}). Chép chính tả đúng mỗi từ được +1.`,
      status: 402,
    };
  addLessonUnlock(user.id, lessonId, "buy", LESSON_PRICE);
  return { kind: "buy", info: lockInfo(user) };
}
