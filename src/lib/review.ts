/** Logic buổi ôn từ vựng (chọn dạng bài, hàng đợi, chấm câu gõ) — dùng chung cho web và app */

/** Phần của 1 mục sổ từ mà buổi ôn cần (ReviewWord của web / app đều khớp) */
export type ReviewWord = { id: number; word: string; meaning: string; context: string; stage: number };

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---- Chấm câu trả lời gõ tay ----

/** Bỏ hoa/thường, dấu câu, mạo từ; ä→ae… để gõ thiếu umlaut vẫn chỉ lệch 1 ký tự */
export const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFC")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(der|die|das|sich) /, "");

function distance(a: string, b: string) {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

/** "exact" | "ok" (khác hoa/thường, umlaut viết ae…) | "almost" (sai 1–2 chữ, vẫn tính đúng) | "wrong" */
export function checkTyped(given: string, word: string): "exact" | "ok" | "almost" | "wrong" {
  if (given.trim() === word.trim()) return "exact";
  const a = norm(given);
  const b = norm(word);
  if (!a) return "wrong";
  if (a === b) return "ok";
  const d = distance(a, b);
  return (b.length >= 5 && d <= 1) || (b.length >= 10 && d <= 2) ? "almost" : "wrong";
}

// ---- Dạng bài ----

export type Kind =
  | "intro" // làm quen từ mới
  | "choose-meaning" // nhìn từ, chọn nghĩa
  | "listen-choose" // nghe, chọn từ
  | "choose-word" // nhìn nghĩa, chọn từ
  | "cloze-bank" // chọn từ điền vào câu
  | "tiles" // xếp chữ cái thành từ
  | "type" // nhìn nghĩa, gõ từ
  | "cloze-type" // gõ từ còn thiếu trong câu
  | "listen-type" // nghe, gõ từ
  | "match" // ghép cặp từ – nghĩa
  | "flash"; // thẻ lật tự chấm (khi không đủ dữ liệu cho dạng khác)

export type Step = {
  id: number;
  /**
   * graded: lần hỏi đầu tiên → chấm vào lịch ôn · retry: hỏi lại sau khi sai ·
   * practice: nhận diện thêm 1 lần (từ mới) · reinforce: tự viết ra · match: ghép cặp nhiều từ
   */
  role: "intro" | "graded" | "retry" | "practice" | "reinforce" | "match";
  item: ReviewWord;
  pairs?: ReviewWord[]; // match
  kind?: Kind; // chọn lúc tới lượt (lúc đó mới biết trình duyệt có giọng Đức chưa)
  options?: string[]; // trắc nghiệm; match: nghĩa cột phải đã xáo
  tiles?: string[]; // xếp chữ
};

export const isPhrase = (v: ReviewWord) => v.word.trim().includes(" ");
export const canCloze = (v: ReviewWord) =>
  !isPhrase(v) && v.context.toLowerCase().includes(v.word.toLowerCase()) && v.context.trim().toLowerCase() !== v.word.toLowerCase();
const canTiles = (v: ReviewWord, tts: boolean) =>
  !isPhrase(v) && [...v.word].length >= 2 && [...v.word].length <= 14 && (!!v.meaning || canCloze(v) || tts);

/** 3 phương án nhiễu khác nhau, ưu tiên cùng loại (từ / cụm từ) với đáp án */
function distractors(item: ReviewWord, pool: ReviewWord[], field: "word" | "meaning"): string[] {
  const right = item[field].trim().toLowerCase();
  const seen = new Set([right]);
  const same: string[] = [];
  const other: string[] = [];
  for (const v of shuffle(pool)) {
    const val = v[field].trim();
    if (!val || seen.has(val.toLowerCase())) continue;
    seen.add(val.toLowerCase());
    (isPhrase(v) === isPhrase(item) ? same : other).push(val);
    if (same.length >= 3) break;
  }
  return [...same, ...other].slice(0, 3);
}

function available(v: ReviewWord, pool: ReviewWord[], tts: boolean): Set<Kind> {
  const out = new Set<Kind>(["flash"]);
  const words = distractors(v, pool, "word").length === 3;
  if (v.meaning && distractors(v, pool, "meaning").length === 3) out.add("choose-meaning");
  if (v.meaning && words) out.add("choose-word");
  if (tts && words) out.add("listen-choose");
  if (canCloze(v) && words) out.add("cloze-bank");
  if (canTiles(v, tts)) out.add("tiles");
  if (v.meaning && !isPhrase(v)) out.add("type");
  if (canCloze(v)) out.add("cloze-type");
  if (tts && !isPhrase(v)) out.add("listen-type");
  return out;
}

const FALLBACK: Kind[] = ["choose-meaning", "cloze-bank", "listen-choose", "choose-word", "tiles", "cloze-type", "type", "listen-type", "flash"];

/** Dạng bài theo mức nhớ: nhận diện (chọn) → nhớ lại có gợi ý (xếp chữ, điền câu) → tự viết ra (gõ, nghe viết) */
function pickKind(step: Step, pool: ReviewWord[], tts: boolean): Kind {
  if (step.role === "intro" || step.role === "match") return step.role;
  const v = step.item;
  const ok = available(v, pool, tts);
  let want: Kind[];
  if (step.role === "practice") want = ["cloze-bank", "listen-choose", "choose-word"];
  else if (step.role === "reinforce") want = ["tiles", "cloze-type", "type"];
  else {
    // Sai rồi hỏi lại thì dễ hơn một bậc
    const s = step.role === "retry" ? Math.max(0, v.stage - 2) : v.stage;
    want =
      s === 0
        ? ["choose-meaning"]
        : s === 1
          ? ["choose-meaning", "listen-choose"]
          : s === 2
            ? ["choose-word", "cloze-bank", "listen-choose"]
            : s === 3
              ? ["tiles", "cloze-bank"]
              : ["type", "cloze-type", "listen-type", "tiles"];
  }
  const pick = shuffle(want.filter((k) => ok.has(k)));
  return pick[0] ?? FALLBACK.find((k) => ok.has(k))!;
}

const EXTRA_LETTERS = [..."aeinrstlhdgumkbo"];

export function resolveStep(step: Step, pool: ReviewWord[], tts: boolean): Step {
  if (step.kind) return step;
  const kind = pickKind(step, pool, tts);
  const v = step.item;
  const s: Step = { ...step, kind };
  if (kind === "choose-meaning") s.options = shuffle([v.meaning.trim(), ...distractors(v, pool, "meaning")]);
  if (kind === "choose-word" || kind === "listen-choose" || kind === "cloze-bank")
    s.options = shuffle([v.word.trim(), ...distractors(v, pool, "word")]);
  if (kind === "match") s.options = shuffle(step.pairs!.map((p) => p.meaning.trim()));
  if (kind === "tiles") {
    const letters = [...v.word.trim()];
    const extra = shuffle(EXTRA_LETTERS.filter((c) => !letters.some((l) => l.toLowerCase() === c))).slice(0, letters.length > 8 ? 3 : 2);
    s.tiles = shuffle([...letters, ...extra]);
  }
  return s;
}

let nextId = 0;
export const newStep = (s: Omit<Step, "id">): Step => ({ ...s, id: nextId++ });

/** Các từ có nghĩa khác nhau (để ghép cặp không bị mơ hồ) */
function matchPairs(list: ReviewWord[]): ReviewWord[] {
  const seen = new Set<string>();
  const out: ReviewWord[] = [];
  for (const v of shuffle(list)) {
    const m = v.meaning.trim().toLowerCase();
    const w = v.word.trim().toLowerCase();
    if (!m || seen.has(m) || seen.has("w:" + w)) continue;
    seen.add(m);
    seen.add("w:" + w);
    out.push(v);
    if (out.length === 5) break;
  }
  return out;
}

/**
 * Từ đã ôn xen kẽ với nhóm 3 từ mới (làm quen cả 3 rồi mới hỏi, để không chỉ nhớ tức thời);
 * cứ khoảng 6 từ thì có 1 bài ghép cặp các từ vừa gặp.
 */
export function buildQueue(items: ReviewWord[]): Step[] {
  const reviews = shuffle(items.filter((v) => v.stage > 0));
  const fresh = shuffle(items.filter((v) => v.stage === 0));
  const out: Step[] = [];
  let block: ReviewWord[] = [];
  const flush = (force = false) => {
    if (block.length < (force ? 4 : 6)) return;
    const pairs = matchPairs(block);
    if (pairs.length >= 4) out.push(newStep({ role: "match", item: pairs[0], pairs }));
    block = [];
  };
  while (reviews.length || fresh.length) {
    const due = reviews.splice(0, 3);
    for (const v of due) out.push(newStep({ role: "graded", item: v }));
    block.push(...due);
    const group = fresh.splice(0, 3);
    for (const v of group) out.push(newStep({ role: "intro", item: v }));
    for (const v of shuffle(group)) out.push(newStep({ role: "graded", item: v }));
    block.push(...group);
    flush();
  }
  flush(true);
  return out;
}

/** Chèn bước vào hàng đợi cách vị trí hiện tại vài thẻ (hoặc cuối hàng) */
export const insertLater = (queue: Step[], pos: number, gap: number, step: Step) => {
  const q = [...queue];
  q.splice(Math.min(pos + 1 + gap, q.length), 0, step);
  return q;
};
