"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";

type DubCue = { start_ms: number; end_ms: number; text: string };

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

let ytApiPromise: Promise<void> | null = null;
function loadYouTubeIframeApi(): Promise<void> {
  const w = window as unknown as {
    YT?: { Player?: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayerEx };
    onYouTubeIframeAPIReady?: () => void;
  };
  if (w.YT?.Player) return Promise.resolve();
  ytApiPromise ??= new Promise((resolve) => {
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
  return ytApiPromise;
}

export default function SyncedPlayer({
  jobId,
  videoId,
  initialOrigVol = 25,
}: {
  jobId: string;
  videoId: string;
  initialOrigVol?: number;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const ytRef = useRef<YTPlayerEx | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [origVol, setOrigVol] = useState(initialOrigVol);
  const [dubVol, setDubVol] = useState(100);
  const [dubMuted, setDubMuted] = useState(false);
  const [offsetMs, setOffsetMs] = useState(0);
  const [cues, setCues] = useState<DubCue[]>([]);
  const [caption, setCaption] = useState("");
  const [audioErr, setAudioErr] = useState("");

  const origVolRef = useRef(origVol);
  const offsetRef = useRef(offsetMs);
  const cuesRef = useRef(cues);
  useEffect(() => {
    origVolRef.current = origVol;
    offsetRef.current = offsetMs;
    cuesRef.current = cues;
  });

  // Load Vietnamese cues for live caption display under video
  useEffect(() => {
    let active = true;
    fetch(`/api/v1/admin/dub/jobs/${jobId}/download?type=cues`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active && Array.isArray(d?.cues)) setCues(d.cues);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [jobId]);

  // Apply volume changes immediately
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
    const a = audioRef.current;
    if (a) {
      a.volume = dubMuted ? 0 : Math.min(1, Math.max(0, dubVol / 100));
    }
  }, [dubVol, dubMuted]);

  // Mount YouTube IFrame Player and wire state sync to <audio>
  useEffect(() => {
    let cancelled = false;
    let player: YTPlayerEx | null = null;
    const host = hostRef.current;
    const audioEl = audioRef.current;
    if (!host) return;
    const el = document.createElement("div");
    host.appendChild(el);

    loadYouTubeIframeApi().then(() => {
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
            if (origVolRef.current <= 0) player.mute();
            else {
              player.unMute();
              player.setVolume(origVolRef.current);
            }
            setReady(true);
          },
          onStateChange: (ev: { data: number }) => {
            const a = audioRef.current;
            if (!player || !a) return;
            if (ev.data === 1) {
              // PLAYING
              setPlaying(true);
              const target = Math.max(0, (player.getCurrentTime() || 0) + offsetRef.current / 1000);
              if (Math.abs(a.currentTime - target) > 0.25) a.currentTime = target;
              a.playbackRate = player.getPlaybackRate() || 1;
              a.play().catch((err) => {
                setAudioErr(err instanceof Error ? err.message : "Trình duyệt chặn tự phát audio — bấm nút Phát đồng bộ bên dưới.");
              });
            } else {
              // PAUSED (2), BUFFERING (3), ENDED (0)
              setPlaying(false);
              a.pause();
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      ytRef.current = null;
      audioEl?.pause();
      player?.destroy();
      el.remove();
    };
  }, [videoId]);

  // Continuous drift & caption sync every 200ms while playing
  useEffect(() => {
    const timer = setInterval(() => {
      const yt = ytRef.current;
      const a = audioRef.current;
      if (!yt || !a) return;
      const t = yt.getCurrentTime?.() ?? 0;
      const tMs = t * 1000;
      const list = cuesRef.current;
      if (list.length) {
        const cur = list.find((c) => tMs >= c.start_ms - 100 && tMs <= c.end_ms + 400);
        setCaption(cur?.text ?? "");
      }
      if (yt.getPlayerState?.() === 1) {
        const target = Math.max(0, t + offsetRef.current / 1000);
        const rate = yt.getPlaybackRate?.() || 1;
        if (Math.abs(a.playbackRate - rate) > 0.01) a.playbackRate = rate;
        if (Math.abs(a.currentTime - target) > 0.28) a.currentTime = target;
        if (a.paused && a.readyState >= 2) {
          a.play().catch(() => {});
        }
      }
    }, 200);
    return () => clearInterval(timer);
  }, []);

  const toggleSyncPlay = () => {
    const yt = ytRef.current;
    const a = audioRef.current;
    if (!yt || !a) return;
    setAudioErr("");
    if (playing) {
      yt.pauseVideo();
      a.pause();
    } else {
      const target = Math.max(0, (yt.getCurrentTime() || 0) + offsetMs / 1000);
      a.currentTime = target;
      a.volume = dubMuted ? 0 : Math.min(1, Math.max(0, dubVol / 100));
      a.play().catch(() => {});
      yt.playVideo();
    }
  };

  const restart = () => {
    const yt = ytRef.current;
    const a = audioRef.current;
    if (!yt || !a) return;
    yt.seekTo(0, true);
    a.currentTime = 0;
    a.play().catch(() => {});
    yt.playVideo();
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div
        ref={hostRef}
        className="aspect-video w-full overflow-hidden rounded-lg bg-black [&_iframe]:h-full [&_iframe]:w-full"
      />

      {/* Live Vietnamese caption */}
      <div className="min-h-11 rounded-lg bg-card-2/80 px-4 py-2.5 text-center text-sm font-medium text-foreground">
        {caption || <span className="text-xs text-muted">Bấm “Phát” để xem YouTube song song với giọng thuyết minh</span>}
      </div>

      <audio
        ref={audioRef}
        preload="auto"
        src={`/api/v1/admin/dub/jobs/${jobId}/download?type=mp3`}
        onError={() => setAudioErr("Không nạp được file MP3 thuyết minh.")}
      />

      {audioErr && <p className="text-xs text-amber">{audioErr}</p>}

      {/* Compact single-row controls */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <button type="button" className="btn btn-sm btn-primary" disabled={!ready} onClick={toggleSyncPlay}>
          {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
          {playing ? "Tạm dừng" : "Phát"}
        </button>
        <button type="button" className="btn btn-sm" disabled={!ready} onClick={restart} title="Từ đầu">
          <RotateCcw className="size-3.5" />
        </button>

        <label className="flex items-center gap-1.5 text-muted">
          <span>Gốc {origVol}%</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={origVol}
            onChange={(e) => setOrigVol(Number(e.target.value))}
            className="w-20"
          />
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
            max={100}
            step={5}
            value={dubVol}
            onChange={(e) => {
              setDubMuted(false);
              setDubVol(Number(e.target.value));
            }}
            className="w-20"
          />
        </label>

        <label className="ml-auto flex items-center gap-1.5 text-muted" title="Chỉnh độ trễ audio">
          <span>{offsetMs >= 0 ? `+${offsetMs}` : offsetMs}ms</span>
          <input
            type="range"
            min={-1000}
            max={1000}
            step={100}
            value={offsetMs}
            onChange={(e) => setOffsetMs(Number(e.target.value))}
            className="w-16"
          />
        </label>
      </div>
    </div>
  );
}
