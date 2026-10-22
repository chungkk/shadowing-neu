import { apiUser, fail } from "@/lib/api";
import { allow } from "@/lib/rate-limit";
import { transcribeAudio, whisperEnabled } from "@/lib/whisper";

// Whisper tốn tiền API: 60 lượt / 10 phút mỗi tài khoản
const WINDOW_MS = 10 * 60 * 1000;
// 1 câu nói (m4a từ app) chỉ vài trăm KB — chặn file lớn bất thường
const MAX_BYTES = 3 * 1024 * 1024;

/**
 * Chế độ Crazy: nhận bản ghi giọng người học (multipart, trường "file") → { text } Whisper nghe được.
 * App tự so với câu gốc để chấm độ "rõ". Không gửi câu gốc làm prompt để Whisper không tự sửa theo.
 */
export async function POST(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  if (!whisperEnabled()) return fail("Server chưa cấu hình Whisper để chấm phát âm.", 503);
  if (!allow(`speak:u:${user.id}`, 60, WINDOW_MS)) return fail("Chấm quá nhiều trong thời gian ngắn, thử lại sau ít phút.", 429);

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof Blob) || !file.size) return fail("Thiếu file ghi âm");
  if (file.size > MAX_BYTES) return fail("File ghi âm quá lớn", 413);

  try {
    const segments = await transcribeAudio(file, file instanceof File && file.name ? file.name : "speech.m4a");
    return Response.json({ text: segments.map((s) => s.text).join(" ").trim() });
  } catch (e) {
    return fail((e as Error).message, 502);
  }
}
