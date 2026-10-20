import "server-only";
import { createHash } from "node:crypto";
import { after } from "next/server";
import { getTranslations, saveTranslations } from "./db";
import { locatePhrase, type Phrase } from "./phrase-match";
import { mergeIntoSentences, type Segment } from "./subtitles";
import { chatJson } from "./translate";
import type { WordLang } from "./word";

/**
 * Tìm cụm từ cố định trong các câu phụ đề (vd. "werden wir uns auf die Lauer legen" → "sich auf die Lauer legen").
 * Gửi AI theo lô câu liên tiếp (có ngữ cảnh); mỗi phần của cụm phải có thật trong câu, không thì bỏ.
 * Kết quả lưu theo từng câu trong kho bản dịch (khoá "phr1:<lang>:…", câu không có cụm nào lưu []) →
 * mỗi câu chỉ hỏi AI 1 lần, dùng chung mọi bài / người học. Đổi prompt → tăng "phr1" để phân tích lại.
 */

const BATCH = 20; // số câu mỗi lần gọi AI
const MAX_PER_SENTENCE = 4;

const prompt = (lang: WordLang) => {
  const L = lang === "vi" ? "Vietnamese (tiếng Việt)" : lang === "en" ? "English" : "simple German (A2)";
  return (
    `You help learners of German spot multi-word expressions in video subtitles. ` +
    `Input JSON {"s": [sentence 0, sentence 1, …]}: consecutive subtitle sentences.\n` +
    `For each sentence, find expressions a learner must learn as a whole because their meaning is not just the sum of the words: ` +
    `idioms / Redewendungen ("sich auf die Lauer legen", "auf dem Schlauch stehen", "die Nase voll haben"), ` +
    `fixed phrases and Funktionsverbgefüge ("eine Rolle spielen", "in Frage stellen", "Bescheid sagen", "zur Verfügung stehen"), ` +
    `idiomatic collocations ("Wert legen auf", "keine Ahnung haben"). ` +
    `Do NOT include single words, plain separable verbs, ordinary verb + preposition, or literal word combinations. Most sentences have none.\n` +
    `Reply ONLY with JSON {"r": [{"i": <sentence index>, "parts": [...], "base": "...", "meaning": "..."}]} ({"r": []} if nothing).\n` +
    `- parts: the words of the expression copied EXACTLY as they appear in the sentence (same spelling, inflection, case). ` +
    `Adjacent words form one part; words separated by other words go in separate parts, in sentence order — ` +
    `e.g. "In diesem Film werden wir uns auf die Lauer legen" → ["uns", "auf die Lauer legen"]. ` +
    `Include the reflexive pronoun and the verb when they belong to the expression; never include other words.\n` +
    `- base: dictionary form as in a German dictionary (infinitive, with "sich", "jemandem", "etwas" where needed).\n` +
    `- meaning: the accurate idiomatic meaning of the whole expression in this context, in ${L} — what a good dictionary would say, worded naturally, 1–6 words, never a literal word-by-word rendering.`
  );
};

type Raw = { r: unknown[] };
const isRaw = (x: unknown): x is Raw => Array.isArray((x as Raw)?.r);

const keyOf = (lang: WordLang, text: string) => `phr1:${lang}:` + createHash("sha1").update(text.trim()).digest("hex");

/** Lọc kết quả AI cho 1 câu: đủ trường, mọi phần có thật trong câu, không trùng */
function clean(sentence: string, items: unknown[]): Phrase[] {
  const out: Phrase[] = [];
  for (const it of items) {
    const o = it as Record<string, unknown>;
    if (!Array.isArray(o.parts) || !o.parts.length || !o.parts.every((p) => typeof p === "string")) continue;
    if (typeof o.base !== "string" || typeof o.meaning !== "string" || !o.base.trim() || !o.meaning.trim()) continue;
    const parts = (o.parts as string[]).map((p) => p.trim()).filter(Boolean);
    if (!parts.length || !locatePhrase(sentence, parts)) continue;
    const base = o.base.trim();
    if (out.some((p) => p.base.toLowerCase() === base.toLowerCase())) continue;
    out.push({ parts, base, meaning: o.meaning.trim() });
  }
  return out.slice(0, MAX_PER_SENTENCE);
}

/** Cụm từ của từng câu (giữ thứ tự). Câu đã phân tích thì lấy từ kho, không gọi AI. */
export async function findPhrases(sentences: string[], lang: WordLang): Promise<Phrase[][]> {
  const keys = sentences.map((s) => keyOf(lang, s));
  const found = new Map<string, Phrase[]>();
  for (const [k, v] of getTranslations(keys)) {
    try {
      found.set(k, JSON.parse(v));
    } catch {}
  }
  const missing = [...new Set(sentences.filter((_, i) => !found.has(keys[i])).map((s) => s.trim()))].filter(Boolean);

  for (let i = 0; i < missing.length; i += BATCH) {
    const chunk = missing.slice(i, i + BATCH);
    const { r, provider } = await chatJson(prompt(lang), { s: chunk }, isRaw, { prefer: "large" });
    const rows = chunk.map((text, k) => {
      const items = r.filter((x) => (x as { i?: unknown })?.i === k);
      const phrases = clean(text, items);
      found.set(keyOf(lang, text), phrases);
      return { key: keyOf(lang, text), text, translation: JSON.stringify(phrases), provider };
    });
    saveTranslations(rows);
  }
  return keys.map((k) => found.get(k) ?? []);
}

const PREWARM_LANGS: WordLang[] = ["vi", "de"]; // ngôn ngữ giao diện của app
const prewarming = new Set<string>();

/**
 * Phân tích sẵn cụm từ cho cả bài ngay khi bài / phụ đề được lưu (chạy nền sau khi trả response) →
 * người học mở bài là có cụm từ tô sáng ngay. Câu gộp giống app (mergeIntoSentences) để trùng khoá cache.
 */
export function prewarmPhrases(segments: Segment[]) {
  const sentences = [...new Set(mergeIntoSentences(segments).map((s) => s.text.trim()))].filter(Boolean);
  if (!sentences.length) return;
  const id = createHash("sha1").update(sentences.join("\n")).digest("hex");
  if (prewarming.has(id)) return;
  prewarming.add(id);
  const run = async () => {
    try {
      for (const lang of PREWARM_LANGS) {
        for (let i = 0; i < sentences.length; i += BATCH * 2) {
          // 1 lô lỗi (AI quá tải…) thì bỏ qua lô đó — app sẽ hỏi lại khi người học tới câu đó
          await findPhrases(sentences.slice(i, i + BATCH * 2), lang).catch((e) => console.error("[phrases] prewarm:", (e as Error).message));
        }
      }
    } finally {
      prewarming.delete(id);
    }
  };
  try {
    after(run);
  } catch {
    void run(); // ngoài request (không có after) → chạy nền luôn
  }
}
