import { parseYouTubeXml } from "@shared/subtitles";
import { searchYouTube, type VideoHit } from "@shared/youtube-search";
import { api, type Track, type Transcript } from "./api";

/**
 * Lấy phụ đề tiếng Đức ngay trên điện thoại (IP nhà mạng / 4G nên YouTube không chặn như IP VPS).
 * Cách gọi giống server (client ANDROID của Innertube) + đọc phụ đề bằng code dùng chung với web.
 * Không có phụ đề tiếng Đức / bị chặn → null (app nhờ server lấy hộ / tạo bằng Whisper).
 */

const UA = "com.google.android.youtube/20.10.38 (Linux; U; Android 14)";

type CaptionTrack = { baseUrl: string; languageCode: string; kind?: string; name?: { simpleText?: string; runs?: { text: string }[] } };

export async function fetchTranscriptOnDevice(videoId: string): Promise<Transcript | null> {
  try {
    const res = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": UA },
      body: JSON.stringify({ context: { client: { clientName: "ANDROID", clientVersion: "20.10.38", hl: "de" } }, videoId }),
    });
    const player = await res.json();
    if (player.playabilityStatus?.status !== "OK") return null;

    const de = ((player.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? []) as CaptionTrack[])
      .filter((t) => t.languageCode.startsWith("de"))
      .map((t) => ({
        baseUrl: t.baseUrl,
        track: {
          languageCode: t.languageCode,
          name: t.name?.simpleText ?? t.name?.runs?.map((r) => r.text).join("") ?? t.languageCode,
          auto: t.kind === "asr",
        } satisfies Track,
      }));
    const picked = de.find((t) => !t.track.auto) ?? de[0]; // ưu tiên phụ đề do người làm
    if (!picked) return null;

    // srv3: phụ đề tự động có thời gian từng từ → cắt câu chính xác
    const xml = await (await fetch(picked.baseUrl.replace(/&fmt=[^&]*/, "") + "&fmt=srv3")).text();
    const segments = parseYouTubeXml(xml);
    if (!segments.length) return null;
    return {
      videoId,
      title: player.videoDetails?.title ?? videoId,
      track: picked.track,
      tracks: de.map((t) => t.track),
      segments,
    };
  } catch {
    return null;
  }
}

/** Tìm video theo từ khoá: gọi YouTube ngay trên điện thoại, lỗi / không ra gì thì nhờ server tìm hộ */
export async function searchVideos(query: string): Promise<VideoHit[]> {
  try {
    const hits = await searchYouTube(query);
    if (hits.length) return hits;
  } catch {}
  return (await api<{ videos: VideoHit[] }>(`/youtube/search?q=${encodeURIComponent(query)}`)).videos;
}
