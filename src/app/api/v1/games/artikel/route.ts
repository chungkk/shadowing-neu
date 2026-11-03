import { apiUser, body, fail, str } from "@/lib/api";
import { answerArtikel, artikelState, cashArtikel, nextArtikel, startArtikel } from "@/lib/artikel-game";
import { allow } from "@/lib/rate-limit";

/** GET → { total, limits, round }: ván đang dở (nếu có) để chơi tiếp */
export async function GET() {
  const user = await apiUser();
  if (user instanceof Response) return user;
  return Response.json(artikelState(user.id));
}

/**
 * POST { action: "start", deck, stake } · { action: "answer", article } (null = hết giờ) · { action: "next" } · { action: "cash" }
 * → { total, limits, round, reveal?, result? }. Chỉ trả đáp án sau khi đã trả lời
 */
export async function POST(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  if (!allow(`artikel:u:${user.id}`, 300, 10 * 60 * 1000)) return fail("Quá nhiều lượt trong thời gian ngắn, thử lại sau ít phút.", 429);
  const b = await body<{ action: string; deck: string; stake: number; article: string | null }>(req);
  const r =
    b.action === "start"
      ? startArtikel(user.id, str(b.deck), Number(b.stake))
      : b.action === "answer"
        ? answerArtikel(user.id, typeof b.article === "string" ? b.article : null)
        : b.action === "next"
          ? nextArtikel(user.id)
          : b.action === "cash"
            ? cashArtikel(user.id)
            : { error: "action không hợp lệ", status: 400 };
  return "error" in r ? fail(r.error, r.status) : Response.json(r);
}
