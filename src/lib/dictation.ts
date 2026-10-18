/**
 * Chấm bài nghe chép chính tả — TypeScript thuần (không phụ thuộc React/Next),
 * dùng chung cho web và app di động.
 */

export type DictationLevel = "easy" | "normal" | "hard";

export type WordState =
  | "correct" // gõ đúng
  | "close" // sai 1–2 ký tự (lỗi gõ)
  | "wrong" // gõ từ khác
  | "missing" // chưa gõ / bỏ sót
  | "revealed"; // người học bấm xem (tính là lỗi)

export type CheckedWord = { text: string; state: WordState; typed?: string };

export type CheckResult = {
  words: CheckedWord[];
  extra: string[]; // từ gõ thừa
  correct: number; // số từ đúng (không tính từ đã xem)
  total: number;
  done: boolean; // mọi từ đều đúng / đã xem
};

/** "Größe," → "groesse": bỏ dấu câu, chữ thường, ä/ö/ü/ß ↔ ae/oe/ue/ss */
export function normalizeWord(w: string): string {
  return w
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

/** Tách câu thành các từ (bỏ dấu câu đứng riêng như "–") */
export function splitWords(text: string): string[] {
  return text.split(/\s+/).filter((w) => normalizeWord(w));
}

function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

/** Gần đúng: sai 1 ký tự (từ ≥ 4 chữ) hoặc 2 ký tự (từ ≥ 8 chữ) */
function isClose(ref: string, typed: string): boolean {
  if (ref.length < 4) return false;
  return editDistance(ref, typed) <= (ref.length >= 8 ? 2 : 1);
}

/**
 * So câu gốc với câu người học gõ. Ghép từ theo thứ tự (quy hoạch động, như diff):
 * gõ thiếu / thừa / sai một từ không làm lệch các từ phía sau.
 */
export function checkDictation(reference: string, input: string, revealed: ReadonlySet<number> = new Set()): CheckResult {
  const ref = splitWords(reference);
  const typed = splitWords(input);
  const a = ref.map(normalizeWord);
  const b = typed.map(normalizeWord);
  const n = a.length;
  const m = b.length;

  // điểm ghép: đúng 2, gần đúng 1 (ưu tiên ghép nhiều từ đúng nhất)
  const score = (i: number, j: number) => (a[i] === b[j] ? 2 : isClose(a[i], b[j]) ? 1 : 0);
  const dp = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      const s = score(i, j);
      dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1], s ? dp[i + 1][j + 1] + s : 0);
    }
  }

  // Lần theo bảng để lấy các cặp (từ gốc, từ gõ) khớp nhau
  const words: CheckedWord[] = ref.map((text) => ({ text, state: "missing" }));
  const pairs: [number, number][] = [];
  for (let i = 0, j = 0; i < n && j < m; ) {
    const s = score(i, j);
    if (s && dp[i][j] === dp[i + 1][j + 1] + s) {
      words[i] = { text: ref[i], state: s === 2 ? "correct" : "close", typed: typed[j] };
      pairs.push([i, j]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }

  // Giữa 2 cặp khớp: từ gốc còn trống + từ gõ chưa dùng → ghép lần lượt thành "gõ sai", dư ra là "thừa"
  const extra: string[] = [];
  const bounds: [number, number][] = [[-1, -1], ...pairs, [n, m]];
  for (let k = 0; k < bounds.length - 1; k++) {
    const [i0, j0] = bounds[k];
    const [i1, j1] = bounds[k + 1];
    const gapTyped = typed.slice(j0 + 1, j1);
    for (let i = i0 + 1; i < i1 && gapTyped.length; i++) {
      words[i] = { text: ref[i], state: "wrong", typed: gapTyped.shift() };
    }
    extra.push(...gapTyped);
  }

  revealed.forEach((k) => {
    if (words[k] && words[k].state !== "correct") words[k] = { text: words[k].text, state: "revealed" };
  });
  const correct = words.filter((w) => w.state === "correct").length;
  return {
    words,
    extra,
    correct,
    total: n,
    done: n > 0 && !extra.length && words.every((w) => w.state === "correct" || w.state === "revealed"),
  };
}

/** Gợi ý cho 1 từ chưa đoán được: Dễ "G____", Vừa "*****", Khó "" */
export function hintFor(word: string, level: DictationLevel): string {
  const core = word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
  if (level === "hard") return "";
  if (level === "normal") return "*".repeat(core.length);
  return core[0] + "_".repeat(Math.max(core.length - 1, 0));
}
