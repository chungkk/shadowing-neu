import type { NextRequest } from "next/server";
import { awardDictWords, chargeDictHints, getDictStreak, getOpenPoints, getOpenWords, getPointIdx, getPoints, resetDictStreak } from "@/lib/db";
import { checkSlots, normalizeDictLevel, slotsFromInput } from "@/lib/dictation";
import { apiUser, body, fail, str } from "@/lib/api";
import { dictationSentenceFor, lockedSource, sourceEarnsPoints } from "@/lib/access";
import { allow } from "@/lib/rate-limit";

/**
 * Điểm chính tả của người đang đăng nhập: gõ đúng 1 từ → +1 điểm cơ bản, đúng liên tiếp thưởng combo (3–4: +2, 5–9: +3, 10+: +4/từ),
 * sai hoặc bấm xem gợi ý → chuỗi về 0; mỗi từ bấm xem → −2 điểm. Mỗi từ của câu chỉ tính điểm 1 lần.
 * source: "/lesson/<id>" hoặc "/watch/<videoId>" (như /progress) · tz: phút, như Date.getTimezoneOffset() — để tính "hôm nay".
 */

const SOURCE_RE = /^\/(lesson|watch)\/[\w-]{1,64}$/;

const tzOf = (v: unknown) => (Number.isFinite(Number(v)) && Math.abs(Number(v)) <= 840 ? Number(v) : 0);

/** GET ?tz=… → { total, today, streak } · thêm ?source=… → kèm { idx, open, openWords } */
export async function GET(req: NextRequest) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const q = req.nextUrl.searchParams;
  const points = getPoints(user.id, tzOf(q.get("tz")));
  const streak = getDictStreak(user.id);
  const source = q.get("source");
  if (source === null) return Response.json({ ...points, streak });
  if (!SOURCE_RE.test(source)) return fail("source không hợp lệ");
  return Response.json({
    ...points,
    streak,
    idx: getPointIdx(user.id, source),
    open: getOpenPoints(user.id, source),
    openWords: getOpenWords(user.id, source),
  });
}

/**
 * POST { source, idx, input, revealed?, streak?, tz? } → { awarded, gain, streak, total, today }
 * POST { source, idx, hints, tz? } → { total, today, streak: 0 }: vừa xem `hints` từ của câu idx → trừ điểm + reset chuỗi
 * POST { resetStreak: true, tz? } → { total, today, streak: 0 }: bấm Kiểm tra còn sai hoặc bỏ dở từ sai → reset chuỗi
 */
export async function POST(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  if (!allow(`points:u:${user.id}`, 900, 10 * 60 * 1000)) return fail("Quá nhiều lượt trong thời gian ngắn, thử lại sau ít phút.", 429);
  const b = await body<{
    source?: string;
    idx?: number;
    input?: string;
    revealed?: number[];
    level?: string;
    hints?: number;
    streak?: number;
    resetStreak?: boolean;
    tz?: number;
  }>(req);
  if (b.resetStreak) {
    resetDictStreak(user.id);
    return Response.json({ ...getPoints(user.id, tzOf(b.tz)), streak: 0 });
  }
  const source = str(b.source);
  if (!SOURCE_RE.test(source)) return fail("source không hợp lệ");
  if (lockedSource(user, source)) return fail("Bài này chưa mở khoá", 403);
  if (typeof b.idx !== "number" || !Number.isInteger(b.idx) || b.idx < 0 || b.idx >= 10000) return fail("idx không hợp lệ");
  if (b.hints !== undefined) {
    if (typeof b.hints !== "number" || !Number.isInteger(b.hints) || b.hints < 1 || b.hints > 200) return fail("hints không hợp lệ");
    if (!sourceEarnsPoints(source)) {
      resetDictStreak(user.id);
      return Response.json({ ...getPoints(user.id, tzOf(b.tz)), streak: 0 });
    }
    return Response.json(chargeDictHints(user.id, source, b.idx, b.hints, tzOf(b.tz)));
  }
  const [, kind, id] = source.split("/");
  const sentence = kind === "lesson" && /^\d+$/.test(id) ? dictationSentenceFor(user, Number(id), b.idx) : null;
  if (sentence === null) return fail("Không có câu này trong bài chính tả");
  const input = str(b.input);
  // Dài quá câu gốc (ä → ae dài gấp đôi + khoảng trắng giữ chỗ các ô trống) → khỏi chấm, tránh tốn CPU
  const revealed = Array.isArray(b.revealed) ? b.revealed.filter(Number.isInteger).slice(0, 200) : [];
  const check =
    input.length <= sentence.length * 2 + 200
      ? checkSlots(sentence, slotsFromInput(sentence, input), new Set(revealed), normalizeDictLevel(b.level))
      : null;
  if (!check?.correct) return fail("Câu chép chưa đúng");
  return Response.json(awardDictWords(user.id, source, b.idx, check.correct, check.total, b.streak, tzOf(b.tz)));
}
