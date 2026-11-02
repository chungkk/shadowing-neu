import { getCurrentUser } from "@/lib/auth";
import { vocabOverview } from "@/lib/db";
import { deckCounts, deckMarks, getDeck, listDecks } from "@/lib/decks";

/**
 * GET → { decks, notebook } — kho bộ từ (khách xem được) · đã đăng nhập: mỗi bộ có `saved` = số từ đã có trong sổ,
 * `learned` = số từ đã học trong bộ, notebook = { total, due } của sổ từ (banner đầu tab, khỏi tải cả sổ)
 */
export async function GET() {
  const user = await getCurrentUser();
  const decks = listDecks();
  if (!user) return Response.json({ decks, notebook: null });
  const m = deckMarks(user.id);
  const o = vocabOverview(user.id);
  return Response.json({
    decks: decks.map((d) => ({ ...d, ...deckCounts(getDeck(d.slug)!, m) })),
    notebook: { total: o.total, due: o.due },
  });
}
