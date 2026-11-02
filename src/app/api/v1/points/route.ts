import type { NextRequest } from "next/server";
import { awardDictPoint, chargeDictHints, getPointIdx, getPoints } from "@/lib/db";
import { checkDictation } from "@/lib/dictation";
import { apiUser, body, fail, str } from "@/lib/api";
import { dictationSentenceFor, lockedSource } from "@/lib/access";
import { allow } from "@/lib/rate-limit";

/**
 * Điểm chính tả của người đang đăng nhập: chép đúng hết 1 câu (không xem từ nào) → +2 điểm, mỗi câu chỉ tính 1 lần;
 * mỗi từ bấm xem → −1 điểm.
 * source: "/lesson/<id>" hoặc "/watch/<videoId>" (như /progress) · tz: phút, như Date.getTimezoneOffset() — để tính "hôm nay".
 */

const SOURCE_RE = /^\/(lesson|watch)\/[\w-]{1,64}$/;

const tzOf = (v: unknown) => (Number.isFinite(Number(v)) && Math.abs(Number(v)) <= 840 ? Number(v) : 0);

/** GET ?tz=… → { total, today } · thêm ?source=… → kèm { idx: [...] } các câu của bài đó đã được tính điểm */
export async function GET(req: NextRequest) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const q = req.nextUrl.searchParams;
  const points = getPoints(user.id, tzOf(q.get("tz")));
  const source = q.get("source");
  if (source === null) return Response.json(points);
  if (!SOURCE_RE.test(source)) return fail("source không hợp lệ");
  return Response.json({ ...points, idx: getPointIdx(user.id, source) });
}

/**
 * POST { source, idx, input, tz? } → { awarded, total, today } (câu đã tính rồi → awarded = false): input = câu đã chép, server tự chấm lại
 * vì điểm mua được bài. Chỉ tính ở bài có bật Chính tả mà người này được xem (video tự dán chỉ Shadowing, không có chính tả)
 * POST { source, idx, hints, tz? } → { total, today }: vừa xem `hints` từ của câu idx → trừ điểm
 */
export async function POST(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  if (!allow(`points:u:${user.id}`, 300, 10 * 60 * 1000)) return fail("Quá nhiều lượt trong thời gian ngắn, thử lại sau ít phút.", 429);
  const b = await body<{ source: string; idx: number; input?: string; hints?: number; tz: number }>(req);
  const source = str(b.source);
  if (!SOURCE_RE.test(source)) return fail("source không hợp lệ");
  if (lockedSource(user, source)) return fail("Bài này chưa mở khoá", 403);
  if (typeof b.idx !== "number" || !Number.isInteger(b.idx) || b.idx < 0 || b.idx >= 10000) return fail("idx không hợp lệ");
  if (b.hints !== undefined) {
    if (typeof b.hints !== "number" || !Number.isInteger(b.hints) || b.hints < 1 || b.hints > 200) return fail("hints không hợp lệ");
    return Response.json(chargeDictHints(user.id, source, b.idx, b.hints, tzOf(b.tz)));
  }
  const [, kind, id] = source.split("/");
  const sentence = kind === "lesson" && /^\d+$/.test(id) ? dictationSentenceFor(user, Number(id), b.idx) : null;
  if (sentence === null) return fail("Không có câu này trong bài chính tả");
  const input = str(b.input);
  // Dài quá câu gốc (ä → ae dài gấp đôi là tối đa) → khỏi chấm, tránh tốn CPU
  const check = input.length <= sentence.length * 2 + 20 ? checkDictation(sentence, input) : null;
  if (!check?.done || check.correct !== check.total) return fail("Câu chép chưa đúng");
  return Response.json(awardDictPoint(user.id, source, b.idx, tzOf(b.tz)));
}
