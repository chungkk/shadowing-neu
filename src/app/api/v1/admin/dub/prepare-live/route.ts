import { apiAdmin, body, fail, str } from "@/lib/api";
import { parseSubtitleText, type DubCue } from "@/lib/dub";
import { prepareLiveDub } from "@/lib/dub-live";
import { extractVideoId, getYouTubeTranscript } from "@/lib/youtube";
import { mergeIntoSentences } from "@/lib/subtitles";
import { translateForDubbing, translationEnabled } from "@/lib/translate";

type PrepareBody = {
  url: unknown;
  subSource?: unknown; // "auto" | "whisper" | "custom"
  customSub?: unknown;
  translateCustom?: unknown;
};

/**
 * Chuẩn bị phụ đề tiếng Việt để chạy thuyết minh trực tiếp trên trình duyệt (Kokoro Lite WASM).
 * Không tốn CPU TTS hay lưu file MP3/MP4 trên VPS.
 */
export async function POST(req: Request) {
  const admin = await apiAdmin();
  if (admin instanceof Response) return admin;

  const b = await body<PrepareBody>(req);
  const videoId = extractVideoId(str(b.url).trim());
  if (!videoId) return fail("Link YouTube không hợp lệ.");

  const subSource = str(b.subSource) || "auto";

  try {
    if (subSource === "auto") {
      const res = await prepareLiveDub(videoId, {
        allowWhisper: true,
        quotaKey: `admin:${admin.id}`,
        maxCues: 2500,
      });
      return Response.json(res);
    }

    let title = "";
    let cues: (DubCue & { orig?: string })[] = [];
    let needTranslateLang: string | null = null;

    if (subSource === "custom") {
      cues = parseSubtitleText(str(b.customSub));
      if (!cues.length) return fail("Không đọc được câu thoại nào từ file phụ đề.");
      if (b.translateCustom) needTranslateLang = "auto";
    } else if (subSource === "whisper") {
      const tr = await getYouTubeTranscript(videoId, "whisper", {
        whisper: true,
        quotaKey: `admin:${admin.id}`,
      });
      title = tr.title;
      cues = mergeIntoSentences(tr.segments).map((s) => ({
        start_ms: Math.max(0, Math.round(s.start * 1000)),
        end_ms: Math.max(Math.round(s.end * 1000), Math.round(s.start * 1000) + 150),
        text: s.text,
      }));
      needTranslateLang = "auto";
    }

    if (!cues.length) return fail("Không tìm thấy phụ đề cho video này.");
    if (cues.length > 2500) return fail(`Phụ đề quá dài (${cues.length} câu).`, 413);

    if (needTranslateLang) {
      if (!translationEnabled()) return fail("Server chưa cấu hình AI dịch phụ đề.", 503);
      const translated = await translateForDubbing(
        cues.map((c) => c.text),
        needTranslateLang,
      );
      cues = cues.map((c, i) => ({ ...c, text: translated[i] || c.text, orig: c.text }));
    }

    return Response.json({
      videoId,
      title: title || videoId,
      sourceLang: needTranslateLang ?? "vi",
      cues,
    });
  } catch (e) {
    return fail((e as Error).message, 502);
  }
}
