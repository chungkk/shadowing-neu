/**
 * Học 1 chủ đề trong bộ từ (Đoán từ · Thẻ lật · Trắc nghiệm · Nghe viết) — TypeScript thuần, dùng chung cho web và app.
 * Trả lời đúng / bấm "Đã thuộc" → từ được thêm vào sổ (ôn tiếp theo lịch SRS) và tính là đã học trong bộ;
 * tiến độ chủ đề = số từ đã học (từ có sẵn trong sổ từ nơi khác vẫn được học).
 */

import { checkTyped, findWord, shuffle } from "./review";

/** Phần của 1 từ trong bộ mà màn học cần (DeckWord của server / app đều khớp) */
export type StudyWord = { word: string; gender: string; plural: string; meaning: string; example: string };

export type StudyMode = "guess" | "flash" | "quiz" | "reverse" | "listen";
export const STUDY_MODES: { mode: StudyMode; label: string }[] = [
  { mode: "guess", label: "Đoán từ" },
  { mode: "flash", label: "Thẻ lật" },
  { mode: "quiz", label: "Trắc nghiệm" },
  { mode: "reverse", label: "Trắc nghiệm ngược" },
  { mode: "listen", label: "Nghe viết" },
];

/** Từ kèm mạo từ (danh từ): "der Hund" */
export const fullWord = (w: StudyWord) => (w.gender === "der" || w.gender === "die" || w.gender === "das" ? `${w.gender} ${w.word}` : w.word);

/**
 * Chấm câu gõ: đúng cả khi thiếu mạo từ / sai hoa thường / gõ ae thay ä; sai 1–2 chữ ở từ dài vẫn tính đúng ("almost").
 * Danh từ gõ sai mạo từ → "article" (đúng từ, sai giống)
 */
export function checkGuess(given: string, w: StudyWord): "ok" | "almost" | "article" | "wrong" {
  const g = given.trim();
  const art = g.match(/^(der|die|das)\s+/i)?.[1].toLowerCase();
  const r = checkTyped(g, w.word);
  if (r === "wrong") return "wrong";
  if (art && (w.gender === "der" || w.gender === "die" || w.gender === "das") && art !== w.gender) return "article";
  return r === "almost" ? "almost" : "ok";
}

/** Gợi ý dần: lộ thêm 1 chữ mỗi lần ("H _ _ d") — n = số chữ đã lộ */
export const hintOf = (w: StudyWord, n: number) =>
  [...w.word].map((c, i) => (i < n || !/\p{L}/u.test(c) ? c : "_")).join(" ");

/**
 * Câu ví dụ với từ cần đoán bị che ("Der ***** bellt."). Động từ chia khác dạng từ điển ("heiße" của "heißen")
 * → tìm từ cùng gốc. Không tìm được → null (câu ví dụ lộ đáp án, chỉ hiện sau khi trả lời)
 */
export function blankExample(w: StudyWord): string | null {
  const text = w.example;
  if (!text) return null;
  const bare = w.word.replace(/^sich /, "");
  const at = [bare, w.plural].map((x) => x && findWord(text, x)).find(Boolean) ?? stemMatch(text, bare);
  return at ? `${text.slice(0, at[0])}*****${text.slice(at[1])}` : null;
}

/** Từ trong câu cùng gốc ≥ 3 chữ với từ cần đoán (động từ / tính từ đã chia) */
function stemMatch(text: string, word: string): [number, number] | null {
  if (/\s/.test(word)) return null;
  const stem = word.toLowerCase().replace(/(en|n|e)$/, "");
  if (stem.length < 3) return null;
  for (const m of text.matchAll(/\p{L}+/gu)) {
    const t = m[0].toLowerCase();
    if (t.startsWith(stem) || (stem.length >= 4 && t.includes(stem.slice(0, -1)))) return [m.index, m.index + m[0].length];
  }
  return null;
}

/** 4 lựa chọn (1 đúng + 3 sai lấy trong cùng chủ đề, thiếu thì lấy cả bộ): reverse = chọn từ tiếng Đức theo nghĩa */
export function quizOptions(w: StudyWord, pool: StudyWord[], reverse: boolean): string[] {
  const label = (x: StudyWord) => (reverse ? fullWord(x) : x.meaning);
  const right = label(w);
  const wrong = [...new Set(shuffle(pool).map(label))].filter((x) => x && x !== right).slice(0, 3);
  return shuffle([right, ...wrong]);
}
