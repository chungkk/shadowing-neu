import { apiAdmin, body, fail, str } from "@/lib/api";
import { mergeDubCues, parseSubtitleText, type DubCue, type DubCueInput } from "@/lib/dub";
import { buildTranslateItems, prepareLiveDub, streamPrepareResponse, type PrepareProgress } from "@/lib/dub-live";
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
 * Hỗ trợ ?stream=1 (NDJSON) để hiện tiến trình 0% → 100%.
 */
export async function POST(req: Request) {
  const admin = await apiAdmin();
  if (admin instanceof Response) return admin;

  const wantStream =
    new URL(req.url).searchParams.get("stream") === "1" ||
    (req.headers.get("accept") ?? "").includes("application/x-ndjson");

  const b = await body<PrepareBody>(req);
  const videoId = extractVideoId(str(b.url).trim());
  if (!videoId) return fail("Link YouTube không hợp lệ.");

  const subSource = str(b.subSource) || "auto";

  const execute = async (emit?: (p: PrepareProgress) => void) => {
    if (subSource === "auto") {
      return prepareLiveDub(videoId, {
        allowWhisper: true,
        quotaKey: `admin:${admin.id}`,
        maxCues: 2500,
        onProgress: emit,
      });
    }

    let title = "";
    let rawCues: DubCueInput[] = [];
    let needTranslateLang: string | null = null;

    if (subSource === "custom") {
      emit?.({ pct: 15, stage: "Đang đọc file phụ đề…" });
      rawCues = parseSubtitleText(str(b.customSub));
      if (!rawCues.length) throw new Error("Không đọc được câu thoại nào từ file phụ đề.");
      if (b.translateCustom) needTranslateLang = "auto";
    } else if (subSource === "whisper") {
      emit?.({ pct: 15, stage: "Đang nhận dạng giọng nói bằng AI (Whisper)…" });
      const tr = await transcribeAnyYouTubeAudio(videoId, {
        quotaKey: `admin:${admin.id}`,
      });
      title = tr.title;
      rawCues = tr.segments.map((s) => ({
        start_ms: Math.max(0, Math.round(s.start * 1000)),
        end_ms: Math.max(Math.round(s.end * 1000), Math.round(s.start * 1000) + 150),
        text: s.text,
        ...(s.words?.length ? { words: s.words } : {}),
      }));
      needTranslateLang = "auto";
    }

    emit?.({ pct: 32, stage: "Đang gộp thành câu hoàn chỉnh…" });
    const merged = mergeDubCues(rawCues);
    if (!merged.length) throw new Error("Không tìm thấy phụ đề cho video này.");
    if (merged.length > 2500) throw new Error(`Phụ đề quá dài (${merged.length} câu).`);

    let cues: (DubCue & { orig?: string; untranslated?: boolean })[] = merged;
    let style = null;
    if (needTranslateLang) {
      if (!translationEnabled()) throw new Error("Server chưa cấu hình AI dịch phụ đề.");
      const res = await translateForDubbingSmart(buildTranslateItems(merged), {
        title,
        sourceLang: needTranslateLang,
        onProgress: ({ phase, done, total }) => {
          if (phase === "style") {
            emit?.({ pct: 36, stage: "Đang đọc toàn bộ phụ đề & phân tích văn phong…", done: 0, total });
          } else {
            const pct = total > 0 ? Math.min(98, 42 + Math.round((done / total) * 56)) : 90;
            emit?.({
              pct,
              stage: done > 0 ? `Đang dịch tiếng Việt (${done}/${total} câu)…` : `Đang bắt đầu dịch ${total} câu…`,
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
        text: res.translations[i] || "",
        orig: c.text,
        ...(res.translations[i] ? {} : { untranslated: true }),
      }));
    }

    emit?.({ pct: 100, stage: "Hoàn tất!" });
    return {
      videoId,
      title: title || videoId,
      sourceLang: needTranslateLang ?? "vi",
      style,
      cues,
    };
  };

  if (wantStream) {
    return streamPrepareResponse((emit) => execute(emit));
  }

  try {
    return Response.json(await execute());
  } catch (e) {
    return fail((e as Error).message, 502);
  }
}
