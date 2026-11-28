"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  Captions,
  ListMusic,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Share2,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  ensurePiperLoaded,
  synthesizePiper,
  type KokoroProgress,
  type PiperVoiceKey,
} from "@/lib/kokoro-vi/engine";
import { formatTime } from "@/lib/subtitles";

export type LiveCue = {
  start_ms: number;
  end_ms: number;
  text: string;
  orig?: string;
  spk?: string;
  /** true = đang dịch ngầm, chưa có bản tiếng Việt */
  pending?: boolean;
  /** true = AI chưa dịch được câu này (text rỗng, không đọc) */
  untranslated?: boolean;
};

export type LiveVoiceId =
  | "edge:vi-VN-NamMinhNeural"
  | "edge:vi-VN-HoaiMyNeural"
  | "piper:adam_bua"
  | "piper:lac_phi"
  | "piper:vtv2_thuyetminh";

export const LIVE_VOICES: { id: LiveVoiceId; label: string; short: string }[] = [
  { id: "edge:vi-VN-NamMinhNeural", label: "Nam Minh (Nam · Tự nhiên)", short: "Nam Minh (Nam · Tự nhiên)" },
  { id: "edge:vi-VN-HoaiMyNeural", label: "Hoài My (Nữ · Tự nhiên)", short: "Hoài My (Nữ · Tự nhiên)" },
  { id: "piper:adam_bua", label: "Adam (Nam · Trình duyệt)", short: "Adam (Nam · Trình duyệt)" },
  { id: "piper:lac_phi", label: "Lạc Phi (Nam · Thuyết minh · Trình duyệt)", short: "Lạc Phi (Thuyết minh · Trình duyệt)" },
  { id: "piper:vtv2_thuyetminh", label: "Eva (Nữ · Thuyết minh · Trình duyệt)", short: "Eva (Thuyết minh · Trình duyệt)" },
];

function resolveInitialVoice(v?: LiveVoiceId): LiveVoiceId {
  if (v && LIVE_VOICES.some((x) => x.id === v)) return v;
  return "edge:vi-VN-NamMinhNeural";
}

function getPiperVoiceKey(v: LiveVoiceId): PiperVoiceKey | null {
  if (v === "piper:adam_bua") return "adam_bua";
  if (v === "piper:lac_phi") return "lac_phi";
  if (v === "piper:vtv2_thuyetminh") return "vtv2_thuyetminh";
  return null;
}

type YTPlayerEx = {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(s: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getPlaybackRate(): number;
  getPlayerState(): number;
  setVolume(v: number): void;
  mute(): void;
  unMute(): void;
  destroy(): void;
};

let ytPromise: Promise<void> | null = null;
function loadYT(): Promise<void> {
  const w = window as unknown as {
    YT?: { Player?: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayerEx };
    onYouTubeIframeAPIReady?: () => void;
  };
  if (w.YT?.Player) return Promise.resolve();
  ytPromise ??= new Promise((resolve) => {
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    }
  });
  return ytPromise;
}

/** Nạp trước script YouTube IFrame API để trình phát mở tức thì ngay khi dữ liệu sẵn sàng. */
export function preloadYouTubeIframeApi(): void {
  if (typeof window !== "undefined") void loadYT();
}

/** Tốc độ đọc tối đa khi phải đọc nhanh để kịp câu sau (trần của /api/v1/dub/tts) */
const MAX_FIT_SPEED = 1.45;
/** Giới hạn số AudioBuffer PCM giữ trong RAM (tránh tràn bộ nhớ trên Safari/iOS với video dài) */
const MAX_BUF_CACHE = 48;
/** Trần độ trễ tối đa của hàng đợi audio so với hình; vượt ngưỡng sẽ cắt câu cũ để bắt kịp nhịp */
const MAX_QUEUE_LAG_SEC = 2.2;
const EDGE_MAX_CHARS = 600;

/** Ước lượng thời lượng đọc tiếng Việt (giây) để chọn tốc độ phù hợp ngay từ lần gọi TTS đầu tiên. */
function estimateViDurSec(text: string, speed: number): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const pauses = (text.match(/[,;:.!?…]/g) ?? []).length;
  return (words * 0.27 + pauses * 0.14 + 0.18) / Math.max(0.75, speed);
}

/** Cắt câu vượt quá giới hạn ký tự Edge TTS tại ranh giới từ/dấu câu gần nhất (tránh cắt cụt giữa từ). */
function truncateTtsText(text: string, maxChars: number): string {
  const clean = text.trim();
  if (clean.length <= maxChars) return clean;
  const cut = clean.slice(0, maxChars);
  const lastBreak = Math.max(cut.lastIndexOf(" "), cut.lastIndexOf(","), cut.lastIndexOf("."));
  return (lastBreak > maxChars * 0.6 ? cut.slice(0, lastBreak) : cut).trim();
}

type ScheduledPlayback = {
  cueIndex: number;
  buf: AudioBuffer;
  startedAtCtx: number;
  baseOffset: number;
  playbackRate: number;
  voiceId: LiveVoiceId;
  pausedOffset: number | null;
};

function detectIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iP(hone|ad|od)/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function ytErrorMessage(code: number): string {
  if (code === 101 || code === 150) {
    return `Chủ kênh YouTube đã tắt chế độ nhúng cho video này (mã ${code}) nên không thể phát trực tiếp trên web. Bạn hãy thử video khác nhé.`;
  }
  if (code === 100) return "Video này đã bị xoá hoặc đang ở chế độ riêng tư trên YouTube.";
  if (code === 2) return "Mã video YouTube không hợp lệ.";
  if (code === 5) return "Trình duyệt không phát được video HTML5 này. Hãy thử tải lại trang.";
  return `Trình phát YouTube gặp lỗi (mã ${code}).`;
}

export default function KokoroLivePlayer({
  videoId,
  title,
  cues,
  sourceLang,
  initialVoice = "edge:vi-VN-NamMinhNeural",
  onVoiceChange,
  initialSpeed = 1.15,
  initialOrigVol = 25,
  shareUrl,
  showDebugMeta = false,
  bgProgress = null,
  onRetranslate,
  retranslating = false,
  autoPlay = false,
}: {
  videoId: string;
  title: string;
  cues: LiveCue[];
  sourceLang?: string;
  initialVoice?: LiveVoiceId;
  onVoiceChange?: (voice: LiveVoiceId) => void;
  initialSpeed?: number;
  initialOrigVol?: number;
  shareUrl?: string;
  showDebugMeta?: boolean;
  bgProgress?: { pct: number; done: number; total: number; reconnecting?: boolean } | null;
  onRetranslate?: (mode: "repair" | "force") => void;
  retranslating?: boolean;
  autoPlay?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const ytRef = useRef<YTPlayerEx | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const activeSrcsRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const audioEndAtRef = useRef<number>(0);
  const stopGenRef = useRef<number>(0);
  const playbackRef = useRef<ScheduledPlayback | null>(null);
  const scheduledRef = useRef<ScheduledPlayback[]>([]);
  const bufCacheRef = useRef<Map<string, AudioBuffer>>(new Map());
  const inflightRef = useRef<Map<string, Promise<AudioBuffer | null>>>(new Map());
  const lastSpokenIdxRef = useRef<number>(-1);
  const lastYtTimeRef = useRef<number>(0);
  const lastPollWallRef = useRef<number>(0);
  const activeRowRef = useRef<HTMLButtonElement | null>(null);
  const warmingRef = useRef(false);
  const gatedCueRef = useRef(-1);
  const prevCuesRef = useRef<LiveCue[]>(cues);
  const autoPlayRef = useRef(autoPlay);
  useEffect(() => {
    autoPlayRef.current = autoPlay;
  }, [autoPlay]);

  const [ytReady, setYtReady] = useState(false);
  const [ytErr, setYtErr] = useState("");
  const [voiceId, setVoiceId] = useState<LiveVoiceId>(() => resolveInitialVoice(initialVoice));
  const [readyEngines, setReadyEngines] = useState<Partial<Record<PiperVoiceKey, boolean>>>({});
  const [progress, setProgress] = useState<KokoroProgress>({ stage: "Đang khởi tạo giọng đọc AI…", pct: 0 });
  const [engineErr, setEngineErr] = useState("");
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [warmingAudio, setWarmingAudio] = useState(false);

  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(initialSpeed);
  // Trên iOS Safari/WebKit, Apple khoá cứng HTMLMediaElement.volume (setVolume bị bỏ qua, chỉ mute/unMute có tác dụng).
  // → Mặc định tắt tiếng gốc (mute) trên iOS để không bị át giọng thuyết minh tiếng Việt.
  const [isIOS] = useState(detectIOS);
  const [origVol, setOrigVol] = useState(() => (detectIOS() ? 0 : initialOrigVol));
  const [dubVol, setDubVol] = useState(110);
  const [dubMuted, setDubMuted] = useState(false);
  const [activeCueIdx, setActiveCueIdx] = useState<number>(-1);
  const [showOrig, setShowOrig] = useState(false);
  const [showScript, setShowScript] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lastSynthMs, setLastSynthMs] = useState<number | null>(null);

  const localEngineKey = getPiperVoiceKey(voiceId);
  const usingLocalWasm = localEngineKey !== null;
  const localWasmReady = localEngineKey ? Boolean(readyEngines[localEngineKey]) : false;
  // Server hỗ trợ tổng hợp nhanh Adam/Eva ngay từ giây đầu (C++ native), không cần đợi tải 79 MB về trình duyệt
  const voiceReady = true;
  const hasOrig = cues.some((c) => Boolean(c.orig));
  const untranslatedCount = cues.filter((c) => c.untranslated).length;
  const activeCue = activeCueIdx >= 0 ? cues[activeCueIdx] : null;

  const stateRef = useRef({ voiceId, speed, origVol, dubVol, dubMuted, voiceReady, localWasmReady, cues, activeCueIdx });
  useEffect(() => {
    stateRef.current = { voiceId, speed, origVol, dubVol, dubMuted, voiceReady, localWasmReady, cues, activeCueIdx };
  });

  // Chỉ xoá cache audio khi đổi sang video khác (KHÔNG xoá khi nhận thêm chunk dịch ngầm)
  useEffect(() => {
    const cache = bufCacheRef.current;
    const inflight = inflightRef.current;
    lastSpokenIdxRef.current = -1;
    lastYtTimeRef.current = 0;
    lastPollWallRef.current = 0;
    gatedCueRef.current = -1;
    prevCuesRef.current = [];
    return () => {
      cache.clear();
      inflight.clear();
    };
  }, [videoId]);

  // Nếu sự kiện done loại bỏ các câu [SKIP] làm thay đổi độ dài mảng cues, ánh xạ lại chỉ số câu đang đọc theo start_ms
  useEffect(() => {
    const prev = prevCuesRef.current;
    prevCuesRef.current = cues;
    if (!prev.length || !cues.length || prev.length === cues.length) return;
    const remapIdx = (oldIdx: number): number => {
      if (oldIdx < 0) return oldIdx;
      const targetMs = prev[oldIdx]?.start_ms;
      if (typeof targetMs !== "number") return -1;
      const exact = cues.findIndex((c) => c.start_ms === targetMs);
      if (exact >= 0) return exact;
      let floor = -1;
      for (let i = 0; i < cues.length; i++) {
        if (cues[i].start_ms <= targetMs) floor = i;
        else break;
      }
      return floor;
    };
    lastSpokenIdxRef.current = remapIdx(lastSpokenIdxRef.current);
    gatedCueRef.current = remapIdx(gatedCueRef.current);
    if (playbackRef.current) {
      const mapped = remapIdx(playbackRef.current.cueIndex);
      if (mapped >= 0) playbackRef.current.cueIndex = mapped;
    }
    for (const pb of scheduledRef.current) {
      const mapped = remapIdx(pb.cueIndex);
      if (mapped >= 0) pb.cueIndex = mapped;
    }
  }, [cues]);

  useEffect(() => {
    gatedCueRef.current = -1;
  }, [voiceId]);

  useEffect(() => {
    return () => {
      if (ctxRef.current) {
        void ctxRef.current.close().catch(() => { });
        ctxRef.current = null;
        gainRef.current = null;
      }
    };
  }, []);

  const getAudioCtx = useCallback((): AudioContext => {
    if (!ctxRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const gain = ctx.createGain();
      gain.gain.value = stateRef.current.dubMuted ? 0 : stateRef.current.dubVol / 100;
      gain.connect(ctx.destination);
      ctx.onstatechange = () => {
        const running = ctx.state === "running";
        setAudioBlocked(!running);
        if (running && activeSrcsRef.current.size === 0 && playbackRef.current?.pausedOffset == null) {
          lastSpokenIdxRef.current = -1;
        }
      };
      ctxRef.current = ctx;
      gainRef.current = gain;
    }
    const ctx = ctxRef.current;
    if (ctx.state === "suspended") {
      setAudioBlocked(true);
      void ctx
        .resume()
        .then(() => {
          if (ctxRef.current === ctx) setAudioBlocked(ctx.state !== "running");
        })
        .catch(() => {
          if (ctxRef.current === ctx) setAudioBlocked(true);
        });
    } else if (ctx.state === "running") {
      setAudioBlocked(false);
    }
    return ctx;
  }, []);

  const stopActiveSources = useCallback(() => {
    stopGenRef.current += 1;
    for (const src of activeSrcsRef.current) {
      try {
        src.stop();
      } catch { }
      try {
        src.disconnect();
      } catch { }
    }
    activeSrcsRef.current.clear();
    scheduledRef.current = [];
    audioEndAtRef.current = 0;
  }, []);

  /** Dừng hẳn giọng đọc và xoá trạng thái tạm dừng (dùng khi tua, đổi giọng, kết thúc, unmount). */
  const stopSpeech = useCallback(() => {
    playbackRef.current = null;
    stopActiveSources();
  }, [stopActiveSources]);

  /** Tạm dừng giọng đọc và lưu chính xác vị trí câu đang phát (không bị ghi đè bởi câu xếp hàng kế tiếp). */
  const pauseSpeech = useCallback(() => {
    const ctx = ctxRef.current;
    const queue = scheduledRef.current;
    if (ctx && queue.length > 0) {
      const now = ctx.currentTime;
      // Ưu tiên tìm đúng câu đang phát tại thời điểm hiện tại
      let target: ScheduledPlayback | null = null;
      let savedOffset = 0;
      for (const item of queue) {
        const pbRate = item.playbackRate || 1;
        const endAt = item.startedAtCtx + (item.buf.duration - item.baseOffset) / pbRate;
        if (now >= item.startedAtCtx && now < endAt - 0.15 / pbRate) {
          target = item;
          savedOffset = item.baseOffset + (now - item.startedAtCtx) * pbRate;
          break;
        }
      }
      // Chưa tới lúc phát câu nào → lưu câu sớm nhất sắp phát từ đầu
      if (!target) {
        const upcoming = queue.find((item) => item.startedAtCtx > now);
        if (upcoming) {
          target = upcoming;
          savedOffset = upcoming.baseOffset;
        }
      }
      if (target && savedOffset < target.buf.duration - 0.15) {
        playbackRef.current = { ...target, pausedOffset: savedOffset };
      } else {
        playbackRef.current = null;
      }
    } else if (playbackRef.current && playbackRef.current.pausedOffset === null) {
      playbackRef.current = null;
    }
    stopActiveSources();
  }, [stopActiveSources]);

  const putBufCache = useCallback((key: string, buf: AudioBuffer) => {
    const cache = bufCacheRef.current;
    if (cache.has(key)) cache.delete(key);
    cache.set(key, buf);
    while (cache.size > MAX_BUF_CACHE) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
      else break;
    }
  }, []);

  const getCueBuffer = useCallback(
    async (cueIndex: number, vId: LiveVoiceId, spd: number, urgent = false): Promise<AudioBuffer | null> => {
      const cue = stateRef.current.cues[cueIndex];
      if (!cue || cue.pending || !cue.text.trim()) return null;
      const engKey = getPiperVoiceKey(vId);

      const normSpd = Math.round(spd * 20) / 20;
      const ytRate = Math.round((ytRef.current?.getPlaybackRate?.() || 1) * 20) / 20;
      // Key theo start_ms + text thay vì cueIndex để không bị lệch audio khi sự kiện done xoá các câu [SKIP]
      const key = `${vId}:${normSpd.toFixed(2)}:${ytRate.toFixed(2)}:${cue.start_ms}:${cue.text}`;
      const hit = bufCacheRef.current.get(key);
      if (hit) {
        putBufCache(key, hit);
        return hit;
      }

      const existing = inflightRef.current.get(key);
      if (existing) return existing;

      /** Tổng hợp 1 câu ở tốc độ `speed` (WASM cục bộ nếu đã tải xong, còn lại dùng server native C++ / Edge TTS) */
      const synthAt = async (speed: number): Promise<AudioBuffer | null> => {
        if (engKey && stateRef.current.localWasmReady) {
          const synth = await synthesizePiper(cue.text, engKey, speed);
          setLastSynthMs(synth.synthMs);
          if (!synth.pcm.length) return null;
          const ctx = getAudioCtx();
          const buf = ctx.createBuffer(1, synth.pcm.length, synth.sampleRate);
          buf.getChannelData(0).set(synth.pcm);
          return buf;
        }
        // Server TTS: Edge Neural (MP3) hoặc Piper C++ native (WAV)
        const t0 = performance.now();
        const qs = new URLSearchParams({
          v: vId,
          s: speed.toFixed(2),
          t: truncateTtsText(cue.text, EDGE_MAX_CHARS),
        });
        if (urgent) qs.set("p", "1");
        const url = `/api/v1/dub/tts?${qs.toString()}`;
        let res: Response | null = null;
        let lastErr: unknown = null;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            res = await fetch(url);
            if (res.ok || (res.status !== 502 && res.status !== 503 && res.status !== 504)) break;
          } catch (e) {
            lastErr = e;
          }
          if (attempt === 0) await new Promise((r) => setTimeout(r, 300));
        }
        if (!res) throw lastErr instanceof Error ? lastErr : new Error("Không tải được âm thanh.");
        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error((errJson as { error?: string }).error || `TTS HTTP ${res.status}`);
        }
        const arr = await res.arrayBuffer();
        setLastSynthMs(Math.round(performance.now() - t0));
        return getAudioCtx().decodeAudioData(arr);
      };

      const p = (async (): Promise<AudioBuffer | null> => {
        try {
          const next = stateRef.current.cues[cueIndex + 1];
          const slot = next ? (next.start_ms - cue.start_ms) / 1000 / ytRate - 0.1 : 0;

          // Ước lượng tốc độ cần thiết ngay từ đầu để tránh phải gọi TTS 2 lần cho cùng 1 câu
          let firstSpd = normSpd;
          if (slot > 0.4 && normSpd < MAX_FIT_SPEED) {
            const estDur = estimateViDurSec(cue.text, normSpd);
            if (estDur > slot + 0.15) {
              firstSpd = Math.min(MAX_FIT_SPEED, Math.ceil(((normSpd * estDur) / slot) * 20) / 20);
            }
          }

          let buf = await synthAt(firstSpd);
          // Câu đang cần phát ngay (`urgent`) không chặn chờ gọi TTS lần 2; chỉ tinh chỉnh khi prefetch ngầm bằng Edge
          if (!urgent && !engKey && buf && slot > 0.4 && buf.duration > slot + 0.45 && firstSpd < MAX_FIT_SPEED) {
            const need = Math.min(MAX_FIT_SPEED, Math.ceil(((firstSpd * buf.duration) / slot) * 20) / 20);
            if (need > firstSpd) {
              const fitted = await synthAt(need).catch(() => null);
              if (fitted) buf = fitted;
            }
          }
          if (buf) {
            putBufCache(key, buf);
            setEngineErr("");
          }
          return buf;
        } catch (e) {
          setEngineErr((e as Error).message || "Không tổng hợp được giọng đọc.");
          return null;
        } finally {
          inflightRef.current.delete(key);
        }
      })();

      inflightRef.current.set(key, p);
      return p;
    },
    [getAudioCtx, putBufCache],
  );

  // Phát câu hiện tại & prefetch ngay lập tức qua server C++; nếu chọn giọng trình duyệt thì tải ngầm WASM để đọc offline về sau
  useEffect(() => {
    let active = true;
    const start = Math.max(0, stateRef.current.activeCueIdx);
    const spd = stateRef.current.speed;
    if (start < cues.length) {
      void getCueBuffer(start, voiceId, spd, true).then(() => {
        if (!active) return;
        for (let k = start + 1; k < Math.min(start + 3, cues.length); k++) {
          void getCueBuffer(k, voiceId, spd, false);
        }
      });
    }

    if (!localEngineKey || readyEngines[localEngineKey]) {
      return () => {
        active = false;
      };
    }

    ensurePiperLoaded(localEngineKey, (p) => {
      if (active) setProgress(p);
    })
      .then(() => {
        if (active) {
          setReadyEngines((prev) => (prev[localEngineKey] ? prev : { ...prev, [localEngineKey]: true }));
          stateRef.current.localWasmReady = true;
        }
      })
      .catch(() => {
        // Không chặn hay báo lỗi nếu tải WASM nền thất bại vì server Piper C++ vẫn đang phát bình thường
      });
    return () => {
      active = false;
    };
  }, [localEngineKey, voiceId, cues, readyEngines, getCueBuffer]);

  // Apply volume updates
  useEffect(() => {
    const yt = ytRef.current;
    if (yt) {
      if (origVol <= 0) yt.mute();
      else {
        yt.unMute();
        yt.setVolume(origVol);
      }
    }
  }, [origVol]);

  useEffect(() => {
    if (gainRef.current) {
      gainRef.current.gain.value = dubMuted ? 0 : Math.min(1.8, Math.max(0, dubVol / 100));
    }
  }, [dubVol, dubMuted]);

  // Auto-scroll active line in transcript drawer
  useEffect(() => {
    if (showScript && activeRowRef.current) {
      activeRowRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [activeCueIdx, showScript]);

  const resumeSpeech = useCallback(() => {
    const ctx = getAudioCtx();
    const gain = gainRef.current;
    const pb = playbackRef.current;
    if (!gain || !pb || pb.pausedOffset === null) return;

    const { voiceId: vId, speed: spd, cues: list } = stateRef.current;
    const cue = list[pb.cueIndex];
    const tMs = (ytRef.current?.getCurrentTime?.() ?? 0) * 1000;
    const nextStart = list[pb.cueIndex + 1]?.start_ms ?? (cue ? cue.end_ms + 5000 : 0);
    const stillInCue =
      cue &&
      pb.voiceId === vId &&
      tMs >= cue.start_ms - 400 &&
      tMs < Math.min(nextStart - 60, cue.end_ms + 800);

    if (!stillInCue) {
      playbackRef.current = null;
      return;
    }

    const pbRate = pb.playbackRate || 1;
    const offset = pb.pausedOffset;
    const remaining = (pb.buf.duration - offset) / pbRate;
    if (remaining <= 0.12) {
      playbackRef.current = null;
      return;
    }

    // Khôi phục đúng âm tiết đang đọc dở ngay lập tức (0ms độ trễ)
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = pb.buf;
    src.playbackRate.value = pbRate;
    src.connect(gain);
    src.start(now, offset);
    activeSrcsRef.current.add(src);
    pb.startedAtCtx = now;
    pb.baseOffset = offset;
    pb.pausedOffset = null;
    scheduledRef.current.push(pb);
    audioEndAtRef.current = now + remaining;
    src.onended = () => {
      activeSrcsRef.current.delete(src);
      scheduledRef.current = scheduledRef.current.filter((item) => item !== pb);
      if (playbackRef.current === pb && pb.pausedOffset === null) {
        playbackRef.current = null;
      }
    };

    // Prefetch lại 2–3 câu kế tiếp để sẵn sàng ngay sau câu đang đọc tiếp
    const count = getPiperVoiceKey(vId) ? 2 : 3;
    for (let k = pb.cueIndex + 1; k <= Math.min(list.length - 1, pb.cueIndex + count); k++) {
      void getCueBuffer(k, vId, spd, false);
    }
  }, [getAudioCtx, getCueBuffer]);

  // Nếu người dùng bấm Play trực tiếp trong iframe YouTube (AudioContext bị treo do autoplay policy),
  // tự mở khoá âm thanh ngay khi có tương tác đầu tiên bất kỳ trên trang và phát ngay câu hiện tại.
  useEffect(() => {
    if (!audioBlocked) return;
    const unlock = () => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      void ctx
        .resume()
        .then(() => {
          if (ctxRef.current === ctx && ctx.state === "running") {
            setAudioBlocked(false);
            if (playbackRef.current && playbackRef.current.pausedOffset !== null) {
              resumeSpeech();
            } else if (activeSrcsRef.current.size === 0) {
              lastSpokenIdxRef.current = -1;
            }
          }
        })
        .catch(() => {});
    };
    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("keydown", unlock, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [audioBlocked, resumeSpeech]);

  const findTargetCueIndex = useCallback((tMs: number): number => {
    const list = stateRef.current.cues;
    if (!list.length) return -1;
    const hit = list.findIndex((c) => tMs <= c.end_ms + 800);
    return hit >= 0 ? hit : 0;
  }, []);

  const isCueCached = useCallback((cueIndex: number, vId: LiveVoiceId, spd: number): boolean => {
    const cue = stateRef.current.cues[cueIndex];
    if (!cue || cue.pending || !cue.text.trim()) return false;
    const normSpd = Math.round(spd * 20) / 20;
    const ytRate = Math.round((ytRef.current?.getPlaybackRate?.() || 1) * 20) / 20;
    return bufCacheRef.current.has(`${vId}:${normSpd.toFixed(2)}:${ytRate.toFixed(2)}:${cue.start_ms}:${cue.text}`);
  }, []);

  // Mount YouTube IFrame Player
  useEffect(() => {
    let cancelled = false;
    let player: YTPlayerEx | null = null;
    const host = hostRef.current;
    if (!host) return;
    const el = document.createElement("div");
    host.appendChild(el);

    loadYT().then(() => {
      const w = window as unknown as {
        YT?: { Player: new (e: HTMLElement, o: Record<string, unknown>) => YTPlayerEx };
      };
      if (cancelled || !w.YT?.Player) return;
      player = new w.YT.Player(el, {
        videoId,
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1, cc_load_policy: 0 },
        events: {
          onReady: () => {
            if (cancelled || !player) return;
            ytRef.current = player;
            setYtErr("");
            if (stateRef.current.origVol <= 0) player.mute();
            else {
              player.unMute();
              player.setVolume(stateRef.current.origVol);
            }
            setYtReady(true);
            if (autoPlayRef.current) {
              getAudioCtx();
              player.playVideo();
            }
          },
          onError: (ev: { data: number }) => {
            if (cancelled) return;
            setPlaying(false);
            stopSpeech();
            setYtErr(ytErrorMessage(ev.data));
          },
          onStateChange: (ev: { data: number }) => {
            lastPollWallRef.current = 0;
            if (ev.data === 1) {
              // Nếu câu đầu tại vị trí hiện tại chưa có sẵn audio trong RAM → giữ video tạm dừng tới khi tải xong giọng Việt
              if (
                activeSrcsRef.current.size === 0 &&
                !playbackRef.current &&
                !warmingRef.current &&
                stateRef.current.voiceReady &&
                stateRef.current.cues.length
              ) {
                const start = findTargetCueIndex((player?.getCurrentTime?.() ?? 0) * 1000);
                const cue = start >= 0 ? stateRef.current.cues[start] : undefined;
                if (
                  start >= 0 &&
                  gatedCueRef.current !== start &&
                  cue &&
                  !cue.pending &&
                  cue.text.trim() &&
                  !isCueCached(start, stateRef.current.voiceId, stateRef.current.speed)
                ) {
                  gatedCueRef.current = start;
                  warmingRef.current = true;
                  setWarmingAudio(true);
                  player?.pauseVideo();
                  void getCueBuffer(start, stateRef.current.voiceId, stateRef.current.speed, true).finally(() => {
                    warmingRef.current = false;
                    setWarmingAudio(false);
                    if (!cancelled) ytRef.current?.playVideo();
                  });
                  return;
                }
              }
              setPlaying(true);
              resumeSpeech();
              // Trên iOS Safari, bấm Play trực tiếp trong iframe đôi khi tự bỏ mute → áp lại mức âm gốc ngay khi phát
              if (player) {
                if (stateRef.current.origVol <= 0) player.mute();
                else {
                  player.unMute();
                  player.setVolume(stateRef.current.origVol);
                }
              }
            } else if (ev.data === 2 || ev.data === 3) {
              // 2 = PAUSED, 3 = BUFFERING → giữ vị trí câu đang đọc dở để tiếp tục ngay khi phát lại
              if (ev.data === 2) setPlaying(false);
              pauseSpeech();
            } else {
              setPlaying(false);
              stopSpeech();
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      ytRef.current = null;
      stopSpeech();
      player?.destroy();
      el.remove();
    };
  }, [videoId, findTargetCueIndex, getAudioCtx, getCueBuffer, isCueCached, pauseSpeech, resumeSpeech, stopSpeech]);

  // Real-time scheduler & lookahead prefetch loop (every 100ms)
  useEffect(() => {
    const speakCue = async (cueIndex: number, isSeek: boolean) => {
      const { voiceId: vId, speed: spd, cues: list } = stateRef.current;
      const yt = ytRef.current;
      if (!yt || yt.getPlayerState?.() !== 1) return;
      const myStopGen = stopGenRef.current;

      // Prefetch next 4 cues ahead in background
      // Luôn tải xong câu đang cần đọc TRƯỚC rồi mới prefetch các câu tiếp theo
      const buf = await getCueBuffer(cueIndex, vId, spd, true);
      if (!buf) {
        // Không reset lastSpokenIdxRef khi TTS lỗi/rỗng để tránh vòng lặp 100ms gọi lại vô hạn
        return;
      }
      if (myStopGen !== stopGenRef.current || !ytRef.current || ytRef.current.getPlayerState?.() !== 1) {
        // Bị pause/dừng ngay lúc câu này đang tải → trả lại mốc để phát ngay khi bấm Phát lại
        if (lastSpokenIdxRef.current === cueIndex && playbackRef.current?.cueIndex !== cueIndex) {
          lastSpokenIdxRef.current = cueIndex - 1;
        }
        return;
      }
      if (lastSpokenIdxRef.current !== cueIndex) return;
      if (stateRef.current.voiceId !== vId) return;

      const prefetchCount = getPiperVoiceKey(vId) ? 2 : 3;
      for (let k = cueIndex + 1; k <= Math.min(list.length - 1, cueIndex + prefetchCount); k++) {
        void getCueBuffer(k, vId, spd, false);
      }

      const ctx = getAudioCtx();
      const gain = gainRef.current;
      if (!gain) return;
      // Nếu AudioContext đang bị trình duyệt treo (autoplay policy), không xếp nguồn cũ vào hàng đợi
      // để tránh phát lại câu đã trôi qua khi mở khoá; buffer vẫn nằm sẵn trong cache.
      if (ctx.state !== "running") {
        stopActiveSources();
        return;
      }

      if (isSeek) {
        stopSpeech();
      } else if (audioEndAtRef.current - ctx.currentTime > MAX_QUEUE_LAG_SEC) {
        // Hàng đợi audio bị tụt quá xa so với video → cắt câu trễ cũ để bắt kịp ngay nhịp hình
        stopActiveSources();
      }

      const next = list[cueIndex + 1];
      const ytRate = Math.round((ytRef.current?.getPlaybackRate?.() || 1) * 20) / 20;
      const slot = next ? (next.start_ms - list[cueIndex].start_ms) / 1000 / ytRate - 0.1 : 0;
      const pbRate = slot > 0.4 && buf.duration > slot + 0.3 ? Math.min(1.12, buf.duration / slot) : 1;
      const effectiveDur = buf.duration / pbRate;

      const now = ctx.currentTime;
      const startAt = Math.max(now, audioEndAtRef.current + 0.02);

      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = pbRate;
      src.connect(gain);
      src.start(startAt);
      activeSrcsRef.current.add(src);
      const pb: ScheduledPlayback = {
        cueIndex,
        buf,
        startedAtCtx: startAt,
        baseOffset: 0,
        playbackRate: pbRate,
        voiceId: vId,
        pausedOffset: null,
      };
      scheduledRef.current.push(pb);
      if (scheduledRef.current.length === 1) {
        playbackRef.current = pb;
      }
      audioEndAtRef.current = startAt + effectiveDur;
      src.onended = () => {
        activeSrcsRef.current.delete(src);
        scheduledRef.current = scheduledRef.current.filter((item) => item !== pb);
        if (playbackRef.current === pb && pb.pausedOffset === null) {
          playbackRef.current = scheduledRef.current[0] ?? null;
        }
      };
    };

    const timer = setInterval(() => {
      const yt = ytRef.current;
      const { voiceReady: ready, cues: list } = stateRef.current;
      if (!yt || !ready || !list.length) return;
      if (yt.getPlayerState?.() !== 1) {
        lastPollWallRef.current = 0;
        return;
      }

      const nowWall = performance.now();
      const dtWall = lastPollWallRef.current > 0 ? Math.max(0, (nowWall - lastPollWallRef.current) / 1000) : 0;
      lastPollWallRef.current = nowWall;

      const t = yt.getCurrentTime?.() ?? 0;
      const tMs = t * 1000;
      const ytRate = yt.getPlaybackRate?.() || 1;
      const dtVideo = t - lastYtTimeRef.current;
      lastYtTimeRef.current = t;

      // Chỉ coi là tua thật khi lùi > 0.5s hoặc nhảy tới vượt xa thời gian thực đã trôi qua
      const seekedBack = dtVideo < -0.5;
      const seekedForward = dtVideo > Math.max(1.5, dtWall * ytRate + 1.2);
      const jumped = seekedBack || seekedForward;

      if (seekedBack) {
        stopSpeech();
        lastSpokenIdxRef.current = -1;
      } else if (seekedForward) {
        stopSpeech();
      }

      let curIdx = -1;
      for (let i = 0; i < list.length; i++) {
        const c = list[i];
        const nextStart = list[i + 1]?.start_ms ?? c.end_ms + 5000;
        if (tMs >= c.start_ms - 120 && tMs < Math.min(nextStart - 60, c.end_ms + 800)) {
          curIdx = i;
          break;
        }
      }

      // Chống giật lùi câu khi getCurrentTime() dao động nhẹ vài chục ms quanh mốc chuyển câu
      if (!seekedBack && curIdx !== -1 && curIdx < lastSpokenIdxRef.current) {
        curIdx = lastSpokenIdxRef.current;
      }

      setActiveCueIdx((prev) => (prev === curIdx ? prev : curIdx));

      if (curIdx !== -1 && curIdx > lastSpokenIdxRef.current) {
        const curCue = list[curIdx];
        if (!curCue.pending && curCue.text.trim()) {
          const lateMs = tMs - curCue.start_ms;
          const remainingMs = curCue.end_ms - tMs;
          if (!jumped || lateMs < 2500 || remainingMs > 1200) {
            lastSpokenIdxRef.current = curIdx;
            void speakCue(curIdx, jumped);
          } else {
            // Tua rơi đúng phần đuôi câu → đánh dấu bỏ qua để tick sau không đọc muộn
            lastSpokenIdxRef.current = curIdx;
          }
        }
      }
    }, 100);

    return () => clearInterval(timer);
  }, [getAudioCtx, getCueBuffer, stopActiveSources, stopSpeech]);

  const togglePlay = useCallback(async () => {
    const yt = ytRef.current;
    if (!yt || ytErr || warmingRef.current) return;
    getAudioCtx();
    if (playing) {
      yt.pauseVideo();
      pauseSpeech();
      return;
    }
    const start = findTargetCueIndex((yt.getCurrentTime?.() ?? 0) * 1000);
    const cue = start >= 0 ? stateRef.current.cues[start] : undefined;
    if (
      start >= 0 &&
      gatedCueRef.current !== start &&
      cue &&
      !cue.pending &&
      cue.text.trim() &&
      !isCueCached(start, stateRef.current.voiceId, stateRef.current.speed)
    ) {
      gatedCueRef.current = start;
      warmingRef.current = true;
      setWarmingAudio(true);
      try {
        await getCueBuffer(start, stateRef.current.voiceId, stateRef.current.speed, true);
      } finally {
        warmingRef.current = false;
        setWarmingAudio(false);
      }
      if (ytRef.current === yt) yt.playVideo();
      return;
    }
    yt.playVideo();
  }, [findTargetCueIndex, getAudioCtx, getCueBuffer, isCueCached, pauseSpeech, playing, ytErr]);

  // Phím tắt Space để Phát / Tạm dừng nhanh khi không đang gõ chữ hoặc bấm nút khác
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(el.tagName))) return;
      if (!ytReady || !voiceReady || warmingAudio || ytErr) return;
      e.preventDefault();
      void togglePlay();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [togglePlay, voiceReady, warmingAudio, ytErr, ytReady]);

  const restart = () => {
    const yt = ytRef.current;
    if (!yt) return;
    getAudioCtx();
    stopSpeech();
    lastSpokenIdxRef.current = -1;
    lastYtTimeRef.current = 0;
    lastPollWallRef.current = 0;
    setActiveCueIdx(-1);
    yt.seekTo(0, true);
    yt.playVideo();
  };

  const seekToCue = (idx: number) => {
    const yt = ytRef.current;
    const cue = cues[idx];
    if (!yt || !cue) return;
    getAudioCtx();
    stopSpeech();
    lastSpokenIdxRef.current = -1;
    lastYtTimeRef.current = cue.start_ms / 1000;
    lastPollWallRef.current = 0;
    setActiveCueIdx(idx);
    yt.seekTo(cue.start_ms / 1000, true);
    yt.playVideo();
  };

  const changeVoice = useCallback(
    (nextVoice: LiveVoiceId) => {
      stopSpeech();
      bufCacheRef.current.clear();
      setEngineErr("");
      lastSpokenIdxRef.current = -1;
      setVoiceId(nextVoice);
      onVoiceChange?.(nextVoice);
    },
    [onVoiceChange, stopSpeech],
  );

  // Đồng bộ khi người dùng chọn giọng ở thanh phía trên (không làm tải lại iframe YouTube)
  useEffect(() => {
    const resolved = resolveInitialVoice(initialVoice);
    if (resolved !== stateRef.current.voiceId) {
      stopSpeech();
      bufCacheRef.current.clear();
      setEngineErr("");
      lastSpokenIdxRef.current = -1;
      setVoiceId(resolved);
    }
  }, [initialVoice, stopSpeech]);

  const unlockAudio = () => {
    const ctx = getAudioCtx();
    void ctx
      .resume()
      .then(() => {
        if (ctxRef.current === ctx && ctx.state === "running") {
          setAudioBlocked(false);
          if (playbackRef.current && playbackRef.current.pausedOffset !== null) {
            resumeSpeech();
          } else if (activeSrcsRef.current.size === 0) {
            lastSpokenIdxRef.current = -1;
          }
        }
      })
      .catch(() => {});
  };

  const copyShare = async () => {
    if (!shareUrl) return;
    const full = shareUrl.startsWith("http") ? shareUrl : `${window.location.origin}${shareUrl}`;
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Vùng 1: Tiêu đề & hành động phiên xem */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line/70 pb-3">
        <div className="min-w-0 flex-1">
          <h2 className="line-clamp-2 text-base font-bold leading-snug text-foreground sm:text-lg">{title}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
            <span className="rounded-md bg-card-2 px-2 py-0.5 font-medium text-foreground/85 tabular-nums">
              {cues.length} câu
            </span>
            {sourceLang && sourceLang !== "auto" && !sourceLang.startsWith("vi") && (
              <span className="rounded-md bg-sec-soft px-2 py-0.5 font-semibold text-sec-text">
                {sourceLang.toUpperCase()} → VI
              </span>
            )}
            {showDebugMeta && (
              <span>
                {localEngineKey === "vtv2_thuyetminh"
                  ? "Eva trình duyệt (INT8)"
                  : localEngineKey === "lac_phi"
                    ? "Lạc Phi trình duyệt (INT8)"
                    : usingLocalWasm
                      ? "Adam trình duyệt (INT8)"
                      : "Neural TTS"}
                {lastSynthMs !== null ? ` · ${lastSynthMs}ms` : ""}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <select
            className="input h-8 w-auto py-1 text-xs text-foreground"
            value={voiceId}
            onChange={(e) => changeVoice(e.target.value as LiveVoiceId)}
            aria-label="Giọng thuyết minh"
          >
            {LIVE_VOICES.map((v) => (
              <option key={v.id} value={v.id}>
                {v.short}
              </option>
            ))}
          </select>

          {hasOrig && (
            <button
              type="button"
              className={`btn btn-sm ${showOrig ? "btn-soft" : ""}`}
              onClick={() => setShowOrig((v) => !v)}
              title="Hiện thêm câu gốc bên dưới bản dịch tiếng Việt"
            >
              <Captions className="size-3.5" />
              <span className="max-sm:hidden">Song ngữ</span>
            </button>
          )}

          <button
            type="button"
            className={`btn btn-sm ${showScript ? "btn-soft" : ""}`}
            onClick={() => setShowScript((v) => !v)}
            title="Xem toàn bộ lời thoại & bấm để tua nhanh"
          >
            <ListMusic className="size-3.5" />
            <span>Lời thoại</span>
          </button>

          {onRetranslate && (
            <button
              type="button"
              className="btn btn-sm"
              disabled={retranslating || Boolean(bgProgress)}
              onClick={() => {
                stopSpeech();
                onRetranslate("force");
              }}
              title="Dịch lại toàn bộ video từ ngôn ngữ gốc"
            >
              <RefreshCw className={`size-3.5 ${retranslating ? "animate-spin" : ""}`} />
              <span className="max-sm:hidden">Dịch lại</span>
            </button>
          )}

          {shareUrl && (
            <button type="button" className="btn btn-sm" onClick={() => void copyShare()} title="Chép link xem thuyết minh">
              {copied ? <Check className="size-3.5 text-ok-text" /> : <Share2 className="size-3.5" />}
              <span className="max-sm:hidden">{copied ? "Đã chép" : "Chia sẻ"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Nạp ngầm giọng trình duyệt để đọc offline lần sau (khi đang tải vẫn phát ngay qua máy chủ) */}
      {usingLocalWasm && !localWasmReady && !engineErr && progress.pct > 0 && progress.pct < 100 && (
        <div className="space-y-1.5 rounded-xl border border-line bg-card-2/60 p-3">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="inline-flex min-w-0 items-center gap-1.5 text-foreground">
              <Loader2 className="size-3.5 shrink-0 animate-spin text-sec-text" />
              <span className="truncate">{progress.stage}</span>
            </span>
            <span className="shrink-0 font-mono text-muted tabular-nums">{progress.pct}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-card">
            <div
              className="h-full rounded-full bg-sec transition-all duration-300"
              style={{ width: `${Math.max(5, progress.pct)}%` }}
            />
          </div>
        </div>
      )}

      {ytErr && (
        <p role="alert" className="alert alert-err text-xs">
          {ytErr}
        </p>
      )}

      {engineErr && (
        <p role="alert" className="alert alert-err text-xs">
          Lỗi giọng đọc: {engineErr}
        </p>
      )}

      {/* Vùng 2: Sân khấu chính (khi mở Lời thoại trên màn lớn sẽ chia 2 cột khoa học) */}
      <div className={showScript ? "grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start" : "flex flex-col gap-3"}>
        <div className="flex min-w-0 flex-col gap-3">
          {/* YouTube Player */}
          <div
            ref={hostRef}
            className="aspect-video w-full overflow-hidden rounded-xl bg-black [&_iframe]:h-full [&_iframe]:w-full"
          />

          {/* Thanh tải phần còn lại gọn nhẹ (không lộ quy trình kỹ thuật) */}
          {bgProgress && bgProgress.done < bgProgress.total && (
            <div className="space-y-1 rounded-xl border border-line/70 bg-card-2/40 px-3 py-2">
              <div className="flex items-center justify-between gap-2 text-[11px] text-muted">
                <span className="inline-flex min-w-0 items-center gap-1.5 text-foreground/85">
                  <Loader2 className="size-3 shrink-0 animate-spin text-sec-text" />
                  <span className="truncate">
                    {bgProgress.reconnecting
                      ? "Đang kết nối lại để tải phần tiếp theo…"
                      : "Đang tải thêm thuyết minh cho phần sau — bạn có thể xem ngay"}
                  </span>
                </span>
                <span className="shrink-0 font-mono font-semibold text-sec-text tabular-nums">{bgProgress.pct}%</span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-card">
                <div
                  className="h-full rounded-full bg-sec transition-[width] duration-300"
                  style={{ width: `${Math.max(8, bgProgress.pct)}%` }}
                />
              </div>
            </div>
          )}

          {/* Cảnh báo 1 chạm khi trình duyệt chặn tự phát Web Audio (vd bấm Play trực tiếp trong iframe YouTube) */}
          {playing && audioBlocked && (
            <button
              type="button"
              onClick={unlockAudio}
              className="flex items-center justify-center gap-2 rounded-xl border border-sec/40 bg-sec-soft px-3.5 py-2.5 text-xs font-semibold text-sec-text transition hover:brightness-95"
            >
              <Volume2 className="size-4 shrink-0" />
              <span>Trình duyệt đang tắt tiếng thuyết minh — Bấm vào đây để bật âm thanh tiếng Việt</span>
            </button>
          )}

          {untranslatedCount > 0 && onRetranslate && !bgProgress && !retranslating && (
            <button
              type="button"
              onClick={() => {
                stopSpeech();
                onRetranslate("repair");
              }}
              className="flex items-center justify-center gap-2 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3.5 py-2 text-xs font-medium text-amber-700 transition hover:bg-amber-500/15 dark:text-amber-300"
            >
              <RefreshCw className="size-3.5 shrink-0" />
              <span>Có {untranslatedCount} câu chưa dịch được — Bấm để dịch bù ngay</span>
            </button>
          )}

          {/* Phụ đề trực tiếp */}
          <div className="flex min-h-15 flex-col items-center justify-center gap-1 rounded-xl border border-line/60 bg-card-2/75 px-4 py-3 text-center">
            {activeCue ? (
              <>
                <p className="text-sm leading-snug font-semibold text-foreground sm:text-base">
                  {activeCue.pending ? (
                    "Đang dịch câu này…"
                  ) : activeCue.untranslated ? (
                    <span className="font-normal italic text-muted">{activeCue.orig} (chưa dịch được)</span>
                  ) : (
                    activeCue.text
                  )}
                </p>
                {showOrig && activeCue.orig && !activeCue.untranslated && (
                  <p className="text-xs leading-snug text-muted">{activeCue.orig}</p>
                )}
              </>
            ) : (
              <span className="text-xs text-muted">
                {voiceReady
                  ? "Bấm “Phát” để xem YouTube với giọng thuyết minh tiếng Việt (tua thoải mái, tự bắt nhịp)"
                  : "Đang nạp giọng đọc AI lần đầu (tự lưu trong trình duyệt cho các lần sau)…"}
              </span>
            )}
          </div>

          {/* Vùng 3: Bảng điều khiển phát & trộn âm tách nhóm rõ ràng */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-card-2/40 p-2.5 sm:px-3.5 sm:py-3">
            {/* Nhóm điều khiển phát */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn btn-sm btn-primary min-w-[104px] tabular-nums"
                disabled={!ytReady || !voiceReady || warmingAudio || Boolean(ytErr)}
                onClick={() => void togglePlay()}
              >
                {!voiceReady ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Nạp {progress.pct}%
                  </>
                ) : warmingAudio ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Tải giọng…
                  </>
                ) : (
                  <>
                    {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                    {playing ? "Tạm dừng" : "Phát"}
                  </>
                )}
              </button>
              <button
                type="button"
                className="btn btn-sm"
                disabled={!ytReady || !voiceReady || Boolean(ytErr)}
                onClick={restart}
                title="Xem lại từ đầu"
                aria-label="Xem lại từ đầu"
              >
                <RotateCcw className="size-3.5" />
              </button>
            </div>

            {/* Nhóm trộn âm lượng & tốc độ */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
              {isIOS ? (
                <button
                  type="button"
                  className={`btn btn-sm ${origVol > 0 ? "btn-soft" : ""}`}
                  onClick={() => setOrigVol((v) => (v > 0 ? 0 : 100))}
                  title="iOS chỉ cho bật/tắt tiếng gốc video trong trình duyệt"
                >
                  {origVol <= 0 ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
                  {origVol <= 0 ? "Gốc: Tắt" : "Gốc: Bật"}
                </button>
              ) : (
                <div className="flex items-center gap-1.5 text-muted">
                  <button
                    type="button"
                    className="text-foreground transition hover:text-sec-text"
                    onClick={() => setOrigVol((v) => (v > 0 ? 0 : 25))}
                    title={origVol <= 0 ? "Bật tiếng gốc video" : "Tắt tiếng gốc video"}
                    aria-label={origVol <= 0 ? "Bật tiếng gốc video" : "Tắt tiếng gốc video"}
                  >
                    {origVol <= 0 ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
                  </button>
                  <span className="min-w-13 tabular-nums">Gốc {origVol}%</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={origVol}
                    onChange={(e) => setOrigVol(Number(e.target.value))}
                    aria-label="Âm lượng tiếng gốc"
                    className="w-16 sm:w-20"
                  />
                </div>
              )}

              <div className="flex items-center gap-1.5 text-muted">
                <button
                  type="button"
                  className="text-foreground transition hover:text-sec-text"
                  onClick={() => setDubMuted((m) => !m)}
                  title={dubMuted ? "Bật thuyết minh" : "Tắt thuyết minh"}
                  aria-label={dubMuted ? "Bật thuyết minh" : "Tắt thuyết minh"}
                >
                  {dubMuted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
                </button>
                <span className="min-w-14 tabular-nums">Việt {dubMuted ? "0" : dubVol}%</span>
                <input
                  type="range"
                  min={0}
                  max={160}
                  step={10}
                  value={dubVol}
                  onChange={(e) => {
                    setDubMuted(false);
                    setDubVol(Number(e.target.value));
                  }}
                  aria-label="Âm lượng thuyết minh"
                  className="w-16 sm:w-20"
                />
              </div>

              <label className="flex items-center gap-1.5 text-muted" title="Tốc độ giọng thuyết minh">
                <span className="min-w-10 font-mono font-semibold text-foreground tabular-nums">{speed.toFixed(2)}×</span>
                <input
                  type="range"
                  min={0.9}
                  max={1.4}
                  step={0.05}
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  aria-label="Tốc độ giọng thuyết minh"
                  className="w-16"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Cột lời thoại song song (màn lớn bên phải, màn nhỏ bên dưới) */}
        {showScript && (
          <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-background/60">
            <div className="flex items-center justify-between border-b border-line/70 px-3 py-2 text-xs">
              <span className="font-semibold text-foreground">Lời thoại ({cues.length} câu)</span>
              <span className="text-[11px] text-muted">Bấm câu để tua tới</span>
            </div>
            <div className="max-h-80 overflow-y-auto p-1.5 lg:max-h-[460px]">
              <div className="flex flex-col gap-0.5">
                {cues.map((c, idx) => {
                  const active = idx === activeCueIdx;
                  return (
                    <button
                      key={`${c.start_ms}-${idx}`}
                      ref={active ? activeRowRef : undefined}
                      type="button"
                      onClick={() => seekToCue(idx)}
                      className={`flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${active ? "bg-sec-soft text-foreground" : "text-muted hover:bg-card-2/70 hover:text-foreground"
                        }`}
                    >
                      <span className="mt-0.5 shrink-0 font-mono text-[11px] tabular-nums opacity-75">
                        {formatTime(c.start_ms / 1000)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block leading-snug ${active ? "font-semibold text-foreground" : "text-foreground/90"}`}>
                          {c.pending ? (
                            <span className="italic text-muted">Đang dịch…</span>
                          ) : c.untranslated ? (
                            <span className="italic text-muted">{c.orig} (chưa dịch được)</span>
                          ) : (
                            c.text
                          )}
                        </span>
                        {showOrig && c.orig && !c.untranslated && (
                          <span className="mt-0.5 block text-[11px] text-muted">{c.orig}</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
