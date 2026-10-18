import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { translateSentences, translationEnabled } from "@/lib/translate";
import { body, fail } from "@/lib/api";

// Giới hạn số lần gọi (lưu trong RAM): khách 30 lần / 10 phút, đã đăng nhập 120 lần / 10 phút
const WINDOW_MS = 10 * 60 * 1000;
const hits = new Map<string, { n: number; reset: number }>();

function allow(key: string, max: number): boolean {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || h.reset < now) {
    hits.set(key, { n: 1, reset: now + WINDOW_MS });
    if (hits.size > 10_000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
    return true;
  }
  return ++h.n <= max;
}

/** POST { sentences: string[] } (tối đa 40 câu) → { translations: string[] } tiếng Việt, cùng thứ tự */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!translationEnabled()) return fail("Server chưa cấu hình AI để dịch.", 503);

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allow(user ? `u:${user.id}` : `ip:${ip}`, user ? 120 : 30)) {
    return fail("Dịch quá nhiều trong thời gian ngắn, thử lại sau ít phút.", 429);
  }

  const b = await body<{ sentences: unknown[] }>(req);
  const sentences = Array.isArray(b.sentences) ? b.sentences.filter((s): s is string => typeof s === "string") : [];
  if (!sentences.length) return fail("Thiếu câu cần dịch");
  if (sentences.length > 40 || sentences.some((s) => s.length > 500)) return fail("Quá nhiều câu hoặc câu quá dài");

  try {
    return Response.json({ translations: await translateSentences(sentences) });
  } catch (e) {
    return fail((e as Error).message, 502);
  }
}
