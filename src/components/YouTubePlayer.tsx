"use client";

import { useEffect, useRef } from "react";
import type { PlayerHandle } from "@/lib/player";

type YTPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(s: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  setPlaybackRate(r: number): void;
  // Không có trong tài liệu chính thức nhưng chạy được: các module của trình phát (phụ đề = "captions")
  getOptions(): string[];
  unloadModule(name: string): void;
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
          events?: { onReady?: () => void; onApiChange?: () => void };
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

/** Gỡ module phụ đề (người học có bật CC hay YouTube tự bật theo cài đặt tài khoản thì cũng tắt) */
function hideCaptions(p: YTPlayer) {
  const loaded = p.getOptions?.() ?? [];
  for (const m of ["captions", "cc"]) if (loaded.includes(m)) p.unloadModule(m);
}

export default function YouTubePlayer({
  videoId,
  onReady,
  captions = true,
}: {
  videoId: string;
  onReady: (handle: PlayerHandle) => void;
  captions?: boolean; // false → luôn tắt phụ đề YouTube (Chính tả: phụ đề = đáp án)
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const onReadyRef = useRef(onReady);
  const captionsRef = useRef(captions);
  useEffect(() => {
    onReadyRef.current = onReady;
    captionsRef.current = captions;
  });
  // Đổi sang chế độ tắt phụ đề khi trình phát đã chạy
  useEffect(() => {
    if (!captions && playerRef.current) hideCaptions(playerRef.current);
  }, [captions]);

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
            playerRef.current = p;
            if (!captionsRef.current) hideCaptions(p);
            onReadyRef.current({
              play: () => p.playVideo(),
              pause: () => p.pauseVideo(),
              seek: (t) => p.seekTo(t, true),
              getTime: () => p.getCurrentTime() ?? 0,
              setRate: (r) => p.setPlaybackRate(r),
            });
          },
          // Module phụ đề chỉ nạp khi bắt đầu phát / bấm CC → gỡ lại mỗi lần nó nạp
          onApiChange: () => {
            if (player && !captionsRef.current) hideCaptions(player);
          },
        },
      });
    });

    return () => {
      cancelled = true;
      playerRef.current = null;
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
