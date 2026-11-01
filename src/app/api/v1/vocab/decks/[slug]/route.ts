import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { addDeckWords, vocabOverview } from "@/lib/db";
import { deckTopics, getDeck } from "@/lib/decks";
import { apiUser, body, fail } from "@/lib/api";

const NOT_FOUND = "Không tìm thấy bộ từ";

/**
 * GET → { deck } — bộ chia chủ đề: `topics` (kèm số từ / số đã có trong sổ), chưa gửi từ;
 * ?topic=<id> → chỉ các từ của chủ đề đó (+ `topic`). Bộ không chia chủ đề → mọi từ.
 * Đã đăng nhập: mỗi từ có `saved` = đã có trong sổ
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/v1/vocab/decks/[slug]">) {
  const deck = getDeck((await ctx.params).slug);
  if (!deck) return fail(NOT_FOUND, 404);
  const user = await getCurrentUser();
  const saved = user ? vocabOverview(user.id).words : new Set<string>();
  const topicId = req.nextUrl.searchParams.get("topic");
  const topic = topicId ? deck.topics.find((t) => t.id === topicId) : undefined;
  if (topicId && !topic) return fail("Không tìm thấy chủ đề", 404);
  const words = topic ? deck.words.filter((w) => w.topic === topic.id) : deck.topics.length ? [] : deck.words;
  return Response.json({
    deck: {
      ...deck,
      topics: deckTopics(deck, saved),
      topic: topic ?? null,
      wordCount: deck.words.length,
      saved: deck.words.filter((w) => saved.has(w.word.toLowerCase())).length,
      words: words.map((w) => ({ ...w, saved: saved.has(w.word.toLowerCase()) })),
    },
  });
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
