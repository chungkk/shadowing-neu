import "server-only";
import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { TTS_DIR } from "./db";
import { DUB_TTS_DIR, noteDubTtsCacheWrite, touchDubTtsFile } from "./dub-tts-cache";
import { normalizeEdgeSpeed } from "./edge-tts";
import config from "./kokoro-vi/config.json";
import { SeaDictionary, phonemizeChunks } from "./kokoro-vi/frontend";

export const SERVER_PIPER_VOICES = {
  "piper:adam_bua": {
    file: "adam_bua_v3_int8.onnx",
    url: "https://hallovn.de/download/media/kokoro/adam_bua_v3_int8.onnx",
    cacheVer: "v3",
    enableGerman: true,
  },
  "piper:lac_phi": {
    file: "lac_phi_int8.onnx",
    url: "https://hallovn.de/download/media/kokoro/lac_phi_int8.onnx?v=1",
    cacheVer: "v2",
    enableGerman: false,
  },
} as const;

export type ServerPiperVoiceId = keyof typeof SERVER_PIPER_VOICES;

export function isServerPiperVoice(v: string): v is ServerPiperVoiceId {
  return v in SERVER_PIPER_VOICES;
}

const PIPER_SAMPLE_RATE = 22_050;
const DICT_URL = "https://hallovn.de/download/media/kokoro/sea_g2p.bin";
const ORT_REMOTE_BASE = "https://hallovn.de/download/media/kokoro/ort/";
const KOKORO_DIR = path.join(TTS_DIR, "kokoro");

type OrtModule = typeof import("onnxruntime-web");
type OrtSession = import("onnxruntime-web").InferenceSession;

const gd = globalThis as unknown as {
  __serverPiper?: {
    ort: OrtModule | null;
    dict: SeaDictionary | null;
    sessions: Map<ServerPiperVoiceId, OrtSession>;
    loading: Map<ServerPiperVoiceId, Promise<OrtSession>>;
    pending: Map<string, Promise<Buffer>>;
    chain: Promise<unknown>;
  };
};

const state = (gd.__serverPiper ??= {
  ort: null,
  dict: null,
  sessions: new Map(),
  loading: new Map(),
  pending: new Map(),
  chain: Promise.resolve(),
});

function cacheFileFor(voiceId: ServerPiperVoiceId, speed: number, text: string): string {
  const ver = SERVER_PIPER_VOICES[voiceId].cacheVer;
  const key = createHash("sha1").update(`piper-${ver}|${voiceId}|${speed.toFixed(2)}|${text}`).digest("hex");
  return path.join(DUB_TTS_DIR, `${key}.wav`);
}

export function hasPiperDubSpeech(voiceId: ServerPiperVoiceId, speed: number, text: string): boolean {
  return fs.existsSync(cacheFileFor(voiceId, normalizeEdgeSpeed(speed), text.trim()));
}

async function ensureAssetFile(localPath: string, remoteUrl: string): Promise<Buffer> {
  try {
    return await fs.promises.readFile(localPath);
  } catch {}
  await fs.promises.mkdir(path.dirname(localPath), { recursive: true });
  const res = await fetch(remoteUrl, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`Không tải được tài nguyên giọng đọc (HTTP ${res.status}).`);
  const data = Buffer.from(await res.arrayBuffer());
  const tmp = `${localPath}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
  try {
    await fs.promises.writeFile(tmp, data);
    await fs.promises.rename(tmp, localPath);
  } catch (e) {
    await fs.promises.rm(tmp, { force: true }).catch(() => {});
    throw e;
  }
  return data;
}

async function resolveOrtWasmPath(): Promise<string> {
  const localDist = path.join(process.cwd(), "node_modules", "onnxruntime-web", "dist");
  if (fs.existsSync(path.join(localDist, "ort-wasm-simd-threaded.wasm"))) {
    return localDist + path.sep;
  }
  // Dự phòng cho Docker standalone nếu file wasm chưa được trace vào node_modules
  const fallbackDir = path.join(KOKORO_DIR, "ort");
  await Promise.all([
    ensureAssetFile(path.join(fallbackDir, "ort-wasm-simd-threaded.mjs"), `${ORT_REMOTE_BASE}ort-wasm-simd-threaded.mjs`),
    ensureAssetFile(path.join(fallbackDir, "ort-wasm-simd-threaded.wasm"), `${ORT_REMOTE_BASE}ort-wasm-simd-threaded.wasm`),
  ]);
  return fallbackDir + path.sep;
}

async function ensureSession(voiceId: ServerPiperVoiceId): Promise<OrtSession> {
  const ready = state.sessions.get(voiceId);
  if (ready && state.dict && state.ort) return ready;

  const inflight = state.loading.get(voiceId);
  if (inflight) return inflight;

  const spec = SERVER_PIPER_VOICES[voiceId];
  const job = (async () => {
    try {
      if (!state.ort) {
        const ort = await import("onnxruntime-web");
        ort.env.wasm.numThreads = 1;
        ort.env.wasm.wasmPaths = await resolveOrtWasmPath();
        state.ort = ort;
      }

      const [modelBuf, dictBuf] = await Promise.all([
        ensureAssetFile(path.join(KOKORO_DIR, spec.file), spec.url),
        state.dict ? Promise.resolve(null) : ensureAssetFile(path.join(KOKORO_DIR, "sea_g2p.bin"), DICT_URL),
      ]);

      if (dictBuf && !state.dict) {
        const ab = new ArrayBuffer(dictBuf.byteLength);
        new Uint8Array(ab).set(dictBuf);
        state.dict = new SeaDictionary(new Uint8Array(ab));
      }

      const sess = await state.ort.InferenceSession.create(modelBuf, {
        executionProviders: ["wasm"],
        graphOptimizationLevel: "all",
      });
      state.sessions.set(voiceId, sess);
      return sess;
    } finally {
      state.loading.delete(voiceId);
    }
  })();

  state.loading.set(voiceId, job);
  return job;
}

function trimSilenceAndFade(pcm: Float32Array, sr: number): Float32Array {
  if (!pcm.length) return pcm;
  let peak = 0;
  for (let i = 0; i < pcm.length; i++) {
    const a = Math.abs(pcm[i]);
    if (a > peak) peak = a;
  }
  if (peak < 1e-5) return new Float32Array(0);

  const thresh = peak * 0.012;
  let lo = 0;
  while (lo < pcm.length && Math.abs(pcm[lo]) < thresh) lo++;
  let hi = pcm.length - 1;
  while (hi > lo && Math.abs(pcm[hi]) < thresh) hi--;

  const pad = Math.round(0.04 * sr);
  lo = Math.max(0, lo - pad);
  hi = Math.min(pcm.length, hi + pad + 1);
  const out = pcm.slice(lo, hi);

  const fade = Math.min(Math.round(0.005 * sr), Math.floor(out.length / 4));
  for (let i = 0; i < fade; i++) {
    const g = i / fade;
    out[i] *= g;
    out[out.length - 1 - i] *= g;
  }
  return out;
}

function pcmToWav(pcm: Float32Array, sampleRate: number): Buffer {
  const dataBytes = pcm.length * 2;
  const buf = Buffer.alloc(44 + dataBytes);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataBytes, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16); // PCM chunk size
  buf.writeUInt16LE(1, 20); // PCM format
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buf.writeUInt16LE(2, 32); // block align
  buf.writeUInt16LE(16, 34); // bits per sample
  buf.write("data", 36);
  buf.writeUInt32LE(dataBytes, 40);
  for (let i = 0; i < pcm.length; i++) {
    const clamped = Math.max(-1, Math.min(1, pcm[i]));
    buf.writeInt16LE(clamped < 0 ? Math.round(clamped * 32768) : Math.round(clamped * 32767), 44 + i * 2);
  }
  return buf;
}

function runInference(voiceId: ServerPiperVoiceId, text: string, speed: number): Promise<Buffer> {
  const job = state.chain.then(async () => {
    const sess = await ensureSession(voiceId);
    const ort = state.ort!;
    const dict = state.dict!;

    const { chunks } = phonemizeChunks(text, dict, config.vocab, {
      enableGerman: SERVER_PIPER_VOICES[voiceId].enableGerman,
    });
    const parts: Float32Array[] = [];
    let totalLen = 0;
    const clampedSpeed = Math.min(1.5, Math.max(0.75, speed));
    const lengthScale = 1.0 / clampedSpeed;

    for (const chunk of chunks) {
      const inner = chunk.tokens.filter((tok) => tok > 0);
      if (!inner.length) continue;

      const ids = new BigInt64Array(inner.length * 2 + 3);
      const pad = BigInt(0);
      ids[0] = BigInt(178);
      ids[1] = pad;
      for (let i = 0; i < inner.length; i++) {
        ids[2 + i * 2] = BigInt(inner[i]);
        ids[3 + i * 2] = pad;
      }
      ids[ids.length - 1] = BigInt(179);

      const out = await sess.run({
        input: new ort.Tensor("int64", ids, [1, ids.length]),
        input_lengths: new ort.Tensor("int64", BigInt64Array.of(BigInt(ids.length)), [1]),
        scales: new ort.Tensor("float32", new Float32Array([0.667, lengthScale, 0.8]), [3]),
      });
      const raw = out.output?.data as Float32Array | undefined;
      if (raw && raw.length) {
        const trimmed = trimSilenceAndFade(raw, PIPER_SAMPLE_RATE);
        if (trimmed.length) {
          parts.push(trimmed);
          totalLen += trimmed.length;
        }
      }
    }

    const merged = new Float32Array(totalLen);
    let pos = 0;
    for (const p of parts) {
      merged.set(p, pos);
      pos += p.length;
    }
    return pcmToWav(merged, PIPER_SAMPLE_RATE);
  });

  state.chain = job.catch(() => {});
  return job;
}

/** Tạo (hoặc lấy từ cache đĩa) WAV tiếng Việt bằng model Piper ONNX (Adam bựa / Lạc Phi) ngay trên server. */
export async function synthesizePiperDub(text: string, voiceId: ServerPiperVoiceId, speed = 1.15): Promise<Buffer> {
  const clean = text.replace(/\s+/g, " ").trim();
  const spd = normalizeEdgeSpeed(speed);
  const file = cacheFileFor(voiceId, spd, clean);

  try {
    const data = await fs.promises.readFile(file);
    touchDubTtsFile(file);
    return data;
  } catch {}

  let job = state.pending.get(file);
  if (!job) {
    job = (async () => {
      const wav = await runInference(voiceId, clean, spd);
      await fs.promises.mkdir(DUB_TTS_DIR, { recursive: true });
      const tmp = `${file}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
      try {
        await fs.promises.writeFile(tmp, wav);
        await fs.promises.rename(tmp, file);
      } catch (e) {
        await fs.promises.rm(tmp, { force: true }).catch(() => {});
        throw e;
      }
      noteDubTtsCacheWrite(wav.byteLength);
      return wav;
    })().finally(() => state.pending.delete(file));
    state.pending.set(file, job);
  }
  return job;
}
