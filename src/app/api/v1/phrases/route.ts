import { apiUser, body, fail } from "@/lib/api";
import { findPhrases } from "@/lib/phrases";
import { translationEnabled } from "@/lib/translate";
import type { WordLang } from "@/lib/word";

/**
 * POST { sentences: string[] (tối đa 40), lang: "vi" | "en" | "de" }
 *   → { phrases: [{ parts, base, meaning }][] } — cụm từ cố định của từng câu, cùng thứ tự
 * Cần đăng nhập (giống tra từ). Kết quả dùng chung mọi người học (cache trên server).
 */
export async function POST(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  if (!translationEnabled()) return fail("Server chưa cấu hình AI.", 503);

  const b = await body<{ sentences: unknown[]; lang: string }>(req);
  const sentences = Array.isArray(b.sentences) ? b.sentences.filter((s): s is string => typeof s === "string") : [];
  const lang: WordLang = b.lang === "en" || b.lang === "de" ? b.lang : "vi";
  if (!sentences.length) return fail("Thiếu câu cần phân tích");
  if (sentences.length > 40 || sentences.some((s) => s.length > 500)) return fail("Quá nhiều câu hoặc câu quá dài");

  try {
    return Response.json({ phrases: await findPhrases(sentences, lang) });
  } catch (e) {
    return fail((e as Error).message, 502);
  }
}
