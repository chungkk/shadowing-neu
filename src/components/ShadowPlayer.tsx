"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { formatTime, mergeIntoSentences, toSrt, type Segment } from "@/lib/subtitles";
import type { PlayerHandle } from "@/lib/player";
import { useRecorder } from "@/hooks/useRecorder";
import YouTubePlayer from "./YouTubePlayer";
import LocalPlayer from "./LocalPlayer";

export type Media =
  | { kind: "youtube"; videoId: string }
  | { kind: "local"; src: string; isVideo: boolean };

type Settings = {
  mode: "segment" | "free"; // dừng sau mỗi câu | phát liên tục
  rate: number;
  repeat: number; // số lần phát mỗi câu
  gapFactor: number; // thời gian nghỉ để nói lại = gapFactor × độ dài câu
  autoNext: boolean;
  autoRecord: boolean; // tự ghi âm trong lúc nghỉ
  hideText: boolean;
  merge: boolean; // gộp dòng thành câu
};

const DEFAULTS: Settings = {
  mode: "segment",
  rate: 1,
  repeat: 1,
  gapFactor: 1.2,
  autoNext: false,
  autoRecord: false,
  hideText: false,
  merge: true,
};

const SETTINGS_KEY = "shadow-settings";

function loadSettings(): Settings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") };
  } catch {
    return DEFAULTS;
  }
}

export default function ShadowPlayer({
  title,
  media,
  segments: rawSegments,
  backHref = "/",
  onBack,
  children,
}: {
  title: string;
  media: Media;
  segments: Segment[];
  backHref?: string;
  onBack?: () => void; // nếu có thì dùng thay cho backHref
  children?: ReactNode; // thông tin thêm hiển thị dưới tiêu đề
}) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const segments = useMemo(
    () => (settings.merge ? mergeIntoSentences(rawSegments) : rawSegments),
    [rawSegments, settings.merge],
  );
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [gap, setGap] = useState<{ ms: number; id: number } | null>(null);
  const recorder = useRecorder();

  const handleRef = useRef<PlayerHandle | null>(null);
  const stopAtRef = useRef<number | null>(null);
  const repeatCountRef = useRef(0);
  const gapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Ref luôn giữ giá trị mới nhất để dùng trong interval/timer
  const live = useRef({ settings, segments, idx, recorder });
  useEffect(() => {
    live.current = { settings, segments, idx, recorder };
  });

  const update = (patch: Partial<Settings>) => {
    setSettings((s) => {
      const next = { ...s, ...patch };
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const clearGap = useCallback(() => {
    if (gapTimerRef.current) clearTimeout(gapTimerRef.current);
    gapTimerRef.current = null;
    setGap(null);
  }, []);

  const playSegment = useCallback(
    (i: number) => {
      const h = handleRef.current;
      const { segments, settings } = live.current;
      const s = segments[i];
      if (!h || !s) return;
      clearGap();
      setIdx(i);
      live.current.idx = i;
      h.setRate(settings.rate);
      h.seek(s.start);
      h.play();
      stopAtRef.current = settings.mode === "free" ? null : s.end;
      setPlaying(true);
    },
    [clearGap],
  );

  /** Người dùng chủ động chọn câu → reset bộ đếm lặp */
  const go = useCallback(
    (i: number) => {
      repeatCountRef.current = 0;
      playSegment(i);
    },
    [playSegment],
  );

  const pause = useCallback(() => {
    handleRef.current?.pause();
    stopAtRef.current = null;
    clearGap();
    setPlaying(false);
  }, [clearGap]);

  // Khi một câu phát xong: lặp lại / nghỉ để nói / sang câu tiếp
  const onSegmentEnd = useCallback(() => {
    const { settings, segments, idx, recorder } = live.current;
    const s = segments[idx];
    const gapMs = settings.gapFactor > 0 ? ((s.end - s.start) / settings.rate) * settings.gapFactor * 1000 + 300 : 0;

    let target: number | null = null;
    if (repeatCountRef.current + 1 < settings.repeat) {
      repeatCountRef.current++;
      target = idx;
    } else if (settings.autoNext && idx + 1 < segments.length) {
      repeatCountRef.current = 0;
      target = idx + 1;
    }

    if (!gapMs) {
      if (target !== null) playSegment(target);
      return;
    }
    if (settings.autoRecord) void recorder.start(idx);
    if (target === null && !settings.autoRecord) return;

    const id = Date.now();
    setGap({ ms: gapMs, id });
    gapTimerRef.current = setTimeout(() => {
      setGap(null);
      if (settings.autoRecord) live.current.recorder.stop();
      if (target !== null) playSegment(target);
    }, gapMs);
  }, [playSegment]);

  // Theo dõi thời gian phát
  useEffect(() => {
    const timer = setInterval(() => {
      const h = handleRef.current;
      if (!h) return;
      const t = h.getTime();
      const { settings, segments, idx } = live.current;
      if (stopAtRef.current !== null) {
        if (t >= stopAtRef.current - 0.03) {
          h.pause();
          stopAtRef.current = null;
          setPlaying(false);
          onSegmentEnd();
        }
      } else if (settings.mode === "free") {
        let i = segments.findIndex((s, k) => t >= s.start && t < (segments[k + 1]?.start ?? Infinity));
        if (i === -1) i = 0;
        if (i !== idx) setIdx(i);
      }
    }, 40);
    return () => clearInterval(timer);
  }, [onSegmentEnd]);

  useEffect(() => clearGap, [clearGap]);

  // Cuộn danh sách tới câu đang học
  useEffect(() => {
    const list = listRef.current;
    const el = list?.querySelector<HTMLElement>(`[data-idx="${idx}"]`);
    if (list && el) list.scrollTo({ top: el.offsetTop - list.clientHeight / 2 + el.clientHeight / 2, behavior: "smooth" });
  }, [idx]);

  // Phím tắt
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, select, textarea")) return;
      const { idx, segments, recorder } = live.current;
      if (e.code === "Space") {
        e.preventDefault();
        if (playing) pause();
        else go(idx);
      } else if (e.key === "ArrowLeft") go(Math.max(0, idx - 1));
      else if (e.key === "ArrowRight") go(Math.min(segments.length - 1, idx + 1));
      else if (e.key === "r" || e.key === "R") {
        if (recorder.recordingKey !== null) recorder.stop();
        else void recorder.start(idx);
      } else if (e.key === "p" || e.key === "P") recorder.play(idx);
      else if (e.key === "h" || e.key === "H") update({ hideText: !live.current.settings.hideText });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, pause, go]);

  const onReady = useCallback((h: PlayerHandle) => {
    handleRef.current = h;
  }, []);

  const current = segments[idx];
  const isRecording = recorder.recordingKey !== null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4">
      <div className="flex items-center gap-3">
        {onBack ? (
          <button onClick={onBack} className="btn shrink-0">
            ← Quay lại
          </button>
        ) : (
          <Link href={backHref} className="btn shrink-0">
            ← Quay lại
          </Link>
        )}
        <h1 className="flex-1 truncate text-lg font-semibold">{title}</h1>
        <button className="btn shrink-0" onClick={() => downloadSrt(title, rawSegments)} title="Tải phụ đề .srt">
          ⬇ .srt
        </button>
      </div>
      {children}

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        {/* Cột trái: player + câu hiện tại + điều khiển */}
        <div className="flex flex-col gap-4">
          {media.kind === "youtube" ? (
            <YouTubePlayer videoId={media.videoId} onReady={onReady} />
          ) : (
            <LocalPlayer src={media.src} isVideo={media.isVideo} onReady={onReady} />
          )}

          <div className="card flex min-h-32 flex-col items-center justify-center gap-2 text-center">
            <div className="text-xs text-muted">
              Câu {idx + 1}/{segments.length}
              {current && ` · ${formatTime(current.start)}`}
            </div>
            {current && (
              <p
                className={`text-2xl leading-relaxed font-medium transition ${
                  settings.hideText ? "cursor-pointer blur-md select-none hover:blur-none" : ""
                }`}
                title={settings.hideText ? "Di chuột để xem" : undefined}
              >
                {current.text.split(" ").map((w, k) => (
                  <a
                    key={k}
                    href={`https://www.dict.cc/?s=${encodeURIComponent(w.replace(/[^\p{L}\p{N}-]/gu, ""))}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded px-0.5 hover:bg-accent/15"
                  >
                    {w}{" "}
                  </a>
                ))}
              </p>
            )}
            {current && (
              <a
                className="text-xs text-muted underline"
                target="_blank"
                rel="noreferrer"
                href={`https://translate.google.com/?sl=de&tl=vi&text=${encodeURIComponent(current.text)}`}
              >
                Dịch câu này
              </a>
            )}
            <div className="h-1.5 w-full max-w-md overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
              {gap && (
                <div
                  key={gap.id}
                  className="gap-bar h-full bg-accent"
                  style={{ animationDuration: `${gap.ms}ms` }}
                />
              )}
            </div>
            <div className="h-4 text-xs text-accent">
              {gap ? (isRecording ? "🎙 Đến lượt bạn — đang ghi âm…" : "🗣 Đến lượt bạn nói…") : ""}
            </div>
          </div>

          {/* Nút điều khiển chính */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button className="btn" onClick={() => go(Math.max(0, idx - 1))}>
              ⏮ Trước
            </button>
            <button className="btn btn-primary min-w-28" onClick={() => (playing ? pause() : go(idx))}>
              {playing ? "⏸ Dừng" : "▶ Phát câu"}
            </button>
            <button className="btn" onClick={() => go(Math.min(segments.length - 1, idx + 1))}>
              Sau ⏭
            </button>
            <button
              className={`btn ${isRecording ? "border-red-500 text-red-600" : ""}`}
              onClick={() => (isRecording ? recorder.stop() : recorder.start(idx))}
            >
              {isRecording ? "⏹ Dừng ghi" : "🎙 Ghi âm"}
            </button>
            <button className="btn" disabled={!recorder.recordings[idx]} onClick={() => recorder.play(idx)}>
              🔊 Nghe lại
            </button>
          </div>

          {/* Cài đặt */}
          <div className="card grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <label className="field">
              Chế độ
              <select value={settings.mode} onChange={(e) => update({ mode: e.target.value as Settings["mode"] })}>
                <option value="segment">Từng câu</option>
                <option value="free">Liên tục</option>
              </select>
            </label>
            <label className="field">
              Tốc độ
              <select
                value={settings.rate}
                onChange={(e) => {
                  update({ rate: Number(e.target.value) });
                  handleRef.current?.setRate(Number(e.target.value));
                }}
              >
                {[0.5, 0.75, 0.85, 1, 1.25].map((r) => (
                  <option key={r} value={r}>
                    {r}×
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Lặp mỗi câu
              <select value={settings.repeat} onChange={(e) => update({ repeat: Number(e.target.value) })}>
                {[1, 2, 3, 5].map((r) => (
                  <option key={r} value={r}>
                    {r} lần
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Nghỉ để nói
              <select value={settings.gapFactor} onChange={(e) => update({ gapFactor: Number(e.target.value) })}>
                <option value={0}>Không</option>
                <option value={1}>1× độ dài câu</option>
                <option value={1.2}>1.2×</option>
                <option value={1.5}>1.5×</option>
                <option value={2}>2×</option>
              </select>
            </label>
            <label className="check">
              <input type="checkbox" checked={settings.autoNext} onChange={(e) => update({ autoNext: e.target.checked })} />
              Tự sang câu tiếp
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={settings.autoRecord}
                onChange={(e) => update({ autoRecord: e.target.checked })}
              />
              Tự ghi âm khi nghỉ
            </label>
            <label className="check">
              <input type="checkbox" checked={settings.hideText} onChange={(e) => update({ hideText: e.target.checked })} />
              Ẩn chữ (H)
            </label>
            <label className="check">
              <input type="checkbox" checked={settings.merge} onChange={(e) => {
                  // Danh sách câu thay đổi → dừng và về câu đầu
                  pause();
                  setIdx(0);
                  update({ merge: e.target.checked });
                }}
              />
              Gộp thành câu
            </label>
          </div>

          <p className="text-center text-xs text-muted">
            Phím tắt: <kbd>Space</kbd> phát/dừng · <kbd>←</kbd> <kbd>→</kbd> câu trước/sau · <kbd>R</kbd> ghi âm ·{" "}
            <kbd>P</kbd> nghe lại · <kbd>H</kbd> ẩn chữ. Nên đeo tai nghe khi ghi âm.
          </p>
        </div>

        {/* Cột phải: toàn bộ transcript */}
        <div ref={listRef} className="card relative max-h-[75vh] overflow-y-auto p-1">
          {segments.map((s, i) => (
            <div
              key={i}
              data-idx={i}
              onClick={() => go(i)}
              className={`group flex cursor-pointer gap-2 rounded-md px-2 py-1.5 text-sm ${
                i === idx ? "bg-accent/15" : "hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >
              <span className="w-10 shrink-0 pt-0.5 font-mono text-xs text-muted">{formatTime(s.start)}</span>
              <span className={`flex-1 ${settings.hideText && i === idx ? "blur-sm" : ""}`}>{s.text}</span>
              {recorder.recordings[i] && (
                <button
                  title="Nghe bản ghi của bạn"
                  onClick={(e) => {
                    e.stopPropagation();
                    recorder.play(i);
                  }}
                >
                  🔊
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function downloadSrt(title: string, segments: Segment[]) {
  const url = URL.createObjectURL(new Blob([toSrt(segments)], { type: "text/plain" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: `${title}.srt` });
  a.click();
  URL.revokeObjectURL(url);
}
