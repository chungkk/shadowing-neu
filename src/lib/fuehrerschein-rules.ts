// Kiểu dữ liệu + luật chấm của tab Lái xe, dùng chung server + trình duyệt (giống utils/examRules.ts của app)

export const LANGS = ["vi", "en", "ar", "zh", "ru"] as const;
export type Lang = (typeof LANGS)[number];
export const LANG_NAMES: Record<Lang, string> = { vi: "Tiếng Việt", en: "English", ar: "العربية", zh: "中文", ru: "Русский" };
export const isLang = (v: unknown): v is Lang => (LANGS as readonly unknown[]).includes(v);

/** Bản dịch 1 câu: câu hỏi, từng lựa chọn (theo thứ tự gốc), giải thích */
export type Tr = { q: string; o: string[]; c: string };

/** Câu hỏi gửi xuống trình duyệt */
export type DrivingQ = {
  id: string;
  chapter: string;
  points: number;
  /** Phần cơ bản (1.x) — còn lại là phần riêng của hạng */
  grund: boolean;
  q: string;
  /** Phần đầu chung của các đáp án ("Wegen des …") */
  stem: string | null;
  /** Rỗng = câu điền số (đáp án là answer[0]) */
  options: { key: string; text: string }[];
  /** Câu điền số: chữ trước ô nhập / đơn vị sau ô nhập */
  num?: { pre?: string; unit?: string } | null;
  answer: string[];
  explain: string;
  images: string[];
  /** images[i] là hình của lựa chọn i (câu biển báo) */
  optionImages: boolean;
  /** Câu video: khung hình hiện ở bước trả lời */
  poster: string | null;
  video: string | null;
  tr: Tr | null;
  /** Thứ tự hiện lựa chọn (chỉ số trong options): bộ đề gốc luôn để đáp án đúng lên đầu nên phải xáo */
  order: number[];
};

export type FailReason = "tooManyErrors" | "twoFivePointErrors";
export type ExamResult = { correct: number; total: number; errorPoints: number; fiveWrong: number; passed: boolean; failReason: FailReason | null };
export type ExamConfig = { questions: number; grundstoff: number; maxErrorPoints: number; minutes: number };

type Gradable = { id: string; points: number; options: unknown[]; answer: string[] };

const normalizeNumber = (s: string) => s.trim().replace(",", ".").replace(/\.0+$/, "");

/** Đúng khi chọn đúng đủ mọi đáp án (không thừa, không thiếu) / điền đúng số */
export function isRight(q: Pick<Gradable, "options" | "answer">, picked: string[] | undefined): boolean {
  const p = picked ?? [];
  if (!q.options.length) return !!p[0] && normalizeNumber(p[0]) === normalizeNumber(q.answer[0] ?? "");
  return p.length === q.answer.length && q.answer.every((a) => p.includes(a));
}

/** Luật thi thật: trượt khi điểm lỗi vượt mức của hạng (10; Mofa 7) hoặc sai từ 2 câu 5 điểm. Câu bỏ trống = sai */
export function grade(qs: Gradable[], picked: Record<string, string[]>, maxErrorPoints: number): ExamResult {
  let correct = 0;
  let errorPoints = 0;
  let fiveWrong = 0;
  for (const q of qs) {
    if (isRight(q, picked[q.id])) correct++;
    else {
      errorPoints += q.points;
      if (q.points === 5) fiveWrong++;
    }
  }
  const failReason: FailReason | null = errorPoints > maxErrorPoints ? "tooManyErrors" : fiveWrong >= 2 ? "twoFivePointErrors" : null;
  return { correct, total: qs.length, errorPoints, fiveWrong, passed: !failReason, failReason };
}

export const FAIL_TEXT: Record<FailReason, string> = {
  tooManyErrors: "Quá số điểm lỗi cho phép",
  twoFivePointErrors: "Sai từ 2 câu 5 điểm",
};

export function formatDuration(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Bài thi đã lưu */
export type ExamRecord = {
  id: number;
  kind: "random" | "bogen";
  ref: string;
  cls: string;
  correct: number;
  total: number;
  errorPoints: number;
  maxErrorPoints: number;
  passed: boolean;
  failReason: FailReason | null;
  durationS: number;
  at: number;
};

export type ExamAnswer = { qid: string; picked: string[]; order: number[] };
