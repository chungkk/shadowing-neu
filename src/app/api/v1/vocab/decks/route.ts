import { getCurrentUser } from "@/lib/auth";
import { vocabOverview } from "@/lib/db";
import { getDeck, listDecks } from "@/lib/decks";

/**
 * GET → { decks, notebook } — kho bộ từ (khách xem được) · đã đăng nhập: mỗi bộ có `saved` = số từ đã có trong sổ,
 * notebook = { total, due } của sổ từ (banner đầu tab, khỏi tải cả sổ)
 */
export async function GET() {
  const user = await getCurrentUser();
  const decks = listDecks();
  if (!user) return Response.json({ decks, notebook: null });
  const o = vocabOverview(user.id);
  return Response.json({
    decks: decks.map((d) => ({ ...d, saved: getDeck(d.slug)!.words.filter((w) => o.words.has(w.word.toLowerCase())).length })),
    notebook: { total: o.total, due: o.due },
  });
}
