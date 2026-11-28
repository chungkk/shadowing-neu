import { body, fail, str } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getCachedLiveDub, isLiveDubInflight, prepareLiveDub, streamPrepareResponse, type LiveDubResult } from "@/lib/dub-live";
import { prewarmDubAudio } from "@/lib/dub-tts-prewarm";
import { isEdgeVoice, normalizeEdgeSpeed, warmEdgeSocket } from "@/lib/edge-tts";
import { isServerPiperVoice, warmPiperVoice } from "@/lib/piper-tts";
import { allow, clientIp } from "@/lib/rate-limit";
import { extractVideoId } from "@/lib/youtube-id";

type PublicPrepareBody = {
  url?: unknown;
  videoId?: unknown;
  voiceId?: unknown;
  voice?: unknown;
  speed?: unknown;
  startMs?: unknown;
  force?: unknown;
  repair?: unknown;
};

/**
 * POST /api/v1/dub/prepare { url | videoId, force?, repair? }
 * Chuẩn bị phụ đề tiếng Việt cho người xem YouTube thuyết minh trực tiếp trên trình duyệt (Kokoro Lite WASM).
 * - Hỗ trợ ?stream=1 (NDJSON) để phát tiến trình 0% → 100% theo thời gian thực.
 * - Video đã từng chuẩn bị → trả ngay từ cache SQLite, không tốn hạn mức.
 */
export async function POST(req: Request) {
  const wantStream =
    new URL(req.url).searchParams.get("stream") === "1" ||
    (req.headers.get("accept") ?? "").includes("application/x-ndjson");

  const b = await body<PublicPrepareBody>(req);
  const reqVoice = str(b.voiceId).trim() || str(b.voice).trim();
  const reqSpeed = normalizeEdgeSpeed(Number(b.speed ?? 1.15));
  const reqStartMs = Number.isFinite(Number(b.startMs)) ? Math.max(0, Number(b.startMs)) : 0;
  if (isServerPiperVoice(reqVoice)) warmPiperVoice(reqVoice);
  else if (isEdgeVoice(reqVoice)) warmEdgeSocket(2);
  const raw = str(b.url).trim() || str(b.videoId).trim();
  const videoId = extractVideoId(raw);
  if (!videoId) return fail("Link YouTube không hợp lệ. Vui lòng dán link video YouTube đầy đủ hoặc mã video.");

  const force = b.force === true;
  const repair = b.repair === true;
  let prewarmed = false;
  const triggerPrewarm = (cues: LiveDubResult["cues"]) => {
    if (prewarmed || !reqVoice || !cues.length) return;
    prewarmed = true;
    prewarmDubAudio(cues, reqVoice, reqSpeed, reqStartMs);
  };

  // Cache hit → trả ngay lập tức, không tính hạn mức (trừ khi force hoặc repair khi còn câu chưa dịch)
  if (!force) {
    const cached = getCachedLiveDub(videoId);
    if (cached && (!repair || !cached.cues.some((c) => c.untranslated))) {
      triggerPrewarm(cached.cues);
      if (wantStream) {
        return streamPrepareResponse(async (emit) => {
          emit({ pct: 100, stage: "Đã sẵn sàng từ bộ nhớ đệm" });
          return { ...cached, cached: true };
        });
      }
      return Response.json({ ...cached, cached: true });
    }
  }

  const user = await getCurrentUser();
  const isAdmin = user?.role === "admin";
  const ip = isAdmin || user ? "" : await clientIp();

  // Nếu video đã có luồng đang dịch dở trên server thì gắn chung listener, không trừ thêm hạn mức
  if (!isAdmin && (force || !isLiveDubInflight(videoId))) {
    const key = user ? `u:${user.id}` : `ip:${ip}`;
    const ok10m = allow(`dub:10m:${key}`, user ? 15 : 5, 10 * 60_000);
    const okDay = allow(`dub:day:${key}`, user ? 60 : 15, 24 * 3600_000);
    if (!ok10m || !okDay) {
      return fail(
        user
          ? "Bạn mở quá nhiều video mới trong thời gian ngắn. Thử lại sau ít phút nhé."
          : "Bạn đã dùng hết lượt xem video mới cho khách. Đăng nhập miễn phí để mở thêm hoặc thử lại sau ít phút nhé.",
        429,
      );
    }
  }

  const runOpts = {
    allowWhisper: !!user,
    quotaKey: isAdmin ? undefined : user ? `u:${user.id}` : `ip:${ip}`,
    maxSeconds: isAdmin ? undefined : user ? 45 * 60 : 30 * 60,
    maxCues: isAdmin ? 2500 : 1800,
    forceRetranslate: force,
    repairNow: repair,
    preferOriginal: force,
  };

  if (wantStream) {
    return streamPrepareResponse(async (emit, emitEvent) => {
      const res = await prepareLiveDub(videoId, {
        ...runOpts,
        onProgress: emit,
        onEvent: (ev) => {
          if (ev.type === "ready" && ev.data?.cues) triggerPrewarm(ev.data.cues);
          emitEvent(ev);
        },
      });
      triggerPrewarm(res.cues);
      return res;
    });
  }

  try {
    const res = await prepareLiveDub(videoId, runOpts);
    triggerPrewarm(res.cues);
    return Response.json(res);
  } catch (e) {
    return fail((e as Error).message, 502);
  }
}
