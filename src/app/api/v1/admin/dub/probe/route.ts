import { apiAdmin, body, fail, str } from "@/lib/api";
import { dubEnabled, dubJson } from "@/lib/dub";
import { extractVideoId } from "@/lib/youtube-id";
import { whisperEnabled } from "@/lib/whisper";

type ProbeResponse = {
  video_id: string;
  title: string;
  duration: number;
  channel: string;
  thumbnail: string;
  language: string;
  subtitles: { lang: string; name: string; auto: boolean }[];
};

export async function POST(req: Request) {
  const admin = await apiAdmin();
  if (admin instanceof Response) return admin;
  if (!dubEnabled()) return fail("Chưa cấu hình VIENEU_DUB_URL.", 503);

  const b = await body<{ url: unknown }>(req);
  const raw = str(b.url).trim();
  const videoId = extractVideoId(raw);
  if (!videoId) return fail("Link YouTube không hợp lệ.");

  try {
    const info = await dubJson<ProbeResponse>("/probe", {
      method: "POST",
      body: { url: `https://www.youtube.com/watch?v=${videoId}` },
      timeoutMs: 50_000,
    });
    return Response.json({ ...info, whisperAvailable: whisperEnabled() });
  } catch (e) {
    return fail((e as Error).message, 502);
  }
}
