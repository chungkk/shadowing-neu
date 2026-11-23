import { Directory, File, Paths } from "expo-file-system";
import { useSyncExternalStore } from "react";
import { API_URL, authHeaders } from "./api";
import { serverError, t } from "./i18n";

export type DubVoiceId = "edge:vi-VN-NamMinhNeural" | "edge:vi-VN-HoaiMyNeural";

export const DUB_VOICES: readonly { id: DubVoiceId; shortKey: "dub.voiceMale" | "dub.voiceFemale" }[] = [
  { id: "edge:vi-VN-NamMinhNeural", shortKey: "dub.voiceMale" },
  { id: "edge:vi-VN-HoaiMyNeural", shortKey: "dub.voiceFemale" },
];

export type DubCue = {
  start_ms: number;
  end_ms: number;
  text: string;
  orig?: string;
  pending?: boolean;
  /** AI chưa dịch được câu này (text rỗng, không đọc) */
  untranslated?: boolean;
};

export type DubResult = {
  videoId: string;
  title: string;
  sourceLang?: string;
  cues: DubCue[];
  cached?: boolean;
};

export type DubProgress = {
  pct: number;
  stage: string;
  done?: number;
  total?: number;
};

export type DubBgProgress = {
  pct: number;
  done: number;
  total: number;
};

export type RecentDub = {
  videoId: string;
  title: string;
};

const IDLE_TIMEOUT_MS = 45_000;

// ---- 1. Stream NDJSON chuẩn bị phụ đề tiếng Việt (tiến trình % + phát cuốn chiếu) ----

export function startDubPrepareStream(
  videoId: string,
  callbacks: {
    onProgress?: (p: DubProgress) => void;
    onReady?: (data: DubResult, bg: DubBgProgress) => void;
    onChunk?: (start: number, translations: string[], bg: DubBgProgress) => void;
  },
): { promise: Promise<DubResult>; abort: () => void } {
  const xhr = new XMLHttpRequest();
  let aborted = false;

  const promise = new Promise<DubResult>((resolve, reject) => {
    let offset = 0;
    let lineBuf = "";
    let finalResult: DubResult | null = null;
    let streamError: string | null = null;

    const processChunk = (text: string) => {
      lineBuf += text;
      let nl = lineBuf.indexOf("\n");
      while (nl !== -1) {
        const raw = lineBuf.slice(0, nl).trim();
        lineBuf = lineBuf.slice(nl + 1);
        if (raw) {
          try {
            const msg = JSON.parse(raw) as
              | { type: "progress"; pct: number; stage: string; done?: number; total?: number }
              | { type: "ready"; data: DubResult; pct: number; done: number; total: number }
              | { type: "chunk"; start: number; translations: string[]; pct: number; done: number; total: number }
              | { type: "done"; data: DubResult }
              | { type: "error"; error: string };

            if (msg.type === "progress") {
              callbacks.onProgress?.({ pct: msg.pct, stage: msg.stage, done: msg.done, total: msg.total });
            } else if (msg.type === "ready") {
              callbacks.onReady?.(msg.data, { pct: msg.pct, done: msg.done, total: msg.total });
            } else if (msg.type === "chunk") {
              callbacks.onChunk?.(msg.start, msg.translations, { pct: msg.pct, done: msg.done, total: msg.total });
            } else if (msg.type === "done") {
              finalResult = msg.data;
            } else if (msg.type === "error") {
              streamError = serverError(msg.error);
            }
          } catch {
            // Bỏ qua dòng không hợp lệ
          }
        }
        nl = lineBuf.indexOf("\n");
      }
    };

    xhr.open("POST", `${API_URL}/api/v1/dub/prepare?stream=1`, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("Accept", "application/x-ndjson");
    const auth = authHeaders();
    if (auth?.Authorization) xhr.setRequestHeader("Authorization", auth.Authorization);
    // Không giới hạn tổng thời gian (video dài dịch ngầm vài phút); chỉ coi là mất kết nối
    // khi không nhận được byte nào trong IDLE_TIMEOUT_MS (server ping mỗi 15 giây).
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    let idleTimedOut = false;
    const bumpIdle = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        idleTimedOut = true;
        try {
          xhr.abort();
        } catch {}
      }, IDLE_TIMEOUT_MS);
    };
    const stopIdle = () => clearTimeout(idleTimer);
    bumpIdle();

    xhr.onprogress = () => {
      bumpIdle();
      if (aborted || xhr.status >= 400) return;
      const resp = xhr.responseText ?? "";
      if (resp.length > offset) {
        processChunk(resp.slice(offset));
        offset = resp.length;
      }
    };

    xhr.onload = () => {
      stopIdle();
      if (aborted) return;
      const resp = xhr.responseText ?? "";
      if (xhr.status < 200 || xhr.status >= 300) {
        let msg = t("api.serverError", { status: xhr.status });
        try {
          const j = JSON.parse(resp) as { error?: string };
          if (j.error) msg = serverError(j.error);
        } catch {}
        reject(new Error(msg));
        return;
      }
      if (resp.length > offset) {
        processChunk(resp.slice(offset));
        offset = resp.length;
      }
      if (lineBuf.trim()) processChunk("\n");

      if (streamError) {
        reject(new Error(streamError));
        return;
      }
      if (finalResult) {
        resolve(finalResult);
        return;
      }
      // Dự phòng nếu server trả JSON thường không phải NDJSON
      try {
        const plain = JSON.parse(resp) as DubResult & { error?: string };
        if (plain.error) reject(new Error(serverError(plain.error)));
        else if (Array.isArray(plain.cues)) resolve(plain);
        else reject(new Error(t("api.noConnection")));
      } catch {
        reject(new Error(t("api.noConnection")));
      }
    };

    xhr.onerror = () => {
      stopIdle();
      if (!aborted) reject(new Error(t("api.noConnection")));
    };
    xhr.onabort = () => {
      stopIdle();
      if (idleTimedOut && !aborted) {
        reject(new Error(t("api.noConnection")));
        return;
      }
      const err = new Error("aborted");
      err.name = "AbortError";
      reject(err);
    };

    xhr.send(JSON.stringify({ videoId }));
  });

  return {
    promise,
    abort: () => {
      aborted = true;
      try {
        xhr.abort();
      } catch {}
    },
  };
}

// ---- 2. Tải & cache MP3 Edge TTS từng câu trên máy ----

function hashKey(s: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

const pendingFiles = new Map<string, Promise<File | null>>();

export function fetchDubCueFile(text: string, voiceId: DubVoiceId, speed: number): Promise<File | null> {
  const clean = text.replace(/\s+/g, " ").trim().slice(0, 600);
  if (!clean) return Promise.resolve(null);
  const normSpeed = (Math.round(Math.min(1.45, Math.max(0.85, speed)) * 20) / 20).toFixed(2);
  const dir = new Directory(Paths.cache, "dub-tts");
  const file = new File(dir, `${hashKey(`${voiceId}|${normSpeed}|${clean}`)}.mp3`);
  if (file.exists && file.size > 0) return Promise.resolve(file);

  const existing = pendingFiles.get(file.uri);
  if (existing) return existing;

  const job = (async () => {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 14_000);
    try {
      dir.create({ idempotent: true, intermediates: true });
      const qs = `v=${encodeURIComponent(voiceId)}&s=${encodeURIComponent(normSpeed)}&t=${encodeURIComponent(clean)}`;
      await File.downloadFileAsync(`${API_URL}/api/v1/dub/tts?${qs}`, file, {
        headers: authHeaders(),
        idempotent: true,
        signal: abort.signal,
      });
      return file.exists && file.size > 0 ? file : null;
    } catch {
      if (file.exists) {
        try {
          file.delete();
        } catch {}
      }
      return null;
    } finally {
      clearTimeout(timer);
      pendingFiles.delete(file.uri);
    }
  })();

  pendingFiles.set(file.uri, job);
  return job;
}

// ---- 3. Lịch sử video thuyết minh đã xem gần đây (lưu trên máy) ----

const recentFile = new File(Paths.document, "dub-recent.json");
const recentListeners = new Set<() => void>();
let recentCache: RecentDub[] | null = null;

function readRecent(): RecentDub[] {
  if (recentCache) return recentCache;
  try {
    if (recentFile.exists) {
      const parsed = JSON.parse(recentFile.textSync()) as unknown;
      if (Array.isArray(parsed)) {
        recentCache = parsed.filter(
          (x): x is RecentDub =>
            !!x && typeof (x as RecentDub).videoId === "string" && typeof (x as RecentDub).title === "string",
        );
        return recentCache;
      }
    }
  } catch {}
  recentCache = [];
  return recentCache;
}

function writeRecent(list: RecentDub[]) {
  recentCache = list;
  try {
    recentFile.write(JSON.stringify(list));
  } catch {}
  recentListeners.forEach((l) => l());
}

export function saveRecentDub(videoId: string, title: string) {
  const cur = readRecent();
  writeRecent([{ videoId, title }, ...cur.filter((r) => r.videoId !== videoId)].slice(0, 12));
}

export function removeRecentDub(videoId: string) {
  const cur = readRecent();
  writeRecent(cur.filter((r) => r.videoId !== videoId));
}

const subscribeRecent = (cb: () => void) => {
  recentListeners.add(cb);
  return () => void recentListeners.delete(cb);
};

export function useRecentDubs(): RecentDub[] {
  return useSyncExternalStore(subscribeRecent, readRecent);
}
