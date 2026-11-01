import type { NextRequest } from "next/server";
import { getDeck } from "@/lib/decks";
import { fail } from "@/lib/api";

/** Nghĩa ngắn cho giọt mưa: phần đầu trước ";", bỏ chú thích trong ngoặc ("khóa (cửa); hoàn thành…" → "khóa") */
const shortMeaning = (m: string) => m.split(";")[0].replace(/\s*\([^)]*\)/g, "").trim() || m;

/**
 * GET ?deck=<slug> → { topics, words } — từ của cả bộ cho game (Mưa từ vựng…): chỉ từ đơn (gõ được nhanh),
 * nghĩa rút gọn. topics = các chủ đề còn từ, theo thứ tự trong bộ (mỗi chủ đề là 1 mốc). Khách cũng chơi được
 */
export async function GET(req: NextRequest) {
  const deck = getDeck(req.nextUrl.searchParams.get("deck") ?? "");
  if (!deck) return fail("Không tìm thấy bộ từ", 404);
  const words = deck.words
    .filter((w) => /^[\p{L}-]+$/u.test(w.word) && w.meaning)
    .map((w) => ({ word: w.word, gender: w.gender, plural: "", meaning: shortMeaning(w.meaning), example: "", topic: w.topic }));
  const used = new Set(words.map((w) => w.topic));
  const topics = deck.topics.length ? deck.topics.filter((t) => used.has(t.id)) : [{ id: "", title: deck.title, icon: "📚" }];
  return Response.json({ topics, words });
}
