import { body, fail, str } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getCachedLiveDub, prepareLiveDub } from "@/lib/dub-live";
import { allow, clientIp } from "@/lib/rate-limit";
import { extractVideoId } from "@/lib/youtube-id";

type PublicPrepareBody = {
  url?: unknown;
  videoId?: unknown;
};

/**
 * POST /api/v1/dub/prepare { url | videoId }
 * Chuẩn bị phụ đề tiếng Việt cho người xem YouTube thuyết minh trực tiếp trên trình duyệt (Kokoro Lite WASM).
 * - Video đã từng chuẩn bị → trả ngay từ cache SQLite, không tốn hạn mức.
 * - Video mới → áp dụng hạn mức hợp lý theo tài khoản / IP; không tốn CPU TTS trên server.
 */
export async function POST(req: Request) {
  const b = await body<PublicPrepareBody>(req);
  const raw = str(b.url).trim() || str(b.videoId).trim();
  const videoId = extractVideoId(raw);
  if (!videoId) return fail("Link YouTube không hợp lệ. Vui lòng dán link video YouTube đầy đủ hoặc mã video.");

  // Cache hit → trả ngay lập tức, không tính hạn mức
  const cached = getCachedLiveDub(videoId);
  if (cached) {
    return Response.json({ ...cached, cached: true });
  }

  const user = await getCurrentUser();
  const isAdmin = user?.role === "admin";

  if (!isAdmin) {
    const key = user ? `u:${user.id}` : `ip:${await clientIp()}`;
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

  try {
    const data = await prepareLiveDub(videoId, {
      allowWhisper: !!user,
      quotaKey: isAdmin ? undefined : user ? `u:${user.id}` : `ip:${await clientIp()}`,
      maxSeconds: isAdmin ? undefined : user ? 45 * 60 : 30 * 60,
      maxCues: isAdmin ? 2500 : 1800,
    });
    return Response.json(data);
  } catch (e) {
    return fail((e as Error).message, 502);
  }
}
