import { apiUser, fail } from "@/lib/api";
import { allow } from "@/lib/rate-limit";
import { germanSpeech, hasSpeech, TTS_MAX_CHARS, ttsEnabled } from "@/lib/tts";

// Tạo giọng mới tốn tiền API: 300 câu mới / 10 phút mỗi tài khoản (câu đã có file thì không tính)
const WINDOW_MS = 10 * 60 * 1000;

/**
 * GET ?text=… → mp3 câu / từ tiếng Đức đọc bằng giọng neural tự nhiên.
 * Server chưa cấu hình (503) hoặc lỗi → app tự lùi về giọng có sẵn của máy.
 */
export async function GET(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  if (!ttsEnabled()) return fail("Server chưa cấu hình giọng đọc.", 503);

  const text = (new URL(req.url).searchParams.get("text") ?? "").replace(/\s+/g, " ").trim();
  if (!text) return fail("Thiếu câu cần đọc");
  if (text.length > TTS_MAX_CHARS) return fail("Câu quá dài", 413);
  if (!hasSpeech(text) && !allow(`tts:u:${user.id}`, 300, WINDOW_MS)) return fail("Nghe quá nhiều câu mới, thử lại sau ít phút.", 429);

  try {
    return new Response(new Uint8Array(await germanSpeech(text)), {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=31536000, immutable" },
    });
  } catch (e) {
    return fail((e as Error).message, 502);
  }
}
