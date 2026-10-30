import type { DictResult } from "./api";

export const ROUND_MIN = 5;
export const ROUND_MAX = 10;

const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;
const shuffle = <T,>(a: T[]) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * Chọn ngẫu nhiên 5–10 câu cho 1 lượt chính tả, xếp theo thứ tự trong video.
 * Chỉ lấy câu chưa làm (`done`) → các lượt nối tiếp nhau dần phủ hết bài; [] = đã làm hết.
 * Ưu tiên câu dài vừa phải (4–25 từ): câu quá ngắn ("Ja.") chép không có gì để luyện, câu quá dài dễ nản.
 */
export function pickDictation(texts: string[], done: Record<number, DictResult>): number[] {
  const left = texts.flatMap((_, i) => (done[i] ? [] : [i]));
  const fits = (i: number) => {
    const n = wordCount(texts[i]);
    return n >= 4 && n <= 25;
  };
  const size = ROUND_MIN + Math.floor(Math.random() * (ROUND_MAX - ROUND_MIN + 1));
  return [...shuffle(left.filter(fits)), ...shuffle(left.filter((i) => !fits(i)))].slice(0, size).sort((a, b) => a - b);
}
