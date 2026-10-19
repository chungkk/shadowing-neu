import "server-only";
import { createHash } from "node:crypto";
import { getTranslations, saveTranslations } from "./db";
import { chatJson } from "./translate";

/**
 * Dịch nghĩa 1 từ tiếng Đức theo ngữ cảnh câu, bằng lời nói hằng ngày (tiếng Việt / Anh / Đức đơn giản — theo giao diện app).
 * Cần nghĩa chuẩn, sát → ChatGPT trước, rồi Groq lớn, Groq nhỏ (dự phòng khi cái trước lỗi).
 * Kết quả lưu trong kho bản dịch (bảng translations, khoá "wordm:<lang>:…") → mỗi từ trong mỗi câu chỉ hỏi AI 1 lần.
 */

export type WordLang = "vi" | "en" | "de";
export type WordInfo = { word: string; meaning: string };

const prompt = (lang: WordLang) =>
  lang === "de"
    ? 'Du hilfst Deutschlernenden. Du bekommst JSON {"word", "sentence"}. ' +
      "Gib die genaue Bedeutung des Wortes in GENAU diesem Satz an. Ist es Teil einer Redewendung, festen Wendung oder eines trennbaren Verbs, " +
      "erkläre die ganze Wendung (z. B. \"keinen Bock haben\" → \"keine Lust haben\"), nie wörtlich — " +
      "als treffendes, alltagssprachliches Synonym oder ganz kurze Umschreibung (1–4 Wörter). " +
      "NUR dieses Wort (bzw. die kürzeste Wendung, zu der es gehört) — keine anderen Wörter des Satzes. " +
      'Nicht das Wort selbst wiederholen, keine Erklärung. Antworte NUR mit JSON {"meaning": "…"}.'
    : `You help learners of German. Input JSON {"word", "sentence"}. ` +
      `Give the precise meaning of the word in EXACTLY this sentence, in ${lang === "vi" ? "Vietnamese" : "English"}. ` +
      `If the word is part of an idiom, fixed phrase or separable verb in this sentence, give the meaning of that whole phrase ` +
      `(e.g. "keinen Bock haben" → "not in the mood", "Bescheid sagen" → "let … know"), never a literal word-by-word meaning. ` +
      `Must be accurate and faithful, worded the way people naturally say it in everyday speech — not stiff dictionary wording. ` +
      `Translate ONLY that word (or the shortest idiom it belongs to) — never other words of the sentence. 1–4 words, no explanations. ` +
      `Reply ONLY with JSON {"meaning": "…"}.`;

const isMeaning = (x: unknown): x is { meaning: string } => {
  const m = (x as { meaning?: unknown })?.meaning;
  return typeof m === "string" && !!m.trim();
};

export async function translateWord(word: string, sentence: string, lang: WordLang): Promise<WordInfo> {
  const key = `wordm:${lang}:` + createHash("sha1").update(`${word.toLowerCase()}|${sentence.trim()}`).digest("hex");
  const cached = getTranslations([key]).get(key);
  if (cached) return { word, meaning: cached };

  const { meaning, provider } = await chatJson(prompt(lang), { word, sentence }, isMeaning, { prefer: "openai" });
  const m = meaning.trim();
  saveTranslations([{ key, text: `${word} | ${sentence}`, translation: m, provider }]);
  return { word, meaning: m };
}

/** Chi tiết cho popup: dạng từ điển, loại từ, ghi chú ngữ pháp, giải thích ngắn, ví dụ đời thường */
export type WordDetail = {
  lemma: string; // "die Aussprache", "sich verabschieden"
  pos: string; // loại từ (theo ngôn ngữ giao diện)
  grammar: string; // "Plural: die Aussprachen" / "Partizip II: verabschiedet"
  explanation: string; // 1–2 câu
  examples: { de: string; tr: string }[]; // từ cần học được bọc **…**; tr = "" khi giao diện tiếng Đức
};

const detailPrompt = (lang: WordLang) => {
  const L = lang === "vi" ? "Vietnamese (tiếng Việt)" : lang === "en" ? "English" : "simple German (A2)";
  return (
    `You help learners of German. Input JSON {"word", "sentence"}: a word and the sentence it appears in. ` +
    `Reply ONLY with JSON {"lemma", "pos", "grammar", "explanation", "examples"}.\n` +
    `OUTPUT LANGUAGE for "pos", "explanation" and every "translation": ${L}. Never use any other language there.\n` +
    `- lemma: German dictionary form (nouns with article, e.g. "die Aussprache"; reflexive/separable verbs as used here, e.g. "sich verabschieden", "anfangen").\n` +
    `- pos: part of speech (in ${L}).\n` +
    `- grammar: one short line of key German forms (nouns: plural; verbs: Präteritum, Partizip II, auxiliary; adjectives: comparative), or "".\n` +
    `- explanation: 1–2 short sentences written in ${L}: what the word means in this sentence and how it is typically used. Accurate, plain everyday language.\n` +
    `- examples: 4 short, natural everyday German sentences using the word with the same meaning as in the sentence (vary the forms). ` +
    `Wrap the target word form in **double asterisks**. ` +
    (lang === "de"
      ? `Each item: {"de": "<German sentence>"}.`
      : `Each item: {"de": "<German sentence>", "translation": "<natural translation in ${L}>"}.`)
  );
};

const isDetail = (x: unknown): x is WordDetail => {
  const o = x as Record<string, unknown>;
  return (
    !!o &&
    typeof o.lemma === "string" &&
    typeof o.pos === "string" &&
    typeof o.explanation === "string" &&
    Array.isArray(o.examples) &&
    o.examples.length > 0 &&
    o.examples.every((e) => e && typeof (e as { de?: unknown }).de === "string")
  );
};

export async function wordDetail(word: string, sentence: string, lang: WordLang): Promise<WordDetail> {
  const key = `wordd:${lang}:` + createHash("sha1").update(`${word.toLowerCase()}|${sentence.trim()}`).digest("hex");
  const cached = getTranslations([key]).get(key);
  if (cached) {
    try {
      return JSON.parse(cached) as WordDetail;
    } catch {}
  }
  const { provider, ...r } = await chatJson(detailPrompt(lang), { word, sentence }, isDetail, { prefer: "large" });
  const d: WordDetail = {
    lemma: r.lemma.trim(),
    pos: r.pos.trim(),
    grammar: typeof r.grammar === "string" ? r.grammar.trim() : "",
    explanation: r.explanation.trim(),
    examples: r.examples.slice(0, 5).map((e) => {
      const tr = (e as { translation?: unknown }).translation;
      return { de: String(e.de).trim(), tr: lang !== "de" && typeof tr === "string" ? tr.trim() : "" };
    }),
  };
  saveTranslations([{ key, text: `${word} | ${sentence}`, translation: JSON.stringify(d), provider }]);
  return d;
}
