/**
 * Cụm từ cố định (Redewendung, feste Wendung, Funktionsverbgefüge…) AI tìm thấy trong 1 câu phụ đề.
 * TypeScript thuần (không phụ thuộc React/Next) — dùng chung cho server, web và app di động.
 */

export type Phrase = {
  parts: string[]; // các phần đúng như trong câu (cụm bị tách thì nhiều phần): ["uns", "auf die Lauer legen"]
  base: string; // dạng từ điển: "sich auf die Lauer legen"
  meaning: string; // nghĩa ngắn theo ngôn ngữ giao diện
};

const isWordChar = (c: string | undefined) => !!c && /[\p{L}\p{N}]/u.test(c);

/**
 * Vị trí [đầu, cuối) của từng phần trong câu: không phân biệt hoa thường, phải trọn từ, các phần không chồng nhau.
 * Có phần không tìm thấy → null (AI "bịa" hoặc chép sai chữ).
 */
export function locatePhrase(sentence: string, parts: string[]): [number, number][] | null {
  const lower = sentence.toLowerCase();
  const ranges: [number, number][] = [];
  for (const raw of parts) {
    const p = raw.trim().toLowerCase();
    if (!p) return null;
    let at = lower.indexOf(p);
    while (
      at >= 0 &&
      (isWordChar(lower[at - 1]) ||
        isWordChar(lower[at + p.length]) ||
        ranges.some(([s, e]) => at < e && at + p.length > s))
    ) {
      at = lower.indexOf(p, at + 1);
    }
    if (at < 0) return null;
    ranges.push([at, at + p.length]);
  }
  return ranges;
}

/** Tách câu thành các từ (theo khoảng trắng) kèm chỉ số cụm từ chứa từ đó (-1 = không thuộc cụm nào) */
export function tokenize(sentence: string, phrases: Phrase[]): { word: string; phrase: number }[] {
  const located = phrases.map((p) => locatePhrase(sentence, p.parts) ?? []);
  return [...sentence.matchAll(/\S+/g)].map((m) => {
    const s = m.index ?? 0;
    const e = s + m[0].length;
    return { word: m[0], phrase: located.findIndex((ranges) => ranges.some(([a, b]) => a < e && b > s)) };
  });
}
