"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  Captions,
  ListMusic,
  Loader2,
  Pause,
  Play,
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
  /** true = đang dịch ngầm, chưa có bản tiếng Việt */
  pending?: boolean;
};

export type LiveVoiceId =
  | "edge:vi-VN-NamMinhNeural"
  | "edge:vi-VN-HoaiMyNeural"
  | "piper:adam_bua";

export const LIVE_VOICES: { id: LiveVoiceId; label: string; short: string }[] = [
  { id: "edge:vi-VN-NamMinhNeural", label: "Edge · Nam Minh (Nam · Tự nhiên)", short: "Edge · Nam Minh (Nam)" },
  { id: "edge:vi-VN-HoaiMyNeural", label: "Edge · Hoài My (Nữ · Tự nhiên)", short: "Edge · Hoài My (Nữ)" },
  { id: "piper:adam_bua", label: "Adam bựa (Nam · Bắc · Trình duyệt)", short: "Adam bựa (Nam · Trình duyệt)" },
];

function resolveInitialVoice(v?: LiveVoiceId): LiveVoiceId {
  if (v && LIVE_VOICES.some((x) => x.id === v)) return v;
  return "edge:vi-VN-NamMinhNeural";
}

function getPiperVoiceKey(v: LiveVoiceId): PiperVoiceKey | null {
  if (v === "piper:adam_bua") return "adam_bua";
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

function detectIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iP(hone|ad|od)/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export default function KokoroLivePlayer({
  videoId,
  title,
  cues,
  sourceLang,
  initialVoice = "edge:vi-VN-NamMinhNeural",
  initialSpeed = 1.15,
  initialOrigVol = 25,
  shareUrl,
  showDebugMeta = false,
  bgProgress = null,
}: {
  videoId: string;
  title: string;
  cues: LiveCue[];
  sourceLang?: string;
  initialVoice?: LiveVoiceId;
  initialSpeed?: number;
  initialOrigVol?: number;
  shareUrl?: string;
  showDebugMeta?: boolean;
  bgProgress?: { pct: number; done: number; total: number } | null;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const ytRef = useRef<YTPlayerEx | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const activeSrcRef = useRef<AudioBufferSourceNode | null>(null);
  const audioEndAtRef = useRef<number>(0);
  const bufCacheRef = useRef<Map<string, AudioBuffer>>(new Map());
  const inflightRef = useRef<Map<string, Promise<AudioBuffer | null>>>(new Map());
  const lastSpokenIdxRef = useRef<number>(-1);
  const lastYtTimeRef = useRef<number>(0);
  const activeRowRef = useRef<HTMLButtonElement | null>(null);

  const [ytReady, setYtReady] = useState(false);
  const [voiceId, setVoiceId] = useState<LiveVoiceId>(() => resolveInitialVoice(initialVoice));
  const [readyEngines, setReadyEngines] = useState<Partial<Record<PiperVoiceKey, boolean>>>({});
  const [progress, setProgress] = useState<KokoroProgress>({ stage: "Đang khởi tạo giọng đọc AI…", pct: 0 });
  const [engineErr, setEngineErr] = useState("");

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
  const voiceReady = localEngineKey ? Boolean(readyEngines[localEngineKey]) : true;
  const hasOrig = cues.some((c) => Boolean(c.orig));
  const activeCue = activeCueIdx >= 0 ? cues[activeCueIdx] : null;

  const stateRef = useRef({ voiceId, speed, origVol, dubVol, dubMuted, voiceReady, cues });
  useEffect(() => {
    stateRef.current = { voiceId, speed, origVol, dubVol, dubMuted, voiceReady, cues };
  });

  // Chỉ xoá cache audio khi đổi sang video khác (KHÔNG xoá khi nhận thêm chunk dịch ngầm)
  useEffect(() => {
    const cache = bufCacheRef.current;
    const inflight = inflightRef.current;
    return () => {
      cache.clear();
      inflight.clear();
    };
  }, [videoId]);

  useEffect(() => {
    return () => {
      if (ctxRef.current) {
        void ctxRef.current.close().catch(() => {});
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
      ctxRef.current = ctx;
      gainRef.current = gain;
    }
    if (ctxRef.current.state === "suspended") void ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const stopSpeech = useCallback(() => {
    if (activeSrcRef.current) {
      try {
        activeSrcRef.current.stop();
      } catch {}
      activeSrcRef.current.disconnect();
      activeSrcRef.current = null;
    }
    audioEndAtRef.current = 0;
  }, []);

  const getCueBuffer = useCallback(
    async (cueIndex: number, vId: LiveVoiceId, spd: number): Promise<AudioBuffer | null> => {
      const cue = stateRef.current.cues[cueIndex];
      if (!cue || cue.pending || !cue.text.trim()) return null;
      const engKey = getPiperVoiceKey(vId);
      if (engKey && !stateRef.current.voiceReady) return null;

      const normSpd = Math.round(spd * 20) / 20;
      const key = `${vId}:${normSpd.toFixed(2)}:${cueIndex}`;
      const hit = bufCacheRef.current.get(key);
      if (hit) return hit;

      const existing = inflightRef.current.get(key);
      if (existing) return existing;

      const p = (async (): Promise<AudioBuffer | null> => {
        try {
          if (engKey) {
            const synth = await synthesizePiper(cue.text, engKey, normSpd);
            setLastSynthMs(synth.synthMs);
            if (!synth.pcm.length) return null;
            const ctx = getAudioCtx();
            const buf = ctx.createBuffer(1, synth.pcm.length, synth.sampleRate);
            buf.getChannelData(0).set(synth.pcm);
            bufCacheRef.current.set(key, buf);
            return buf;
          }

          // Edge Neural TTS: fetch MP3 cue-by-cue & decode into AudioBuffer
          const t0 = performance.now();
          const qs = new URLSearchParams({
            v: vId,
            s: normSpd.toFixed(2),
            t: cue.text.slice(0, 600),
          });
          const res = await fetch(`/api/v1/dub/tts?${qs.toString()}`);
          if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            throw new Error((errJson as { error?: string }).error || `Edge TTS HTTP ${res.status}`);
          }
          const arr = await res.arrayBuffer();
          setLastSynthMs(Math.round(performance.now() - t0));
          const ctx = getAudioCtx();
          const buf = await ctx.decodeAudioData(arr);
          bufCacheRef.current.set(key, buf);
          setEngineErr("");
          return buf;
        } catch (e) {
          if (!engKey) {
            setEngineErr((e as Error).message);
          }
          return null;
        } finally {
          inflightRef.current.delete(key);
        }
      })();

      inflightRef.current.set(key, p);
      return p;
    },
    [getAudioCtx],
  );

  // Warm up Edge TTS (first 3 cues) OR lazily load local WASM engine when selected
  useEffect(() => {
    let active = true;
    if (!localEngineKey) {
      // Edge TTS sẵn sàng ngay lập tức — prefetch trước 3 câu đầu
      for (let k = 0; k < Math.min(3, cues.length); k++) {
        void getCueBuffer(k, voiceId, stateRef.current.speed);
      }
      return;
    }

    ensurePiperLoaded(localEngineKey, (p) => {
      if (active) setProgress(p);
    })
      .then(() => {
        if (active) {
          setReadyEngines((prev) => (prev[localEngineKey] ? prev : { ...prev, [localEngineKey]: true }));
          stateRef.current.voiceReady = true;
          for (let k = 0; k < Math.min(3, cues.length); k++) {
            void getCueBuffer(k, voiceId, stateRef.current.speed);
          }
        }
      })
      .catch((e) => {
        if (active) setEngineErr((e as Error).message);
      });
    return () => {
      active = false;
    };
  }, [localEngineKey, voiceId, cues.length, getCueBuffer]);

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
            if (stateRef.current.origVol <= 0) player.mute();
            else {
              player.unMute();
              player.setVolume(stateRef.current.origVol);
            }
            setYtReady(true);
          },
          onStateChange: (ev: { data: number }) => {
            if (ev.data === 1) {
              setPlaying(true);
              getAudioCtx();
              // Trên iOS Safari, bấm Play trực tiếp trong iframe đôi khi tự bỏ mute → áp lại mức âm gốc ngay khi phát
              if (player) {
                if (stateRef.current.origVol <= 0) player.mute();
                else {
                  player.unMute();
                  player.setVolume(stateRef.current.origVol);
                }
              }
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
  }, [videoId, getAudioCtx, stopSpeech]);

  // Real-time scheduler & lookahead prefetch loop (every 100ms)
  useEffect(() => {
    const speakCue = async (cueIndex: number, isSeek: boolean) => {
      const { voiceId: vId, speed: spd, cues: list } = stateRef.current;
      const yt = ytRef.current;
      if (!yt || yt.getPlayerState?.() !== 1) return;

      // Prefetch next 4 cues ahead in background
      for (let k = cueIndex + 1; k <= Math.min(list.length - 1, cueIndex + 4); k++) {
        void getCueBuffer(k, vId, spd);
      }

      const buf = await getCueBuffer(cueIndex, vId, spd);
      if (!buf) return;
      if (!ytRef.current || ytRef.current.getPlayerState?.() !== 1) return;
      if (lastSpokenIdxRef.current !== cueIndex) return;
      if (stateRef.current.voiceId !== vId) return;

      const ctx = getAudioCtx();
      const gain = gainRef.current;
      if (!gain) return;

      if (isSeek) stopSpeech();

      const now = ctx.currentTime;
      const startAt = Math.max(now, audioEndAtRef.current + 0.02);

      // Fit clip neatly before next cue if tight (gentle speedup up to 1.35x)
      const ytRate = ytRef.current.getPlaybackRate?.() || 1;
      let rate = ytRate;
      const nextCue = list[cueIndex + 1];
      if (nextCue) {
        const curT = ytRef.current.getCurrentTime?.() ?? list[cueIndex].start_ms / 1000;
        const avail = nextCue.start_ms / 1000 - curT - 0.05;
        if (avail > 0.4 && buf.duration / rate > avail) {
          rate = Math.min(ytRate * 1.35, buf.duration / avail);
        }
      }

      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = rate;
      src.connect(gain);
      src.start(startAt);
      activeSrcRef.current = src;
      audioEndAtRef.current = startAt + buf.duration / rate;
      src.onended = () => {
        if (activeSrcRef.current === src) activeSrcRef.current = null;
      };
    };

    const timer = setInterval(() => {
      const yt = ytRef.current;
      const { voiceReady: ready, cues: list } = stateRef.current;
      if (!yt || !ready || !list.length) return;
      if (yt.getPlayerState?.() !== 1) return;

      const t = yt.getCurrentTime?.() ?? 0;
      const tMs = t * 1000;
      const jumped = Math.abs(t - lastYtTimeRef.current) > 1.2;
      lastYtTimeRef.current = t;

      if (jumped) {
        stopSpeech();
        lastSpokenIdxRef.current = -1;
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

      setActiveCueIdx((prev) => (prev === curIdx ? prev : curIdx));

      if (curIdx !== -1) {
        const curCue = list[curIdx];
        if (!curCue.pending && curCue.text.trim() && curIdx !== lastSpokenIdxRef.current) {
          const lateMs = tMs - curCue.start_ms;
          const remainingMs = curCue.end_ms - tMs;
          if (!jumped || lateMs < 2500 || remainingMs > 1200) {
            lastSpokenIdxRef.current = curIdx;
            void speakCue(curIdx, jumped);
          }
        }
      }
    }, 100);

    return () => clearInterval(timer);
  }, [getAudioCtx, getCueBuffer, stopSpeech]);

  const togglePlay = () => {
    const yt = ytRef.current;
    if (!yt) return;
    getAudioCtx();
    if (playing) {
      yt.pauseVideo();
      stopSpeech();
    } else {
      yt.playVideo();
    }
  };

  const restart = () => {
    const yt = ytRef.current;
    if (!yt) return;
    getAudioCtx();
    stopSpeech();
    lastSpokenIdxRef.current = -1;
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
    setActiveCueIdx(idx);
    yt.seekTo(cue.start_ms / 1000, true);
    yt.playVideo();
  };

  const copyShare = async () => {
    if (!shareUrl) return;
    const full = shareUrl.startsWith("http") ? shareUrl : `${window.location.origin}${shareUrl}`;
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-bold text-foreground sm:text-lg">{title}</h2>
          <p className="text-xs text-muted">
            {showDebugMeta ? (
              <>
                {usingLocalWasm ? "Adam bựa trình duyệt (INT8)" : "Edge Neural TTS trực tiếp"} ({cues.length} câu)
                {lastSynthMs !== null ? ` · tạo câu trong ${lastSynthMs}ms` : ""}
              </>
            ) : (
              <>
                Thuyết minh tiếng Việt trực tiếp · {cues.length} câu
                {sourceLang && sourceLang !== "auto" && !sourceLang.startsWith("vi") ? ` · dịch từ ${sourceLang.toUpperCase()}` : ""}
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <select
            className="input h-8 w-auto py-1 text-xs text-foreground"
            value={voiceId}
            onChange={(e) => {
              stopSpeech();
              setEngineErr("");
              lastSpokenIdxRef.current = -1;
              setVoiceId(e.target.value as LiveVoiceId);
            }}
            aria-label="Giọng thuyết minh"
          >
            {LIVE_VOICES.map((v) => (
              <option key={v.id} value={v.id}>
                {v.short}
              </option>
            ))}
          </select>

          {shareUrl && (
            <button type="button" className="btn btn-sm" onClick={() => void copyShare()} title="Chép link xem thuyết minh">
              {copied ? <Check className="size-3.5 text-ok-text" /> : <Share2 className="size-3.5" />}
              <span className="max-sm:hidden">{copied ? "Đã chép" : "Chia sẻ"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Model download / init progress (chỉ hiện khi chọn giọng trình duyệt lần đầu) */}
      {usingLocalWasm && !voiceReady && !engineErr && (
        <div className="space-y-1.5 rounded-lg border border-line bg-card-2/60 p-3">
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

      {engineErr && (
        <p role="alert" className="alert alert-err text-xs">
          Lỗi giọng đọc: {engineErr}
        </p>
      )}

      {/* YouTube Player */}
      <div
        ref={hostRef}
        className="aspect-video w-full overflow-hidden rounded-lg bg-black [&_iframe]:h-full [&_iframe]:w-full"
      />

      {/* Background translation progress bar (khi đã phát cuốn chiếu từ 20 câu đầu) */}
      {bgProgress && bgProgress.done < bgProgress.total && (
        <div className="space-y-1 rounded-lg border border-line bg-card-2/50 px-3 py-2">
          <div className="flex items-center justify-between gap-2 text-[11px] text-muted">
            <span className="inline-flex items-center gap-1.5 text-foreground">
              <Loader2 className="size-3 animate-spin text-sec-text" />
              Đang dịch ngầm phần còn lại ({bgProgress.done}/{bgProgress.total} câu) — bạn đã có thể bấm Phát ngay
            </span>
            <span className="font-mono font-semibold text-sec-text tabular-nums">{bgProgress.pct}%</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-card">
            <div className="h-full rounded-full bg-sec transition-all duration-300" style={{ width: `${bgProgress.pct}%` }} />
          </div>
        </div>
      )}

      {/* Live Vietnamese (+ optional original) caption */}
      <div className="flex min-h-13 flex-col items-center justify-center gap-1 rounded-lg bg-card-2/80 px-4 py-2.5 text-center">
        {activeCue ? (
          <>
            <p className="text-sm leading-snug font-semibold text-foreground sm:text-[0.95rem]">
              {activeCue.pending ? "Đang dịch câu này…" : activeCue.text}
            </p>
            {showOrig && activeCue.orig && (
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

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2.5 text-xs sm:gap-3">
        <button
          type="button"
          className="btn btn-sm btn-primary tabular-nums"
          disabled={!ytReady || !voiceReady}
          onClick={togglePlay}
        >
          {!voiceReady ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Đang nạp {progress.pct}%
            </>
          ) : (
            <>
              {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
              {playing ? "Tạm dừng" : "Phát"}
            </>
          )}
        </button>
        <button type="button" className="btn btn-sm" disabled={!ytReady || !voiceReady} onClick={restart} title="Xem lại từ đầu">
          <RotateCcw className="size-3.5" />
        </button>

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
          <label className="flex items-center gap-1.5 text-muted">
            <button
              type="button"
              className="text-foreground"
              onClick={() => setOrigVol((v) => (v > 0 ? 0 : 25))}
              title={origVol <= 0 ? "Bật tiếng gốc video" : "Tắt tiếng gốc video"}
            >
              {origVol <= 0 ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
            </button>
            <span>Gốc {origVol}%</span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={origVol}
              onChange={(e) => setOrigVol(Number(e.target.value))}
              className="w-18 sm:w-20"
            />
          </label>
        )}

        <label className="flex items-center gap-1.5 text-muted">
          <button
            type="button"
            className="text-foreground"
            onClick={() => setDubMuted((m) => !m)}
            title={dubMuted ? "Bật thuyết minh" : "Tắt thuyết minh"}
          >
            {dubMuted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
          </button>
          <span>Việt {dubMuted ? "0" : dubVol}%</span>
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
            className="w-18 sm:w-20"
          />
        </label>

        <label className="flex items-center gap-1.5 text-muted" title="Tốc độ giọng thuyết minh">
          <span>{speed.toFixed(2)}×</span>
          <input
            type="range"
            min={0.9}
            max={1.4}
            step={0.05}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="w-16"
          />
        </label>

        <div className="ml-auto flex items-center gap-1.5">
          {hasOrig && (
            <button
              type="button"
              className={`btn btn-sm ${showOrig ? "btn-soft" : ""}`}
              onClick={() => setShowOrig((v) => !v)}
              title="Hiện thêm câu gốc bên dưới bản dịch tiếng Việt"
            >
              <Captions className="size-3.5" />
              Song ngữ
            </button>
          )}
          <button
            type="button"
            className={`btn btn-sm ${showScript ? "btn-soft" : ""}`}
            onClick={() => setShowScript((v) => !v)}
            title="Xem toàn bộ lời thoại & bấm để tua nhanh"
          >
            <ListMusic className="size-3.5" />
            Lời thoại
          </button>
        </div>
      </div>

      {/* Collapsible clickable transcript */}
      {showScript && (
        <div className="max-h-72 overflow-y-auto rounded-lg border border-line bg-background/60 p-1.5">
          <div className="flex flex-col gap-0.5">
            {cues.map((c, idx) => {
              const active = idx === activeCueIdx;
              return (
                <button
                  key={`${c.start_ms}-${idx}`}
                  ref={active ? activeRowRef : undefined}
                  type="button"
                  onClick={() => seekToCue(idx)}
                  className={`flex items-start gap-2.5 rounded-md px-2.5 py-2 text-left text-xs transition-colors ${
                    active ? "bg-sec-soft text-foreground" : "text-muted hover:bg-card-2/70 hover:text-foreground"
                  }`}
                >
                  <span className="mt-0.5 shrink-0 font-mono text-[11px] tabular-nums opacity-75">
                    {formatTime(c.start_ms / 1000)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block leading-snug ${active ? "font-semibold text-foreground" : "text-foreground/90"}`}>
                      {c.pending ? <span className="italic text-muted">Đang dịch…</span> : c.text}
                    </span>
                    {showOrig && c.orig && <span className="mt-0.5 block text-[11px] text-muted">{c.orig}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
