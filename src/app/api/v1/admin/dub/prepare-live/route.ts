import { apiAdmin, body, fail, str } from "@/lib/api";
import { dubEnabled, dubJson, parseSubtitleText, type DubCue } from "@/lib/dub";
import { extractVideoId, getYouTubeTranscript } from "@/lib/youtube";
import { mergeIntoSentences } from "@/lib/subtitles";
import { translateForDubbing, translationEnabled } from "@/lib/translate";
import { whisperEnabled } from "@/lib/whisper";

type PrepareBody = {
  url: unknown;
  subSource?: unknown; // "auto" | "whisper" | "custom"
  customSub?: unknown;
  translateCustom?: unknown;
};

type ProbeRes = {
  video_id: string;
  title: string;
  subtitles: { lang: string; name: string; auto: boolean }[];
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
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  let subSource = str(b.subSource) || "auto";
  let subLang = "";
  let subAuto = false;
  let title = "";
  let cues: DubCue[] = [];
  let needTranslateLang: string | null = null;

  try {
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
    } else {
      // Auto mode: prefer vieneu-dub Innertube (all languages), fallback to HalloVN's own getYouTubeTranscript
      if (dubEnabled()) {
        const info = await dubJson<ProbeRes>("/probe", { method: "POST", body: { url }, timeoutMs: 25_000 });
        title = info.title || "";
        if (info.subtitles?.length) {
          subLang = info.subtitles[0].lang;
          subAuto = info.subtitles[0].auto;
          const subRes = await dubJson<{ lang: string; cues: DubCue[] }>("/subtitles", {
            method: "POST",
            body: { url, lang: subLang, auto: subAuto },
            timeoutMs: 35_000,
          });
          cues = subRes.cues;
          const actualLang = (subRes.lang || subLang).toLowerCase();
          if (!actualLang.startsWith("vi")) needTranslateLang = actualLang || "auto";
        } else if (whisperEnabled()) {
          subSource = "whisper";
        }
      }

      if (!cues.length) {
        const tr = await getYouTubeTranscript(videoId, subSource === "whisper" ? "whisper" : undefined, {
          whisper: whisperEnabled(),
          quotaKey: `admin:${admin.id}`,
        });
        title = title || tr.title;
        cues = mergeIntoSentences(tr.segments).map((s) => ({
          start_ms: Math.max(0, Math.round(s.start * 1000)),
          end_ms: Math.max(Math.round(s.end * 1000), Math.round(s.start * 1000) + 150),
          text: s.text,
        }));
        needTranslateLang = tr.track.languageCode.startsWith("vi") ? null : "auto";
      }
    }

    if (!cues.length) return fail("Không tìm thấy phụ đề cho video này.");
    if (cues.length > 2500) return fail(`Phụ đề quá dài (${cues.length} câu).`, 413);

    if (needTranslateLang) {
      if (!translationEnabled()) return fail("Server chưa cấu hình AI dịch phụ đề.", 503);
      const translated = await translateForDubbing(
        cues.map((c) => c.text),
        needTranslateLang,
      );
      cues = cues.map((c, i) => ({ ...c, text: translated[i] || c.text }));
    }

    return Response.json({
      videoId,
      title: title || videoId,
      cues,
    });
  } catch (e) {
    return fail((e as Error).message, 502);
  }
}
