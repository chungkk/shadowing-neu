import "server-only";
import { connection } from "next/server";
import { getCached, setCached } from "./db";
import { dubEnabled, dubJson, mergeDubCues, type DubCue } from "./dub";
import { addPunctuation, lacksPunctuation, punctuationEnabled } from "./punctuate";
import type { Segment } from "./subtitles";
import { translateForDubbingSmart, translationEnabled, type DubStyleCard } from "./translate";
import { whisperEnabled } from "./whisper";
import { fetchAnyYouTubeSubtitles, transcribeAnyYouTubeAudio, VideoTooLongError } from "./youtube";

export type LiveDubCue = DubCue & {
  /** Câu gốc trước khi dịch (nếu video không phải tiếng Việt) */
  orig?: string;
};

export type LiveDubResult = {
  videoId: string;
  title: string;
  sourceLang: string;
  style?: DubStyleCard | null;
  cues: LiveDubCue[];
};

type ProbeRes = {
  video_id: string;
  title: string;
  duration?: number;
  subtitles: { lang: string; name: string; auto: boolean }[];
};

// v2: gộp câu hoàn chỉnh + thêm dấu câu đa ngôn ngữ + dịch theo ngữ cảnh (Style Card + cửa sổ trượt) + căn thời lượng
const CACHE_PREFIX = "dub:live:v2:";
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

function segmentsToCues(segments: Segment[]): DubCue[] {
  return segments.map((s) => ({
    start_ms: Math.max(0, Math.round(s.start * 1000)),
    end_ms: Math.max(Math.round(s.end * 1000), Math.round(s.start * 1000) + 150),
    text: s.text,
  }));
}

/** Nếu phụ đề tự động thiếu dấu chấm câu → bổ sung dấu câu đa ngôn ngữ trước khi gộp thành câu trọn vẹn */
async function ensurePunctuatedCues(cues: DubCue[], lang: string): Promise<DubCue[]> {
  if (!punctuationEnabled() || cues.length < 4) return cues;
  const segs: Segment[] = cues.map((c) => ({
    start: c.start_ms / 1000,
    end: c.end_ms / 1000,
    text: c.text,
  }));
  if (!lacksPunctuation(segs)) return cues;
  const fixed = await addPunctuation(segs, lang);
  return fixed.map((s) => ({
    start_ms: Math.max(0, Math.round(s.start * 1000)),
    end_ms: Math.max(Math.round(s.end * 1000), Math.round(s.start * 1000) + 150),
    text: s.text,
  }));
}

/** Tính thời lượng & khung thời gian khả dụng trước câu kế tiếp để AI căn độ dài bản dịch khớp hình */
export function buildTranslateItems(cues: DubCue[]) {
  return cues.map((c, i) => {
    const durSec = Math.max(0.4, (c.end_ms - c.start_ms) / 1000);
    const next = cues[i + 1];
    const availSec = next
      ? Math.max(durSec, Math.min(durSec + 1.2, (next.start_ms - c.start_ms) / 1000))
      : durSec + 1.0;
    return { text: c.text, durationSec: durSec, availSec };
  });
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
    let rawCues: DubCue[] = [];
    let isAutoSub = false;

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
          rawCues = subRes.cues;
          sourceLang = (subRes.lang || chosen.lang || "auto").toLowerCase();
          isAutoSub = chosen.auto;
        }
      } catch (e) {
        if (e instanceof VideoTooLongError) throw e;
        // Lỗi probe/subtitles từ sidecar → thử tiếp bằng Innertube / yt-dlp tích hợp của HalloVN
      }
    }

    // 2. Dự phòng: lấy phụ đề mọi ngôn ngữ trực tiếp bằng Innertube / yt-dlp của HalloVN
    if (!rawCues.length) {
      const anySub = await fetchAnyYouTubeSubtitles(videoId, { maxSeconds: opts.maxSeconds }).catch((e) => {
        if (e instanceof VideoTooLongError) throw e;
        return null;
      });
      if (anySub && anySub.segments.length) {
        title = title || anySub.title;
        sourceLang = anySub.lang.toLowerCase();
        isAutoSub = anySub.auto;
        rawCues = segmentsToCues(anySub.segments);
      }
    }

    // 3. Nếu video hoàn toàn không có phụ đề trên YouTube → Whisper tự nhận diện ngôn ngữ (chỉ khi được phép)
    if (!rawCues.length && opts.allowWhisper && whisperEnabled()) {
      const tr = await transcribeAnyYouTubeAudio(videoId, {
        quotaKey: opts.quotaKey,
        maxSeconds: opts.maxSeconds,
      });
      title = title || tr.title;
      sourceLang = "auto";
      rawCues = segmentsToCues(tr.segments);
    }

    if (!rawCues.length) {
      throw new Error(
        opts.allowWhisper
          ? "Không tìm thấy phụ đề cho video này."
          : "Video này chưa có phụ đề trên YouTube. Bạn hãy chọn video có bật phụ đề (CC) hoặc đăng nhập để tạo bằng AI.",
      );
    }

    // Bước 1 (Combo 1): Thêm dấu câu cho phụ đề tự động rồi gộp các mảnh vụn thành câu trọn vẹn
    const punctuated = isAutoSub ? await ensurePunctuatedCues(rawCues, sourceLang) : rawCues;
    const merged = mergeDubCues(punctuated);

    if (!merged.length) throw new Error("Không tìm thấy lời thoại hợp lệ trong phụ đề.");
    if (merged.length > maxCues) {
      throw new Error(`Phụ đề video quá dài (${merged.length} câu, tối đa ${maxCues} câu). Hãy chọn video ngắn hơn nhé.`);
    }

    // Bước 2 & 3 (Combo 2 + 3): Dịch có ngữ cảnh toàn video (Style Card + cửa sổ trượt) & căn theo thời lượng câu
    let cues: LiveDubCue[] = merged;
    let style: DubStyleCard | null = null;
    if (!sourceLang.startsWith("vi")) {
      if (!translationEnabled()) throw new Error("Server chưa cấu hình AI dịch phụ đề.");
      const res = await translateForDubbingSmart(buildTranslateItems(merged), {
        title,
        sourceLang,
      });
      style = res.style;
      cues = merged.map((c, i) => ({
        start_ms: c.start_ms,
        end_ms: c.end_ms,
        text: res.translations[i] || c.text,
        orig: c.text,
      }));
    }

    const result: LiveDubResult = {
      videoId,
      title: title || videoId,
      sourceLang,
      style,
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
