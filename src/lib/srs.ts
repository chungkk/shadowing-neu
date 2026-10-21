/** Lặp lại ngắt quãng cho sổ từ vựng — dùng được cả server lẫn trình duyệt */

/** Khoảng cách (ngày) tới lần ôn sau khi đạt mức nhớ tương ứng (chỉ số = mức) */
export const SRS_INTERVALS = [0, 1, 3, 7, 14, 30, 60, 120, 240];
export const SRS_MAX_STAGE = SRS_INTERVALS.length - 1;

/** Từ đã ôn ít nhất 1 lần và tới hạn ôn lại */
export const isDue = (v: { stage: number; dueAt: number | null }, now: number) => v.stage > 0 && v.dueAt != null && v.dueAt <= now;

export function stageInfo(stage: number): { label: string; color: string } {
  if (stage === 0) return { label: "Mới", color: "text-muted" };
  if (stage <= 2) return { label: "Đang học", color: "text-red-400" };
  if (stage <= 4) return { label: "Khá nhớ", color: "text-amber" };
  return { label: "Thuộc lâu", color: "text-accent" };
}
