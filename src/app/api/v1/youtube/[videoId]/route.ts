import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { extractVideoId, getSavedTranscript, getYouTubeTranscript, saveUploadedTranscript } from "@/lib/youtube";
import { apiUser, body, fail } from "@/lib/api";

/**
 * GET /api/v1/youtube/<videoId hoặc link đã encode>?lang=<mã | whisper>
 * → { videoId, title, track, tracks, segments }. Whisper (tốn tiền) chỉ cho người đã đăng nhập.
 * ?saved=1 → chỉ trả phụ đề đã lưu (không gọi YouTube); chưa có → 404 — app dùng để hỏi trước khi tự lấy.
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/v1/youtube/[videoId]">) {
  const user = await getCurrentUser();
  const videoId = extractVideoId(decodeURIComponent((await ctx.params).videoId));
  if (!videoId) return fail("Link YouTube không hợp lệ");

  if (req.nextUrl.searchParams.get("saved")) {
    const saved = await getSavedTranscript(videoId);
    return saved ? Response.json(saved) : fail("Chưa có phụ đề lưu sẵn", 404);
  }

  const lang = req.nextUrl.searchParams.get("lang") || undefined;
  try {
    return Response.json(await getYouTubeTranscript(videoId, lang, { whisper: !!user }));
  } catch (e) {
    return fail((e as Error).message, 502);
  }
}

/**
 * POST { title, track, tracks, segments } — app gửi phụ đề tiếng Đức lấy được trên điện thoại
 * để lưu cho mọi người dùng chung (web cũng dùng). Cần đăng nhập. → phụ đề đã lưu (có thể là bản cũ).
 */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/v1/youtube/[videoId]">) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const videoId = extractVideoId(decodeURIComponent((await ctx.params).videoId));
  if (!videoId) return fail("Link YouTube không hợp lệ");
  const res = await saveUploadedTranscript(
    videoId,
    await body<{ title: unknown; track: unknown; tracks: unknown; segments: unknown }>(req),
    user.id,
  );
  return typeof res === "string" ? fail(res) : Response.json(res, { status: 201 });
}
