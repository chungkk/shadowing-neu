"use client";

import config from "./config.json";
import { SeaDictionary, phonemizeChunks } from "./frontend";

const CACHE_NAME = "kokoro-vi-lite-v2";
const DICT_URL = "/download/media/kokoro/sea_g2p.bin";
const ORT_WASM_PATH = "/download/media/kokoro/ort/";

export const PIPER_SAMPLE_RATE = 22_050;

export type PiperVoiceKey = "adam_bua" | "lac_phi";

const PIPER_MODELS: Record<PiperVoiceKey, { url: string; label: string; approxBytes: number }> = {
  adam_bua: {
    url: "/download/media/kokoro/adam_bua_int8.onnx?v=2",
    label: "giọng Adam bựa (16 MB)",
    approxBytes: 16_700_000,
  },
  lac_phi: {
    url: "/download/media/kokoro/lac_phi_int8.onnx?v=1",
    label: "giọng Lạc Phi (16 MB)",
    approxBytes: 16_700_000,
  },
};

export type KokoroProgress = {
  stage: string;
  pct: number; // 0..100
};

type OrtModule = typeof import("onnxruntime-web");
type OrtSession = import("onnxruntime-web").InferenceSession;

let ortMod: OrtModule | null = null;
let dictionary: SeaDictionary | null = null;
const piperSessions = new Map<PiperVoiceKey, OrtSession>();
const piperLoading = new Map<PiperVoiceKey, Promise<void>>();
const piperListeners = new Map<PiperVoiceKey, Set<(p: KokoroProgress) => void>>();
const piperLastProgress = new Map<PiperVoiceKey, KokoroProgress>();
let runChain: Promise<unknown> = Promise.resolve();

async function fetchWithCache(
  url: string,
  label: string,
  onProgress: (loaded: number, total: number) => void,
): Promise<Uint8Array<ArrayBuffer>> {
  if (typeof caches !== "undefined") {
    try {
      const cache = await caches.open(CACHE_NAME);
      const hit = await cache.match(url);
      if (hit && hit.ok) {
        const buf = await hit.arrayBuffer();
        onProgress(buf.byteLength, buf.byteLength);
        return new Uint8Array(buf);
      }
    } catch {
      // Cache API may be unavailable in restricted contexts — fall back to direct fetch
    }
  }

  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error(`Không tải được ${label} (HTTP ${res.status})`);
  const total = Number(res.headers.get("content-length") || 0);

  let buf: ArrayBuffer;
  if (res.body && typeof res.body.getReader === "function") {
    const reader = res.body.getReader();
    const parts: Uint8Array[] = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        parts.push(value);
        received += value.byteLength;
        onProgress(received, total);
      }
    }
    const merged = new Uint8Array(new ArrayBuffer(received));
    let offset = 0;
    for (const p of parts) {
      merged.set(p, offset);
      offset += p.byteLength;
    }
    buf = merged.buffer;
  } else {
    buf = await res.arrayBuffer();
    onProgress(buf.byteLength, buf.byteLength);
  }

  if (typeof caches !== "undefined") {
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(url, new Response(buf, { headers: { "Content-Type": "application/octet-stream" } }));
    } catch {
      // Ignore quota errors
    }
  }
  return new Uint8Array(buf);
}

export function isPiperReady(voiceKey: PiperVoiceKey): boolean {
  return Boolean(piperSessions.has(voiceKey) && dictionary && ortMod);
}

export async function ensurePiperLoaded(
  voiceKey: PiperVoiceKey,
  onProgress?: (p: KokoroProgress) => void,
): Promise<void> {
  if (isPiperReady(voiceKey)) {
    onProgress?.({ stage: "Sẵn sàng", pct: 100 });
    return;
  }

  let listeners = piperListeners.get(voiceKey);
  if (!listeners) {
    listeners = new Set();
    piperListeners.set(voiceKey, listeners);
  }
  if (onProgress) {
    listeners.add(onProgress);
    const last = piperLastProgress.get(voiceKey);
    if (last) onProgress(last);
  }

  const existing = piperLoading.get(voiceKey);
  if (existing) {
    try {
      await existing;
    } finally {
      if (onProgress) listeners.delete(onProgress);
    }
    return;
  }

  const emit = (p: KokoroProgress) => {
    piperLastProgress.set(voiceKey, p);
    const subs = piperListeners.get(voiceKey);
    if (subs) {
      for (const fn of subs) {
        try {
          fn(p);
        } catch {}
      }
    }
  };

  const spec = PIPER_MODELS[voiceKey];
  const p = (async () => {
    try {
      emit({ stage: "Đang nạp ONNX Runtime (WASM)…", pct: 5 });
      if (!ortMod) {
        const ort = await import("onnxruntime-web");
        ort.env.wasm.wasmPaths = ORT_WASM_PATH;
        ort.env.wasm.numThreads = 1;
        ortMod = ort;
      }

      const needDict = !dictionary;
      let modelLoaded = 0;
      let modelTotal = spec.approxBytes;
      let dictLoaded = 0;
      let dictTotal = needDict ? 62_829_820 : 0;

      const emitDownload = () => {
        const total = Math.max(1, modelTotal + dictTotal);
        const loaded = modelLoaded + dictLoaded;
        const pct = Math.min(90, 8 + Math.round((loaded / total) * 82));
        const mbDone = (loaded / (1024 * 1024)).toFixed(1);
        const mbAll = (total / (1024 * 1024)).toFixed(0);
        emit({
          stage: `Đang tải ${spec.label} (lần đầu, lưu cache trình duyệt)… ${mbDone}/${mbAll} MB`,
          pct,
        });
      };

      const modelTask = fetchWithCache(spec.url, spec.label, (l, t) => {
        modelLoaded = l;
        if (t > 0) modelTotal = t;
        emitDownload();
      });
      const dictTask = needDict
        ? fetchWithCache(DICT_URL, "từ điển SEA-G2P", (l, t) => {
            dictLoaded = l;
            if (t > 0) dictTotal = t;
            emitDownload();
          })
        : Promise.resolve(null);

      const [modelBytes, dictBytes] = await Promise.all([modelTask, dictTask]);
      if (dictBytes && !dictionary) {
        dictionary = new SeaDictionary(dictBytes);
      }

      emit({ stage: `Đang khởi tạo ${spec.label}…`, pct: 94 });
      const sess = await ortMod.InferenceSession.create(modelBytes, {
        executionProviders: ["wasm"],
        graphOptimizationLevel: "all",
      });
      piperSessions.set(voiceKey, sess);
      emit({ stage: "Sẵn sàng", pct: 100 });
    } catch (e) {
      piperLoading.delete(voiceKey);
      throw e;
    } finally {
      piperLastProgress.delete(voiceKey);
      piperListeners.delete(voiceKey);
    }
  })();

  piperLoading.set(voiceKey, p);
  return p;
}

function trimSilenceAndFade(pcm: Float32Array, sr: number): Float32Array {
  if (!pcm.length) return pcm;
  let peak = 0;
  for (let i = 0; i < pcm.length; i++) {
    const a = Math.abs(pcm[i]);
    if (a > peak) peak = a;
  }
  if (peak < 1e-5) return new Float32Array(0);

  const thresh = peak * 0.012; // ~ -38 dB
  let lo = 0;
  while (lo < pcm.length && Math.abs(pcm[lo]) < thresh) lo++;
  let hi = pcm.length - 1;
  while (hi > lo && Math.abs(pcm[hi]) < thresh) hi--;

  const pad = Math.round(0.04 * sr); // Trim Kokoro's 200ms padding down to 40ms
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

/**
 * Synthesize Vietnamese text locally in browser WASM using a distilled Piper VITS voice
 * trained on SEA-G2P phoneme IDs (BOS=178, PAD=0 interspersed, EOS=179).
 */
export function synthesizePiper(
  text: string,
  voiceKey: PiperVoiceKey,
  speed = 1.15,
): Promise<{ pcm: Float32Array; sampleRate: number; synthMs: number }> {
  const job = runChain.then(async () => {
    const sess = piperSessions.get(voiceKey);
    if (!sess || !dictionary || !ortMod) throw new Error("Giọng đọc trình duyệt chưa được nạp.");
    const clean = text.trim();
    if (!clean) return { pcm: new Float32Array(0), sampleRate: PIPER_SAMPLE_RATE, synthMs: 0 };

    const t0 = performance.now();
    const { chunks } = phonemizeChunks(clean, dictionary, config.vocab);
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

      const feeds = {
        input: new ortMod.Tensor("int64", ids, [1, ids.length]),
        input_lengths: new ortMod.Tensor("int64", BigInt64Array.of(BigInt(ids.length)), [1]),
        scales: new ortMod.Tensor("float32", new Float32Array([0.667, lengthScale, 0.8]), [3]),
      };
      const out = await sess.run(feeds);
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
    return { pcm: merged, sampleRate: PIPER_SAMPLE_RATE, synthMs: Math.round(performance.now() - t0) };
  });

  runChain = job.catch(() => {});
  return job;
}
