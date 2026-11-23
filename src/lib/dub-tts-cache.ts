import "server-only";
import fs from "node:fs";
import path from "node:path";
import { TTS_DIR } from "./db";

export const DUB_TTS_DIR = path.join(TTS_DIR, "dub");

/** Giới hạn mặc định 2 GB (2048 MB), có thể chỉnh qua biến môi trường DUB_TTS_CACHE_MB */
const CACHE_MAX_BYTES = Math.max(100, Number(process.env.DUB_TTS_CACHE_MB) || 2048) * 1024 * 1024;
/** Hạn tối đa cho file không được nghe lại (mặc định 30 ngày) */
const CACHE_MAX_AGE_MS = Math.max(1, Number(process.env.DUB_TTS_CACHE_MAX_AGE_DAYS) || 30) * 24 * 3600_000;
/** File .tmp mồ côi quá 10 phút sẽ được dọn luôn */
const TMP_STALE_MS = 10 * 60_000;
const PRUNE_COOLDOWN_MS = 30_000;
const PRUNE_EVERY_WRITES = 80;
const PRUNE_EVERY_BYTES = 40 * 1024 * 1024; // 40 MB (phòng trường hợp WAV Adam phình nhanh)
const TOUCH_INTERVAL_MS = 6 * 3600_000;

const gd = globalThis as unknown as {
  __dubTtsCache?: {
    writes: number;
    writtenBytes: number;
    pruning: boolean;
    lastPruneAt: number;
    bootScheduled: boolean;
    touchedAt: Map<string, number>;
  };
};

const state = (gd.__dubTtsCache ??= {
  writes: 0,
  writtenBytes: 0,
  pruning: false,
  lastPruneAt: 0,
  bootScheduled: false,
  touchedAt: new Map(),
});

function isAudioCacheFile(name: string): boolean {
  return name.endsWith(".mp3") || name.endsWith(".wav");
}

/** Cập nhật mtime nhẹ khi đọc trúng cache để LRU chuẩn cả trên VPS Linux bật noatime/relatime */
export function touchDubTtsFile(filePath: string): void {
  const now = Date.now();
  const prev = state.touchedAt.get(filePath);
  if (prev && now - prev < TOUCH_INTERVAL_MS) return;
  if (state.touchedAt.size > 4000) state.touchedAt.clear();
  state.touchedAt.set(filePath, now);
  const sec = now / 1000;
  void fs.promises.utimes(filePath, sec, sec).catch(() => {});
}

/** Dọn toàn bộ cache đĩa `data/tts/dub/` (.mp3, .wav và .tmp mồ côi): xoá file quá hạn & cắt LRU xuống 80% hạn mức. */
export async function pruneDubTtsCache(force = false): Promise<{ removed: number; freedBytes: number; totalBytes: number }> {
  if (state.pruning) return { removed: 0, freedBytes: 0, totalBytes: 0 };
  const now = Date.now();
  if (!force && now - state.lastPruneAt < PRUNE_COOLDOWN_MS) {
    return { removed: 0, freedBytes: 0, totalBytes: 0 };
  }

  state.pruning = true;
  state.lastPruneAt = now;
  let removed = 0;
  let freedBytes = 0;
  let totalBytes = 0;

  try {
    let names: string[];
    try {
      names = await fs.promises.readdir(DUB_TTS_DIR);
    } catch {
      return { removed: 0, freedBytes: 0, totalBytes: 0 };
    }

    const files: { name: string; size: number; used: number }[] = [];
    for (const name of names) {
      const full = path.join(DUB_TTS_DIR, name);
      if (name.endsWith(".tmp")) {
        try {
          const st = await fs.promises.stat(full);
          if (now - st.mtimeMs > TMP_STALE_MS) {
            await fs.promises.rm(full, { force: true }).catch(() => {});
            removed++;
            freedBytes += st.size;
          }
        } catch {}
        continue;
      }
      if (!isAudioCacheFile(name)) continue;

      try {
        const st = await fs.promises.stat(full);
        const used = Math.max(st.atimeMs, st.mtimeMs);
        if (now - used > CACHE_MAX_AGE_MS) {
          await fs.promises.rm(full, { force: true }).catch(() => {});
          removed++;
          freedBytes += st.size;
          continue;
        }
        files.push({ name, size: st.size, used });
        totalBytes += st.size;
      } catch {}
    }

    if (totalBytes > CACHE_MAX_BYTES) {
      const targetBytes = Math.floor(CACHE_MAX_BYTES * 0.8);
      files.sort((a, b) => a.used - b.used);
      for (const f of files) {
        if (totalBytes <= targetBytes) break;
        await fs.promises.rm(path.join(DUB_TTS_DIR, f.name), { force: true }).catch(() => {});
        totalBytes -= f.size;
        freedBytes += f.size;
        removed++;
      }
    }

    if (removed > 0) {
      console.log(
        `[dub-tts-cache] Đã dọn ${removed} file (${(freedBytes / 1024 / 1024).toFixed(1)} MB), còn lại ${(totalBytes / 1024 / 1024).toFixed(1)} MB / ${Math.round(CACHE_MAX_BYTES / 1024 / 1024)} MB.`,
      );
    }
    return { removed, freedBytes, totalBytes };
  } catch (e) {
    console.error("[dub-tts-cache] dọn cache lỗi:", e);
    return { removed, freedBytes, totalBytes };
  } finally {
    state.pruning = false;
  }
}

/** Ghi nhận mỗi lần ghi file cache mới để tự động kích hoạt dọn nền theo số lần ghi hoặc dung lượng. */
export function noteDubTtsCacheWrite(bytes: number): void {
  state.writes += 1;
  state.writtenBytes += Math.max(0, bytes);
  if (state.writes >= PRUNE_EVERY_WRITES || state.writtenBytes >= PRUNE_EVERY_BYTES) {
    state.writes = 0;
    state.writtenBytes = 0;
    void pruneDubTtsCache();
  }
}

/** Kiểm tra dọn nhẹ 1 lần sau khi khởi động server (không giữ event loop) */
if (!state.bootScheduled && typeof setTimeout === "function") {
  state.bootScheduled = true;
  const t = setTimeout(() => void pruneDubTtsCache(), 15_000);
  if (typeof (t as NodeJS.Timeout).unref === "function") {
    (t as NodeJS.Timeout).unref();
  }
}
