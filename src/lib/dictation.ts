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

// ---- So câu nói (nhận dạng giọng nói) với câu gốc ----

const ONES = ["null", "eins", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun", "zehn", "elf", "zwölf", "dreizehn", "vierzehn", "fünfzehn", "sechzehn", "siebzehn", "achtzehn", "neunzehn"];
const TENS = ["", "", "zwanzig", "dreißig", "vierzig", "fünfzig", "sechzig", "siebzig", "achtzig", "neunzig"];

/** Số nguyên → chữ tiếng Đức viết liền: 21 → "einundzwanzig", 2024 → "zweitausendvierundzwanzig" (0 … 999 999) */
export function germanNumber(n: number): string {
  const below100 = (x: number) => (x < 20 ? ONES[x] : (x % 10 ? (x % 10 === 1 ? "ein" : ONES[x % 10]) + "und" : "") + TENS[Math.floor(x / 10)]);
  // Trong số ghép "eins" → "ein" (einhundert, einundzwanzig); nói thường bỏ "ein" đầu: "hundert", "tausend"
  const below1000 = (x: number) => (x >= 100 ? (x >= 200 ? ONES[Math.floor(x / 100)] : "") + "hundert" : "") + (x % 100 ? below100(x % 100) : "");
  if (n < 1000) return n < 100 ? below100(n) : below1000(n);
  const th = Math.floor(n / 1000);
  return (th === 1 ? "" : th < 100 ? below100(th).replace(/eins$/, "ein") : below1000(th).replace(/eins$/, "ein")) + "tausend" + (n % 1000 ? below1000(n % 1000) : "");
}

/** Chữ viết tắt hay gặp → dạng đọc ra (máy nhận dạng có lúc viết tắt, có lúc viết đủ) */
const SPOKEN: [RegExp, string][] = [
  [/\bz\.\s?B\./gi, "zum Beispiel"],
  [/\bd\.\s?h\./gi, "das heißt"],
  [/\bu\.\s?a\./gi, "unter anderem"],
  [/\busw\./gi, "und so weiter"],
  [/\bbzw\./gi, "beziehungsweise"],
  [/\bca\./gi, "circa"],
  [/\bNr\./g, "Nummer"],
  [/\s?%/g, " Prozent"],
  [/\s?€/g, " Euro"],
  [/(\p{L})['’]s\b/gu, "$1 es"], // gibt's → gibt es
];

/** Câu → dạng đọc ra: viết tắt → viết đủ, số → chữ ("3 Uhr" ~ "drei Uhr") */
export function spokenText(s: string): string {
  let out = s;
  for (const [re, to] of SPOKEN) out = out.replace(re, to);
  // Số nguyên đứng riêng (bỏ dấu chấm / phẩy ngăn hàng nghìn: 1.000 / 1,000); số thập phân, giờ giữ nguyên
  return out.replace(/(?<![\d.,:])\d{1,3}(?:[.,]\d{3})+(?![\d,:])|(?<![\d.,:])\d+(?![\d,:]|\.\d)/g, (m) => {
    const n = Number(m.replace(/[.,]/g, ""));
    return n <= 999_999 ? germanNumber(n) : m;
  });
}

/** Như checkDictation nhưng cho câu nói: cả câu gốc lẫn câu máy nghe được đều đổi về dạng đọc ra trước khi so */
export const speechCheck = (reference: string, heard: string): CheckResult => checkDictation(spokenText(reference), spokenText(heard));
