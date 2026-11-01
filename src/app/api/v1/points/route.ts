import type { NextRequest } from "next/server";
import { awardDictPoint, chargeDictHints, getCached, getPointIdx, getPoints, publishedSentenceCount, savedTranscriptKeys, watchPointsSince } from "@/lib/db";
import { POINTS_CORRECT } from "@/lib/dictation";
import { mergeIntoSentences } from "@/lib/subtitles";
import type { Transcript } from "@/lib/youtube";
import { apiUser, body, fail, str } from "@/lib/api";
import { lockedSource } from "@/lib/access";
import { allow } from "@/lib/rate-limit";

/**
 * Điểm chính tả của người đang đăng nhập: chép đúng hết 1 câu (không xem từ nào) → +2 điểm, mỗi câu chỉ tính 1 lần;
 * mỗi từ bấm xem → −1 điểm.
 * source: "/lesson/<id>" hoặc "/watch/<videoId>" (như /progress) · tz: phút, như Date.getTimezoneOffset() — để tính "hôm nay".
 */

const SOURCE_RE = /^\/(lesson|watch)\/[\w-]{1,64}$/;

/**
 * Điểm mua được bài (khoá bài học) → chỉ cộng cho câu có thật: idx < số câu (đã gộp, như màn học — chỉ chế độ gộp câu
 * mới tính điểm) của bài đã đăng, hoặc của video YouTube đã có phụ đề lưu trên server (nhiều track → lấy track nhiều câu
 * nhất, người học có thể chọn track khác mặc định). null = không có bài / video này.
 */
function sentenceLimit(source: string): number | null {
  const [, kind, id] = source.split("/");
  if (kind === "lesson") return /^\d+$/.test(id) ? publishedSentenceCount(Number(id)) : null;
  const counts = savedTranscriptKeys(id).map((k) => mergeIntoSentences(getCached<Transcript>(k)?.segments ?? []).length);
  return counts.length ? Math.max(...counts) : null;
}

/**
 * Phụ đề video do app tự gửi lên (POST /youtube/<id>) → ai cũng tạo được "video" nhiều câu tuỳ ý.
 * Nên điểm từ video YouTube có trần trong 24 giờ (bài học admin đăng thì không cần: số câu đã cố định)
 */
const WATCH_POINTS_PER_DAY = 200;
const DAY_MS = 86_400_000;

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
 * POST { source, idx, tz? } → { awarded, total, today } (câu đã tính rồi → awarded = false)
 * POST { source, idx, hints, tz? } → { total, today }: vừa xem `hints` từ của câu idx → trừ điểm
 */
export async function POST(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  if (!allow(`points:u:${user.id}`, 300, 10 * 60 * 1000)) return fail("Quá nhiều lượt trong thời gian ngắn, thử lại sau ít phút.", 429);
  const b = await body<{ source: string; idx: number; hints?: number; tz: number }>(req);
  const source = str(b.source);
  if (!SOURCE_RE.test(source)) return fail("source không hợp lệ");
  if (lockedSource(user, source)) return fail("Bài này chưa mở khoá", 403);
  if (typeof b.idx !== "number" || !Number.isInteger(b.idx) || b.idx < 0 || b.idx >= 10000) return fail("idx không hợp lệ");
  if (b.hints !== undefined) {
    if (typeof b.hints !== "number" || !Number.isInteger(b.hints) || b.hints < 1 || b.hints > 200) return fail("hints không hợp lệ");
    return Response.json(chargeDictHints(user.id, source, b.idx, b.hints, tzOf(b.tz)));
  }
  const limit = sentenceLimit(source);
  if (limit === null || b.idx >= limit) return fail("Không có câu này trong bài");
  // Hết trần điểm video hôm nay → không cộng (awarded = false, câu chưa được tính → mai làm lại vẫn được điểm)
  if (source.startsWith("/watch/") && watchPointsSince(user.id, Date.now() - DAY_MS) + POINTS_CORRECT > WATCH_POINTS_PER_DAY)
    return Response.json({ ...getPoints(user.id, tzOf(b.tz)), awarded: false, capped: true });
  return Response.json(awardDictPoint(user.id, source, b.idx, tzOf(b.tz)));
}
