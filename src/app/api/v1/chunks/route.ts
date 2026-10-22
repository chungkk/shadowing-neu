import { apiUser, body, fail } from "@/lib/api";
import { splitChunks } from "@/lib/chunks";
import { translationEnabled } from "@/lib/translate";

/**
 * POST { sentences: string[] (tối đa 40) } → { chunks: string[][] } — cụm ngữ nghĩa của từng câu, cùng thứ tự.
 * Cần đăng nhập. Kết quả dùng chung mọi người học (cache trên server).
 */
export async function POST(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  if (!translationEnabled()) return fail("Server chưa cấu hình AI.", 503);

  const b = await body<{ sentences: unknown[] }>(req);
  const sentences = Array.isArray(b.sentences) ? b.sentences.filter((s): s is string => typeof s === "string") : [];
  if (!sentences.length) return fail("Thiếu câu cần chia");
  if (sentences.length > 40 || sentences.some((s) => s.length > 500)) return fail("Quá nhiều câu hoặc câu quá dài");

  try {
    return Response.json({ chunks: await splitChunks(sentences) });
  } catch (e) {
    return fail((e as Error).message, 502);
  }
}
