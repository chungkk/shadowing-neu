import { fail } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import {
  EDGE_TTS_MAX_CHARS,
  hasEdgeDubSpeech,
  isEdgeVoice,
  normalizeEdgeSpeed,
  synthesizeEdgeDub,
} from "@/lib/edge-tts";
import { allow, clientIp } from "@/lib/rate-limit";

const WINDOW_MS = 10 * 60_000;

/**
 * GET /api/v1/dub/tts?v=edge:vi-VN-NamMinhNeural&s=1.15&t=...
 * Đọc từng câu thuyết minh tiếng Việt trực tiếp bằng Edge Neural TTS (có cache đĩa + HTTP cache).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const voice = (searchParams.get("v") ?? "").trim();
  const text = (searchParams.get("t") ?? "").replace(/\s+/g, " ").trim();
  const speed = normalizeEdgeSpeed(Number(searchParams.get("s") ?? "1.15"));

  if (!isEdgeVoice(voice)) return fail("Giọng đọc Edge không hợp lệ.");
  if (!text) return fail("Thiếu câu cần đọc.");
  if (text.length > EDGE_TTS_MAX_CHARS) return fail("Câu quá dài.", 413);

  // Cache hit trên đĩa → trả ngay, không tính hạn mức
  if (!hasEdgeDubSpeech(voice, speed, text)) {
    const user = await getCurrentUser();
    if (user?.role !== "admin") {
      const key = user ? `u:${user.id}` : `ip:${await clientIp()}`;
      if (!allow(`dubtts:${key}`, user ? 450 : 200, WINDOW_MS)) {
        return fail("Bạn tạo giọng đọc quá nhanh trong thời gian ngắn, thử lại sau ít phút nhé.", 429);
      }
    }
  }

  try {
    const mp3 = await synthesizeEdgeDub(text, voice, speed);
    return new Response(new Uint8Array(mp3), {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=604800, immutable",
      },
    });
  } catch (e) {
    return fail((e as Error).message, 502);
  }
}
