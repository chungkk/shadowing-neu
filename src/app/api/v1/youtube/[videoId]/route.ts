import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { extractVideoId, getYouTubeTranscript } from "@/lib/youtube";
import { fail } from "@/lib/api";

/**
 * GET /api/v1/youtube/<videoId hoặc link đã encode>?lang=<mã | whisper>
 * → { videoId, title, track, tracks, segments }. Whisper (tốn tiền) chỉ cho người đã đăng nhập.
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/v1/youtube/[videoId]">) {
  const user = await getCurrentUser();
  const videoId = extractVideoId(decodeURIComponent((await ctx.params).videoId));
  if (!videoId) return fail("Link YouTube không hợp lệ");
  const lang = req.nextUrl.searchParams.get("lang") || undefined;
  try {
    return Response.json(await getYouTubeTranscript(videoId, lang, { whisper: !!user }));
  } catch (e) {
    return fail((e as Error).message, 502);
  }
}
