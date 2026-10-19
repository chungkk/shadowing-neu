import { apiUser, body, fail, str } from "@/lib/api";
import { translationEnabled } from "@/lib/translate";
import { translateWord, type WordLang } from "@/lib/word";

/**
 * POST { word, context, lang: "vi" | "en" | "de" } → { word, meaning }
 * Dịch nghĩa từ theo ngữ cảnh câu, kiểu nói hằng ngày. Cần đăng nhập (khách được mời đăng ký).
 */
export async function POST(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  if (!translationEnabled()) return fail("Server chưa cấu hình AI để dịch.", 503);

  const b = await body<{ word: string; context: string; lang: string }>(req);
  const word = str(b.word).trim();
  const context = str(b.context).trim();
  const lang: WordLang = b.lang === "en" || b.lang === "de" ? b.lang : "vi";
  if (!word || word.length > 60) return fail("Thiếu từ hoặc từ quá dài");
  if (context.length > 500) return fail("Câu quá dài");

  try {
    return Response.json(await translateWord(word, context || word, lang));
  } catch (e) {
    return fail((e as Error).message, 502);
  }
}
