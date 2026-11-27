import { createHash } from "node:crypto";
import { body, fail, str } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getCached, setCached } from "@/lib/db";
import { cleanDubCues, mergeDubCues, type DubCue, type DubCueInput } from "@/lib/dub";
import {
  buildTranslateItems,
  ensurePunctuatedCues,
  finalizeLiveDubResult,
  getCachedLiveDub,
  isLiveDubInflight,
  needsLiveDubRepair,
  prepareLiveDub,
  repairLiveDubCues,
  sanitizeCachedLiveDub,
  saveCachedLiveDub,
  streamPrepareResponse,
  type FlightEntry,
  type LiveDubCue,
  type LiveDubResult,
  type PrepareProgress,
  type PrepareStreamEvent,
} from "@/lib/dub-live";
import { allow, clientIp } from "@/lib/rate-limit";
import type { Word } from "@/lib/subtitles";
import { isDubSkip, translateForDubbingSmart, translationEnabled } from "@/lib/translate";
import { extractVideoId } from "@/lib/youtube-id";

type TranslateCuesBody = {
  videoId?: unknown;
  title?: unknown;
  sourceLang?: unknown;
  cues?: unknown;
};

const CACHE_PREFIX = "dub:ext:v1:";
const VI_UNIQUE = /[ăâđêôơưảãạằắẳẵặầấẩẫậẻẽẹềếểễệỉĩịỏõọồốổỗộờớởỡợủũụừứửữựỳỷỹỵ]/gi;
const gd = globalThis as unknown as { __dubExtFlights?: Map<string, FlightEntry> };
const inflight = (gd.__dubExtFlights ??= new Map());

function looksVi(cues: DubCue[]): boolean {
  const sample = cues
    .slice(0, 15)
    .map((c) => c.text)
    .join(" ");
  const letters = (sample.match(/\p{L}/gu) ?? []).length;
  const vi = (sample.match(VI_UNIQUE) ?? []).length;
  return vi >= 6 && letters > 0 && vi / letters >= 0.08;
}

function parseWords(raw: unknown): Word[] | undefined {
  if (!Array.isArray(raw) || !raw.length) return undefined;
  const out: Word[] = [];
  for (const w of raw) {
    if (!Array.isArray(w) || w.length < 2) continue;
    const t = Number(w[0]);
    const text = typeof w[1] === "string" ? w[1].trim() : "";
    if (!Number.isFinite(t) || t < 0 || !text) continue;
    const e = w.length >= 3 && Number.isFinite(Number(w[2])) ? Number(w[2]) : undefined;
    out.push(e === undefined ? [t, text] : [t, text, e]);
  }
  return out.length ? out : undefined;
}

function parseRawCues(raw: unknown): DubCueInput[] {
  if (!Array.isArray(raw)) return [];
  const out: DubCueInput[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const start = Number(o.start_ms);
    const end = Number(o.end_ms);
    const text = typeof o.text === "string" ? o.text.replace(/\s+/g, " ").trim().slice(0, 1000) : "";
    if (!Number.isFinite(start) || start < 0 || !text) continue;
    const endMs = Number.isFinite(end) && end > start ? end : start + 2500;
    const words = parseWords(o.words);
    out.push({ start_ms: Math.round(start), end_ms: Math.round(endMs), text, ...(words ? { words } : {}) });
    if (out.length >= 5000) break;
  }
  return out;
}

/**
 * POST /api/v1/dub/translate-cues { videoId?, title?, sourceLang?, cues: [{ start_ms, end_ms, text, words? }] }
 * Nhận phụ đề lấy trực tiếp từ trình duyệt người dùng (Chrome Extension: YouTube bị chặn vùng ARD/WDR/ZDF
 * hoặc mọi trang web có <video> + phụ đề) → khôi phục dấu câu nếu thiếu → gộp câu trọn vẹn → dịch cuốn chiếu (~2s).
 */
export async function POST(req: Request) {
  const wantStream =
    new URL(req.url).searchParams.get("stream") === "1" ||
    (req.headers.get("accept") ?? "").includes("application/x-ndjson");

  const b = await body<TranslateCuesBody>(req);
  const ytVideoId = extractVideoId(str(b.videoId).trim());
  const title = str(b.title).trim().slice(0, 200) || ytVideoId || "Video";
  const rawLang = (str(b.sourceLang).trim() || "auto").toLowerCase().slice(0, 16);

  // Nếu là video YouTube đã có sẵn trong kho cache chung → trả về ngay tức thì (0ms, không trừ hạn mức)
  if (ytVideoId) {
    const ytHit = getCachedLiveDub(ytVideoId);
    if (ytHit) {
      if (wantStream) {
        return streamPrepareResponse(async (emit) => {
          emit({ pct: 100, stage: "Sẵn sàng" });
          return { ...ytHit, cached: true };
        });
      }
      return Response.json({ ...ytHit, cached: true });
    }
    // Nếu video YouTube này đang được luồng chính prepareLiveDub xử lý → nghe chung luôn để tránh dịch trùng 2 lần
    if (isLiveDubInflight(ytVideoId)) {
      if (wantStream) {
        return streamPrepareResponse((emit, emitEvent) =>
          prepareLiveDub(ytVideoId, { onProgress: emit, onEvent: emitEvent }),
        );
      }
      try {
        return Response.json(await prepareLiveDub(ytVideoId));
      } catch (e) {
        return fail((e as Error).message, 502);
      }
    }
  }

  const rawCues = cleanDubCues(parseRawCues(b.cues));
  if (!rawCues.length) return fail("Không tìm thấy phụ đề hợp lệ để thuyết minh.");

  const user = await getCurrentUser();
  const isAdmin = user?.role === "admin";
  const maxCues = isAdmin ? 2500 : 1800;

  const hash = createHash("sha1")
    .update(rawLang + "\n" + rawCues.map((c) => `${c.start_ms}:${c.text}`).join("\n"))
    .digest("hex");
  const cacheKey = `${CACHE_PREFIX}${hash}`;

  const cached = sanitizeCachedLiveDub(getCached<LiveDubResult>(cacheKey));
  const staleForRepair = cached && needsLiveDubRepair(cached) ? cached : null;
  if (cached && !staleForRepair) {
    if (wantStream) {
      return streamPrepareResponse(async (emit) => {
        emit({ pct: 100, stage: "Sẵn sàng" });
        return { ...cached, title: title || cached.title, cached: true };
      });
    }
    return Response.json({ ...cached, title: title || cached.title, cached: true });
  }

  if (!isAdmin && !inflight.has(cacheKey) && !staleForRepair) {
    const key = user ? `u:${user.id}` : `ip:${await clientIp()}`;
    const ok10m = allow(`dub:10m:${key}`, user ? 15 : 5, 10 * 60_000);
    const okDay = allow(`dub:day:${key}`, user ? 60 : 15, 24 * 3600_000);
    if (!ok10m || !okDay) {
      return fail(
        user
          ? "Bạn mở quá nhiều video mới trong thời gian ngắn. Thử lại sau ít phút nhé."
          : "Bạn đã dùng hết lượt miễn phí cho khách. Đăng nhập HalloVN trong tiện ích để mở thêm hoặc thử lại sau ít phút nhé.",
        429,
      );
    }
  }

  const execute = async (
    emit?: (p: { pct: number; stage: string; done?: number; total?: number }) => void,
    emitEvent?: (ev: PrepareStreamEvent) => void,
  ): Promise<LiveDubResult & { cached: boolean }> => {
    const forward = (ev: PrepareStreamEvent) => {
      if (ev.type === "progress") emit?.({ pct: ev.pct, stage: ev.stage, done: ev.done, total: ev.total });
      emitEvent?.(ev);
    };

    const existing = inflight.get(cacheKey);
    if (existing) {
      if (existing.partial) {
        forward({
          type: "ready",
          data: existing.partial.data,
          pct: existing.partial.pct,
          done: existing.partial.done,
          total: existing.partial.total,
        });
      } else if (existing.lastProgress) {
        forward({ type: "progress", ...existing.lastProgress });
      }
      existing.listeners.add(forward);
      try {
        const res = await existing.promise;
        return { ...res, title: title || res.title, cached: false };
      } finally {
        existing.listeners.delete(forward);
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

    const job = (async (): Promise<LiveDubResult> => {
      if (staleForRepair) {
        const repaired = await repairLiveDubCues(
          { ...staleForRepair, title: title || staleForRepair.title },
          { emitProgress, broadcast, entry },
        );
        setCached(cacheKey, repaired, null);
        if (ytVideoId) saveCachedLiveDub(ytVideoId, repaired);
        emitProgress({ pct: 100, stage: "Hoàn tất!" });
        return repaired;
      }

      emitProgress({ pct: 18, stage: "Đang chuẩn bị nội dung…" });
      const punctuated = await ensurePunctuatedCues(rawCues, rawLang, emitProgress);
      const merged = mergeDubCues(punctuated);
      if (!merged.length) throw new Error("Không có lời thoại hợp lệ trong phụ đề.");
      if (merged.length > maxCues) {
        throw new Error(`Phụ đề video quá dài (${merged.length} câu, tối đa ${maxCues} câu).`);
      }

      const sourceLang = rawLang.startsWith("vi") || looksVi(merged) ? "vi" : rawLang;
      let cues: LiveDubCue[] = merged;
      let style = null;
      const resultId = ytVideoId || hash.slice(0, 12);

      if (!sourceLang.startsWith("vi")) {
        if (!translationEnabled()) throw new Error("Server chưa cấu hình AI dịch phụ đề.");
        const workingCues: LiveDubCue[] = merged.map((c) => ({
          start_ms: c.start_ms,
          end_ms: c.end_ms,
          text: "",
          orig: c.text,
          pending: true,
        }));
        let sentReady = false;

        emitProgress({ pct: 32, stage: "Đang tạo thuyết minh…" });
        const res = await translateForDubbingSmart(buildTranslateItems(merged), {
          title,
          sourceLang,
          onProgress: ({ phase, done, total }) => {
            if (phase === "style") {
              const pct = total > 0 ? Math.min(98, 40 + Math.round((done / total) * 58)) : 40;
              emitProgress({ pct, stage: "Đang phân tích văn phong & xưng hô toàn bài…", done, total });
            } else {
              const pct = total > 0 ? Math.min(98, 40 + Math.round((done / total) * 58)) : 90;
              emitProgress({ pct, stage: "Đang tạo thuyết minh…", done, total });
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
                ...(!rawTr ? { untranslated: true } : {}),
              };
            });
            const pct = total > 0 ? Math.min(98, 40 + Math.round((done / total) * 58)) : 98;
            if (!sentReady && start === 0 && done < total) {
              sentReady = true;
              const snapshot: LiveDubResult = {
                videoId: resultId,
                title,
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
              ...(tr ? {} : { untranslated: true }),
            },
          ];
        });
      }

      const result = finalizeLiveDubResult({
        videoId: resultId,
        title,
        sourceLang,
        style,
        cues,
      });
      setCached(cacheKey, result, null);
      // Nếu là video YouTube → lưu luôn vào kho cache chung của /thuyet-minh để mở lại tức thì (kể cả video ARD/WDR/ZDF!)
      if (ytVideoId) saveCachedLiveDub(ytVideoId, result);
      emitProgress({ pct: 100, stage: "Hoàn tất!" });
      return result;
    })().finally(() => {
      inflight.delete(cacheKey);
    });

    entry.promise = job;
    inflight.set(cacheKey, entry);
    return { ...(await job), cached: false };
  };

  if (wantStream) {
    return streamPrepareResponse((emit, emitEvent) => execute(emit, emitEvent));
  }

  try {
    return Response.json(await execute());
  } catch (e) {
    return fail((e as Error).message, 502);
  }
}
