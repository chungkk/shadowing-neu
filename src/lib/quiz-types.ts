// Kiểu dữ liệu câu trắc nghiệm dùng chung cho tab Lái xe và Leben in Deutschland (server + trình duyệt)

export type QuizOption = { key: string; text: string; textVi: string };

export type QuizQuestion = {
  id: string;
  q: string;
  qVi: string;
  /** Rỗng = câu điền số (đáp án là answer[0]) */
  options: QuizOption[];
  /** Các key đúng (lái xe có thể nhiều đáp án đúng) */
  answer: string[];
  explain?: string;
  explainVi?: string;
  /** Ảnh câu hỏi; câu lái xe có 3 ảnh = 3 lựa chọn bằng hình */
  images?: string[];
  video?: string | null;
  /** Điểm lỗi khi sai (lái xe: 2–5) */
  points?: number;
  /** Nhãn nhỏ phía trên câu: số câu / chương */
  label?: string;
};

export type QuizStat = { correct: number; wrong: number; lastOk: boolean };

/** Câu trả lời có đúng không: chọn đúng đủ mọi đáp án (lái xe) / điền đúng số */
export function isCorrect(q: QuizQuestion, picked: string[]): boolean {
  if (!q.options.length) return normalizeNumber(picked[0] ?? "") === normalizeNumber(q.answer[0] ?? "");
  return picked.length === q.answer.length && q.answer.every((a) => picked.includes(a));
}

const normalizeNumber = (s: string) => s.trim().replace(",", ".").replace(/\.0+$/, "");

/** Thống kê 1 nhóm câu: đã làm / đang đúng / đang sai */
export function summarize(ids: string[], stats: Record<string, QuizStat>) {
  let done = 0;
  let ok = 0;
  for (const id of ids) {
    const s = stats[id];
    if (!s) continue;
    done++;
    if (s.lastOk) ok++;
  }
  return { total: ids.length, done, ok, wrong: done - ok };
}
