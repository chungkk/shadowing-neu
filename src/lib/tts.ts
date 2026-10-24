import "server-only";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { TTS_DIR } from "./db";

/**
 * Giọng đọc tiếng Đức tự nhiên (neural, như người Đức thật) cho app — thay giọng máy của expo-speech.
 * - Mặc định OpenAI gpt-4o-mini-tts (chung OPENAI_API_KEY), dặn đọc chuẩn hochdeutsch, không lơ lớ.
 * - Có AZURE_SPEECH_KEY + AZURE_SPEECH_REGION → dùng Azure (giọng de-DE bản xứ, rẻ, rất tự nhiên).
 * - TTS_VOICE đổi giọng (OpenAI: marin, cedar, coral…; Azure: de-DE-SeraphinaMultilingualNeural, de-DE-ConradNeural…).
 * File mp3 lưu trong TTS_DIR (cạnh DB, trên volume VPS) → mỗi câu chỉ trả tiền tạo 1 lần.
 */

const AZURE_KEY = process.env.AZURE_SPEECH_KEY;
const AZURE_REGION = process.env.AZURE_SPEECH_REGION;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_TTS_MODEL ?? "gpt-4o-mini-tts";

const provider = AZURE_KEY && AZURE_REGION ? "azure" : OPENAI_KEY ? "openai" : null;
const VOICE = process.env.TTS_VOICE ?? (provider === "azure" ? "de-DE-SeraphinaMultilingualNeural" : "marin");

const INSTRUCTIONS =
  "Sprich wie eine Muttersprachlerin aus Deutschland: reines Hochdeutsch ohne fremden Akzent, " +
  "natürlich und freundlich wie im Alltag, deutlich artikuliert, ruhiges Tempo. Lies nur den Text, ohne etwas hinzuzufügen.";

/** Câu dài nhất được đọc (ký tự) — câu học chỉ 1–2 dòng */
export const TTS_MAX_CHARS = 400;

export const ttsEnabled = () => provider !== null;

const escapeXml = (s: string) => s.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);

async function synthesize(text: string): Promise<Buffer> {
  const res =
    provider === "azure"
      ? await fetch(`https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
          method: "POST",
          headers: {
            "Ocp-Apim-Subscription-Key": AZURE_KEY!,
            "Content-Type": "application/ssml+xml",
            "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
          },
          body: `<speak version="1.0" xml:lang="de-DE"><voice name="${VOICE}"><lang xml:lang="de-DE">${escapeXml(text)}</lang></voice></speak>`,
        })
      : await fetch("https://api.openai.com/v1/audio/speech", {
          method: "POST",
          headers: { Authorization: `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: OPENAI_MODEL, voice: VOICE, input: text, instructions: INSTRUCTIONS, response_format: "mp3" }),
        });
  if (!res.ok) throw new Error(`Lỗi tạo giọng đọc (${res.status}): ${(await res.text()).slice(0, 200)}`);
  return Buffer.from(await res.arrayBuffer());
}

/** File cache của 1 câu — đổi nhà cung cấp / giọng thì tạo lại */
const fileFor = (text: string) =>
  path.join(TTS_DIR, createHash("sha1").update(`${provider}|${OPENAI_MODEL}|${VOICE}|${text}`).digest("hex") + ".mp3");

/** Đã có file sẵn (đọc lại không tốn tiền API → không tính vào giới hạn lượt) */
export const hasSpeech = (text: string) => fs.existsSync(fileFor(text));

// Nhiều người bấm cùng 1 câu lúc chưa có file → chỉ gọi API 1 lần
const pending = new Map<string, Promise<Buffer>>();

/** mp3 của `text` (tạo mới nếu chưa có file) */
export async function germanSpeech(text: string): Promise<Buffer> {
  const file = fileFor(text);
  try {
    return fs.readFileSync(file);
  } catch {}
  let job = pending.get(file);
  if (!job) {
    job = synthesize(text)
      .then((audio) => {
        fs.mkdirSync(TTS_DIR, { recursive: true });
        fs.writeFileSync(file, audio);
        return audio;
      })
      .finally(() => pending.delete(file));
    pending.set(file, job);
  }
  return job;
}
