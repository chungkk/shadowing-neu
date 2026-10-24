/** Lặp lại ngắt quãng cho sổ từ vựng — dùng được cả server lẫn trình duyệt / app */

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

/**
 * Kết quả 1 lần ôn: again (quên / không nói được) · hard (nhớ một phần / nói ngập ngừng) · good · easy (nhớ ngay, nói trôi chảy).
 * Kiểu Duolingo chỉ có đúng / sai → good / again.
 */
export type Grade = "again" | "hard" | "good" | "easy";
export const GRADES: readonly Grade[] = ["again", "hard", "good", "easy"];

/** Tự đánh giá (Crazy Deutsch): nhớ 0 không nhớ · 1 một phần · 2 nhớ sau khi nghĩ · 3 nhớ ngay */
export type RecallLevel = 0 | 1 | 2 | 3;
/** Tự đánh giá: nói 0 không nói được / sai nhiều · 1 ngập ngừng · 2 trôi chảy, khá chính xác */
export type SpeakLevel = 0 | 1 | 2;

/** Gộp 2 chiều tự đánh giá thành 1 kết quả để xếp lịch */
export function gradeOf(recall: RecallLevel, speaking: SpeakLevel): Grade {
  if (recall === 0 || speaking === 0) return "again";
  if (recall === 1 || speaking === 1) return "hard";
  return recall === 3 && speaking === 2 ? "easy" : "good";
}

const DAY = 86_400_000;
const HOUR = 3_600_000;
/** Mục mới mà lần đầu chưa nhớ / còn khó → ôn lại sau vài giờ (trong ngày), không đợi tới mai */
export const RELEARN_HOURS = 8;

/**
 * Lịch ôn sau 1 lần chấm:
 * - again: tụt về nửa mức cũ, ôn lại ngày mai (tính 1 lần quên).
 * - hard: giữ mức, hẹn gần hơn (nửa khoảng cách, ít nhất 1 ngày).
 * - good: lên 1 mức. easy: lên 1 mức, khoảng cách ×1,5 (vẫn kiểm tra lại, không nhảy cóc).
 * Mục mới (mức 0): again / hard → mức 1, ôn lại sau RELEARN_HOURS giờ; chưa học thì không tính là quên.
 * Ôn sớm khi chưa tới hạn: không quên → giữ nguyên lịch; quên → giữ mức, kéo hạn ôn về sớm nhất là ngày mai
 * (không phạt tụt mức vì ôn thêm — lần ôn đúng hạn mới quyết định lên / xuống).
 */
export function nextSchedule(
  cur: { stage: number; dueAt: number | null },
  grade: Grade,
  now: number,
): { stage: number; dueAt: number; lapse: boolean } {
  const day1 = now + DAY - 4 * HOUR;
  if (cur.stage > 0 && cur.dueAt != null && cur.dueAt > now)
    return { stage: cur.stage, dueAt: grade === "again" ? Math.min(cur.dueAt, day1) : cur.dueAt, lapse: false };
  if (cur.stage === 0 && (grade === "again" || grade === "hard")) return { stage: 1, dueAt: now + RELEARN_HOURS * HOUR, lapse: false };
  const stage =
    grade === "again"
      ? Math.max(1, Math.floor(cur.stage / 2))
      : grade === "hard"
        ? Math.max(1, cur.stage)
        : Math.min(cur.stage + 1, SRS_MAX_STAGE);
  const days = SRS_INTERVALS[stage] * (grade === "hard" ? 0.5 : grade === "easy" ? 1.5 : 1);
  // Trừ vài giờ để hôm sau ôn sớm hơn giờ hôm nay một chút vẫn tính là tới hạn
  return { stage, dueAt: now + Math.max(1, days) * DAY - 4 * HOUR, lapse: grade === "again" };
}

/**
 * Trạng thái thành thạo — suy ra từ lịch sử ôn, không từ tự khai báo:
 * saved: đã lưu, chưa ôn · learning: còn cần gợi ý · active: tự nhớ được qua vài lần ôn cách quãng ·
 * mastered: mức cao VÀ từng nhớ lại đúng sau khoảng cách ≥ 14 ngày ở dạng bài không tự khai báo (`proven`).
 */
export type Mastery = "saved" | "learning" | "active" | "mastered";
export const MASTERY_GAP_DAYS = 14;
export function masteryOf(stage: number, proven: boolean): Mastery {
  if (stage === 0) return "saved";
  if (stage <= 2) return "learning";
  return stage >= 5 && proven ? "mastered" : "active";
}
