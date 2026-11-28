import { Directory, File, Paths } from "expo-file-system";
import * as SecureStore from "expo-secure-store";
import { useSyncExternalStore } from "react";
import { API_URL, api, authHeaders } from "./api";
import { serverError, t } from "./i18n";

export type DubVoiceId =
  | "edge:vi-VN-NamMinhNeural"
  | "edge:vi-VN-HoaiMyNeural"
  | "piper:adam_bua"
  | "piper:lac_phi"
  | "piper:vtv2_thuyetminh";

export const DUB_VOICES: readonly {
  id: DubVoiceId;
  shortKey: "dub.voiceMale" | "dub.voiceFemale" | "dub.voiceAdam" | "dub.voiceLacPhi" | "dub.voiceEva";
}[] = [
  { id: "edge:vi-VN-NamMinhNeural", shortKey: "dub.voiceMale" },
  { id: "edge:vi-VN-HoaiMyNeural", shortKey: "dub.voiceFemale" },
  { id: "piper:adam_bua", shortKey: "dub.voiceAdam" },
  { id: "piper:lac_phi", shortKey: "dub.voiceLacPhi" },
  { id: "piper:vtv2_thuyetminh", shortKey: "dub.voiceEva" },
];

export function isDubVoiceId(v: unknown): v is DubVoiceId {
  return typeof v === "string" && DUB_VOICES.some((x) => x.id === v);
}

const VOICE_KEY = "dub-voice";
const voiceListeners = new Set<() => void>();
let currentVoice: DubVoiceId = "edge:vi-VN-NamMinhNeural";
let voiceLoaded = false;
let voiceDirty = false;
let voicePromise: Promise<DubVoiceId> | null = null;

export function ensureDubVoiceLoaded(): Promise<DubVoiceId> {
  if (voiceLoaded) return Promise.resolve(currentVoice);
  if (voicePromise) return voicePromise.then(() => currentVoice);
  voicePromise = SecureStore.getItemAsync(VOICE_KEY)
    .then((v) => {
      voiceLoaded = true;
      if (!voiceDirty && isDubVoiceId(v) && v !== currentVoice) {
        currentVoice = v;
        voiceListeners.forEach((cb) => cb());
      }
      return currentVoice;
    })
    .catch(() => {
      voiceLoaded = true;
      return currentVoice;
    });
  return voicePromise;
}

export function setDubVoice(v: DubVoiceId) {
  voiceDirty = true;
  if (v === currentVoice) return;
  currentVoice = v;
  SecureStore.setItemAsync(VOICE_KEY, v).catch(() => {});
  voiceListeners.forEach((cb) => cb());
}

export function getDubVoice(): DubVoiceId {
  void ensureDubVoiceLoaded();
  return currentVoice;
}

export function useDubVoice(): [DubVoiceId, (v: DubVoiceId) => void] {
  const voice = useSyncExternalStore(
    (cb) => {
      void ensureDubVoiceLoaded();
      voiceListeners.add(cb);
      return () => void voiceListeners.delete(cb);
    },
    getDubVoice,
  );
  return [voice, setDubVoice];
}

export type DubCue = {
  start_ms: number;
  end_ms: number;
  text: string;
  orig?: string;
  spk?: string;
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

export type DubChannelInfo = {
  key: string;
  dbId?: number;
  channelId?: string;
  title: string;
  handle: string;
  avatar: string;
  url: string;
};

export type DubChannelVideo = {
  id: string;
  title: string;
  duration: number | null;
};

const IDLE_TIMEOUT_MS = 45_000;

// ---- 0. Kênh YouTube cho tab Thuyết minh ----

export function fetchDubChannels(): Promise<{ channels: DubChannelInfo[] }> {
  return api<{ channels: DubChannelInfo[] }>("/dub/channels");
}

export function fetchDubChannelVideos(opts: {
  id?: number;
  channel?: string;
  refresh?: boolean;
  limit?: number;
}): Promise<{ channel: DubChannelInfo; videos: DubChannelVideo[] }> {
  const qs = new URLSearchParams();
  if (opts.id) qs.set("id", String(opts.id));
  else if (opts.channel) qs.set("channel", opts.channel);
  if (opts.refresh) qs.set("refresh", "1");
  if (opts.limit) qs.set("limit", String(opts.limit));
  return api<{ channel: DubChannelInfo; videos: DubChannelVideo[] }>(`/dub/channels?${qs.toString()}`);
}

export function fmtDuration(s: number | null | undefined): string {
  if (s == null || !Number.isFinite(s) || s < 0) return "";
  const total = Math.floor(s);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  return h
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

// ---- 1. Stream NDJSON chuẩn bị phụ đề tiếng Việt (tiến trình % + phát cuốn chiếu) ----

export function startDubPrepareStream(
  videoId: string,
  callbacks: {
    voiceId?: DubVoiceId;
    speed?: number;
    startMs?: number;
    force?: boolean;
    repair?: boolean;
    onProgress?: (p: DubProgress) => void;
    onReady?: (data: DubResult, bg: DubBgProgress) => void;
    onChunk?: (start: number, translations: string[], skipped: number[], bg: DubBgProgress) => void;
  },
): { promise: Promise<DubResult>; abort: () => void } {
  const xhr = new XMLHttpRequest();
  let aborted = false;
  let stopIdle = () => {};

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
              | { type: "chunk"; start: number; translations: string[]; skipped?: number[]; pct: number; done: number; total: number }
              | { type: "done"; data: DubResult }
              | { type: "error"; error: string };

            if (msg.type === "progress") {
              callbacks.onProgress?.({ pct: msg.pct, stage: msg.stage, done: msg.done, total: msg.total });
            } else if (msg.type === "ready") {
              callbacks.onReady?.(msg.data, { pct: msg.pct, done: msg.done, total: msg.total });
            } else if (msg.type === "chunk") {
              callbacks.onChunk?.(
                msg.start,
                msg.translations,
                Array.isArray(msg.skipped) ? msg.skipped : [],
                { pct: msg.pct, done: msg.done, total: msg.total },
              );
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
    stopIdle = () => clearTimeout(idleTimer);
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

    const payload: Record<string, unknown> = { videoId };
    if (callbacks.voiceId) payload.voiceId = callbacks.voiceId;
    if (callbacks.speed) payload.speed = callbacks.speed;
    if (callbacks.startMs) payload.startMs = callbacks.startMs;
    if (callbacks.force) payload.force = true;
    if (callbacks.repair) payload.repair = true;
    xhr.send(JSON.stringify(payload));
  });

  return {
    promise,
    abort: () => {
      aborted = true;
      stopIdle();
      try {
        xhr.abort();
      } catch {}
    },
  };
}

// ---- 2. Tải & cache Edge MP3 / Piper WAV từng câu trên máy ----

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

/** Cắt câu vượt quá giới hạn ký tự tại ranh giới từ/dấu câu gần nhất */
export function truncateTtsText(text: string, maxChars = 600): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxChars) return clean;
  const cut = clean.slice(0, maxChars);
  const lastBreak = Math.max(cut.lastIndexOf(" "), cut.lastIndexOf(","), cut.lastIndexOf("."));
  return (lastBreak > maxChars * 0.6 ? cut.slice(0, lastBreak) : cut).trim();
}

const MAX_DUB_CACHE_FILES = 160;
const pendingFiles = new Map<string, { promise: Promise<File | null>; onErrors: Set<(msg: string) => void> }>();
let pruneCount = 0;

function dubCueCacheSpec(text: string, voiceId: DubVoiceId, speed: number) {
  const clean = truncateTtsText(text, 600);
  const isPiper = voiceId.startsWith("piper:");
  const ext = isPiper ? "wav" : "mp3";
  const normSpeed = (Math.round(Math.min(1.45, Math.max(0.85, speed)) * 20) / 20).toFixed(2);
  const dir = new Directory(Paths.cache, "dub-tts");
  const file = new File(dir, `${hashKey(`${voiceId}|${normSpeed}|${clean}`)}.${ext}`);
  return { clean, isPiper, normSpeed, dir, file };
}

function pruneDubCache(dir: Directory) {
  if (++pruneCount % 25 !== 0) return;
  try {
    const items = dir.list().filter((x): x is File => x instanceof File);
    if (items.length <= MAX_DUB_CACHE_FILES) return;
    items.sort((a, b) => (a.modificationTime ?? 0) - (b.modificationTime ?? 0));
    for (const old of items.slice(0, items.length - MAX_DUB_CACHE_FILES)) {
      try {
        old.delete();
      } catch {}
    }
  } catch {}
}

export function fetchDubCueFile(
  text: string,
  voiceId: DubVoiceId,
  speed: number,
  opts?: { urgent?: boolean; onError?: (msg: string) => void },
): Promise<File | null> {
  const { clean, isPiper, normSpeed, dir, file } = dubCueCacheSpec(text, voiceId, speed);
  if (!clean) return Promise.resolve(null);

  const existing = pendingFiles.get(file.uri);
  if (existing) {
    if (opts?.onError) existing.onErrors.add(opts.onError);
    if (opts?.urgent && isPiper) {
      const promoteQs = `v=${encodeURIComponent(voiceId)}&s=${encodeURIComponent(normSpeed)}&t=${encodeURIComponent(clean)}&p=1`;
      fetch(`${API_URL}/api/v1/dub/tts?${promoteQs}`, { headers: authHeaders() }).catch(() => {});
    }
    return existing.promise;
  }

  if (file.exists && file.size > 0) return Promise.resolve(file);

  const onErrors = new Set<(msg: string) => void>();
  if (opts?.onError) onErrors.add(opts.onError);

  const promise = (async () => {
    const qs = `v=${encodeURIComponent(voiceId)}&s=${encodeURIComponent(normSpeed)}&t=${encodeURIComponent(clean)}${opts?.urgent ? "&p=1" : ""}`;
    const url = `${API_URL}/api/v1/dub/tts?${qs}`;

    let lastError = "";
    for (let attempt = 0; attempt < 2; attempt++) {
      const abort = new AbortController();
      const timer = setTimeout(() => abort.abort(), 16_000);
      try {
        dir.create({ idempotent: true, intermediates: true });
        await File.downloadFileAsync(url, file, {
          headers: authHeaders(),
          idempotent: true,
          signal: abort.signal,
        });
        if (file.exists && file.size > 0) {
          pruneDubCache(dir);
          return file;
        }
        lastError = t("api.noConnection");
      } catch (e) {
        if (file.exists) {
          try {
            file.delete();
          } catch {}
        }
        const msg = e instanceof Error ? e.message : "";
        if (abort.signal.aborted) {
          lastError = t("api.noConnection");
        } else if (/\b429\b/.test(msg)) {
          lastError = serverError("Bạn dùng tính năng thuyết minh hơi nhanh, vui lòng chờ ít phút nhé.");
          break;
        } else if (/\b(400|413)\b/.test(msg)) {
          lastError = serverError(msg);
          break;
        } else {
          const code = msg.match(/\b(\d{3})\b/);
          lastError = code ? t("api.serverError", { status: code[1] }) : t("api.noConnection");
        }
      } finally {
        clearTimeout(timer);
      }
      if (attempt === 0) await new Promise((r) => setTimeout(r, 150));
    }
    if (lastError) onErrors.forEach((cb) => cb(lastError));
    return null;
  })().finally(() => {
    pendingFiles.delete(file.uri);
  });

  pendingFiles.set(file.uri, { promise, onErrors });
  return promise;
}

/** Edge MP3 48kbit/s = 6000 B/s */
const EDGE_BYTES_PER_SEC = 6000;
/** Trần tốc độ của /api/v1/dub/tts */
const MAX_FIT_SPEED = 1.45;

function estimateViDurSec(text: string, speed: number): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const pauses = (text.match(/[,;:.!?…]/g) ?? []).length;
  return (words * 0.27 + pauses * 0.14 + 0.18) / Math.max(0.75, speed);
}

/**
 * Lấy MP3/WAV cho câu `list[index]`, khớp thời lượng với khoảng trống trước câu sau.
 */
export async function fetchFittedDubCue(
  list: DubCue[],
  index: number,
  voiceId: DubVoiceId,
  speed: number,
  opts?: { urgent?: boolean; onError?: (msg: string) => void },
): Promise<File | null> {
  const cue = list[index];
  if (!cue || cue.pending || !cue.text.trim()) return null;
  const next = list[index + 1];
  const slot = next ? (next.start_ms - cue.start_ms) / 1000 - 0.1 : 0;
  const norm = Math.round(Math.min(MAX_FIT_SPEED, Math.max(0.85, speed)) * 20) / 20;

  let firstSpd = norm;
  if (slot > 0.4 && norm < MAX_FIT_SPEED) {
    const estDur = estimateViDurSec(cue.text, norm);
    if (estDur > slot + 0.15) {
      firstSpd = Math.min(MAX_FIT_SPEED, Math.ceil(((norm * estDur) / slot) * 20) / 20);
    }
  }

  const base = await fetchDubCueFile(cue.text, voiceId, firstSpd, opts);
  if (!base || !next || voiceId.startsWith("piper:")) return base;

  const dur = base.size / EDGE_BYTES_PER_SEC;
  if (slot <= 0.4 || dur <= slot * 1.18 + 0.4 || firstSpd >= MAX_FIT_SPEED) return base;

  const need = Math.min(MAX_FIT_SPEED, Math.ceil(((firstSpd * dur) / slot) * 20) / 20);
  if (need <= firstSpd) return base;
  if (opts?.urgent) {
    const { file: fitted } = dubCueCacheSpec(cue.text, voiceId, need);
    if (!pendingFiles.has(fitted.uri) && fitted.exists && fitted.size > 0) return fitted;
    return base;
  }
  return (await fetchDubCueFile(cue.text, voiceId, need, opts)) ?? base;
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
