import { setVocabNoun, vocabNounsUnknown } from "@/lib/db";
import { apiUser, body, fail } from "@/lib/api";
import { allow } from "@/lib/rate-limit";
import { translationEnabled } from "@/lib/translate";
import { nounInfo, type NounInfo } from "@/lib/word";

const MAX_IDS = 40;

/** Chắc chắn không phải danh từ, khỏi hỏi AI: nhiều từ (cụm / câu), hoặc gặp viết thường giữa câu (danh từ tiếng Đức luôn viết hoa) */
function surelyNotNoun(word: string, context: string): boolean {
  if (/\s/.test(word.trim())) return true;
  if (word[0] !== word[0].toLowerCase()) return false;
  return new RegExp(`(^|[^\\p{L}])${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\p{L}]|$)`, "u").test(context);
}

/**
 * POST { ids: number[] (≤ 40) } → { items: [{ id, gender, singular, plural }] } — mạo từ + số ít / số nhiều của các mục
 * chưa xác định (mục đã xác định thì không trả lại). gender "-" = không phải danh từ. Kết quả lưu vào sổ từ.
 */
export async function POST(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const b = await body<{ ids: unknown[] }>(req);
  const ids = Array.isArray(b.ids) ? b.ids.filter((x): x is number => Number.isInteger(x)).slice(0, MAX_IDS) : [];
  const todo = vocabNounsUnknown(user.id, ids);
  const out: ({ id: number } & NounInfo)[] = [];
  const ask: typeof todo = [];
  for (const v of todo) {
    if (surelyNotNoun(v.word, v.context)) out.push({ id: v.id, gender: "-", singular: "", plural: "" });
    else ask.push(v);
  }
  if (ask.length) {
    if (!translationEnabled()) return fail("Server chưa cấu hình AI.", 503);
    if (!allow(`nouns:u:${user.id}`, 60, 10 * 60 * 1000)) return fail("Quá nhiều yêu cầu, thử lại sau ít phút.", 429);
    try {
      const info = await nounInfo(ask.map((v) => ({ word: v.word.trim(), sentence: v.context })));
      ask.forEach((v, k) => out.push({ id: v.id, ...info[k] }));
    } catch (e) {
      return fail((e as Error).message, 502);
    }
  }
  for (const n of out) setVocabNoun(user.id, n.id, n);
  return Response.json({ items: out });
}
