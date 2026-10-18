"use client";

import type { Segment } from "./subtitles";

const SAMPLE_RATE = 16000;
const CHUNK_SECONDS = 10 * 60; // 10 phút ≈ 19MB WAV, dưới giới hạn 25MB của Whisper

/** Giải mã audio/video ngay trên trình duyệt, đổi về mono 16kHz. */
async function decodeToMono16k(file: File): Promise<Float32Array> {
  const buf = await file.arrayBuffer();
  const ctx = new AudioContext();
  const decoded = await ctx.decodeAudioData(buf).finally(() => ctx.close());
  const length = Math.ceil(decoded.duration * SAMPLE_RATE);
  const offline = new OfflineAudioContext(1, length, SAMPLE_RATE);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start();
  const rendered = await offline.startRendering();
  return rendered.getChannelData(0);
}

function encodeWav(samples: Float32Array): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (o: number, s: string) => [...s].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)));
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

/** Tạo phụ đề cho file local: cắt audio thành từng đoạn 10 phút và gửi lên /api/transcribe. */
export async function transcribeFile(
  file: File,
  onProgress: (msg: string) => void,
): Promise<Segment[]> {
  onProgress("Đang tách âm thanh…");
  const samples = await decodeToMono16k(file);
  const chunkSize = CHUNK_SECONDS * SAMPLE_RATE;
  const total = Math.ceil(samples.length / chunkSize);
  const all: Segment[] = [];

  for (let i = 0; i < total; i++) {
    onProgress(`Đang nhận dạng giọng nói… (${i + 1}/${total})`);
    const chunk = samples.subarray(i * chunkSize, (i + 1) * chunkSize);
    const form = new FormData();
    form.append("file", encodeWav(chunk), "audio.wav");
    form.append("offset", String(i * CHUNK_SECONDS));
    const res = await fetch("/api/transcribe", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Nhận dạng thất bại");
    all.push(...data.segments);
  }
  return all;
}
