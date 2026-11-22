import "server-only";
import { connection } from "next/server";
import { getCached, setCached } from "./db";
import { dubEnabled, dubJson, type DubCue } from "./dub";
import { mergeIntoSentences } from "./subtitles";
import { translateForDubbing, translationEnabled } from "./translate";
import { whisperEnabled } from "./whisper";
import { fetchAnyYouTubeSubtitles, getYouTubeTranscript, VideoTooLongError } from "./youtube";

export type LiveDubCue = DubCue & {
  /** Câu gốc trước khi dịch (nếu video không phải tiếng Việt) */
  orig?: string;
};

export type LiveDubResult = {
  videoId: string;
  title: string;
  sourceLang: string;
  cues: LiveDubCue[];
};

type ProbeRes = {
  video_id: string;
  title: string;
  duration?: number;
  subtitles: { lang: string; name: string; auto: boolean }[];
};

const CACHE_PREFIX = "dub:live:v1:";
const gd = globalThis as unknown as { __dubLiveInflight?: Map<string, Promise<LiveDubResult>> };
const inflight = (gd.__dubLiveInflight ??= new Map());

export function getCachedLiveDub(videoId: string): LiveDubResult | null {
  const hit = getCached<LiveDubResult>(`${CACHE_PREFIX}${videoId}`);
  return hit && Array.isArray(hit.cues) && hit.cues.length > 0 ? hit : null;
}

function pickProbeSub(subs: ProbeRes["subtitles"]) {
  const isVi = (s: { lang: string }) => s.lang.toLowerCase().startsWith("vi");
  return (
    subs.find((s) => !s.auto && isVi(s)) ??
    subs.find((s) => !s.auto) ??
    subs.find((s) => isVi(s)) ??
    subs[0]
  );
}

export async function prepareLiveDub(
  videoId: string,
  opts: {
    allowWhisper?: boolean;
    quotaKey?: string;
    maxSeconds?: number;
    maxCues?: number;
  } = {},
): Promise<LiveDubResult & { cached: boolean }> {
  await connection();
  const hit = getCachedLiveDub(videoId);
  if (hit) return { ...hit, cached: true };

  const pending = inflight.get(videoId);
  if (pending) return { ...(await pending), cached: false };

  const run = (async (): Promise<LiveDubResult> => {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const maxCues = opts.maxCues ?? 1800;
    let title = "";
    let sourceLang = "auto";
    let cues: LiveDubCue[] = [];

    // 1. Ưu tiên dịch vụ vieneu-dub (Innertube mọi ngôn ngữ) nếu đã cấu hình
    if (dubEnabled()) {
      try {
        const info = await dubJson<ProbeRes>("/probe", { method: "POST", body: { url }, timeoutMs: 25_000 });
        title = info.title || "";
        if (opts.maxSeconds && info.duration && info.duration > opts.maxSeconds) {
          throw new VideoTooLongError(info.duration, opts.maxSeconds);
        }
        if (info.subtitles?.length) {
          const chosen = pickProbeSub(info.subtitles);
          const subRes = await dubJson<{ lang: string; cues: DubCue[] }>("/subtitles", {
            method: "POST",
            body: { url, lang: chosen.lang, auto: chosen.auto },
            timeoutMs: 35_000,
          });
          cues = subRes.cues;
          sourceLang = (subRes.lang || chosen.lang || "auto").toLowerCase();
        }
      } catch (e) {
        if (e instanceof VideoTooLongError) throw e;
        // Lỗi probe/subtitles từ sidecar → thử tiếp bằng Innertube / yt-dlp tích hợp của HalloVN
      }
    }

    // 2. Dự phòng: lấy phụ đề mọi ngôn ngữ trực tiếp bằng Innertube / yt-dlp của HalloVN
    if (!cues.length) {
      const anySub = await fetchAnyYouTubeSubtitles(videoId, { maxSeconds: opts.maxSeconds }).catch((e) => {
        if (e instanceof VideoTooLongError) throw e;
        return null;
      });
      if (anySub && anySub.segments.length) {
        title = title || anySub.title;
        sourceLang = anySub.lang.toLowerCase();
        cues = mergeIntoSentences(anySub.segments).map((s) => ({
          start_ms: Math.max(0, Math.round(s.start * 1000)),
          end_ms: Math.max(Math.round(s.end * 1000), Math.round(s.start * 1000) + 150),
          text: s.text,
        }));
      }
    }

    // 3. Nếu video hoàn toàn không có phụ đề trên YouTube → Whisper (chỉ khi được phép)
    if (!cues.length && opts.allowWhisper && whisperEnabled()) {
      const tr = await getYouTubeTranscript(videoId, "whisper", {
        whisper: true,
        quotaKey: opts.quotaKey,
        maxSeconds: opts.maxSeconds,
      });
      title = title || tr.title;
      sourceLang = "auto";
      cues = mergeIntoSentences(tr.segments).map((s) => ({
        start_ms: Math.max(0, Math.round(s.start * 1000)),
        end_ms: Math.max(Math.round(s.end * 1000), Math.round(s.start * 1000) + 150),
        text: s.text,
      }));
    }

    if (!cues.length) {
      throw new Error(
        opts.allowWhisper
          ? "Không tìm thấy phụ đề cho video này."
          : "Video này chưa có phụ đề trên YouTube. Bạn hãy chọn video có bật phụ đề (CC) hoặc đăng nhập để tạo bằng AI.",
      );
    }

    if (cues.length > maxCues) {
      throw new Error(`Phụ đề video quá dài (${cues.length} câu, tối đa ${maxCues} câu). Hãy chọn video ngắn hơn nhé.`);
    }

    // 4. Dịch sang tiếng Việt nếu nguồn không phải tiếng Việt
    if (!sourceLang.startsWith("vi")) {
      if (!translationEnabled()) throw new Error("Server chưa cấu hình AI dịch phụ đề.");
      const translated = await translateForDubbing(
        cues.map((c) => c.text),
        sourceLang,
      );
      cues = cues.map((c, i) => ({
        start_ms: c.start_ms,
        end_ms: c.end_ms,
        text: translated[i] || c.text,
        orig: c.text,
      }));
    }

    const result: LiveDubResult = {
      videoId,
      title: title || videoId,
      sourceLang,
      cues,
    };
    setCached(`${CACHE_PREFIX}${videoId}`, result, null);
    return result;
  })().finally(() => {
    inflight.delete(videoId);
  });

  inflight.set(videoId, run);
  return { ...(await run), cached: false };
}
