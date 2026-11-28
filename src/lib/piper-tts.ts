import "server-only";
import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
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
    cacheVer: "v3c",
    enableGerman: true,
  },
  "piper:lac_phi": {
    file: "lac_phi_int8.onnx",
    url: "https://hallovn.de/download/media/kokoro/lac_phi_int8.onnx?v=1",
    cacheVer: "v2b",
    enableGerman: false,
  },
  "piper:vtv2_thuyetminh": {
    file: "vtv2_thuyetminh_v3_int8.onnx",
    url: "https://hallovn.de/download/media/kokoro/vtv2_thuyetminh_v3_int8.onnx",
    cacheVer: "v3c",
    enableGerman: true,
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

export type PiperPriority = "urgent" | "normal";

type QueuedPiperJob = {
  key: string;
  priority: PiperPriority;
  signal?: AbortSignal;
  run: () => Promise<Buffer>;
  resolve: (b: Buffer) => void;
  reject: (e: unknown) => void;
};

type OrtTensorLike = {
  data: unknown;
};

type OrtTensorCtor = new (
  type: "int64" | "float32",
  data: BigInt64Array | Float32Array,
  dims: number[],
) => OrtTensorLike;

type OrtSessionLike = {
  run(feeds: Record<string, OrtTensorLike>): Promise<Record<string, OrtTensorLike>>;
};

type OrtRuntimeLike = {
  Tensor: OrtTensorCtor;
  InferenceSession: {
    create(pathOrBuf: string | Buffer | Uint8Array, options?: Record<string, unknown>): Promise<OrtSessionLike>;
  };
};

type PiperBackend = "node" | "wasm";

type ServerPiperState = {
  ort: OrtRuntimeLike | null;
  backend: PiperBackend | null;
  dict: SeaDictionary | null;
  sessions: Map<ServerPiperVoiceId, OrtSessionLike>;
  loading: Map<ServerPiperVoiceId, Promise<OrtSessionLike>>;
  pending: Map<string, Promise<Buffer>>;
  urgentQueue: QueuedPiperJob[];
  normalQueue: QueuedPiperJob[];
  activeCount: number;
};

const gd = globalThis as unknown as {
  __serverPiper?: ServerPiperState;
};

const state: ServerPiperState = (gd.__serverPiper ??= {
  ort: null,
  backend: null,
  dict: null,
  sessions: new Map(),
  loading: new Map(),
  pending: new Map(),
  urgentQueue: [],
  normalQueue: [],
  activeCount: 0,
});
// Bảo đảm giữ tương thích nếu singleton đã khởi tạo trước hot-reload
if (!Array.isArray(state.urgentQueue)) state.urgentQueue = [];
if (!Array.isArray(state.normalQueue)) state.normalQueue = [];
if (typeof state.activeCount !== "number") state.activeCount = 0;

function getPiperConcurrency(): number {
  if (state.backend !== "node") return 1;
  const envVal = Number(process.env.PIPER_CONCURRENCY);
  if (Number.isFinite(envVal) && envVal >= 1) return Math.min(4, Math.floor(envVal));
  const cpus = os.cpus().length;
  return cpus >= 4 ? 2 : 1;
}

function getIntraOpThreads(concurrency: number): number {
  const cpus = Math.max(1, os.cpus().length);
  return Math.max(1, Math.min(4, Math.floor(cpus / Math.max(1, concurrency))));
}

function cacheFileFor(voiceId: ServerPiperVoiceId, speed: number, text: string): string {
  const ver = SERVER_PIPER_VOICES[voiceId].cacheVer;
  const key = createHash("sha1").update(`piper-${ver}|${voiceId}|${speed.toFixed(2)}|${text}`).digest("hex");
  return path.join(DUB_TTS_DIR, `${key}.wav`);
}

export function hasPiperDubSpeech(voiceId: ServerPiperVoiceId, speed: number, text: string): boolean {
  return fs.existsSync(cacheFileFor(voiceId, normalizeEdgeSpeed(speed), text.trim()));
}

async function ensureAssetOnDisk(localPath: string, remoteUrl: string): Promise<string> {
  if (fs.existsSync(localPath)) return localPath;
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
  return localPath;
}

async function ensureAssetFile(localPath: string, remoteUrl: string): Promise<Buffer> {
  try {
    return await fs.promises.readFile(localPath);
  } catch {}
  await ensureAssetOnDisk(localPath, remoteUrl);
  return fs.promises.readFile(localPath);
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

async function ensureOrtRuntime(): Promise<{ ort: OrtRuntimeLike; backend: PiperBackend }> {
  if (state.ort && state.backend) return { ort: state.ort, backend: state.backend };

  // Ưu tiên onnxruntime-node (C++ native đa luồng, nhanh gấp ~4–6× WASM trên Node.js)
  try {
    const ortNode = await import("onnxruntime-node");
    const runtime = ((ortNode as unknown as { default?: OrtRuntimeLike }).default ?? ortNode) as unknown as OrtRuntimeLike;
    if (typeof runtime?.InferenceSession?.create === "function" && typeof runtime?.Tensor === "function") {
      state.ort = runtime;
      state.backend = "node";
      return { ort: runtime, backend: "node" };
    }
  } catch (e) {
    console.warn("[piper-tts] onnxruntime-node không khả dụng, chuyển sang WASM:", (e as Error)?.message ?? e);
  }

  const ortWeb = await import("onnxruntime-web");
  ortWeb.env.wasm.numThreads = 1;
  ortWeb.env.wasm.wasmPaths = await resolveOrtWasmPath();
  const runtime = ortWeb as unknown as OrtRuntimeLike;
  state.ort = runtime;
  state.backend = "wasm";
  return { ort: runtime, backend: "wasm" };
}

async function ensureSession(voiceId: ServerPiperVoiceId): Promise<OrtSessionLike> {
  const ready = state.sessions.get(voiceId);
  if (ready && state.dict && state.ort) return ready;

  const inflight = state.loading.get(voiceId);
  if (inflight) return inflight;

  const spec = SERVER_PIPER_VOICES[voiceId];
  const job = (async () => {
    try {
      const [{ ort, backend }, modelPath, dictBuf] = await Promise.all([
        ensureOrtRuntime(),
        ensureAssetOnDisk(path.join(KOKORO_DIR, spec.file), spec.url),
        state.dict ? Promise.resolve(null) : ensureAssetFile(path.join(KOKORO_DIR, "sea_g2p.bin"), DICT_URL),
      ]);

      if (dictBuf && !state.dict) {
        const ab = new ArrayBuffer(dictBuf.byteLength);
        new Uint8Array(ab).set(dictBuf);
        state.dict = new SeaDictionary(new Uint8Array(ab));
      }

      const sess =
        backend === "node"
          ? await ort.InferenceSession.create(modelPath, {
              executionProviders: ["cpu"],
              graphOptimizationLevel: "all",
              intraOpNumThreads: getIntraOpThreads(getPiperConcurrency()),
              interOpNumThreads: 1,
            })
          : await ort.InferenceSession.create(await fs.promises.readFile(modelPath), {
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

/** Nạp sẵn model Piper + từ điển SEA-G2P vào RAM ngay khi bắt đầu dịch phụ đề (không đợi tới câu đọc đầu). */
export function warmPiperVoice(voiceId: ServerPiperVoiceId): void {
  void ensureSession(voiceId).catch(() => {});
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

function drainPiperQueue() {
  const limit = getPiperConcurrency();
  while (state.activeCount < limit && (state.urgentQueue.length || state.normalQueue.length)) {
    const job = state.urgentQueue.shift() ?? state.normalQueue.shift()!;
    if (job.signal?.aborted) {
      job.reject(new Error("Đã huỷ yêu cầu giọng đọc."));
      continue;
    }
    state.activeCount++;
    job
      .run()
      .then(job.resolve, job.reject)
      .finally(() => {
        state.activeCount = Math.max(0, state.activeCount - 1);
        drainPiperQueue();
      });
  }
}

async function runInferenceOnce(voiceId: ServerPiperVoiceId, text: string, speed: number): Promise<Buffer> {
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
}

function enqueueInference(
  key: string,
  priority: PiperPriority,
  signal: AbortSignal | undefined,
  run: () => Promise<Buffer>,
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const item: QueuedPiperJob = { key, priority, signal, run, resolve, reject };
    if (priority === "urgent") state.urgentQueue.push(item);
    else state.normalQueue.push(item);
    drainPiperQueue();
  });
}

function promoteQueuedPiperJob(key: string, signal?: AbortSignal) {
  const idx = state.normalQueue.findIndex((j) => j.key === key);
  if (idx === -1) return;
  const [job] = state.normalQueue.splice(idx, 1);
  job.priority = "urgent";
  job.signal = signal;
  state.urgentQueue.push(job);
}

/** Tạo (hoặc lấy từ cache đĩa) WAV tiếng Việt bằng model Piper ONNX (Adam bựa / Lạc Phi) ngay trên server. */
export async function synthesizePiperDub(
  text: string,
  voiceId: ServerPiperVoiceId,
  speed = 1.15,
  opts?: { priority?: PiperPriority; signal?: AbortSignal },
): Promise<Buffer> {
  const clean = text.replace(/\s+/g, " ").trim();
  const spd = normalizeEdgeSpeed(speed);
  const file = cacheFileFor(voiceId, spd, clean);
  const priority: PiperPriority = opts?.priority ?? "normal";

  try {
    const data = await fs.promises.readFile(file);
    touchDubTtsFile(file);
    return data;
  } catch {}

  let job = state.pending.get(file);
  if (job) {
    if (priority === "urgent") promoteQueuedPiperJob(file, opts?.signal);
    return job;
  }

  job = (async () => {
    const wav = await enqueueInference(file, priority, opts?.signal, () => runInferenceOnce(voiceId, clean, spd));
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
  return job;
}
