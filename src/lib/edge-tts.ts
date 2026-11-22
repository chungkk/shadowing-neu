import "server-only";
import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import WebSocket from "ws";
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

const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const WSS_URL = "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1";
const SEC_MS_GEC_VERSION = "2-143.0.3650.96";
const EDGE_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0";
const EDGE_ORIGIN = "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold";
const OUTPUT_FORMAT = "audio-24khz-48kbitrate-mono-mp3";
const AUDIO_DELIM = Buffer.from("Path:audio\r\n");

// Sec-MS-GEC v2 (CS64 checksum + SHA-256)
const EDGE_COPYRIGHT = "Copyright (C) Microsoft Corporation. All rights reserved.";
const SWAP_FIRST = { swappedWord: 0xef0569fb, swappedSum: 0x76f50f34, swappedProduct: 0xc3efea97 };
const SWAP_SECOND = { swappedWord: 0xc31713db, swappedSum: 0x1881ce3c, swappedProduct: 0x35bd1ec9 };
const MIX_FIRST = [0xcf98b111, 0x87085b9f, 0x12ceb96d, 0x257e1d83];
const MIX_SECOND = [0xa27416f5, 0xd38396ff, 0x7c932b89, 0xbfa49f69];

let clockOffsetMs = 0;

function swapHalves(v: number): number {
  return ((v << 16) | (v >>> 16)) >>> 0;
}

function swapTerm(word: number, key: number, m: { swappedWord: number; swappedSum: number; swappedProduct: number }): number {
  const sum = Math.imul(word, key) + Math.imul(swapHalves(word), m.swappedWord);
  const prod = Math.imul(swapHalves(sum), m.swappedSum) >>> 0;
  return (Math.imul(swapHalves(prod), m.swappedProduct) + prod) >>> 0;
}

function swapAndMultiply(value: number, mults: number[]): number {
  let v = value;
  for (const m of mults) v = Math.imul(swapHalves(v), m) >>> 0;
  return v;
}

function cs64(message: Uint8Array, digest: Buffer): Uint8Array {
  const firstKey = (digest.readUInt32LE(0) | 1) >>> 0;
  const secondKey = (digest.readUInt32LE(4) | 1) >>> 0;
  const padded = new Uint8Array(Math.ceil(message.length / 8) * 8);
  padded.set(message);
  const words = new DataView(padded.buffer);
  let swapSum = 0;
  let lastSwap = 0;
  let mix = 0;
  let mixSum = 0;
  for (let offset = 0; offset < padded.length; offset += 8) {
    const firstWord = words.getUint32(offset, true);
    const secondWord = words.getUint32(offset + 4, true);
    const firstSwap = swapTerm(firstWord, firstKey, SWAP_FIRST);
    lastSwap = swapTerm(secondWord, secondKey, SWAP_SECOND);
    swapSum = (swapSum + firstSwap + lastSwap) >>> 0;
    mix = swapAndMultiply(Math.imul(mix + firstWord, firstKey), MIX_FIRST);
    mixSum = (mixSum + mix) >>> 0;
    mix = swapAndMultiply(Math.imul(mix + secondWord, secondKey), MIX_SECOND);
    mixSum = (mixSum + mix) >>> 0;
  }
  const out = new Uint8Array(8);
  const view = new DataView(out.buffer);
  view.setUint32(0, lastSwap ^ mix, true);
  view.setUint32(4, swapSum ^ mixSum, true);
  return out;
}

function generateSecMsGec(): string {
  const ticks = Math.floor((Date.now() + clockOffsetMs) / 1000) + 11644473600;
  const rounded = ticks - (ticks % 300);
  const windowsTicks = rounded * 10000000;
  const msg = Buffer.from(`${EDGE_COPYRIGHT}${windowsTicks}${TRUSTED_CLIENT_TOKEN}`, "utf8");
  const digest = createHash("sha256").update(msg).digest();
  const csum = Buffer.from(cs64(msg, digest)).toString("hex").toUpperCase();
  return `${csum}-${digest.toString("hex").toUpperCase()}`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

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

function runEdgeOnce(voiceName: string, rate: string, text: string, allowClockRetry = true): Promise<Buffer> {
  const connId = randomBytes(16).toString("hex");
  const reqId = randomBytes(16).toString("hex");
  const url = `${WSS_URL}?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${generateSecMsGec()}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}&ConnectionId=${connId}`;

  return new Promise<Buffer>((resolve, reject) => {
    let settled = false;
    const chunks: Buffer[] = [];
    const ws = new WebSocket(url, {
      headers: {
        "User-Agent": EDGE_UA,
        Origin: EDGE_ORIGIN,
      },
      handshakeTimeout: 10_000,
    });

    const timer = setTimeout(() => {
      finish(new Error("Edge TTS hết thời gian chờ."));
    }, 12_000);

    const finish = (err: Error | null, data?: Buffer) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        if (ws.readyState === WebSocket.OPEN) ws.close();
        else ws.terminate();
      } catch {}
      if (err) reject(err);
      else resolve(data!);
    };

    ws.once("unexpected-response", (req, res) => {
      const status = res.statusCode ?? 0;
      const serverDate = typeof res.headers.date === "string" ? Date.parse(res.headers.date) : NaN;
      req.destroy();
      res.destroy();
      if (allowClockRetry && status === 403 && Number.isFinite(serverDate)) {
        clockOffsetMs = serverDate - Date.now();
        settled = true;
        clearTimeout(timer);
        runEdgeOnce(voiceName, rate, text, false).then(resolve, reject);
        return;
      }
      finish(new Error(`Edge TTS từ chối kết nối (HTTP ${status}).`));
    });

    ws.on("open", () => {
      const configMsg =
        `Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
        JSON.stringify({
          context: {
            synthesis: {
              audio: {
                metadataoptions: { sentenceBoundaryEnabled: "false", wordBoundaryEnabled: "false" },
                outputFormat: OUTPUT_FORMAT,
              },
            },
          },
        });
      const ssml =
        `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="vi-VN">` +
        `<voice name="${voiceName}"><prosody pitch="+0Hz" rate="${rate}" volume="+0%">${escapeXml(text)}</prosody></voice>` +
        `</speak>`;
      const ssmlMsg = `X-RequestId:${reqId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n${ssml}`;
      ws.send(configMsg);
      ws.send(ssmlMsg);
    });

    ws.on("message", (raw, isBinary) => {
      if (isBinary) {
        const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(raw as ArrayBuffer);
        const idx = buf.indexOf(AUDIO_DELIM);
        if (idx !== -1) {
          const payload = buf.subarray(idx + AUDIO_DELIM.length);
          if (payload.length) chunks.push(payload);
        }
      } else {
        const msg = raw.toString();
        if (msg.includes("Path:turn.end")) {
          const out = Buffer.concat(chunks);
          if (!out.length) finish(new Error("Edge TTS trả về âm thanh rỗng."));
          else finish(null, out);
        }
      }
    });

    ws.on("error", (err) => {
      finish(new Error(`Edge TTS lỗi kết nối: ${err.message}`));
    });

    ws.on("close", () => {
      if (!settled) {
        const out = Buffer.concat(chunks);
        if (out.length) finish(null, out);
        else finish(new Error("Edge TTS đóng kết nối trước khi hoàn tất."));
      }
    });
  });
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
