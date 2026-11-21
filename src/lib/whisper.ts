import "server-only";
import type { Segment, Word } from "./subtitles";

// API tương thích OpenAI Whisper. Mặc định OpenAI; có thể đổi sang Groq (nhanh + rẻ) qua .env.local
const API_URL = process.env.TRANSCRIBE_API_URL ?? "https://api.openai.com/v1/audio/transcriptions";
const API_KEY = process.env.TRANSCRIBE_API_KEY ?? process.env.OPENAI_API_KEY;
const MODEL = process.env.TRANSCRIBE_MODEL ?? "whisper-1";

/** Giới hạn file của Whisper API (OpenAI/Groq free tier: 25MB) */
export const WHISPER_MAX_BYTES = 24 * 1024 * 1024;

// Có key (OpenAI/Groq) hoặc tự đặt URL (server Whisper offline, không cần key) → bật Whisper
export const whisperEnabled = () => !!(API_KEY || process.env.TRANSCRIBE_API_URL);

// Đuôi file Whisper API (Groq/OpenAI) chấp nhận. Groq chỉ xét ĐUÔI TÊN FILE: tên "blob" / không đuôi → lỗi 400
// "file must be one of the following types", dù nội dung là m4a hợp lệ.
const EXTS = ["flac", "mp3", "mp4", "mpeg", "mpga", "m4a", "ogg", "opus", "wav", "webm"];
const MIME_EXT: Record<string, string> = {
  "audio/mp4": "m4a", "audio/m4a": "m4a", "audio/x-m4a": "m4a", "audio/aac": "m4a", "video/mp4": "mp4",
  "audio/webm": "webm", "video/webm": "webm", "audio/ogg": "ogg", "audio/opus": "opus",
  "audio/mpeg": "mp3", "audio/mp3": "mp3", "audio/wav": "wav", "audio/x-wav": "wav", "audio/wave": "wav",
  "audio/flac": "flac", "audio/x-flac": "flac",
};

/** Nhận định dạng thật từ vài byte đầu file (không tin tên file / MIME do client gửi). */
export function sniffAudioExt(b: Uint8Array): string | null {
  const ascii = (from: number, len: number) => String.fromCharCode(...b.subarray(from, from + len));
  if (b.length < 12) return null;
  if (ascii(4, 4) === "ftyp") return "m4a"; // MP4 / M4A (cả bản DASH của YouTube)
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return "webm"; // Matroska / WebM
  if (ascii(0, 4) === "OggS") return "ogg";
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WAVE") return "wav";
  if (ascii(0, 4) === "fLaC") return "flac";
  if (ascii(0, 3) === "ID3" || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return "mp3";
  return null;
}

/** Tên file gửi Whisper: đuôi theo nội dung thật → theo đuôi tên gốc → theo MIME. Không xác định được → null. */
export function whisperFilename(head: Uint8Array, filename: string, mime: string): string | null {
  const fromName = filename.split(".").pop()?.toLowerCase() ?? "";
  const ext =
    sniffAudioExt(head) ??
    (filename.includes(".") && EXTS.includes(fromName) ? fromName : null) ??
    MIME_EXT[mime.split(";")[0].trim().toLowerCase()] ??
    null;
  return ext ? `audio.${ext}` : null;
}

/**
 * Phiên bản Whisper (biến WHISPER_VERSION, mặc định "v2"):
 * - v1: code cũ, chỉ lấy thời gian theo đoạn (segment) → cắt câu chia thời gian theo số ký tự
 * - v2: lấy thêm thời gian TỪNG TỪ (+ thời điểm hết từ) → cắt câu chính xác như phụ đề tự động YouTube.
 *       v2 lỗi → tự chạy lại bằng v1.
 * KHÔNG gửi tiêu đề video làm `prompt`: đo trên 9 video có phụ đề người làm (scripts/eval-whisper.mts),
 * Whisper bắt chước văn phong của prompt (tiêu đề không dấu chấm, viết HOA…) → sai chữ tăng 8% → 19%,
 * chấm câu ít đi rõ rệt.
 */
export type WhisperVersion = "v1" | "v2";
export const whisperVersion = (): WhisperVersion => (process.env.WHISPER_VERSION === "v1" ? "v1" : "v2");

/** Gửi 1 file audio lên Whisper, trả về segment có timestamp (đã cộng offset giây) + phiên bản đã dùng. */
export async function transcribeAudio(
  audio: Blob,
  filename: string,
  offset = 0,
  { prompt, version = whisperVersion() }: { prompt?: string; version?: WhisperVersion } = {},
): Promise<{ segments: Segment[]; version: WhisperVersion }> {
  if (!whisperEnabled()) throw new Error("Chưa cấu hình Whisper trong .env.local (xem README).");

  const head = new Uint8Array(await audio.slice(0, 16).arrayBuffer());
  const name = whisperFilename(head, filename, audio.type);
  if (!name) {
    const hex = Buffer.from(head).toString("hex");
    console.error("[whisper] định dạng audio không nhận ra:", { filename, type: audio.type, size: audio.size, head: hex });
    throw new Error(`File ghi âm không đúng định dạng audio hỗ trợ (${filename || "không tên"}, ${audio.type || "không rõ kiểu"}).`);
  }

  if (version === "v2") {
    try {
      return { segments: await transcribeV2(audio, name, offset, prompt), version };
    } catch (e) {
      console.error("[whisper] v2 lỗi, chạy lại bằng v1:", (e as Error).message);
    }
  }
  return { segments: await transcribeV1(audio, name, offset), version: "v1" };
}

async function callApi(body: FormData, info: object) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {},
    body,
  });
  if (!res.ok) {
    const detail = await res.text();
    console.error("[whisper]", res.status, info, detail.slice(0, 300));
    throw new Error(`Lỗi API nhận dạng giọng nói (${res.status}): ${detail}`);
  }
  return res.json();
}

// ---- v1 (code cũ, giữ nguyên) ----

async function transcribeV1(audio: Blob, name: string, offset: number): Promise<Segment[]> {
  const body = new FormData();
  body.append("file", audio, name);
  body.append("model", MODEL);
  body.append("language", "de");
  body.append("response_format", "verbose_json");
  body.append("timestamp_granularities[]", "segment");

  const data: { segments?: RawSegment[] } = await callApi(body, { v: 1, sent: name, type: audio.type, size: audio.size });
  return filterHallucinations(data.segments ?? []).map((s) => ({
    start: s.start + offset,
    end: s.end + offset,
    text: s.text.trim(),
  }));
}

// ---- v2: thời gian từng từ (+ prompt tuỳ chọn — app KHÔNG dùng, xem ghi chú ở whisperVersion) ----

type RawWord = { word: string; start: number; end: number };

async function transcribeV2(audio: Blob, name: string, offset: number, prompt?: string): Promise<Segment[]> {
  const body = new FormData();
  body.append("file", audio, name);
  body.append("model", MODEL);
  body.append("language", "de");
  body.append("response_format", "verbose_json");
  body.append("timestamp_granularities[]", "segment");
  body.append("timestamp_granularities[]", "word");
  // Prompt của Whisper tối đa ~224 token; chỉ là gợi ý từ vựng / văn phong (câu tiếng Đức có dấu câu đầy đủ)
  const p = prompt?.replace(/\s+/g, " ").trim().slice(0, 200);
  if (p) body.append("prompt", p);

  const data: { segments?: RawSegment[]; words?: RawWord[] } = await callApi(body, {
    v: 2,
    sent: name,
    type: audio.type,
    size: audio.size,
  });
  const words = (data.words ?? []).filter((w) => w.word?.trim() && Number.isFinite(w.start));
  if (!words.length) throw new Error("API không trả về thời gian từng từ.");

  // Whisper đôi khi chép lại nguyên prompt vào chỗ im lặng / có nhạc → bỏ
  const pn = p ? norm(p) : "";
  const segs = filterHallucinations(data.segments ?? []).filter((s) => !pn || norm(s.text) !== pn);
  return segs.map((s) => {
    const inSeg = words.filter((w) => w.start >= s.start - 0.05 && w.start < s.end);
    const text = s.text.trim();
    return {
      start: s.start + offset,
      end: s.end + offset,
      text,
      ...(inSeg.length ? { words: attachWordTimes(text, inSeg, s.start, s.end).map(([t, w, e]): Word => (e === undefined ? [t + offset, w] : [t + offset, w, e + offset])) } : {}),
    };
  });
}

const norm = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

/**
 * Chữ của segment (có dấu câu, chữ hoa) + thời gian từ API (từ thường không có dấu câu):
 * mỗi từ trong câu tìm từ khớp gần nhất phía trước (nhìn tới 3 từ); không khớp → nội suy giữa 2 từ khớp bên cạnh.
 * Từ khớp được giữ cả thời điểm hết từ (để câu dừng đúng lúc dứt lời).
 */
export function attachWordTimes(text: string, words: RawWord[], segStart: number, segEnd: number): Word[] {
  const toks = text.split(/\s+/).filter(Boolean);
  const times: (number | null)[] = toks.map(() => null);
  const ends: (number | undefined)[] = toks.map(() => undefined); // thời điểm hết từ (chỉ từ khớp được)
  let j = 0;
  toks.forEach((tok, i) => {
    const n = norm(tok);
    if (!n) return;
    for (let k = j; k < Math.min(j + 4, words.length); k++) {
      if (norm(words[k].word) === n) {
        times[i] = words[k].start;
        if (Number.isFinite(words[k].end)) ends[i] = words[k].end;
        j = k + 1;
        return;
      }
    }
  });
  // Nội suy chỗ trống; thời gian phải tăng dần và nằm trong segment
  let prev = segStart;
  return toks.map((tok, i): Word => {
    let t = times[i];
    if (t == null) {
      let k = i + 1;
      while (k < toks.length && times[k] == null) k++;
      const nextT = k < toks.length ? (times[k] as number) : segEnd;
      t = prev + (nextT - prev) / (k - i + 1);
    }
    t = Math.min(Math.max(t, prev), segEnd);
    prev = t;
    const e = ends[i];
    return e !== undefined && e > t ? [t, tok, Math.min(e, segEnd)] : [t, tok];
  });
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
