import "server-only";
import { createHash } from "node:crypto";
import { getTranslations, saveTranslations } from "./db";
import { chatJson } from "./translate";

/**
 * Chia câu tiếng Đức thành cụm ngữ nghĩa (Sinneinheiten) để luyện nói theo cụm:
 * "Das soll andere Täter abschrecken." → ["Das soll", "andere Täter", "abschrecken."].
 * Cụm theo nghĩa + chỗ ngắt hơi tự nhiên, không cắt theo số từ cố định. AI phải trả đúng nguyên văn, ghép lại = câu gốc;
 * sai thì coi cả câu là 1 cụm. Lưu theo câu trong kho bản dịch (khoá "chk1:…") → mỗi câu chỉ hỏi AI 1 lần, dùng chung.
 */

const BATCH = 20;
const SHORT = 4; // câu ≤ 4 từ: không cần chia

const PROMPT =
  `You help learners of German practise speaking long sentences chunk by chunk. ` +
  `Input JSON {"s": [sentence 0, sentence 1, …]}.\n` +
  `Split each sentence into meaningful chunks (Sinneinheiten) — the natural units a native speaker would group and pause between: ` +
  `subject group, verb group, prepositional phrase, adverbial, subordinate clause start… ` +
  `Usually 2–5 words per chunk; never split inside a noun phrase or a fixed expression; a 1-word chunk is fine for a separated verb or particle at the end.\n` +
  `Example: "Das soll andere Täter abschrecken." → ["Das soll", "andere Täter", "abschrecken."]\n` +
  `Reply ONLY with JSON {"r": [[chunks of sentence 0], [chunks of sentence 1], …]}. ` +
  `Copy the words EXACTLY (same spelling, punctuation attached to its word); chunks joined with single spaces must equal the sentence.`;

type Raw = { r: unknown[] };
const isRaw = (x: unknown): x is Raw => Array.isArray((x as Raw)?.r);

const keyOf = (text: string) => "chk1:" + createHash("sha1").update(text.trim()).digest("hex");
const norm = (s: string) => s.trim().replace(/\s+/g, " ");
const words = (s: string) => norm(s).split(" ").filter(Boolean).length;

/** Kết quả AI hợp lệ khi ghép lại đúng câu gốc; không thì cả câu là 1 cụm */
function clean(sentence: string, raw: unknown): string[] {
  if (!Array.isArray(raw) || !raw.length || !raw.every((c) => typeof c === "string" && c.trim())) return [norm(sentence)];
  const chunks = (raw as string[]).map(norm);
  return chunks.join(" ") === norm(sentence) ? chunks : [norm(sentence)];
}

/** Cụm của từng câu (giữ thứ tự). Câu ngắn hoặc đã chia thì không gọi AI. */
export async function splitChunks(sentences: string[]): Promise<string[][]> {
  const keys = sentences.map(keyOf);
  const found = new Map<string, string[]>();
  sentences.forEach((s, i) => words(s) <= SHORT && found.set(keys[i], [norm(s)]));
  for (const [k, v] of getTranslations(keys.filter((k) => !found.has(k)))) {
    try {
      found.set(k, JSON.parse(v));
    } catch {}
  }
  const missing = [...new Set(sentences.filter((_, i) => !found.has(keys[i])).map(norm))].filter(Boolean);

  for (let i = 0; i < missing.length; i += BATCH) {
    const batch = missing.slice(i, i + BATCH);
    const { r, provider } = await chatJson(PROMPT, { s: batch }, isRaw, { prefer: "large" });
    const rows = batch.map((text, k) => {
      const chunks = clean(text, r[k]);
      found.set(keyOf(text), chunks);
      return { key: keyOf(text), text, translation: JSON.stringify(chunks), provider };
    });
    saveTranslations(rows);
  }
  return keys.map((k, i) => found.get(k) ?? [norm(sentences[i])]);
}
