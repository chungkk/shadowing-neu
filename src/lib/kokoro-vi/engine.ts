"use client";

import config from "./config.json";
import { SeaDictionary, phonemizeChunks } from "./frontend";

const CACHE_NAME = "kokoro-vi-lite-v1";
const MODEL_URL = "https://huggingface.co/loanhviet/Kokoro-Vietnamese-Lite/resolve/main/kokoro_vi_lite.onnx";
const DICT_URL = "https://raw.githubusercontent.com/pnnbao97/sea-g2p/e825173f/python/sea_g2p/sea_g2p.bin";
const ORT_WASM_CDN = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/";

export const KOKORO_SAMPLE_RATE = 24_000;

export type KokoroProgress = {
  stage: string;
  pct: number; // 0..100
};

type OrtModule = typeof import("onnxruntime-web");
type OrtSession = import("onnxruntime-web").InferenceSession;

let ortMod: OrtModule | null = null;
let session: OrtSession | null = null;
let dictionary: SeaDictionary | null = null;
let loadingPromise: Promise<void> | null = null;
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

export function isKokoroReady(): boolean {
  return Boolean(session && dictionary && ortMod);
}

export async function ensureKokoroLoaded(onProgress?: (p: KokoroProgress) => void): Promise<void> {
  if (isKokoroReady()) {
    onProgress?.({ stage: "Sẵn sàng", pct: 100 });
    return;
  }
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      onProgress?.({ stage: "Đang nạp ONNX Runtime (WASM)…", pct: 5 });
      const ort = await import("onnxruntime-web");
      ort.env.wasm.wasmPaths = ORT_WASM_CDN;
      ort.env.wasm.numThreads = 1; // Single-thread WASM needs no COOP/COEP headers (safe with YouTube iframe)
      ortMod = ort;

      let modelLoaded = 0;
      let modelTotal = 9_210_026;
      let dictLoaded = 0;
      let dictTotal = 62_829_820;

      const emitDownload = () => {
        const total = Math.max(1, modelTotal + dictTotal);
        const loaded = modelLoaded + dictLoaded;
        const pct = Math.min(90, 8 + Math.round((loaded / total) * 82));
        const mbDone = (loaded / (1024 * 1024)).toFixed(1);
        const mbAll = (total / (1024 * 1024)).toFixed(0);
        onProgress?.({ stage: `Đang tải model & từ điển tiếng Việt (lần đầu, lưu cache trình duyệt)… ${mbDone}/${mbAll} MB`, pct });
      };

      const [modelBytes, dictBytes] = await Promise.all([
        fetchWithCache(MODEL_URL, "model Kokoro Lite (9.2 MB)", (l, t) => {
          modelLoaded = l;
          if (t > 0) modelTotal = t;
          emitDownload();
        }),
        fetchWithCache(DICT_URL, "từ điển SEA-G2P", (l, t) => {
          dictLoaded = l;
          if (t > 0) dictTotal = t;
          emitDownload();
        }),
      ]);

      onProgress?.({ stage: "Đang khởi tạo mô hình Kokoro Lite…", pct: 94 });
      dictionary = new SeaDictionary(dictBytes);
      session = await ort.InferenceSession.create(modelBytes, {
        executionProviders: ["wasm"],
        graphOptimizationLevel: "all",
      });
      onProgress?.({ stage: "Sẵn sàng", pct: 100 });
    } catch (e) {
      loadingPromise = null;
      throw e;
    }
  })();

  return loadingPromise;
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

/** Synthesize Vietnamese text locally in browser WASM (voiceIdx: 0 = Diễm Trinh nữ, 1 = Đức Duy nam). */
export function synthesizeKokoro(
  text: string,
  voiceIdx: 0 | 1,
  speed = 1.15,
): Promise<{ pcm: Float32Array; sampleRate: number; synthMs: number }> {
  const job = runChain.then(async () => {
    if (!session || !dictionary || !ortMod) throw new Error("Kokoro Lite chưa được nạp.");
    const clean = text.trim();
    if (!clean) return { pcm: new Float32Array(0), sampleRate: KOKORO_SAMPLE_RATE, synthMs: 0 };

    const t0 = performance.now();
    const { chunks } = phonemizeChunks(clean, dictionary, config.vocab);
    const parts: Float32Array[] = [];
    let totalLen = 0;
    const clampedSpeed = Math.min(1.5, Math.max(0.75, speed));

    for (const chunk of chunks) {
      if (!chunk.tokens.length) continue;
      const feeds = {
        input_ids: new ortMod.Tensor("int64", BigInt64Array.from(chunk.tokens, BigInt), [1, chunk.tokens.length]),
        speed: new ortMod.Tensor("float32", new Float32Array([clampedSpeed]), [1]),
        voice: new ortMod.Tensor("int64", BigInt64Array.of(BigInt(voiceIdx)), [1]),
      };
      const out = await session.run(feeds);
      const raw = out.waveform?.data as Float32Array | undefined;
      if (raw && raw.length) {
        const trimmed = trimSilenceAndFade(raw, KOKORO_SAMPLE_RATE);
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
    return { pcm: merged, sampleRate: KOKORO_SAMPLE_RATE, synthMs: Math.round(performance.now() - t0) };
  });

  runChain = job.catch(() => {});
  return job;
}
