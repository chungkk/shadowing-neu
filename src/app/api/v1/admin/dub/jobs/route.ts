import { apiAdmin, body, fail, str } from "@/lib/api";
import { dubEnabled, dubJson, mergeDubCues, parseSubtitleText, type DubCue, type DubJob } from "@/lib/dub";
import { buildTranslateItems } from "@/lib/dub-live";
import { extractVideoId, transcribeAnyYouTubeAudio } from "@/lib/youtube";
import { translateForDubbingSmart, translationEnabled } from "@/lib/translate";
import { whisperEnabled } from "@/lib/whisper";

type CreateBody = {
  url: unknown;
  title?: unknown;
  outputMode?: unknown; // "mp3" | "mp4"
  subSource?: unknown; // "auto" | "youtube" | "whisper" | "custom"
  subLang?: unknown;
  subAuto?: unknown;
  customSub?: unknown;
  translateCustom?: unknown;
  voice?: unknown;
  baseSpeed?: unknown;
  origVol?: unknown;
  dubVol?: unknown;
  maxHeight?: unknown;
};

type ProbeRes = {
  video_id: string;
  title: string;
  subtitles: { lang: string; name: string; auto: boolean }[];
};

export async function POST(req: Request) {
  const admin = await apiAdmin();
  if (admin instanceof Response) return admin;
  if (!dubEnabled()) return fail("Chưa cấu hình VIENEU_DUB_URL.", 503);

  const b = await body<CreateBody>(req);
  const videoId = extractVideoId(str(b.url).trim());
  if (!videoId) return fail("Link YouTube không hợp lệ.");
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  let subSource = str(b.subSource) || "auto";
  let subLang = str(b.subLang) || "";
  let subAuto = Boolean(b.subAuto);
  const outputMode = str(b.outputMode) === "mp4" ? "mp4" : "mp3";
  const voice = str(b.voice) || "edge:vi-VN-NamMinhNeural";
  const baseSpeed = Math.min(1.5, Math.max(0.85, Number(b.baseSpeed) || 1.15));
  const origVol = Math.min(1.0, Math.max(0, Number(b.origVol ?? 0.25)));
  const dubVol = Math.min(2.0, Math.max(0.2, Number(b.dubVol ?? 1.4)));
  const maxHeight = Number(b.maxHeight) === 1080 ? 1080 : 720;
  let title = str(b.title).trim();

  let cues: DubCue[] = [];
  let needTranslateLang: string | null = null;

  try {
    // One-click auto mode: probe video and automatically pick the best subtitle track (or Whisper)
    if (subSource === "auto" || (subSource === "youtube" && !subLang)) {
      const info = await dubJson<ProbeRes>("/probe", {
        method: "POST",
        body: { url },
        timeoutMs: 30_000,
      });
      if (!title && info.title) title = info.title;
      if (info.subtitles?.length) {
        const best = info.subtitles[0];
        subSource = "youtube";
        subLang = best.lang;
        subAuto = best.auto;
      } else if (whisperEnabled()) {
        subSource = "whisper";
      } else {
        return fail("Video này không có phụ đề trên YouTube. Hãy mở 'Tuỳ chọn nâng cao' để dán file .srt/.ass.");
      }
    }

    if (subSource === "custom") {
      cues = parseSubtitleText(str(b.customSub));
      if (!cues.length) return fail("Không đọc được câu thoại nào từ file phụ đề đã dán/tải lên.");
      if (b.translateCustom) needTranslateLang = "auto";
    } else if (subSource === "whisper") {
      const tr = await transcribeAnyYouTubeAudio(videoId, {
        quotaKey: `admin:${admin.id}`,
      });
      if (!title) title = tr.title;
      cues = tr.segments.map((s) => ({
        start_ms: Math.max(0, Math.round(s.start * 1000)),
        end_ms: Math.max(Math.round(s.end * 1000), Math.round(s.start * 1000) + 150),
        text: s.text,
      }));
      needTranslateLang = "auto";
    } else {
      const subRes = await dubJson<{ lang: string; cues: DubCue[] }>("/subtitles", {
        method: "POST",
        body: { url, lang: subLang || "de", auto: subAuto },
        timeoutMs: 45_000,
      });
      cues = subRes.cues;
      const actualLang = (subRes.lang || subLang || "").toLowerCase();
      if (!actualLang.startsWith("vi")) needTranslateLang = actualLang || "auto";
    }

    cues = mergeDubCues(cues);
    if (!cues.length) return fail("Video không có câu thoại nào để thuyết minh.");
    if (cues.length > 2500) return fail(`Phụ đề quá dài (${cues.length} câu, tối đa 2500 câu).`, 413);

    if (needTranslateLang) {
      if (!translationEnabled()) return fail("Server chưa cấu hình AI dịch phụ đề.", 503);
      const { translations } = await translateForDubbingSmart(buildTranslateItems(cues), {
        title,
        sourceLang: needTranslateLang,
      });
      cues = cues.map((c, i) => ({ ...c, text: translations[i] || c.text }));
    }

    const created = await dubJson<{ job: DubJob }>("/jobs", {
      method: "POST",
      body: {
        url,
        video_id: videoId,
        title: title || videoId,
        cues,
        voice,
        output_mode: outputMode,
        base_speed: baseSpeed,
        max_speed: Math.max(1.45, baseSpeed + 0.25),
        orig_vol: origVol,
        dub_vol: dubVol,
        max_height: maxHeight,
      },
      timeoutMs: 30_000,
    });
    return Response.json(created, { status: 201 });
  } catch (e) {
    return fail((e as Error).message, 502);
  }
}
