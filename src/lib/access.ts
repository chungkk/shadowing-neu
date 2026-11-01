import "server-only";
import type { User } from "./auth";
import {
  addLessonUnlock,
  getLesson,
  getPoints,
  getSetting,
  lessonPicksUsed,
  publishedLessonsByVideo,
  setSetting,
  unlockedLessonIds,
  unlockLessonsWithProgress,
} from "./db";
import { FREE_LESSONS, FREE_PICKS, LESSON_PRICE, type LessonAccess, type LockInfo } from "./lesson-lock";

/** Quyền học từng bài khi admin bật khoá bài (quy tắc: lib/lesson-lock.ts) */

export type LockSettings = { enabled: boolean; free: number[] }; // free: id các bài miễn phí
const KEY = "lesson_lock";

export const lockSettings = (): LockSettings => getSetting<LockSettings>(KEY) ?? { enabled: false, free: [] };

export function saveLockSettings(s: LockSettings) {
  // Vừa bật khoá → bài ai đang học dở vẫn học tiếp được
  if (s.enabled && !lockSettings().enabled) unlockLessonsWithProgress();
  setSetting(KEY, { enabled: s.enabled, free: [...new Set(s.free)].slice(0, FREE_LESSONS) });
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
 */
export function unlockLesson(user: User, lessonId: number): { error: string; status: number } | { kind: "pick" | "buy" | null; info: LockInfo } {
  const lesson = getLesson(lessonId);
  if (!lesson || !lesson.published) return { error: "Không tìm thấy bài học", status: 404 };
  if (accessOf(user)(lessonId) !== "locked") return { kind: null, info: lockInfo(user) };
  const info = lockInfo(user);
  if (info.picksLeft > 0) {
    addLessonUnlock(user.id, lessonId, "pick", 0);
    return { kind: "pick", info: lockInfo(user) };
  }
  if (info.points < LESSON_PRICE)
    return {
      error: `Cần ${LESSON_PRICE.toLocaleString("vi-VN")} kim cương để mở bài này (bạn đang có ${info.points.toLocaleString("vi-VN")}). Chép chính tả đúng mỗi câu được +2.`,
      status: 402,
    };
  addLessonUnlock(user.id, lessonId, "buy", LESSON_PRICE);
  return { kind: "buy", info: lockInfo(user) };
}
