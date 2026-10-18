import "server-only";
import type { Segment } from "./subtitles";

// API tương thích OpenAI Whisper. Mặc định OpenAI; có thể đổi sang Groq (nhanh + rẻ) qua .env.local
const API_URL = process.env.TRANSCRIBE_API_URL ?? "https://api.openai.com/v1/audio/transcriptions";
const API_KEY = process.env.TRANSCRIBE_API_KEY ?? process.env.OPENAI_API_KEY;
const MODEL = process.env.TRANSCRIBE_MODEL ?? "whisper-1";

/** Giới hạn file của Whisper API (OpenAI/Groq free tier: 25MB) */
export const WHISPER_MAX_BYTES = 24 * 1024 * 1024;

// Có key (OpenAI/Groq) hoặc tự đặt URL (server Whisper offline, không cần key) → bật Whisper
export const whisperEnabled = () => !!(API_KEY || process.env.TRANSCRIBE_API_URL);

/** Gửi 1 file audio lên Whisper, trả về segment có timestamp (đã cộng offset giây). */
export async function transcribeAudio(audio: Blob, filename: string, offset = 0): Promise<Segment[]> {
  if (!whisperEnabled()) throw new Error("Chưa cấu hình Whisper trong .env.local (xem README).");

  const body = new FormData();
  body.append("file", audio, filename);
  body.append("model", MODEL);
  body.append("language", "de");
  body.append("response_format", "verbose_json");
  body.append("timestamp_granularities[]", "segment");

  const res = await fetch(API_URL, {
    method: "POST",
    headers: API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {},
    body,
  });
  if (!res.ok) throw new Error(`Lỗi API nhận dạng giọng nói (${res.status}): ${await res.text()}`);

  const data: { segments?: RawSegment[] } = await res.json();
  return filterHallucinations(data.segments ?? []).map((s) => ({
    start: s.start + offset,
    end: s.end + offset,
    text: s.text.trim(),
  }));
}

type RawSegment = {
  start: number;
  end: number;
  text: string;
  no_speech_prob?: number;
  avg_logprob?: number;
  compression_ratio?: number;
};

// Câu Whisper hay "bịa" khi gặp nhạc / im lặng (học từ phụ đề TV Đức trong dữ liệu huấn luyện)
const CREDITS =
  /untertitel(ung)?\s*(:|von|des|der|im\s+auftrag|by|erstellt|wurden)|amara\.org|copyright\s+(wdr|swr|ndr|br|zdf|ard)|(wdr|swr|ndr|zdf|ard|funk)\s*(mediathek|,)?\s*20\d\d|www\.|\.(de|com|org)\b/i;
const NOISE_ONLY = /^[\s\p{P}\p{S}]*(musik|applaus|gelächter|lachen|stille|\.{3}|…)?[\s\p{P}\p{S}]*$/iu;
const OUTRO = /^(vielen\s+)?dank(e)?\s+(fürs|für's|für das|für ihre|für eure)\s+(zuschauen|zuhören|aufmerksamkeit)[.!]*$/i;

/** Bỏ câu bịa / lặp / không có tiếng nói khỏi kết quả Whisper. */
export function filterHallucinations(segs: RawSegment[]): RawSegment[] {
  const out: RawSegment[] = [];
  for (const s of segs) {
    const text = s.text.trim();
    const noSpeech = s.no_speech_prob ?? 0;
    const logprob = s.avg_logprob ?? 0;
    if (NOISE_ONLY.test(text)) continue;
    if (CREDITS.test(text)) continue;
    // Heuristic của OpenAI: khả năng "không có tiếng" cao + model không tự tin
    if (noSpeech > 0.6 && logprob < -1) continue;
    if (noSpeech > 0.9) continue;
    // Lặp vòng ("ja ja ja ja ...")
    if ((s.compression_ratio ?? 0) > 2.4) continue;
    // "Danke fürs Zuschauen" thật thì thường có tiếng rõ; bịa thì no_speech cao
    if (OUTRO.test(text) && noSpeech > 0.3) continue;
    // Câu y hệt câu trước (Whisper bị kẹt)
    if (out.length && out[out.length - 1].text.trim() === text) {
      out[out.length - 1] = { ...out[out.length - 1], end: s.end };
      continue;
    }
    out.push(s);
  }
  return out;
}
