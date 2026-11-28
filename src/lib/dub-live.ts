import "server-only";
import { connection } from "next/server";
import { getCached, setCached } from "./db";
import { cleanDubCues, dubEnabled, dubJson, mergeDubCues, type DubCue, type DubCueInput } from "./dub";
import { addPunctuation, lacksPunctuation, punctuationEnabled } from "./punctuate";
import { cleanSubtitleText, type Segment } from "./subtitles";
import {
  isDubSkip,
  pickStyleExamples,
  translateDubRepair,
  translateForDubbingSmart,
  translationEnabled,
  type DubStyleCard,
} from "./translate";
import { whisperEnabled } from "./whisper";
import { fetchAnyYouTubeSubtitles, transcribeAnyYouTubeAudio, VideoTooLongError } from "./youtube";

export type LiveDubCue = DubCue & {
  /** Câu gốc trước khi dịch (nếu video không phải tiếng Việt) */
  orig?: string;
  /** true = đang dịch ngầm ở server (chỉ có trong gói `ready` cuốn chiếu) */
  pending?: boolean;
  /** true = AI chưa dịch được câu này (text = ""), lần mở sau sẽ dịch bù */
  untranslated?: boolean;
};

export type LiveDubResult = {
  videoId: string;
  title: string;
  channel?: string;
  description?: string;
  sourceLang: string;
  style?: DubStyleCard | null;
  cues: LiveDubCue[];
  /** Thời điểm lưu khi còn câu chưa dịch; quá REPAIR_AFTER_MS thì lần mở sau dịch bù */
  failedAt?: number;
};

export type PrepareProgress = {
  pct: number; // 0..100
  stage: string;
  done?: number;
  total?: number;
};

export type PrepareStreamEvent =
  | ({ type: "progress" } & PrepareProgress)
  | { type: "ready"; data: LiveDubResult; pct: number; done: number; total: number }
  | { type: "chunk"; start: number; translations: string[]; skipped?: number[]; pct: number; done: number; total: number }
  | { type: "done"; data: LiveDubResult & { cached: boolean } }
  | { type: "error"; error: string };

type ProbeRes = {
  video_id: string;
  title: string;
  duration?: number;
  channel?: string;
  description?: string;
  language?: string;
  subtitles: { lang: string; name: string; auto: boolean }[];
};

export type FlightEntry = {
  promise: Promise<LiveDubResult>;
  listeners: Set<(ev: PrepareStreamEvent) => void>;
  lastProgress?: PrepareProgress;
  partial?: { data: LiveDubResult; pct: number; done: number; total: number };
};

// v5: metadata kênh/mô tả + Style Bible 16k + chống lọt Pháp/TBN/ALL CAPS + nối prevVi chuẩn ngữ cảnh
const CACHE_PREFIX = "dub:live:v5:";
const gd = globalThis as unknown as { __dubLiveFlights?: Map<string, FlightEntry> };
const inflight = (gd.__dubLiveFlights ??= new Map());

/** Chờ bao lâu rồi mới dịch bù câu lỗi (tránh gọi AI liên tục khi nhà cung cấp đang lỗi) */
const REPAIR_AFTER_MS = 10 * 60_000;

const hasUntranslated = (r: LiveDubResult) => r.cues.some((c) => c.untranslated);

/** Kiểm tra bản cache có còn câu lỗi dịch cần tự động dịch bù không. */
export const needsLiveDubRepair = (r: LiveDubResult): boolean =>
  hasUntranslated(r) && translationEnabled() && Date.now() - (r.failedAt ?? 0) >= REPAIR_AFTER_MS;

/** Lọc bỏ các câu mô tả âm thanh / nhạc / giọng đọc còn sót trong bản cache cũ trước khi phát. */
export function sanitizeCachedLiveDub(r: LiveDubResult | null): LiveDubResult | null {
  if (!r || !Array.isArray(r.cues) || !r.cues.length) return null;
  const cues: LiveDubCue[] = [];
  for (const c of r.cues) {
    if (c.orig !== undefined && !cleanSubtitleText(c.orig)) continue;
    if (c.pending || c.untranslated) {
      cues.push(c);
      continue;
    }
    if (isDubSkip(c.text)) continue;
    const text = cleanSubtitleText(c.text);
    if (!text) continue;
    cues.push({ ...c, text });
  }
  return cues.length ? { ...r, cues } : null;
}

function readCachedLiveDub(videoId: string): LiveDubResult | null {
  return sanitizeCachedLiveDub(getCached<LiveDubResult>(`${CACHE_PREFIX}${videoId}`));
}

/** Bản cache dùng được ngay; null nếu chưa có hoặc còn câu lỗi đã đến hạn dịch bù. */
export function getCachedLiveDub(videoId: string): LiveDubResult | null {
  const hit = readCachedLiveDub(videoId);
  if (!hit) return null;
  if (needsLiveDubRepair(hit)) return null;
  return hit;
}

/** Video đang có luồng chuẩn bị chạy sẵn trên server → đăng ký nghe chung, không tốn thêm hạn mức. */
export function isLiveDubInflight(videoId: string): boolean {
  return inflight.has(videoId) || inflight.has(`${videoId}:force`);
}

/** Đánh dấu câu chưa dịch + thời điểm lỗi trước khi lưu cache */
export function finalizeLiveDubResult(r: LiveDubResult): LiveDubResult {
  const out: LiveDubResult = { ...r };
  if (hasUntranslated(r)) out.failedAt = Date.now();
  else delete out.failedAt;
  return out;
}

export function pickProbeSub(
  subs: ProbeRes["subtitles"],
  defaultAudioLang?: string,
  preferOriginal = false,
) {
  const baseLang = (code?: string) => (code || "").toLowerCase().split(/[-_]/)[0];
  const origBase = baseLang(defaultAudioLang) || baseLang(subs.find((s) => s.auto)?.lang);
  const isVi = (s: { lang: string }) => baseLang(s.lang) === "vi";
  const isOrig = (s: { lang: string }) => Boolean(origBase) && baseLang(s.lang) === origBase;
  const isEnOrDe = (s: { lang: string }) => {
    const b = baseLang(s.lang);
    return b === "en" || b === "de";
  };
  const useViPriority = !preferOriginal || origBase === "vi";
  return (
    (useViPriority ? subs.find((s) => !s.auto && isVi(s)) : undefined) ??
    subs.find((s) => !s.auto && isOrig(s)) ??
    (useViPriority ? subs.find((s) => s.auto && isVi(s)) : undefined) ??
    subs.find((s) => s.auto && isOrig(s)) ??
    subs.find((s) => !s.auto && isEnOrDe(s)) ??
    subs.find((s) => !s.auto) ??
    subs[0]
  );
}

// Ký tự đặc trưng tiếng Việt (không có trong Đức/Anh/Tây Ban Nha…; tiếng Pháp chỉ có â/ê/ô rất ít)
const VI_UNIQUE_CHARS = /[ăâđêôơưảãạằắẳẵặầấẩẫậẻẽẹềếểễệỉĩịỏõọồốổỗộờớởỡợủũụừứửữựỳỷỹỵ]/gi;

/** Nhận diện nhanh phụ đề Whisper đã là tiếng Việt sẵn để không gửi đi dịch AI thừa. */
function looksVietnameseCues(cues: DubCueInput[]): boolean {
  const sample = cues
    .slice(0, 15)
    .map((c) => c.text)
    .join(" ");
  const letters = (sample.match(/\p{L}/gu) ?? []).length;
  const viChars = (sample.match(VI_UNIQUE_CHARS) ?? []).length;
  return viChars >= 6 && letters > 0 && viChars / letters >= 0.08;
}

function segmentsToCues(segments: Segment[]): DubCueInput[] {
  return segments.map((s) => ({
    start_ms: Math.max(0, Math.round(s.start * 1000)),
    end_ms: Math.max(Math.round(s.end * 1000), Math.round(s.start * 1000) + 150),
    text: s.text,
    ...(s.words?.length ? { words: s.words } : {}),
    ...(s.turn ? { turnBreak: true } : {}),
  }));
}

/** Lưu bản thuyết minh đã hoàn tất vào cache dùng chung theo videoId (kể cả khi phụ đề do Chrome Extension lấy từ trình duyệt). */
export function saveCachedLiveDub(videoId: string, result: LiveDubResult): void {
  setCached(`${CACHE_PREFIX}${videoId}`, finalizeLiveDubResult(result), null);
}

/** Nếu phụ đề thiếu dấu chấm câu → bổ sung dấu câu đa ngôn ngữ trước khi sắp xếp thành từng câu trọn vẹn */
export async function ensurePunctuatedCues(
  cues: DubCueInput[],
  lang: string,
  emit?: (p: PrepareProgress) => void,
): Promise<DubCueInput[]> {
  if (!punctuationEnabled() || cues.length < 4) return cues;
  const segs: Segment[] = cues.map((c) => ({
    start: c.start_ms / 1000,
    end: c.end_ms / 1000,
    text: c.text,
    ...(c.words?.length ? { words: c.words } : {}),
    ...(c.turnBreak ? { turn: true as const } : {}),
  }));
  if (!lacksPunctuation(segs)) return cues;
  emit?.({ pct: 24, stage: "Đang khôi phục dấu câu cho phụ đề tự động…" });
  const fixed = await addPunctuation(segs, lang);
  return fixed.map((s) => ({
    start_ms: Math.max(0, Math.round(s.start * 1000)),
    end_ms: Math.max(Math.round(s.end * 1000), Math.round(s.start * 1000) + 150),
    text: s.text,
    ...(s.words?.length ? { words: s.words } : {}),
    ...(s.turn ? { turnBreak: true } : {}),
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
    return { text: c.text, durationSec: durSec, availSec, ...(c.spk ? { spk: c.spk } : {}) };
  });
}

/** Dịch bù các câu chưa dịch của một video đã lưu, phát cuốn chiếu phần đã có trước rồi vá dần. */
export async function repairLiveDubCues(
  stale: LiveDubResult,
  {
    emitProgress,
    broadcast,
    entry,
  }: {
    emitProgress?: (p: PrepareProgress) => void;
    broadcast?: (ev: PrepareStreamEvent) => void;
    entry?: Pick<FlightEntry, "partial">;
  } = {},
): Promise<LiveDubResult> {
  const missing = stale.cues.flatMap((c, i) => (c.untranslated ? [i] : []));
  const total = stale.cues.length;
  const baseDone = total - missing.length;
  const snapshot: LiveDubResult = { ...stale, cues: stale.cues.map((c) => ({ ...c })) };
  if (entry) entry.partial = { data: snapshot, pct: 60, done: baseDone, total };
  broadcast?.({ type: "ready", data: snapshot, pct: 60, done: baseDone, total });
  emitProgress?.({ pct: 60, stage: `Đang dịch bù ${missing.length} câu còn thiếu…`, done: baseDone, total });

  const items = buildTranslateItems(
    stale.cues.map((c) => ({ start_ms: c.start_ms, end_ms: c.end_ms, text: c.orig || c.text, spk: c.spk })),
  );
  const existingTranslations = stale.cues.map((c) => (c.untranslated ? "" : c.text));
  const styleExamples = pickStyleExamples(items, existingTranslations);

  const fixed = await translateDubRepair(items, missing, {
    title: stale.title,
    channel: stale.channel,
    description: stale.description,
    sourceLang: stale.sourceLang,
    style: stale.style ?? null,
    styleExamples,
    existingTranslations,
    onChunk: ({ start, translations, done: repairDone, total: repairTotal }) => {
      const doneNow = Math.min(total, baseDone + repairDone);
      const pct = repairTotal > 0 ? Math.min(98, 60 + Math.round((repairDone / repairTotal) * 38)) : 98;
      const skipped = translations.flatMap((tr, k) => (isDubSkip(tr) ? [k] : []));
      const cleanChunk = translations.map((tr) => (isDubSkip(tr) ? "" : tr));
      if (entry?.partial) {
        entry.partial.pct = pct;
        entry.partial.done = doneNow;
        cleanChunk.forEach((tr, k) => {
          const idx = start + k;
          const origCue = entry.partial!.data.cues[idx];
          if (origCue) {
            const isSkip = isDubSkip(translations[k] || "");
            entry.partial!.data.cues[idx] = {
              start_ms: origCue.start_ms,
              end_ms: origCue.end_ms,
              text: tr,
              orig: origCue.orig,
              ...(origCue.spk ? { spk: origCue.spk } : {}),
              ...(!tr && !isSkip ? { untranslated: true } : {}),
            };
          }
        });
      }
      broadcast?.({
        type: "chunk",
        start,
        translations: cleanChunk,
        ...(skipped.length ? { skipped } : {}),
        pct,
        done: doneNow,
        total,
      });
    },
  });

  return finalizeLiveDubResult({
    ...stale,
    cues: stale.cues.flatMap((c, i) => {
      const tr = fixed.get(i);
      if (tr && isDubSkip(tr)) return [];
      return [tr ? { start_ms: c.start_ms, end_ms: c.end_ms, text: tr, orig: c.orig, ...(c.spk ? { spk: c.spk } : {}) } : c];
    }),
  });
}

export async function prepareLiveDub(
  videoId: string,
  opts: {
    allowWhisper?: boolean;
    quotaKey?: string;
    maxSeconds?: number;
    maxCues?: number;
    forceRetranslate?: boolean;
    repairNow?: boolean;
    preferOriginal?: boolean;
    onProgress?: (p: PrepareProgress) => void;
    onEvent?: (ev: PrepareStreamEvent) => void;
  } = {},
): Promise<LiveDubResult & { cached: boolean }> {
  await connection();
  const force = Boolean(opts.forceRetranslate);
  const repairNow = Boolean(opts.repairNow);
  if (!force) {
    if (!repairNow) {
      const hit = getCachedLiveDub(videoId);
      if (hit) {
        opts.onProgress?.({ pct: 100, stage: "Đã sẵn sàng từ bộ nhớ đệm" });
        return { ...hit, cached: true };
      }
    } else {
      const existing = readCachedLiveDub(videoId);
      if (existing && !hasUntranslated(existing)) {
        opts.onProgress?.({ pct: 100, stage: "Đã sẵn sàng từ bộ nhớ đệm" });
        return { ...existing, cached: true };
      }
    }
  }

  const forward = (ev: PrepareStreamEvent) => {
    if (ev.type === "progress") opts.onProgress?.({ pct: ev.pct, stage: ev.stage, done: ev.done, total: ev.total });
    opts.onEvent?.(ev);
  };

  const flightKey = force ? `${videoId}:force` : videoId;
  const pending = inflight.get(flightKey);
  if (pending) {
    if (pending.partial) {
      forward({
        type: "ready",
        data: pending.partial.data,
        pct: pending.partial.pct,
        done: pending.partial.done,
        total: pending.partial.total,
      });
    } else if (pending.lastProgress) {
      forward({ type: "progress", ...pending.lastProgress });
    }
    pending.listeners.add(forward);
    try {
      return { ...(await pending.promise), cached: false };
    } finally {
      pending.listeners.delete(forward);
    }
  }

  const entry: FlightEntry = {
    promise: Promise.resolve() as unknown as Promise<LiveDubResult>,
    listeners: new Set([forward]),
  };

  const broadcast = (ev: PrepareStreamEvent) => {
    if (ev.type === "progress") {
      entry.lastProgress = { pct: ev.pct, stage: ev.stage, done: ev.done, total: ev.total };
    }
    for (const fn of entry.listeners) {
      try {
        fn(ev);
      } catch {}
    }
  };

  const emitProgress = (p: PrepareProgress) => broadcast({ type: "progress", ...p });

  const run = (async (): Promise<LiveDubResult> => {
    // Đã dịch trước đó nhưng còn câu lỗi → phát ngay bản cũ, chỉ dịch bù những câu thiếu
    if (!force) {
      const stale = readCachedLiveDub(videoId);
      if (stale && hasUntranslated(stale) && translationEnabled()) {
        const repaired = await repairLiveDubCues(stale, { emitProgress, broadcast, entry });
        setCached(`${CACHE_PREFIX}${videoId}`, repaired, null);
        emitProgress({ pct: 100, stage: "Hoàn tất!" });
        return repaired;
      }
    }

    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const maxCues = opts.maxCues ?? 1800;
    const preferOrig = opts.preferOriginal ?? force;
    let title = "";
    let channel = "";
    let description = "";
    let sourceLang = "auto";
    let rawCues: DubCueInput[] = [];

    emitProgress({ pct: 6, stage: "Đang kiểm tra video & danh sách phụ đề…" });

    // 1. Ưu tiên dịch vụ vieneu-dub (Innertube mọi ngôn ngữ) nếu đã cấu hình
    if (dubEnabled()) {
      try {
        const info = await dubJson<ProbeRes>("/probe", { method: "POST", body: { url }, timeoutMs: 10_000 });
        title = info.title || "";
        channel = info.channel || "";
        description = info.description || "";
        if (opts.maxSeconds && info.duration && info.duration > opts.maxSeconds) {
          throw new VideoTooLongError(info.duration, opts.maxSeconds);
        }
        if (info.subtitles?.length) {
          const chosen = pickProbeSub(info.subtitles, info.language, preferOrig);
          emitProgress({ pct: 16, stage: `Đang tải phụ đề (${chosen.lang.toUpperCase()})…` });
          const subRes = await dubJson<{ lang: string; cues: DubCue[] }>("/subtitles", {
            method: "POST",
            body: { url, lang: chosen.lang, auto: chosen.auto },
            timeoutMs: 20_000,
          });
          rawCues = cleanDubCues(subRes.cues);
          sourceLang = (subRes.lang || chosen.lang || "auto").toLowerCase();
        }
      } catch (e) {
        if (e instanceof VideoTooLongError) throw e;
      }
    }

    // 2. Dự phòng: lấy phụ đề mọi ngôn ngữ trực tiếp bằng Innertube / yt-dlp của HalloVN
    if (!rawCues.length) {
      emitProgress({ pct: 16, stage: "Đang tải phụ đề YouTube…" });
      // Bỏ qua bước chấm câu bên trong để gộp về đúng 1 bước ensurePunctuatedCues (có báo tiến trình 24% và không gọi lặp 2 lần)
      const anySub = await fetchAnyYouTubeSubtitles(videoId, {
        maxSeconds: opts.maxSeconds,
        skipPunctuate: true,
        preferOriginal: preferOrig,
      }).catch((e) => {
        if (e instanceof VideoTooLongError) throw e;
        return null;
      });
      if (anySub && anySub.segments.length) {
        title = title || anySub.title;
        channel = channel || anySub.channel || "";
        description = description || anySub.description || "";
        sourceLang = anySub.lang.toLowerCase();
        rawCues = cleanDubCues(segmentsToCues(anySub.segments));
      }
    }

    // 3. Nếu video hoàn toàn không có phụ đề trên YouTube → Whisper tự nhận diện ngôn ngữ (chỉ khi được phép)
    if (!rawCues.length && opts.allowWhisper && whisperEnabled()) {
      emitProgress({ pct: 18, stage: "Video không có phụ đề — đang nhận dạng giọng nói bằng AI (Whisper)…" });
      const tr = await transcribeAnyYouTubeAudio(videoId, {
        quotaKey: opts.quotaKey,
        maxSeconds: opts.maxSeconds,
        skipPunctuate: true,
      });
      title = title || tr.title;
      channel = channel || tr.channel || "";
      description = description || tr.description || "";
      rawCues = cleanDubCues(segmentsToCues(tr.segments));
      sourceLang = looksVietnameseCues(rawCues) ? "vi" : "auto";
    }

    if (!rawCues.length) {
      throw new Error(
        opts.allowWhisper
          ? "Không tìm thấy phụ đề cho video này."
          : "Video này chưa có phụ đề trên YouTube. Bạn hãy chọn video có bật phụ đề (CC) hoặc đăng nhập để tạo bằng AI.",
      );
    }

    // Bước 1: Thêm dấu câu nếu phụ đề bị thiếu (kể cả phụ đề thường không có dấu), rồi sắp xếp thành từng câu trọn vẹn
    const punctuated = await ensurePunctuatedCues(rawCues, sourceLang, emitProgress);
    emitProgress({ pct: 30, stage: "Đang sắp xếp thành câu hoàn chỉnh…" });
    const merged = mergeDubCues(punctuated);

    if (!merged.length) throw new Error("Không tìm thấy lời thoại hợp lệ trong phụ đề.");
    if (merged.length > maxCues) {
      throw new Error(`Phụ đề video quá dài (${merged.length} câu, tối đa ${maxCues} câu). Hãy chọn video ngắn hơn nhé.`);
    }

    // Bước 2 & 3: Dịch có ngữ cảnh + phát cuốn chiếu ngay khi xong lô đầu
    let cues: LiveDubCue[] = merged;
    let style: DubStyleCard | null = null;
    if (!sourceLang.startsWith("vi")) {
      if (!translationEnabled()) throw new Error("Server chưa cấu hình AI dịch phụ đề.");

      const workingCues: LiveDubCue[] = merged.map((c) => ({
        start_ms: c.start_ms,
        end_ms: c.end_ms,
        text: "",
        orig: c.text,
        ...(c.spk ? { spk: c.spk } : {}),
        pending: true,
      }));
      let sentReady = false;

      const res = await translateForDubbingSmart(buildTranslateItems(merged), {
        title,
        channel,
        description,
        sourceLang,
        onProgress: ({ phase, done, total }) => {
          if (phase === "style") {
            const pct = total > 0 ? Math.min(98, 40 + Math.round((done / total) * 58)) : 40;
            emitProgress({ pct, stage: "Đang phân tích văn phong & xưng hô toàn bài…", done, total });
          } else {
            const pct = total > 0 ? Math.min(98, 40 + Math.round((done / total) * 58)) : 90;
            emitProgress({
              pct,
              stage: done > 0 ? `Đang dịch tiếng Việt (${done}/${total} câu)…` : `Đang dịch 10 câu đầu để phát ngay…`,
              done,
              total,
            });
          }
        },
        onChunk: ({ start, translations, done, total }) => {
          const skipped = translations.flatMap((tr, k) => (isDubSkip(tr) ? [k] : []));
          const cleanChunk = translations.map((tr) => (isDubSkip(tr) ? "" : tr));
          cleanChunk.forEach((tr, k) => {
            const idx = start + k;
            const rawTr = translations[k];
            workingCues[idx] = {
              start_ms: merged[idx].start_ms,
              end_ms: merged[idx].end_ms,
              text: tr,
              orig: merged[idx].text,
              ...(merged[idx].spk ? { spk: merged[idx].spk } : {}),
              ...(!rawTr ? { untranslated: true } : {}),
            };
          });
          const pct = total > 0 ? Math.min(98, 40 + Math.round((done / total) * 58)) : 98;
          if (!sentReady && start === 0 && done < total) {
            sentReady = true;
            const snapshot: LiveDubResult = {
              videoId,
              title: title || videoId,
              sourceLang,
              cues: workingCues.map((c) => ({ ...c })),
            };
            entry.partial = { data: snapshot, pct, done, total };
            broadcast({ type: "ready", data: snapshot, pct, done, total });
          } else if (sentReady) {
            if (entry.partial) {
              entry.partial.pct = pct;
              entry.partial.done = done;
              cleanChunk.forEach((_, k) => {
                const idx = start + k;
                entry.partial!.data.cues[idx] = { ...workingCues[idx] };
              });
            }
            broadcast({
              type: "chunk",
              start,
              translations: cleanChunk,
              ...(skipped.length ? { skipped } : {}),
              pct,
              done,
              total,
            });
          }
        },
      });
      style = res.style;
      cues = merged.flatMap((c, i) => {
        const tr = res.translations[i] || "";
        if (isDubSkip(tr)) return [];
        return [
          {
            start_ms: c.start_ms,
            end_ms: c.end_ms,
            text: tr,
            orig: c.text,
            ...(c.spk ? { spk: c.spk } : {}),
            ...(tr ? {} : { untranslated: true }),
          },
        ];
      });
    }

    const result = finalizeLiveDubResult({
      videoId,
      title: title || videoId,
      ...(channel ? { channel } : {}),
      ...(description ? { description } : {}),
      sourceLang,
      style,
      cues,
    });
    setCached(`${CACHE_PREFIX}${videoId}`, result, null);
    emitProgress({ pct: 100, stage: "Hoàn tất!" });
    return result;
  })().finally(() => {
    inflight.delete(flightKey);
  });

  entry.promise = run;
  inflight.set(flightKey, entry);
  return { ...(await run), cached: false };
}

/** Tạo Response NDJSON streaming tiến trình chuẩn bị thuyết minh (hỗ trợ cả phát cuốn chiếu `ready` + `chunk` + `done`) */
export function streamPrepareResponse(
  executor: (emit: (p: PrepareProgress) => void, emitEvent: (ev: PrepareStreamEvent) => void) => Promise<unknown>,
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
        } catch {}
      };
      // Nhịp giữ kết nối: các bước lâu (tải phụ đề, Whisper) có thể im lặng hàng chục giây;
      // ping giúp proxy không cắt kết nối và app phân biệt được "server đang làm" với "mất mạng".
      const heartbeat = setInterval(() => send({ type: "ping" }), 15_000);
      try {
        const data = await executor(
          (p) => send({ type: "progress", ...p }),
          (ev) => {
            if (ev.type === "ready" || ev.type === "chunk") send(ev);
          },
        );
        send({ type: "done", data });
      } catch (e) {
        send({ type: "error", error: (e as Error).message || "Không thể chuẩn bị thuyết minh lúc này." });
      } finally {
        clearInterval(heartbeat);
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
