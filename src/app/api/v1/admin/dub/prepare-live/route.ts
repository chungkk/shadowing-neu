import { apiAdmin, body, fail, str } from "@/lib/api";
import { mergeDubCues, parseSubtitleText, type DubCue } from "@/lib/dub";
import { buildTranslateItems, prepareLiveDub } from "@/lib/dub-live";
import { extractVideoId, transcribeAnyYouTubeAudio } from "@/lib/youtube";
import { translateForDubbingSmart, translationEnabled } from "@/lib/translate";

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
    let rawCues: DubCue[] = [];
    let needTranslateLang: string | null = null;

    if (subSource === "custom") {
      rawCues = parseSubtitleText(str(b.customSub));
      if (!rawCues.length) return fail("Không đọc được câu thoại nào từ file phụ đề.");
      if (b.translateCustom) needTranslateLang = "auto";
    } else if (subSource === "whisper") {
      const tr = await transcribeAnyYouTubeAudio(videoId, {
        quotaKey: `admin:${admin.id}`,
      });
      title = tr.title;
      rawCues = tr.segments.map((s) => ({
        start_ms: Math.max(0, Math.round(s.start * 1000)),
        end_ms: Math.max(Math.round(s.end * 1000), Math.round(s.start * 1000) + 150),
        text: s.text,
      }));
      needTranslateLang = "auto";
    }

    const merged = mergeDubCues(rawCues);
    if (!merged.length) return fail("Không tìm thấy phụ đề cho video này.");
    if (merged.length > 2500) return fail(`Phụ đề quá dài (${merged.length} câu).`, 413);

    let cues: (DubCue & { orig?: string })[] = merged;
    let style = null;
    if (needTranslateLang) {
      if (!translationEnabled()) return fail("Server chưa cấu hình AI dịch phụ đề.", 503);
      const res = await translateForDubbingSmart(buildTranslateItems(merged), {
        title,
        sourceLang: needTranslateLang,
      });
      style = res.style;
      cues = merged.map((c, i) => ({ ...c, text: res.translations[i] || c.text, orig: c.text }));
    }

    return Response.json({
      videoId,
      title: title || videoId,
      sourceLang: needTranslateLang ?? "vi",
      style,
      cues,
    });
  } catch (e) {
    return fail((e as Error).message, 502);
  }
}
