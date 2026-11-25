/**
 * Mọi bài học đã đăng đều mở tự do; kim cương chỉ dùng làm điểm tích luỹ trên bảng xếp hạng.
 * Giữ các hằng số và kiểu dữ liệu để tương thích ngược với API và ứng dụng di động.
 */

export const FREE_PICKS = 0;
export const LESSON_PRICE = 0;
export const OWN_LESSON_PRICE = 0;

/** open = mở tự do · các giá trị còn lại giữ cho kiểu dữ liệu tương thích ngược */
export type LessonAccess = "open" | "free" | "unlocked" | "locked";

/** Tình trạng khoá bài — enabled luôn là false (mọi bài đều mở) */
export type LockInfo = { enabled: boolean; loggedIn: boolean; picksLeft: number; price: number; points: number };
