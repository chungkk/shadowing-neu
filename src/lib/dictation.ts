/**
 * Chấm bài nghe chép chính tả — TypeScript thuần (không phụ thuộc React/Next),
 * dùng chung cho web và app di động.
 */

export type DictationLevel = "cloze" | "easy" | "hard";

/** Chuẩn hoá mức chính tả (giá trị cũ "normal" hoặc lạ → fallback "easy") */
export function normalizeDictLevel(v: unknown, fallback: DictationLevel = "easy"): DictationLevel {
  return v === "cloze" || v === "easy" || v === "hard" ? v : fallback;
}

/**
 * Điểm chính tả: gõ đúng 1 từ → +1 cơ bản, đúng liên tiếp được thưởng chuỗi (3–4: +2/từ, 5–9: +3/từ, 10+: +4/từ),
 * sai / bỏ dở từ sai / bấm xem gợi ý → chuỗi về 0; mỗi từ bấm xem → −2. Mỗi từ của câu chỉ được tính điểm 1 lần.
 */
export const POINTS_CORRECT = 1;
export const POINTS_HINT = 2;

/** Điểm kim cương cho từ đúng thứ `streak` liên tiếp (streak ≥ 1): 1–2 → +1, 3–4 → +2, 5–9 → +3, 10+ → +4 */
export function comboPoints(streak: number): number {
  if (streak >= 10) return 4;
  if (streak >= 5) return 3;
  if (streak >= 3) return 2;
  return POINTS_CORRECT;
}

/** Tổng điểm khi nối tiếp `count` từ đúng mới kể từ chuỗi `baseStreak` hiện tại */
export function comboGain(baseStreak: number, count: number): number {
  let sum = 0;
  for (let k = 1; k <= count; k++) sum += comboPoints(baseStreak + k);
  return sum;
}

export type WordState =
  | "correct" // gõ đúng
  | "close" // sai 1–2 ký tự (lỗi gõ)
  | "wrong" // gõ từ khác
  | "missing" // chưa gõ / bỏ sót
  | "revealed" // người học bấm xem (tính là lỗi)
  | "given"; // từ hiện sẵn (từ đầu câu, hoặc ~40% từ giữ lại ở chế độ Điền từ): không phải chép, không tính điểm, không tính lỗi

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

/**
 * Tách câu thành các từ (bỏ dấu câu đứng riêng như "–"). Từ nối gạch tách thành từng phần, gạch giữ ở phần trước:
 * "20-Liter-Challenge" → "20-", "Liter-", "Challenge" — gạch nối không nghe được nên chép "20 Liter Challenge" là đúng.
 * `group`: các phần của cùng một từ nối gạch chung một số.
 */
function splitTokens(text: string): { text: string; group: number }[] {
  return text
    .split(/\s+/)
    .flatMap((w, group) => w.split(/(?<=[-‐‑])/).map((part) => ({ text: part, group })))
    .filter((t) => normalizeWord(t.text));
}

export function splitWords(text: string): string[] {
  return splitTokens(text).map((t) => t.text);
}

/**
 * Các vị trí từ hiện sẵn (không phải chép, không tính điểm):
 * - Câu ≤ 1 từ: không hiện sẵn từ nào (vẫn phải chép).
 * - Dễ / Khó: chỉ hiện từ đầu câu (index 0).
 * - Điền từ ("cloze"): hiện từ đầu câu + giữ lại ~40% từ (ẩn ~60% còn lại), chia đều theo từng đoạn của câu,
 *   tất định theo nội dung câu để web / app / server chấm điểm khớp nhau 100%.
 */
export function givenWordIndices(reference: string, level: DictationLevel = "easy"): Set<number> {
  const n = splitWords(reference).length;
  if (n <= 1) return new Set();
  const given = new Set<number>([0]);
  if (level !== "cloze") return given;

  const hiddenCount = Math.min(n - 1, Math.max(1, Math.round(n * 0.6)));
  const extraGiven = n - 1 - hiddenCount;
  if (extraGiven <= 0) return given;

  // FNV-1a 32-bit hash từ nội dung câu
  let h = 2166136261;
  for (let i = 0; i < reference.length; i++) {
    h ^= reference.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }

  const pool = n - 1; // các vị trí 1..n-1
  for (let b = 0; b < extraGiven; b++) {
    let lo = 1 + Math.floor((b * pool) / extraGiven);
    const hi = 1 + Math.floor(((b + 1) * pool) / extraGiven) - 1;
    // Tránh để 2 từ đầu câu (0 và 1) hiện liền nhau khi bucket đầu có thể chọn từ vị trí 2
    if (b === 0 && lo === 1 && hi > lo) lo = 2;
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    given.add(lo + ((h >>> 0) % (hi - lo + 1)));
  }
  return given;
}

/** Số từ phải chép của 1 câu (bỏ qua các từ hiện sẵn theo mức độ) */
export function dictationWordCount(text: string, level: DictationLevel = "easy"): number {
  const n = splitWords(text).length;
  return n - givenWordIndices(text, level).size;
}

/** Câu có chữ / số để chép — câu chỉ gồm ký hiệu ("♪ ♪", "…") không chép được, không bao giờ "xong" */
export const hasWords = (text: string) => splitTokens(text).length > 0;

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
  const refTok = splitTokens(reference);
  const typedTok = splitTokens(input);
  const ref = refTok.map((t) => t.text);
  const typed = typedTok.map((t) => t.text);
  const a = ref.map(normalizeWord);
  const b = typed.map(normalizeWord);
  const n = a.length;
  const m = b.length;

  // Một bước ghép: di từ gốc ↔ dj từ gõ. Thường là 1 ↔ 1; với từ nối gạch còn cho ghép cả cụm phần với 1 từ gõ liền
  // ("20-Liter-Challenge" ↔ "20literchallenge") và ngược lại. Điểm: mỗi từ gốc đúng 2, gần đúng 1.
  type Move = { di: number; dj: number; s: number };
  const moves = (i: number, j: number): Move[] => {
    const out: Move[] = [];
    const add = (di: number, dj: number) => {
      const x = a.slice(i, i + di).join("");
      const y = b.slice(j, j + dj).join("");
      const s = x === y ? 2 : isClose(x, y) ? 1 : 0;
      if (s) out.push({ di, dj, s: s * di });
    };
    add(1, 1);
    for (let k = i + 1; k < n && refTok[k].group === refTok[i].group; k++) add(k - i + 1, 1);
    for (let k = j + 1; k < m && typedTok[k].group === typedTok[j].group; k++) add(1, k - j + 1);
    return out;
  };

  // Quy hoạch động: tối đa điểm ghép (ưu tiên ghép nhiều từ đúng nhất)
  const dp = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1], ...moves(i, j).map((mv) => dp[i + mv.di][j + mv.dj] + mv.s));
    }
  }

  // Lần theo bảng để lấy các đoạn (từ gốc, từ gõ) khớp nhau
  const words: CheckedWord[] = ref.map((text) => ({ text, state: "missing" }));
  const matched: { i: number; j: number; di: number; dj: number }[] = [];
  for (let i = 0, j = 0; i < n && j < m; ) {
    const mv = moves(i, j).find((mv) => dp[i][j] === dp[i + mv.di][j + mv.dj] + mv.s);
    if (mv) {
      const state = mv.s === 2 * mv.di ? "correct" : "close";
      const t = typed.slice(j, j + mv.dj).join("");
      for (let k = i; k < i + mv.di; k++) words[k] = { text: ref[k], state, typed: t };
      matched.push({ i, j, ...mv });
      i += mv.di;
      j += mv.dj;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }

  // Giữa 2 đoạn khớp: từ gốc còn trống + từ gõ chưa dùng → ghép lần lượt thành "gõ sai", dư ra là "thừa"
  const extra: string[] = [];
  let pi = 0;
  let pj = 0;
  for (const mv of [...matched, { i: n, j: m, di: 0, dj: 0 }]) {
    const gapTyped = typed.slice(pj, mv.j);
    for (let i = pi; i < mv.i && gapTyped.length; i++) {
      words[i] = { text: ref[i], state: "wrong", typed: gapTyped.shift() };
    }
    extra.push(...gapTyped);
    pi = mv.i + mv.di;
    pj = mv.j + mv.dj;
  }

  // Từ đã xem luôn tính là lỗi, kể cả khi gõ lại đúng sau đó (xem rồi chép lại không được điểm)
  revealed.forEach((k) => {
    if (words[k]) words[k] = { text: words[k].text, state: "revealed" };
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

/** Chuỗi `input` (mỗi ô cách nhau đúng 1 dấu cách, ô trống vẫn giữ chỗ) → các ô theo từng từ của câu */
export function slotsFromInput(reference: string, input: string): string[] {
  const parts = input.split(" ");
  return splitWords(reference).map((_, k) => parts[k] ?? "");
}

/**
 * Chấm theo từng ô: mỗi ô chỉ so với đúng từ ở vị trí đó. Ô nằm sẵn theo từ nên không có từ thừa.
 * Các từ hiện sẵn theo mức độ (`givenWordIndices`) không phải chép và không nằm trong `total`.
 */
export function checkSlots(
  reference: string,
  slots: readonly string[],
  revealed: ReadonlySet<number> = new Set(),
  level: DictationLevel = "easy",
): CheckResult {
  const given = givenWordIndices(reference, level);
  const words = splitWords(reference).map((text, k): CheckedWord => {
    if (given.has(k)) return { text, state: "given" };
    if (revealed.has(k)) return { text, state: "revealed" };
    const typed = slots[k] ?? "";
    const a = normalizeWord(text);
    const b = normalizeWord(typed);
    if (!b) return { text, state: "missing" };
    return { text, typed, state: a === b ? "correct" : isClose(a, b) ? "close" : "wrong" };
  });
  return {
    words,
    extra: [],
    correct: words.filter((w) => w.state === "correct").length,
    total: words.filter((w) => w.state !== "given").length,
    done: words.length > 0 && words.every((w) => !isOpenWord(w)),
  };
}

export const isOpenWord = (w: CheckedWord) => w.state !== "correct" && w.state !== "revealed" && w.state !== "given";

/** Bản nháp hiện tại có ô nào đã gõ chữ nhưng chưa đúng không (rời câu lúc này tính là bỏ dở từ sai → đứt chuỗi) */
export function hasWrongSlot(
  reference: string,
  slots: readonly string[],
  revealed: ReadonlySet<number> = new Set(),
  level: DictationLevel = "easy",
): boolean {
  const r = checkSlots(reference, slots, revealed, level);
  return r.words.some((w, k) => !!slots[k] && isOpenWord(w));
}

/** Ô chưa xong gần nhất theo hướng dir (hết thì quay vòng); không còn ô nào → giữ nguyên */
export function nextOpenSlot(words: CheckedWord[], from: number, dir: 1 | -1 = 1): number {
  const n = words.length;
  for (let i = 1; i <= n; i++) {
    const k = (from + dir * i + n * 2) % n;
    if (isOpenWord(words[k])) return k;
  }
  return from;
}

/**
 * Chữ đang gõ thuộc ô nào. Không có Space để bỏ qua từ: gõ trọn một từ ngay phía sau (mà không phải đang gõ dở từ hiện tại)
 * → coi như đã bỏ sót các từ giữa, chữ vào đúng ô đó.
 */
export function slotForTyped(words: CheckedWord[], active: number, value: string): number {
  const typed = normalizeWord(value);
  if (!typed || normalizeWord(words[active].text).startsWith(typed)) return active;
  for (let k = active + 1; k <= active + 3 && k < words.length; k++) {
    if (isOpenWord(words[k]) && normalizeWord(words[k].text) === typed) return k;
  }
  return active;
}

/** Gợi ý cho 1 từ chưa đoán được: Dễ "G____", Điền từ & Khó "" */
export function hintFor(word: string, level: DictationLevel): string {
  if (level !== "easy") return "";
  const core = word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
  return core ? core[0] + "_".repeat(Math.max(core.length - 1, 0)) : "";
}

// ---- Lượt chính tả: lần lượt từ đầu đến cuối bài ----

/**
 * Các câu cho lượt chính tả: mọi câu chưa làm (`done`) và có chữ để chép, theo thứ tự trong video; [] = đã làm hết.
 */
export function pickDictation(texts: string[], done: Record<number, { correct: number; total: number }>): number[] {
  return texts.flatMap((t, i) => (done[i] || !hasWords(t) ? [] : [i]));
}
