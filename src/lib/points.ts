/**
 * Báo cho huy hiệu điểm trên thanh trên cùng (PointsBadge) — chạy trên trình duyệt.
 * delta + from: vừa được điểm → kim cương bay từ `from` (toạ độ màn hình) vào huy hiệu rồi số mới tăng.
 * total: số điểm thật từ server (sửa lại nếu số tạm tính lệch, vd. câu đã được tính điểm trên máy khác).
 */
export type PointsEvent = { delta?: number; total?: number; from?: { x: number; y: number } };

export const POINTS_EVENT = "points";

export const emitPoints = (detail: PointsEvent) => window.dispatchEvent(new CustomEvent<PointsEvent>(POINTS_EVENT, { detail }));
