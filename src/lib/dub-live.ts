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

export type PrepareProgress = {
  pct: number; // 0..100
  stage: string;
  done?: number;
  total?: number;
};

type ProbeRes = {
  video_id: string;
  title: string;
  duration?: number;
  subtitles: { lang: string; name: string; auto: boolean }[];
};

type FlightEntry = {
  promise: Promise<LiveDubResult>;
  listeners: Set<(p: PrepareProgress) => void>;
  last?: PrepareProgress;
};

// v2: gộp câu hoàn chỉnh + thêm dấu câu đa ngôn ngữ + dịch theo ngữ cảnh (Style Card + cửa sổ trượt) + căn thời lượng
const CACHE_PREFIX = "dub:live:v2:";
const gd = globalThis as unknown as { __dubLiveFlights?: Map<string, FlightEntry> };
const inflight = (gd.__dubLiveFlights ??= new Map());

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
async function ensurePunctuatedCues(
  cues: DubCue[],
  lang: string,
  emit?: (p: PrepareProgress) => void,
): Promise<DubCue[]> {
  if (!punctuationEnabled() || cues.length < 4) return cues;
  const segs: Segment[] = cues.map((c) => ({
    start: c.start_ms / 1000,
    end: c.end_ms / 1000,
    text: c.text,
  }));
  if (!lacksPunctuation(segs)) return cues;
  emit?.({ pct: 26, stage: "Đang khôi phục dấu câu cho phụ đề tự động…" });
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
    onProgress?: (p: PrepareProgress) => void;
  } = {},
): Promise<LiveDubResult & { cached: boolean }> {
  await connection();
  const hit = getCachedLiveDub(videoId);
  if (hit) {
    opts.onProgress?.({ pct: 100, stage: "Đã sẵn sàng từ bộ nhớ đệm" });
    return { ...hit, cached: true };
  }

  const pending = inflight.get(videoId);
  if (pending) {
    if (opts.onProgress) {
      if (pending.last) opts.onProgress(pending.last);
      pending.listeners.add(opts.onProgress);
    }
    try {
      return { ...(await pending.promise), cached: false };
    } finally {
      if (opts.onProgress) pending.listeners.delete(opts.onProgress);
    }
  }

  const entry: FlightEntry = {
    promise: Promise.resolve() as unknown as Promise<LiveDubResult>,
    listeners: new Set(opts.onProgress ? [opts.onProgress] : []),
  };

  const emit = (p: PrepareProgress) => {
    entry.last = p;
    for (const fn of entry.listeners) {
      try {
        fn(p);
      } catch {}
    }
  };

  const run = (async (): Promise<LiveDubResult> => {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const maxCues = opts.maxCues ?? 1800;
    let title = "";
    let sourceLang = "auto";
    let rawCues: DubCue[] = [];
    let isAutoSub = false;

    emit({ pct: 6, stage: "Đang kiểm tra video & danh sách phụ đề…" });

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
          emit({ pct: 16, stage: `Đang tải phụ đề (${chosen.lang.toUpperCase()})…` });
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
      emit({ pct: 16, stage: "Đang tải phụ đề YouTube…" });
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
      emit({ pct: 18, stage: "Video không có phụ đề — đang nhận dạng giọng nói bằng AI (Whisper)…" });
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
    const punctuated = isAutoSub ? await ensurePunctuatedCues(rawCues, sourceLang, emit) : rawCues;
    emit({ pct: 32, stage: "Đang gộp thành câu hoàn chỉnh…" });
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
        onProgress: ({ phase, done, total }) => {
          if (phase === "style") {
            emit({ pct: 36, stage: "Đang phân tích ngữ cảnh & phong cách video…", done: 0, total });
          } else {
            const pct = total > 0 ? Math.min(98, 42 + Math.round((done / total) * 56)) : 90;
            emit({
              pct,
              stage: done > 0 ? `Đang dịch tiếng Việt (${done}/${total} câu)…` : `Đang bắt đầu dịch ${total} câu sang tiếng Việt…`,
              done,
              total,
            });
          }
        },
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
    emit({ pct: 100, stage: "Hoàn tất!" });
    return result;
  })().finally(() => {
    inflight.delete(videoId);
  });

  entry.promise = run;
  inflight.set(videoId, entry);
  return { ...(await run), cached: false };
}

/** Tạo Response NDJSON streaming tiến trình chuẩn bị thuyết minh (0% → 100%) */
export function streamPrepareResponse(
  executor: (emit: (p: PrepareProgress) => void) => Promise<unknown>,
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
        } catch {}
      };
      try {
        const data = await executor((p) => send({ type: "progress", ...p }));
        send({ type: "done", data });
      } catch (e) {
        send({ type: "error", error: (e as Error).message || "Không thể chuẩn bị thuyết minh lúc này." });
      } finally {
        try {
          controller.close();
        } catch {}
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
