import { apiUser, body, fail, str } from "@/lib/api";
import { translateSentences, translationEnabled } from "@/lib/translate";
import { translateWord, wordDetail, type WordLang } from "@/lib/word";

/**
 * POST { word, context, lang: "vi" | "en" | "de" } → { word, meaning } — nghĩa theo ngữ cảnh câu, kiểu nói hằng ngày (nhanh)
 * POST { …, detail: true } → { lemma, pos, grammar, explanation, examples: [{ de, tr }] } — tab Ví dụ / Giải thích (gọi song song)
 * Cả câu (có khoảng trắng, không kèm câu ngữ cảnh — vd. người học tự thêm câu vào sổ từ) → bản dịch cả câu (tối đa 500 ký tự),
 * giống AI ghi nghĩa cho câu ⭐ trong sổ từ.
 * Cần đăng nhập (khách được mời đăng ký).
 */
export async function POST(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  if (!translationEnabled()) return fail("Server chưa cấu hình AI để dịch.", 503);

  const b = await body<{ word: string; context: string; lang: string; detail: boolean }>(req);
  const word = str(b.word).trim();
  const context = str(b.context).trim();
  const lang: WordLang = b.lang === "en" || b.lang === "de" ? b.lang : "vi";
  const sentence = b.detail !== true && word.includes(" ") && !context;
  if (!word || word.length > (sentence ? 500 : 60)) return fail("Thiếu từ hoặc từ quá dài");
  if (context.length > 500) return fail("Câu quá dài");

  try {
    if (b.detail === true) return Response.json(await wordDetail(word, context || word, lang));
    // Câu: bản dịch tiếng Việt (như aiWordMeaning); giao diện khác tiếng Việt thì giải nghĩa theo ngôn ngữ đó
    if (sentence && lang === "vi") return Response.json({ word, meaning: (await translateSentences([word]))[0] ?? "" });
    return Response.json(await translateWord(word, context || word, lang));
  } catch (e) {
    return fail((e as Error).message, 502);
  }
}
