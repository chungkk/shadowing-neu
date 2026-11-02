/**
 * Báo cho huy hiệu điểm trên thanh trên cùng (PointsBadge) — chạy trên trình duyệt.
 * delta: cộng / trừ vào số đang hiện. earned: delta này là điểm vừa kiếm được → hiện "+N" lấp lánh cạnh kim cương.
 * total: số điểm thật từ server (sửa lại nếu số tạm tính lệch, vd. câu đã được tính điểm trên máy khác).
 */
export type PointsEvent = { delta?: number; total?: number; earned?: boolean };

export const POINTS_EVENT = "points";

export const emitPoints = (detail: PointsEvent) => window.dispatchEvent(new CustomEvent<PointsEvent>(POINTS_EVENT, { detail }));
