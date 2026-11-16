import type { ClassId } from "./fuehrerschein";

// Hằng số nhẹ cho store.ts / reminders.ts — KHÔNG import file câu hỏi (questions.json 2,5 MB) để mở app nhanh:
// root layout → ReminderSync → store chỉ cần kiểm tra hạng / bang hợp lệ. fuehrerschein.ts / lid.ts kiểm tra
// (bản dev) danh sách này khớp với dữ liệu thật.

export const CLASS_IDS: readonly ClassId[] = ["B", "A", "A2", "A1", "AM", "Mofa", "C", "CE", "C1", "D", "D1", "L", "T"] as ClassId[];
export const DEFAULT_CLASS: ClassId = "B";
export const isClassId = (v: unknown): v is ClassId => (CLASS_IDS as unknown[]).includes(v);

export const STATE_CODES: readonly string[] = ["bw", "by", "be", "bb", "hb", "hh", "he", "mv", "ni", "nw", "rp", "sl", "sn", "st", "sh", "th"];
export const DEFAULT_STATE = "be";
export const isStateCode = (v: unknown): v is string => typeof v === "string" && STATE_CODES.includes(v);
