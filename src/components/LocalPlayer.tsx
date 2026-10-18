"use client";

import { useEffect, useRef } from "react";
import type { PlayerHandle } from "@/lib/player";

export default function LocalPlayer({
  src,
  isVideo,
  onReady,
}: {
  src: string;
  isVideo: boolean;
  onReady: (handle: PlayerHandle) => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    onReadyRef.current({
      play: () => void el.play(),
      pause: () => el.pause(),
      seek: (t) => (el.currentTime = t),
      getTime: () => el.currentTime,
      setRate: (r) => (el.playbackRate = r),
    });
  }, [src]);

  return (
    <video
      ref={ref}
      src={src}
      controls
      playsInline
      className={isVideo ? "aspect-video w-full rounded-lg bg-black" : "h-14 w-full"}
    />
  );
}
