"use client";

import { useEffect, useRef } from "react";
import type { PlayerHandle } from "@/lib/player";

type YTPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(s: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  setPlaybackRate(r: number): void;
  destroy(): void;
};

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement,
        opts: {
          videoId: string;
          playerVars?: Record<string, number | string>;
          events?: { onReady?: () => void };
        },
      ) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  apiPromise ??= new Promise((resolve) => {
    window.onYouTubeIframeAPIReady = () => resolve();
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(s);
  });
  return apiPromise;
}

export default function YouTubePlayer({
  videoId,
  onReady,
}: {
  videoId: string;
  onReady: (handle: PlayerHandle) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  });

  useEffect(() => {
    let player: YTPlayer | null = null;
    let cancelled = false;
    const el = document.createElement("div");
    hostRef.current?.appendChild(el);

    loadYouTubeApi().then(() => {
      if (cancelled || !window.YT) return;
      player = new window.YT.Player(el, {
        videoId,
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1, cc_load_policy: 0 },
        events: {
          onReady: () => {
            const p = player!;
            onReadyRef.current({
              play: () => p.playVideo(),
              pause: () => p.pauseVideo(),
              seek: (t) => p.seekTo(t, true),
              getTime: () => p.getCurrentTime() ?? 0,
              setRate: (r) => p.setPlaybackRate(r),
            });
          },
        },
      });
    });

    return () => {
      cancelled = true;
      player?.destroy();
      el.remove();
    };
  }, [videoId]);

  return (
    <div
      ref={hostRef}
      className="aspect-video w-full overflow-hidden rounded-lg bg-black [&_iframe]:h-full [&_iframe]:w-full"
    />
  );
}
