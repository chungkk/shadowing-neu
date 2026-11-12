import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { addDeckEntries, deckCounts, deckMarks, deckTopics, getDeck, markWord } from "@/lib/decks";
import { apiUser, body, fail } from "@/lib/api";

const NOT_FOUND = "Không tìm thấy bộ từ";

/**
 * GET → { deck } — bộ chia chủ đề: `topics` (kèm số từ / số đã có trong sổ), chưa gửi từ;
 * ?topic=<id> → chỉ các từ của chủ đề đó (+ `topic`). Bộ không chia chủ đề → mọi từ.
 * Đã đăng nhập: mỗi từ có `saved` = đã có trong sổ, `learned` = đã học trong bộ này
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/v1/vocab/decks/[slug]">) {
  const deck = getDeck((await ctx.params).slug);
  if (!deck) return fail(NOT_FOUND, 404);
  const user = await getCurrentUser();
  const marks = deckMarks(user?.id ?? null);
  const topicId = req.nextUrl.searchParams.get("topic");
  const topic = topicId ? deck.topics.find((t) => t.id === topicId) : undefined;
  if (topicId && !topic) return fail("Không tìm thấy chủ đề", 404);
  const words = topic ? deck.words.filter((w) => w.topic === topic.id) : deck.topics.length ? [] : deck.words;
  return Response.json({
    deck: {
      ...deck,
      topics: deckTopics(deck, marks),
      topic: topic ?? null,
      wordCount: deck.words.length,
      ...deckCounts(deck, marks),
      words: words.map((w) => markWord(deck, w, marks)),
    },
  });
}

/**
 * POST { keys?: string[], learn?: boolean, tested?: boolean } → thêm các mục đó vào sổ để ôn (learn: học xong ở màn học, ghi tiến độ;
 * tested: đúng ở dạng có kiểm tra, không phải thẻ lật → từ mới lên mức 1) → { added }.
 * App bản cũ gửi { words: string[] } theo cách viết; không gửi gì = cả bộ.
 */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/v1/vocab/decks/[slug]">) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const deck = getDeck((await ctx.params).slug);
  if (!deck) return fail(NOT_FOUND, 404);
  const b = await body<{ keys: unknown[]; words: unknown[]; learn: boolean; tested: boolean }>(req);
  const strings = (list: unknown[]) => new Set(list.filter((x): x is string => typeof x === "string"));
  const keys = Array.isArray(b.keys) ? strings(b.keys) : null;
  const names = Array.isArray(b.words) ? strings(b.words) : null;
  const words = keys ? deck.words.filter((w) => keys.has(w.key)) : names ? deck.words.filter((w) => names.has(w.word)) : deck.words;
  if (!words.length) return fail("Chưa chọn từ nào");
  const tested = b.learn === true && b.tested === true && words.length === 1;
  return Response.json({ added: addDeckEntries(user.id, deck, words, b.learn === true, tested) });
}
