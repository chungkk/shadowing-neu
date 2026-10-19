import "server-only";
import { createHash } from "node:crypto";
import { getTranslations, saveTranslations } from "./db";
import { chatJson } from "./translate";

/**
 * Dịch nghĩa 1 từ tiếng Đức theo ngữ cảnh câu, bằng lời nói hằng ngày (tiếng Việt / Anh / Đức đơn giản — theo giao diện app).
 * Thử lần lượt mọi nhà cung cấp AI đã cấu hình (Groq nhỏ → Groq lớn → ChatGPT).
 * Kết quả lưu trong kho bản dịch (bảng translations, khoá "wordm:<lang>:…") → mỗi từ trong mỗi câu chỉ hỏi AI 1 lần.
 */

export type WordLang = "vi" | "en" | "de";
export type WordInfo = { word: string; meaning: string };

const prompt = (lang: WordLang) =>
  lang === "de"
    ? 'Du hilfst Deutschlernenden. Du bekommst JSON {"word", "sentence"}. ' +
      "Erkläre, was das Wort in diesem Satz bedeutet — mit einem alltäglichen, umgangssprachlichen Synonym oder einer ganz kurzen Umschreibung (max. 6 Wörter), " +
      'NICHT das Wort selbst wiederholen. Antworte NUR mit JSON {"meaning": "…"}.'
    : `You help learners of German. Input JSON {"word", "sentence"}. ` +
      `Translate what the word means in this sentence into ${lang === "vi" ? "Vietnamese" : "English"}, ` +
      `the way people say it in everyday speech (natural, casual, not dictionary-style), max 6 words, no explanations. ` +
      `Reply ONLY with JSON {"meaning": "…"}.`;

const isMeaning = (x: unknown): x is { meaning: string } => {
  const m = (x as { meaning?: unknown })?.meaning;
  return typeof m === "string" && !!m.trim();
};

export async function translateWord(word: string, sentence: string, lang: WordLang): Promise<WordInfo> {
  const key = `wordm:${lang}:` + createHash("sha1").update(`${word.toLowerCase()}|${sentence.trim()}`).digest("hex");
  const cached = getTranslations([key]).get(key);
  if (cached) return { word, meaning: cached };

  const { meaning, provider } = await chatJson(prompt(lang), { word, sentence }, isMeaning);
  const m = meaning.trim();
  saveTranslations([{ key, text: `${word} | ${sentence}`, translation: m, provider }]);
  return { word, meaning: m };
}
