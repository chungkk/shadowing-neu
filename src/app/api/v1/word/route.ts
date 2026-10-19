import { apiUser, body, fail, str } from "@/lib/api";
import { translationEnabled } from "@/lib/translate";
import { translateWord, wordDetail, type WordLang } from "@/lib/word";

/**
 * POST { word, context, lang: "vi" | "en" | "de" } → { word, meaning } — nghĩa theo ngữ cảnh câu, kiểu nói hằng ngày (nhanh)
 * POST { …, detail: true } → { lemma, pos, grammar, explanation, examples: [{ de, tr }] } — tab Ví dụ / Giải thích (gọi song song)
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
  if (!word || word.length > 60) return fail("Thiếu từ hoặc từ quá dài");
  if (context.length > 500) return fail("Câu quá dài");

  try {
    if (b.detail === true) return Response.json(await wordDetail(word, context || word, lang));
    return Response.json(await translateWord(word, context || word, lang));
  } catch (e) {
    return fail((e as Error).message, 502);
  }
}
