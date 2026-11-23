import { body, fail, str } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getCachedLiveDub, isLiveDubInflight, prepareLiveDub, streamPrepareResponse } from "@/lib/dub-live";
import { allow, clientIp } from "@/lib/rate-limit";
import { extractVideoId } from "@/lib/youtube-id";

type PublicPrepareBody = {
  url?: unknown;
  videoId?: unknown;
};

/**
 * POST /api/v1/dub/prepare { url | videoId }
 * Chuẩn bị phụ đề tiếng Việt cho người xem YouTube thuyết minh trực tiếp trên trình duyệt (Kokoro Lite WASM).
 * - Hỗ trợ ?stream=1 (NDJSON) để phát tiến trình 0% → 100% theo thời gian thực.
 * - Video đã từng chuẩn bị → trả ngay từ cache SQLite, không tốn hạn mức.
 */
export async function POST(req: Request) {
  const wantStream =
    new URL(req.url).searchParams.get("stream") === "1" ||
    (req.headers.get("accept") ?? "").includes("application/x-ndjson");

  const b = await body<PublicPrepareBody>(req);
  const raw = str(b.url).trim() || str(b.videoId).trim();
  const videoId = extractVideoId(raw);
  if (!videoId) return fail("Link YouTube không hợp lệ. Vui lòng dán link video YouTube đầy đủ hoặc mã video.");

  // Cache hit → trả ngay lập tức, không tính hạn mức
  const cached = getCachedLiveDub(videoId);
  if (cached) {
    if (wantStream) {
      return streamPrepareResponse(async (emit) => {
        emit({ pct: 100, stage: "Đã sẵn sàng từ bộ nhớ đệm" });
        return { ...cached, cached: true };
      });
    }
    return Response.json({ ...cached, cached: true });
  }

  const user = await getCurrentUser();
  const isAdmin = user?.role === "admin";
  const ip = isAdmin || user ? "" : await clientIp();

  // Nếu video đã có luồng đang dịch dở trên server thì gắn chung listener, không trừ thêm hạn mức
  if (!isAdmin && !isLiveDubInflight(videoId)) {
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
  };

  if (wantStream) {
    return streamPrepareResponse((emit, emitEvent) =>
      prepareLiveDub(videoId, { ...runOpts, onProgress: emit, onEvent: emitEvent }),
    );
  }

  try {
    return Response.json(await prepareLiveDub(videoId, runOpts));
  } catch (e) {
    return fail((e as Error).message, 502);
  }
}
