import type { NextRequest } from "next/server";
import { extractVideoId, getYouTubeTranscript } from "@/lib/youtube";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url") ?? "";
  const lang = req.nextUrl.searchParams.get("lang") ?? undefined;
  const videoId = extractVideoId(url);
  if (!videoId) return Response.json({ error: "Link YouTube không hợp lệ" }, { status: 400 });

  try {
    return Response.json(await getYouTubeTranscript(videoId, lang));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
