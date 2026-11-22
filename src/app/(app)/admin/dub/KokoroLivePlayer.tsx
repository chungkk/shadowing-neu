"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { ensureKokoroLoaded, synthesizeKokoro, type KokoroProgress } from "@/lib/kokoro-vi/engine";

export type LiveCue = { start_ms: number; end_ms: number; text: string };

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

export default function KokoroLivePlayer({
  videoId,
  title,
  cues,
  initialVoice = 1,
  initialSpeed = 1.15,
  initialOrigVol = 25,
}: {
  videoId: string;
  title: string;
  cues: LiveCue[];
  initialVoice?: 0 | 1; // 0 = Diễm Trinh (nữ), 1 = Đức Duy (nam)
  initialSpeed?: number;
  initialOrigVol?: number;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const ytRef = useRef<YTPlayerEx | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const activeSrcRef = useRef<AudioBufferSourceNode | null>(null);
  const audioEndAtRef = useRef<number>(0); // AudioContext time when current cue ends
  const bufCacheRef = useRef<Map<string, AudioBuffer>>(new Map());
  const inflightRef = useRef<Map<string, Promise<AudioBuffer | null>>>(new Map());
  const lastSpokenIdxRef = useRef<number>(-1);
  const lastYtTimeRef = useRef<number>(0);

  const [ytReady, setYtReady] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [progress, setProgress] = useState<KokoroProgress>({ stage: "Đang khởi tạo Kokoro Lite…", pct: 0 });
  const [modelErr, setModelErr] = useState("");

  const [playing, setPlaying] = useState(false);
  const [voiceIdx, setVoiceIdx] = useState<0 | 1>(initialVoice);
  const [speed, setSpeed] = useState(initialSpeed);
  const [origVol, setOrigVol] = useState(initialOrigVol);
  const [dubVol, setDubVol] = useState(110);
  const [dubMuted, setDubMuted] = useState(false);
  const [caption, setCaption] = useState("");
  const [lastSynthMs, setLastSynthMs] = useState<number | null>(null);

  const stateRef = useRef({ voiceIdx, speed, origVol, dubVol, dubMuted, modelReady, cues });
  useEffect(() => {
    stateRef.current = { voiceIdx, speed, origVol, dubVol, dubMuted, modelReady, cues };
  });

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
    async (cueIndex: number, vIdx: 0 | 1, spd: number): Promise<AudioBuffer | null> => {
      const cue = stateRef.current.cues[cueIndex];
      if (!cue || !stateRef.current.modelReady) return null;
      const key = `${vIdx}:${spd.toFixed(2)}:${cueIndex}`;
      const hit = bufCacheRef.current.get(key);
      if (hit) return hit;

      const existing = inflightRef.current.get(key);
      if (existing) return existing;

      const p = synthesizeKokoro(cue.text, vIdx, spd)
        .then(({ pcm, sampleRate, synthMs }) => {
          setLastSynthMs(synthMs);
          if (!pcm.length) return null;
          const ctx = getAudioCtx();
          const buf = ctx.createBuffer(1, pcm.length, sampleRate);
          buf.getChannelData(0).set(pcm);
          bufCacheRef.current.set(key, buf);
          return buf;
        })
        .catch(() => null)
        .finally(() => {
          inflightRef.current.delete(key);
        });
      inflightRef.current.set(key, p);
      return p;
    },
    [getAudioCtx],
  );

  // Load Kokoro-Vietnamese-Lite model in browser (cached in Cache API after 1st load)
  useEffect(() => {
    let active = true;
    ensureKokoroLoaded((p) => {
      if (active) setProgress(p);
    })
      .then(() => {
        if (active) {
          setModelReady(true);
          // Warm up first 3 cues immediately so Play starts with 0ms delay!
          stateRef.current.modelReady = true;
          for (let k = 0; k < Math.min(3, cues.length); k++) {
            void getCueBuffer(k, stateRef.current.voiceIdx, stateRef.current.speed);
          }
        }
      })
      .catch((e) => {
        if (active) setModelErr((e as Error).message);
      });
    return () => {
      active = false;
    };
  }, [cues.length, getCueBuffer]);

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
      const { voiceIdx: vIdx, speed: spd, cues: list } = stateRef.current;
      const yt = ytRef.current;
      if (!yt || yt.getPlayerState?.() !== 1) return;

      // Prefetch next 4 cues ahead in background
      for (let k = cueIndex + 1; k <= Math.min(list.length - 1, cueIndex + 4); k++) {
        void getCueBuffer(k, vIdx, spd);
      }

      const buf = await getCueBuffer(cueIndex, vIdx, spd);
      if (!buf) return;
      // Re-check player is still playing and hasn't jumped elsewhere
      if (!ytRef.current || ytRef.current.getPlayerState?.() !== 1) return;
      if (lastSpokenIdxRef.current !== cueIndex) return;

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
      const { modelReady: ready, cues: list } = stateRef.current;
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

      // Find cue covering current time (or just started)
      let curIdx = -1;
      for (let i = 0; i < list.length; i++) {
        const c = list[i];
        const nextStart = list[i + 1]?.start_ms ?? c.end_ms + 5000;
        if (tMs >= c.start_ms - 120 && tMs < Math.min(nextStart - 60, c.end_ms + 800)) {
          curIdx = i;
          break;
        }
      }

      if (curIdx !== -1) {
        setCaption(list[curIdx].text);
        if (curIdx !== lastSpokenIdxRef.current) {
          // If seeking into the middle of a cue (>2.5s late), only play if cue still has >1s left
          const lateMs = tMs - list[curIdx].start_ms;
          const remainingMs = list[curIdx].end_ms - tMs;
          if (!jumped || lateMs < 2500 || remainingMs > 1200) {
            lastSpokenIdxRef.current = curIdx;
            void speakCue(curIdx, jumped);
          }
        }
      } else {
        setCaption("");
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
    yt.seekTo(0, true);
    yt.playVideo();
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted">
            🚀 Kokoro Lite trên trình duyệt (0đ server · {cues.length} câu)
            {lastSynthMs !== null ? ` · tạo câu trong ${lastSynthMs}ms` : ""}
          </p>
        </div>
        <select
          className="input h-8 w-auto py-1 text-xs text-foreground"
          value={voiceIdx}
          onChange={(e) => {
            stopSpeech();
            lastSpokenIdxRef.current = -1;
            setVoiceIdx(Number(e.target.value) === 0 ? 0 : 1);
          }}
          aria-label="Giọng Kokoro"
        >
          <option value={1}>Đức Duy (Nam)</option>
          <option value={0}>Diễm Trinh (Nữ)</option>
        </select>
      </div>

      {/* Model download / init progress (1-time, cached in browser) */}
      {!modelReady && !modelErr && (
        <div className="space-y-1.5 rounded-lg border border-line bg-card-2/60 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1.5 text-foreground">
              <Loader2 className="size-3.5 animate-spin text-accent" />
              {progress.stage}
            </span>
            <span className="font-mono text-muted">{progress.pct}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-card">
            <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${Math.max(5, progress.pct)}%` }} />
          </div>
        </div>
      )}

      {modelErr && (
        <p role="alert" className="alert alert-err text-xs">
          Lỗi nạp Kokoro Lite trên trình duyệt: {modelErr}
        </p>
      )}

      <div
        ref={hostRef}
        className="aspect-video w-full overflow-hidden rounded-lg bg-black [&_iframe]:h-full [&_iframe]:w-full"
      />

      {/* Live Vietnamese caption */}
      <div className="min-h-11 rounded-lg bg-card-2/80 px-4 py-2.5 text-center text-sm font-medium text-foreground">
        {caption || (
          <span className="text-xs text-muted">
            {modelReady ? "Bấm “Phát” để nghe thuyết minh trực tiếp (tua thoải mái, tự bắt nhịp ~0.5s)" : "Đang nạp model giọng đọc…"}
          </span>
        )}
      </div>

      {/* Compact controls */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <button type="button" className="btn btn-sm btn-primary" disabled={!ytReady || !modelReady} onClick={togglePlay}>
          {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
          {playing ? "Tạm dừng" : "Phát"}
        </button>
        <button type="button" className="btn btn-sm" disabled={!ytReady || !modelReady} onClick={restart} title="Từ đầu">
          <RotateCcw className="size-3.5" />
        </button>

        <label className="flex items-center gap-1.5 text-muted">
          <span>Gốc {origVol}%</span>
          <input type="range" min={0} max={100} step={5} value={origVol} onChange={(e) => setOrigVol(Number(e.target.value))} className="w-20" />
        </label>

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
            className="w-20"
          />
        </label>

        <label className="ml-auto flex items-center gap-1.5 text-muted">
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
      </div>
    </div>
  );
}
