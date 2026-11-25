import "server-only";
import type { User } from "./auth";
import {
  getLesson,
  getPoints,
  listLessons,
  paidLessonIds,
} from "./db";
import { POINTS_CORRECT } from "./dictation";
import { mergeIntoSentences } from "./subtitles";
import { type LessonAccess, type LockInfo } from "./lesson-lock";

/** Quyền học bài: mọi bài đã đăng đều mở tự do; kim cương chỉ tích điểm cho bảng xếp hạng */

export type LockSettings = { enabled: boolean; free: number[] };

export const lockSettings = (): LockSettings => ({ enabled: false, free: [] });

export function saveLockSettings(_s: LockSettings) {
  void _s;
}

/** Tổng số kim cương tối đa có thể kiếm được từ toàn bộ các bài đã đăng có bật Chính tả */
export function earnableFreePoints(): number {
  return listLessons()
    .filter((l) => l.dictation)
    .reduce((n, l) => n + (l.wordCount ?? 0) * POINTS_CORRECT, 0);
}

/** Bài ẩn (bản nháp) chỉ admin xem được, trừ người từng mở trước đây; bài riêng chỉ chủ bài (và admin) xem */
export function canViewLesson(user: User | null, lesson: { id: number; published: boolean; ownerId?: number | null }): boolean {
  if (lesson.ownerId) return !!user && (user.id === lesson.ownerId || user.role === "admin");
  return lesson.published || user?.role === "admin" || (!!user && paidLessonIds(user.id).has(lesson.id));
}

/** Danh sách bài của 1 người: bài đã đăng + bài ẩn người này từng mở */
export function lessonsFor(userId: number | null) {
  const paid = userId === null ? new Set<number>() : paidLessonIds(userId);
  return listLessons({ includeDrafts: true }).filter((l) => l.published || paid.has(l.id));
}

/**
 * Câu idx (sau khi gộp, như màn học) của bài có bật Chính tả mà người này được xem — null = không có. Để server chấm lại trước khi cộng điểm.
 * Bài riêng (tự tạo) không tính kim cương xếp hạng để đảm bảo công bằng trên bảng xếp hạng.
 */
export function dictationSentenceFor(user: User, lessonId: number, idx: number): string | null {
  const l = getLesson(lessonId);
  return l?.dictation && !l.ownerId && canViewLesson(user, l) ? (mergeIntoSentences(l.segments)[idx]?.text ?? null) : null;
}

/** Nguồn này có tính kim cương chính tả không (chỉ bài của site có bật Chính tả — video tự dán / bài riêng thì không) */
export function sourceEarnsPoints(source: string): boolean {
  const [, kind, id] = source.split("/");
  if (kind !== "lesson" || !/^\d+$/.test(id)) return false;
  const l = getLesson(Number(id));
  return !!l?.dictation && !l.ownerId;
}

/** Mọi bài đã đăng đều mở ("open") */
export function accessOf(_user: User | null): (lessonId: number) => LessonAccess {
  void _user;
  return () => "open";
}

export function lockInfo(user: User | null): LockInfo {
  return {
    enabled: false,
    loggedIn: !!user,
    picksLeft: 0,
    price: 0,
    points: user ? getPoints(user.id).total : 0,
  };
}

export function lockedLessonOfVideo(_user: User | null, _videoId: string): { id: number; slug: string } | null {
  void _user;
  void _videoId;
  return null;
}

export function lockedSource(_user: User | null, _source: string): boolean {
  void _user;
  void _source;
  return false;
}

export function unlockLesson(user: User, lessonId: number, _expected?: unknown): { error: string; status: number } | { kind: "pick" | "buy" | null; info: LockInfo } {
  void _expected;
  const lesson = getLesson(lessonId);
  if (!lesson || !lesson.published) return { error: "Không tìm thấy bài học", status: 404 };
  return { kind: null, info: lockInfo(user) };
}
