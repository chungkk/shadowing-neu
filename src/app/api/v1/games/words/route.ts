import type { NextRequest } from "next/server";
import { getDeck, isGameWord, shortMeaning } from "@/lib/decks";
import { fail } from "@/lib/api";

/**
 * GET ?deck=<slug> → { topics, words } — từ của cả bộ cho game (Mưa từ vựng…): chỉ từ đơn (gõ được nhanh),
 * nghĩa rút gọn. topics = các chủ đề còn từ, theo thứ tự trong bộ (mỗi chủ đề là 1 mốc). Khách cũng chơi được
 */
export async function GET(req: NextRequest) {
  const deck = getDeck(req.nextUrl.searchParams.get("deck") ?? "");
  if (!deck) return fail("Không tìm thấy bộ từ", 404);
  const words = deck.words
    .filter(isGameWord)
    .map((w) => ({ key: w.key, word: w.word, gender: w.gender, plural: "", meaning: shortMeaning(w.meaning), example: "", topic: w.topic }));
  const used = new Set(words.map((w) => w.topic));
  const topics = deck.topics.length ? deck.topics.filter((t) => used.has(t.id)) : [{ id: "", title: deck.title, icon: "📚" }];
  return Response.json({ topics, words });
}
