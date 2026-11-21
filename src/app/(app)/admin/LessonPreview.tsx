"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, X } from "lucide-react";
import type { PlayerHandle } from "@/lib/player";
import type { Segment } from "@/lib/subtitles";
import YouTubePlayer from "@/components/YouTubePlayer";

const RATES = [0.75, 1, 1.25] as const;

/** "0:04.2" (chính xác 0.1 giây để admin kiểm tra điểm cắt câu) */
function formatPrecise(t: number): string {
  const tenths = Math.max(0, Math.round(t * 10));
  const sec = Math.floor(tenths / 10);
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}.${tenths % 10}`;
}

export function useLessonPreview(videoId: string | null, sentences: Segment[]) {
  const [open, setOpen] = useState(false);
  const [readyFor, setReadyFor] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [stopEach, setStopEach] = useState(true);
  const [rate, setRate] = useState<number>(1);

  const handleRef = useRef<PlayerHandle | null>(null);
  const stopAtRef = useRef<number | null>(null);
  const armAtRef = useRef<{ start: number; since: number } | null>(null);
  const pendingIdxRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const safeIdx = sentences.length ? Math.min(activeIdx, sentences.length - 1) : 0;
  const ready = open && !!videoId && readyFor === videoId;

  const live = useRef({ sentences, safeIdx, stopEach, rate });
  useEffect(() => {
    live.current = { sentences, safeIdx, stopEach, rate };
  });

  // Đổi videoId → huỷ handle cũ (YouTubePlayer tự dựng lại theo videoId)
  useEffect(() => {
    handleRef.current = null;
    stopAtRef.current = null;
    armAtRef.current = null;
  }, [videoId]);

  const startAt = useCallback((h: PlayerHandle, i: number) => {
    const s = live.current.sentences[i];
    if (!s) return;
    setActiveIdx(i);
    live.current.safeIdx = i;
    h.setRate(live.current.rate);
    h.seek(s.start);
    h.play();
    armAtRef.current = { start: s.start, since: Date.now() };
    stopAtRef.current = live.current.stopEach ? s.end : null;
    setPlaying(true);
  }, []);

  const onReady = useCallback(
    (h: PlayerHandle) => {
      handleRef.current = h;
      setReadyFor(videoId);
      const pending = pendingIdxRef.current;
      if (pending !== null) {
        pendingIdxRef.current = null;
        startAt(h, pending);
      }
    },
    [videoId, startAt],
  );

  const pause = useCallback(() => {
    handleRef.current?.pause();
    stopAtRef.current = null;
    pendingIdxRef.current = null;
    setPlaying(false);
  }, []);

  const playSentence = useCallback(
    (i: number) => {
      if (!videoId || !live.current.sentences[i]) return;
      const h = handleRef.current;
      if (!open || !h) {
        pendingIdxRef.current = i;
        setActiveIdx(i);
        setOpen(true);
        return;
      }
      pendingIdxRef.current = null;
      startAt(h, i);
    },
    [videoId, open, startAt],
  );

  const toggleSentence = useCallback(
    (i: number) => {
      if (open && playing && live.current.safeIdx === i) pause();
      else playSentence(i);
    },
    [open, playing, pause, playSentence],
  );

  const close = useCallback(() => {
    handleRef.current?.pause();
    handleRef.current = null;
    stopAtRef.current = null;
    armAtRef.current = null;
    pendingIdxRef.current = null;
    setPlaying(false);
    setReadyFor(null);
    setOpen(false);
  }, []);

  const toggleOpen = useCallback(() => {
    if (open) close();
    else if (videoId) setOpen(true);
  }, [open, videoId, close]);

  const toggleStopEach = useCallback(() => {
    setStopEach((prev) => {
      const next = !prev;
      if (playing) stopAtRef.current = next ? (live.current.sentences[live.current.safeIdx]?.end ?? null) : null;
      return next;
    });
  }, [playing]);

  const cycleRate = useCallback(() => {
    setRate((prev) => {
      const next = RATES[(RATES.indexOf(prev as (typeof RATES)[number]) + 1) % RATES.length];
      handleRef.current?.setRate(next);
      return next;
    });
  }, []);

  // Theo dõi mốc thời gian phát: tự dừng cuối câu (khi bật "Dừng mỗi câu") hoặc tô sáng câu đang phát
  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => {
      const h = handleRef.current;
      if (!h) return;
      const t = h.getTime();
      const { sentences, safeIdx, stopEach } = live.current;
      const arm = armAtRef.current;
      if (arm) {
        if (t >= arm.start - 0.5 && (stopAtRef.current === null || t < stopAtRef.current - 0.03)) armAtRef.current = null;
        else if (Date.now() - arm.since > 3000) armAtRef.current = null;
        else return;
      }
      if (stopAtRef.current !== null) {
        if (t >= stopAtRef.current - 0.03) {
          h.pause();
          stopAtRef.current = null;
          setPlaying(false);
        }
      } else if (sentences.length && (!stopEach || Math.abs(t - lastTimeRef.current) > 0.05)) {
        if (Math.abs(t - lastTimeRef.current) > 0.02) {
          let i = sentences.findIndex((s, k) => t >= s.start && t < (sentences[k + 1]?.start ?? Infinity));
          if (i === -1) i = 0;
          if (i !== safeIdx) setActiveIdx(i);
        }
      }
      lastTimeRef.current = t;
    }, 40);
    return () => clearInterval(timer);
  }, [open]);

  return {
    open: open && !!videoId,
    ready,
    playing: playing && ready,
    activeIdx: safeIdx,
    stopEach,
    rate,
    onReady,
    pause,
    playSentence,
    toggleSentence,
    toggleOpen,
    close,
    toggleStopEach,
    cycleRate,
  };
}

export function LessonPreviewPanel({
  videoId,
  sentences,
  preview,
}: {
  videoId: string;
  sentences: Segment[];
  preview: ReturnType<typeof useLessonPreview>;
}) {
  const cur = sentences[preview.activeIdx];
  const hasSentences = sentences.length > 0;

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-background/60 p-3">
      <div className="mx-auto w-full max-w-xl">
        <YouTubePlayer key={videoId} videoId={videoId} onReady={preview.onReady} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {hasSentences && (
            <>
              <button
                type="button"
                className="btn btn-sm px-2"
                title="Câu trước"
                disabled={preview.activeIdx <= 0}
                onClick={() => preview.playSentence(preview.activeIdx - 1)}
              >
                <ChevronLeft className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => (preview.playing ? preview.pause() : preview.playSentence(preview.activeIdx))}
              >
                {preview.playing ? <Pause className="size-3.5" aria-hidden /> : <Play className="size-3.5" aria-hidden />}
                {preview.playing ? "Tạm dừng" : preview.ready ? "Nghe câu này" : "Đang tải…"}
              </button>
              <button
                type="button"
                className="btn btn-sm px-2"
                title="Phát lại câu này"
                onClick={() => preview.playSentence(preview.activeIdx)}
              >
                <RotateCcw className="size-3.5" aria-hidden />
              </button>
              <button
                type="button"
                className="btn btn-sm px-2"
                title="Câu tiếp"
                disabled={preview.activeIdx >= sentences.length - 1}
                onClick={() => preview.playSentence(preview.activeIdx + 1)}
              >
                <ChevronRight className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                className="chip text-xs"
                aria-pressed={preview.stopEach}
                title="Bật: tự dừng cuối mỗi câu như lúc luyện · Tắt: phát liên tục"
                onClick={preview.toggleStopEach}
              >
                {preview.stopEach ? "Dừng mỗi câu" : "Phát liên tục"}
              </button>
              <button
                type="button"
                className="chip font-mono text-xs tabular-nums"
                title="Đổi tốc độ phát"
                onClick={preview.cycleRate}
              >
                {preview.rate}×
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {cur && (
            <span className="font-mono text-xs text-muted tabular-nums">
              Câu {preview.activeIdx + 1}/{sentences.length} · {formatPrecise(cur.start)} → {formatPrecise(cur.end)}
            </span>
          )}
          <button type="button" className="btn btn-sm px-2" title="Ẩn video nghe thử" onClick={preview.close}>
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>

      {cur && (
        <p className="rounded-lg bg-accent-soft/60 px-3 py-2 text-sm text-foreground">
          {cur.text}
        </p>
      )}
    </div>
  );
}
