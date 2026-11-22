import { apiAdmin, body, fail, str } from "@/lib/api";
import { dubEnabled, dubJson, parseSubtitleText, type DubCue, type DubJob } from "@/lib/dub";
import { extractVideoId, getYouTubeTranscript } from "@/lib/youtube";
import { mergeIntoSentences } from "@/lib/subtitles";
import { translateForDubbing, translationEnabled } from "@/lib/translate";

type CreateBody = {
  url: unknown;
  title?: unknown;
  subSource?: unknown; // "youtube" | "whisper" | "custom"
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

export async function POST(req: Request) {
  const admin = await apiAdmin();
  if (admin instanceof Response) return admin;
  if (!dubEnabled()) return fail("Chưa cấu hình VIENEU_DUB_URL.", 503);

  const b = await body<CreateBody>(req);
  const videoId = extractVideoId(str(b.url).trim());
  if (!videoId) return fail("Link YouTube không hợp lệ.");
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  const subSource = str(b.subSource) || "youtube";
  const subLang = str(b.subLang) || "de";
  const subAuto = Boolean(b.subAuto);
  const voice = str(b.voice) || "Lạc Phi";
  const baseSpeed = Math.min(1.5, Math.max(0.85, Number(b.baseSpeed) || 1.15));
  const origVol = Math.min(1.0, Math.max(0, Number(b.origVol ?? 0.25)));
  const dubVol = Math.min(2.0, Math.max(0.2, Number(b.dubVol ?? 1.4)));
  const maxHeight = Number(b.maxHeight) === 1080 ? 1080 : 720;
  let title = str(b.title).trim();

  let cues: DubCue[] = [];
  let needTranslateLang: string | null = null;

  try {
    if (subSource === "custom") {
      cues = parseSubtitleText(str(b.customSub));
      if (!cues.length) return fail("Không đọc được câu thoại nào từ file phụ đề đã dán/tải lên.");
      if (b.translateCustom) needTranslateLang = "auto";
    } else if (subSource === "whisper") {
      const tr = await getYouTubeTranscript(videoId, "whisper", {
        whisper: true,
        quotaKey: `admin:${admin.id}`,
      });
      if (!title) title = tr.title;
      const merged = mergeIntoSentences(tr.segments);
      cues = merged.map((s) => ({
        start_ms: Math.max(0, Math.round(s.start * 1000)),
        end_ms: Math.max(Math.round(s.end * 1000), Math.round(s.start * 1000) + 150),
        text: s.text,
      }));
      needTranslateLang = "auto";
    } else {
      const subRes = await dubJson<{ lang: string; cues: DubCue[] }>("/subtitles", {
        method: "POST",
        body: { url, lang: subLang, auto: subAuto },
        timeoutMs: 55_000,
      });
      cues = subRes.cues;
      if (!subLang.toLowerCase().startsWith("vi")) needTranslateLang = subLang;
    }

    if (!cues.length) return fail("Video không có câu thoại nào để thuyết minh.");
    if (cues.length > 2500) return fail(`Phụ đề quá dài (${cues.length} câu, tối đa 2500 câu).`, 413);

    if (needTranslateLang) {
      if (!translationEnabled()) return fail("Server chưa cấu hình AI dịch phụ đề.", 503);
      const translated = await translateForDubbing(
        cues.map((c) => c.text),
        needTranslateLang,
      );
      cues = cues.map((c, i) => ({ ...c, text: translated[i] || c.text }));
    }

    const created = await dubJson<{ job: DubJob }>("/jobs", {
      method: "POST",
      body: {
        url,
        title: title || videoId,
        cues,
        voice,
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
