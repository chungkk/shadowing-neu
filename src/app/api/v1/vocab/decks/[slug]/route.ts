import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { addDeckWords, vocabOverview } from "@/lib/db";
import { getDeck } from "@/lib/decks";
import { apiUser, body, fail } from "@/lib/api";

const NOT_FOUND = "Không tìm thấy bộ từ";

/** GET → { deck } kèm từng từ; đã đăng nhập: `saved` = từ đã có trong sổ */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/v1/vocab/decks/[slug]">) {
  const deck = getDeck((await ctx.params).slug);
  if (!deck) return fail(NOT_FOUND, 404);
  const user = await getCurrentUser();
  const saved = user ? vocabOverview(user.id).words : new Set<string>();
  return Response.json({ deck: { ...deck, words: deck.words.map((w) => ({ ...w, saved: saved.has(w.word.toLowerCase()) })) } });
}

/** POST { words?: string[] } → thêm các từ đó (không gửi = cả bộ) vào sổ để ôn → { added } */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/v1/vocab/decks/[slug]">) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const deck = getDeck((await ctx.params).slug);
  if (!deck) return fail(NOT_FOUND, 404);
  const b = await body<{ words: unknown[] }>(req);
  const pick = Array.isArray(b.words) ? new Set(b.words.filter((x): x is string => typeof x === "string")) : null;
  const words = pick ? deck.words.filter((w) => pick.has(w.word)) : deck.words;
  if (!words.length) return fail("Chưa chọn từ nào");
  return Response.json({ added: addDeckWords(user.id, words, deck.title) });
}
