/**
 * Khoá bài học (admin bật trong Cài đặt): khách chỉ học được FREE_LESSONS bài admin chọn; người đã đăng nhập chọn thêm
 * FREE_PICKS bài bất kỳ, sau đó mỗi bài mở khoá tốn LESSON_PRICE kim cương (điểm chính tả). Dùng được cả trình duyệt lẫn server.
 */

export const FREE_LESSONS = 2; // số bài miễn phí admin chọn (tối đa)
export const FREE_PICKS = 2; // số bài người dùng mới được tự chọn mở miễn phí
export const LESSON_PRICE = 1000; // kim cương / bài sau khi hết lượt chọn

/** open = không khoá (chưa bật khoá / admin) · free = bài miễn phí · unlocked = người này đã mở · locked = chưa mở */
export type LessonAccess = "open" | "free" | "unlocked" | "locked";

/** Tình trạng khoá bài của người đang xem — enabled = false thì mọi bài đều mở */
export type LockInfo = { enabled: boolean; loggedIn: boolean; picksLeft: number; price: number; points: number };
