import "server-only";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { TTS_DIR } from "./db";

export const EDGE_VI_VOICES = {
  "edge:vi-VN-NamMinhNeural": "vi-VN-NamMinhNeural",
  "edge:vi-VN-HoaiMyNeural": "vi-VN-HoaiMyNeural",
} as const;

export type EdgeVoiceId = keyof typeof EDGE_VI_VOICES;

export function isEdgeVoice(v: string): v is EdgeVoiceId {
  return v in EDGE_VI_VOICES;
}

export const EDGE_TTS_MAX_CHARS = 600;

const DUB_TTS_DIR = path.join(TTS_DIR, "dub");
const CACHE_MAX_BYTES = (Number(process.env.DUB_TTS_CACHE_MB) || 500) * 1024 * 1024;
const pending = new Map<string, Promise<Buffer>>();
let writes = 0;

/** Làm tròn tốc độ về bội 0.05 trong [0.85, 1.45] để tăng tỷ lệ trùng cache */
export function normalizeEdgeSpeed(speed: number): number {
  const clamped = Math.min(1.45, Math.max(0.85, Number.isFinite(speed) ? speed : 1.15));
  return Math.round(clamped * 20) / 20;
}

function toRateStr(speed: number): string {
  const pct = Math.round((speed - 1) * 100);
  return `${pct >= 0 ? "+" : ""}${pct}%`;
}

function cacheFileFor(voiceId: EdgeVoiceId, speed: number, text: string): string {
  const key = createHash("sha1").update(`edge|${voiceId}|${speed.toFixed(2)}|${text}`).digest("hex");
  return path.join(DUB_TTS_DIR, `${key}.mp3`);
}

export function hasEdgeDubSpeech(voiceId: EdgeVoiceId, speed: number, text: string): boolean {
  return fs.existsSync(cacheFileFor(voiceId, normalizeEdgeSpeed(speed), text.trim()));
}

function pruneCache() {
  try {
    const files = fs.readdirSync(DUB_TTS_DIR).flatMap((name) => {
      if (!name.endsWith(".mp3")) return [];
      const st = fs.statSync(path.join(DUB_TTS_DIR, name));
      return [{ name, size: st.size, used: Math.max(st.atimeMs, st.mtimeMs) }];
    });
    let total = files.reduce((n, f) => n + f.size, 0);
    if (total <= CACHE_MAX_BYTES) return;
    for (const f of files.sort((a, b) => a.used - b.used)) {
      if (total <= CACHE_MAX_BYTES * 0.8) break;
      fs.rmSync(path.join(DUB_TTS_DIR, f.name), { force: true });
      total -= f.size;
    }
  } catch (e) {
    console.error("[edge-tts] dọn cache lỗi:", e);
  }
}

async function runEdgeOnce(voiceName: string, rate: string, text: string): Promise<Buffer> {
  const tts = new MsEdgeTTS();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const work = (async () => {
      await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      const { audioStream } = tts.toStream(text, { rate });
      const chunks: Buffer[] = [];
      for await (const chunk of audioStream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const buf = Buffer.concat(chunks);
      if (!buf.length) throw new Error("Edge TTS trả về âm thanh rỗng.");
      return buf;
    })();

    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Edge TTS hết thời gian chờ.")), 12_000);
    });

    return await Promise.race([work, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
    try {
      tts.close();
    } catch {}
  }
}

/** Tạo (hoặc lấy từ cache đĩa) MP3 tiếng Việt bằng Microsoft Edge Neural TTS (miễn phí, 0đ). */
export async function synthesizeEdgeDub(text: string, voiceId: EdgeVoiceId, speed = 1.15): Promise<Buffer> {
  const clean = text.replace(/\s+/g, " ").trim();
  const spd = normalizeEdgeSpeed(speed);
  const file = cacheFileFor(voiceId, spd, clean);

  try {
    return fs.readFileSync(file);
  } catch {}

  let job = pending.get(file);
  if (!job) {
    const voiceName = EDGE_VI_VOICES[voiceId];
    const rate = toRateStr(spd);
    job = (async () => {
      let lastErr: unknown;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const audio = await runEdgeOnce(voiceName, rate, clean);
          fs.mkdirSync(DUB_TTS_DIR, { recursive: true });
          fs.writeFileSync(file, audio);
          if (++writes % 100 === 0) pruneCache();
          return audio;
        } catch (e) {
          lastErr = e;
        }
      }
      throw lastErr instanceof Error ? lastErr : new Error("Không tạo được giọng đọc Edge TTS.");
    })().finally(() => pending.delete(file));
    pending.set(file, job);
  }
  return job;
}
