import "server-only";
import { getStats, listProgress } from "./db";
import type { AccountStatsData } from "@/components/AccountStats";

/** Số liệu của khối Thành tích (trang /stats và /settings dùng chung) */
export function accountStats(userId: number): AccountStatsData {
  // Múi giờ chỉ ảnh hưởng "hôm nay" / chuỗi ngày — AccountStats tự tải lại theo giờ máy
  const s = getStats(userId, 0);
  const progress = listProgress(userId);
  return {
    points: s.points.total,
    words: Object.values(s.mastery).reduce((a, b) => a + b, 0),
    mastered: s.mastery.mastered,
    due: s.dueToday,
    lessons: progress.length,
    sentences: progress.reduce((n, p) => n + Object.keys(p.dictDone).length, 0),
  };
}
