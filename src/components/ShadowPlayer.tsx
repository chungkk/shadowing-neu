"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  BookmarkCheck,
  BookmarkPlus,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  EyeOff,
  Keyboard,
  Languages,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  Square,
  Volume2,
  X,
  Zap,
} from "lucide-react";
import { saveWord } from "@/app/account-actions";
import { formatTime, mergeIntoSentences, toSrt, type Segment } from "@/lib/subtitles";
import type { PlayerHandle } from "@/lib/player";
import { useRecorder } from "@/hooks/useRecorder";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import YouTubePlayer from "./YouTubePlayer";
import LocalPlayer from "./LocalPlayer";
import LevelBadge from "./LevelBadge";
import DictationPanel from "./DictationPanel";
import type { DictationLevel } from "@/lib/dictation";

export type Media = { kind: "youtube"; videoId: string } | { kind: "local"; src: string; isVideo: boolean };

type Settings = {
  mode: "segment" | "free"; // dừng sau mỗi câu | phát liên tục
  rate: number;
  repeat: number; // số lần phát mỗi câu
  gapFactor: number; // thời gian nghỉ để nói lại = gapFactor × độ dài câu
  autoNext: boolean;
  autoRecord: boolean; // tự ghi âm trong lúc nghỉ
  hideText: boolean;
  hideMedia: boolean; // thu gọn khung video (vẫn phát tiếng)
  practice: "shadow" | "dictation"; // nói theo | nghe chép chính tả
  dictLevel: DictationLevel;
  showTranslation: boolean; // hiện bản dịch tiếng Việt dưới mỗi câu
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
  hideMedia: false,
  practice: "shadow",
  dictLevel: "normal",
  showTranslation: false,
  merge: true,
};

const SETTINGS_KEY = "shadow-settings";
const NO_SETTINGS: Partial<Settings> = {};
const RATES = [0.5, 0.75, 0.85, 1, 1.25];

/** Nhóm nút chọn 1 trong nhiều (Shadowing/Chính tả, Dễ/Vừa/Khó…) */
function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly (readonly [T, string, string?])[]; // [giá trị, nhãn, tooltip]
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-xl bg-card-2 p-1 text-sm font-bold">
      {options.map(([v, label, title]) => (
        <button
          key={v}
          title={title}
          onClick={() => onChange(v)}
          className={`cursor-pointer rounded-lg px-4 py-1.5 transition ${
            value === v ? "bg-accent text-white" : "text-muted hover:text-foreground"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

const PRACTICES = [
  ["shadow", "Shadowing"],
  ["dictation", "Chính tả"],
] as const;
const MODES = [
  ["segment", "Từng câu"],
  ["free", "Liên tục"],
] as const;
const DICT_LEVELS = [
  ["easy", "Dễ", "Gợi ý chữ cái đầu"],
  ["normal", "Vừa", "Gợi ý số chữ cái"],
  ["hard", "Khó", "Không gợi ý"],
] as const;

/** "Kamera," → "Kamera" (bỏ dấu câu quanh từ) */
const cleanWord = (w: string) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");

/** "Guten Tag!" → "****** ***!" (chế độ ẩn chữ) */
const mask = (s: string) => s.replace(/[\p{L}\p{N}]/gu, "*");

export default function ShadowPlayer({
  title,
  level,
  media,
  segments: rawSegments,
  backHref = "/",
  onBack,
  loggedIn = false,
  sourceUrl = null,
  children,
}: {
  title: string;
  level?: string;
  loggedIn?: boolean; // đã đăng nhập → lưu được từ vựng
  sourceUrl?: string | null; // trang hiện tại (/lesson/1, /watch/…), lưu kèm từ vựng để mở lại
  media: Media;
  segments: Segment[];
  backHref?: string;
  onBack?: () => void; // nếu có thì dùng thay cho backHref
  children?: ReactNode; // thông tin thêm hiển thị dưới video
}) {
  // Đọc cài đặt qua useSyncExternalStore: server và lần hydrate đầu dùng DEFAULTS, không lệch HTML
  const [stored, setStored] = useLocalStorage(SETTINGS_KEY, NO_SETTINGS);
  const settings = useMemo<Settings>(() => ({ ...DEFAULTS, ...stored }), [stored]);
  const segments = useMemo(
    () => (settings.merge ? mergeIntoSentences(rawSegments) : rawSegments),
    [rawSegments, settings.merge],
  );
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [gap, setGap] = useState<{ ms: number; id: number } | null>(null);
  const [panel, setPanel] = useState<"settings" | "keys" | null>(null);
  const [pick, setPick] = useState<{ idx: number; word: string } | null>(null); // từ đang chọn để lưu / tra
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());
  const [dictDone, setDictDone] = useState<Record<number, { correct: number; total: number }>>({}); // câu chính tả đã xong
  const [tr, setTr] = useState<Record<string, string>>({}); // câu gốc → bản dịch tiếng Việt
  const [trShown, setTrShown] = useState<Set<number>>(new Set()); // câu bấm "Dịch câu này" khi chưa bật bản dịch
  const [trError, setTrError] = useState("");
  const trPending = useRef<Set<string>>(new Set());
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

  const update = useCallback(
    (patch: Partial<Settings>) => setStored({ ...live.current.settings, ...patch }),
    [setStored],
  );

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
      // Chính tả luôn dừng sau mỗi câu
      stopAtRef.current = settings.mode === "free" && settings.practice !== "dictation" ? null : s.end;
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
    // Chính tả: chỉ lặp lại câu theo cài đặt, không nghỉ / ghi âm / tự sang câu (người học đang gõ)
    if (settings.practice === "dictation") {
      if (repeatCountRef.current + 1 < settings.repeat) {
        repeatCountRef.current++;
        playSegment(idx);
      }
      return;
    }
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
      setTime((prev) => (Math.floor(prev) === Math.floor(t) ? prev : t)); // chỉ render lại mỗi giây
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

  /** Dịch câu i và ~20 câu kế tiếp (chỉ những câu chưa có / chưa đang dịch); server có kho bản dịch dùng chung */
  const translateFrom = useCallback(
    async (i: number) => {
      const texts = segments
        .slice(i, i + 20)
        .map((s) => s.text)
        .filter((t) => !(t in tr) && !trPending.current.has(t));
      if (!texts.length) return;
      texts.forEach((t) => trPending.current.add(t));
      try {
        const res = await fetch("/api/v1/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sentences: texts }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Không dịch được");
        setTrError("");
        setTr((prev) => ({ ...prev, ...Object.fromEntries(texts.map((t, k) => [t, data.translations[k]])) }));
      } catch (e) {
        setTrError((e as Error).message);
      } finally {
        texts.forEach((t) => trPending.current.delete(t));
      }
    },
    [segments, tr],
  );

  // Bật bản dịch → dịch trước các câu sắp học
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- gọi API; setState chỉ chạy sau khi có kết quả
    if (settings.showTranslation) void translateFrom(idx);
  }, [settings.showTranslation, idx, translateFrom]);

  // Cuộn danh sách tới câu đang học
  useEffect(() => {
    const list = listRef.current;
    const el = list?.querySelector<HTMLElement>(`[data-idx="${idx}"]`);
    if (list && el)
      list.scrollTo({
        top: el.offsetTop - list.clientHeight / 2 + el.clientHeight / 2,
        behavior: "smooth",
      });
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
  }, [playing, pause, go, update]);

  const onReady = useCallback((h: PlayerHandle) => {
    handleRef.current = h;
  }, []);

  const current = segments[idx];
  const picked = pick && pick.idx === idx ? pick.word : null; // sang câu khác thì ẩn
  const savePicked = async () => {
    if (!picked || !current) return;
    const res = await saveWord({
      word: picked,
      context: current.text,
      sourceUrl,
      sourceTitle: title,
    });
    if (res.ok) setSavedWords((s) => new Set(s).add(picked.toLowerCase()));
  };
  const isRecording = recorder.recordingKey !== null;
  const dictation = settings.practice === "dictation";
  const doneCount = Object.keys(dictDone).length;
  const progress = segments.length ? Math.round(((dictation ? doneCount : idx + 1) / segments.length) * 100) : 0;
  const prev = () => go(Math.max(0, idx - 1));
  const next = () => go(Math.min(segments.length - 1, idx + 1));
  const togglePlay = () => (playing ? pause() : go(idx));
  const backLabel = (
    <>
      <ChevronLeft className="size-4" /> Quay lại
    </>
  );

  return (
    <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-4 p-4 md:p-6">
      {/* Dòng tiêu đề */}
      <div className="flex flex-wrap items-center gap-3">
        {onBack ? (
          <button onClick={onBack} className="btn shrink-0">
            {backLabel}
          </button>
        ) : (
          <Link href={backHref} className="btn shrink-0">
            {backLabel}
          </Link>
        )}
        <h1 className="min-w-0 flex-1 truncate text-lg font-extrabold text-link">{title}</h1>
        {level && <LevelBadge level={level} />}
        <Segmented
          options={PRACTICES}
          value={settings.practice}
          onChange={(p) => {
            pause();
            update({ practice: p });
          }}
        />
        <div className="flex gap-2">
          <button className="btn" onClick={() => update({ hideMedia: !settings.hideMedia })}>
            {settings.hideMedia ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
            {settings.hideMedia ? "Hiện video" : "Ẩn video"}
          </button>
          <button className="btn" onClick={() => update({ hideText: !settings.hideText })}>
            {settings.hideText ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
            {settings.hideText ? "Hiện chữ" : "Ẩn chữ"}
          </button>
          <button
            className={`btn ${settings.showTranslation ? "border-accent text-accent" : ""}`}
            onClick={() => update({ showTranslation: !settings.showTranslation })}
            title="Hiện bản dịch tiếng Việt dưới mỗi câu"
          >
            <Languages className="size-4" /> Bản dịch
          </button>
          <button className="btn" onClick={() => downloadSrt(title, segments)} title="Tải phụ đề .srt">
            <Download className="size-4" /> .srt
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,0.9fr)]">
        {/* Cột 1: video + điều khiển */}
        <div className="card flex flex-col gap-4 self-start">
          <div className="flex items-center justify-between">
            <span className="label">Video</span>
            <span className="pill bg-card-2 px-3 py-1.5 text-base text-link">
              <Clock className="size-4" /> {formatTime(time)}
            </span>
          </div>
          <div className={settings.hideMedia ? "h-0 overflow-hidden" : "overflow-hidden rounded-2xl"}>
            {media.kind === "youtube" ? (
              <YouTubePlayer videoId={media.videoId} onReady={onReady} />
            ) : (
              <LocalPlayer src={media.src} isVideo={media.isVideo} onReady={onReady} />
            )}
          </div>
          {settings.hideMedia && (
            <p className="rounded-xl bg-card-2 p-3 text-center text-sm text-muted">Video đang ẩn — chỉ nghe tiếng.</p>
          )}
          <span className="label text-link">Điều khiển</span>
          <div className="grid grid-cols-2 gap-3">
            <button className="btn btn-primary py-3 text-base" onClick={togglePlay}>
              {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
              {playing ? "Dừng" : "Phát"}
            </button>
            <button className="btn py-3 text-base uppercase" onClick={() => go(idx)}>
              <RotateCcw className="size-5" /> Phát lại
            </button>
          </div>
          {children}
        </div>

        {/* Cột 2: luyện tập câu hiện tại */}
        <div className="card flex flex-col gap-4 self-start">
          <div className="flex justify-center">
            {dictation ? (
              <Segmented options={DICT_LEVELS} value={settings.dictLevel} onChange={(l) => update({ dictLevel: l })} />
            ) : (
              <Segmented options={MODES} value={settings.mode} onChange={(m) => update({ mode: m })} />
            )}
          </div>

          {/* Thanh công cụ */}
          <div className="flex items-center gap-1 rounded-2xl border border-border bg-card-2/60 px-2 py-1.5">
            <button className="btn-icon" title="Câu trước (←)" onClick={prev}>
              <ChevronLeft className="size-5" />
            </button>
            <button className="btn-icon" title="Phát lại câu" onClick={() => go(idx)}>
              <RotateCcw className="size-5" />
            </button>
            <button className="btn-icon" title="Phát / dừng (Space)" onClick={togglePlay}>
              {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
            </button>
            <button className="btn-icon" title="Câu sau (→)" onClick={next}>
              <ChevronRight className="size-5" />
            </button>
            <div className="flex-1" />
            <button
              className="btn-icon w-auto gap-1 px-2 font-bold"
              title="Tốc độ phát"
              onClick={() => {
                const r = RATES[(RATES.indexOf(settings.rate) + 1) % RATES.length];
                update({ rate: r });
                handleRef.current?.setRate(r);
              }}
            >
              <Zap className="size-5" /> {settings.rate}×
            </button>
            <button
              className={`btn-icon ${panel === "settings" ? "bg-white/10" : ""}`}
              title="Cài đặt"
              onClick={() => setPanel(panel === "settings" ? null : "settings")}
            >
              <Settings2 className="size-5" />
            </button>
            <button
              className={`btn-icon ${panel === "keys" ? "bg-white/10" : ""}`}
              title="Phím tắt"
              onClick={() => setPanel(panel === "keys" ? null : "keys")}
            >
              <Keyboard className="size-5" />
            </button>
          </div>

          {panel === "settings" && (
            <div className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-card-2/40 p-4 text-sm">
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
                <input
                  type="checkbox"
                  checked={settings.autoNext}
                  onChange={(e) => update({ autoNext: e.target.checked })}
                />
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
              <label className="check col-span-2">
                <input
                  type="checkbox"
                  checked={settings.merge}
                  onChange={(e) => {
                    // Danh sách câu thay đổi → dừng và về câu đầu
                    pause();
                    setIdx(0);
                    setDictDone({});
                    update({ merge: e.target.checked });
                  }}
                />
                Gộp các dòng phụ đề thành câu hoàn chỉnh
              </label>
            </div>
          )}
          {panel === "keys" && (
            <p className="rounded-2xl border border-border bg-card-2/40 p-4 text-sm leading-7 text-muted">
              <kbd>Space</kbd> phát/dừng · <kbd>←</kbd> <kbd>→</kbd> câu trước/sau · <kbd>R</kbd> ghi âm · <kbd>P</kbd>{" "}
              nghe lại · <kbd>H</kbd> ẩn chữ. Nên đeo tai nghe khi ghi âm.
            </p>
          )}

          {dictation && current && (
            <>
              <div className="flex items-center justify-between">
                <span className="label text-link">
                  Câu {idx + 1}/{segments.length}
                </span>
                <span className="text-xs text-muted">
                  Đã xong {doneCount}/{segments.length} câu
                </span>
              </div>
              <DictationPanel
                key={`${idx}-${settings.merge}`}
                text={current.text}
                level={settings.dictLevel}
                onReplay={() => go(idx)}
                onNext={next}
                onDone={(correct, total) => setDictDone((d) => ({ ...d, [idx]: { correct, total } }))}
                hasNext={idx < segments.length - 1}
              />
            </>
          )}

          {!dictation && (
            <>
              {/* Câu hiện tại */}
              <div className="flex min-h-48 flex-col gap-3 rounded-2xl border border-border bg-background/60 p-5">
                <div className="flex items-center justify-between">
                  <span className="label text-link">
                    Câu {idx + 1}/{segments.length}
                  </span>
                  {current && <span className="text-xs text-muted">{formatTime(current.start)}</span>}
                </div>
                {current && (
                  <p
                    className={`text-2xl leading-relaxed font-bold transition ${
                      settings.hideText ? "cursor-pointer blur-md select-none hover:blur-none" : ""
                    }`}
                    title={settings.hideText ? "Di chuột để xem" : undefined}
                  >
                    {current.text.split(" ").map((w, k) => {
                      const cw = cleanWord(w);
                      return (
                        <span key={k}>
                          <button
                            title="Lưu từ / tra từ điển"
                            onClick={() => cw && setPick({ idx, word: cw })}
                            className={`cursor-pointer rounded px-0.5 transition hover:bg-accent/20 ${
                              picked === cw ? "bg-accent/25" : ""
                            } ${savedWords.has(cw.toLowerCase()) ? "text-amber" : ""}`}
                          >
                            {w}
                          </button>{" "}
                        </span>
                      );
                    })}
                  </p>
                )}
                {picked && (
                  <div className="flex flex-wrap items-center gap-2 rounded-xl bg-card-2 p-2">
                    <span className="px-2 text-lg font-extrabold text-amber">{picked}</span>
                    {!loggedIn ? (
                      <Link href={`/login?next=${encodeURIComponent(sourceUrl ?? "/")}`} className="btn py-1.5">
                        <BookmarkPlus className="size-4" /> Đăng nhập để lưu từ
                      </Link>
                    ) : savedWords.has(picked.toLowerCase()) ? (
                      <Link href="/vocab" className="btn py-1.5 text-amber">
                        <BookmarkCheck className="size-4" /> Đã lưu · xem sổ từ
                      </Link>
                    ) : (
                      <button className="btn py-1.5" onClick={savePicked}>
                        <BookmarkPlus className="size-4" /> Lưu từ
                      </button>
                    )}
                    <a
                      className="btn py-1.5"
                      href={`https://www.dict.cc/?s=${encodeURIComponent(picked)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <BookOpen className="size-4" /> dict.cc
                    </a>
                    <button className="btn-icon ml-auto size-8" title="Đóng" onClick={() => setPick(null)}>
                      <X className="size-4" />
                    </button>
                  </div>
                )}
                {current && (settings.showTranslation || trShown.has(idx)) && (
                  <p className="text-base text-muted">
                    {tr[current.text] || (current.text in tr ? "Chưa dịch được câu này." : trError ? "" : "Đang dịch…")}
                  </p>
                )}
                <div className="mt-auto flex items-center gap-3">
                  {current && !settings.showTranslation && !trShown.has(idx) && (
                    <button
                      className="inline-flex cursor-pointer items-center gap-1 text-xs font-bold text-link hover:underline"
                      onClick={() => {
                        setTrShown((s) => new Set(s).add(idx));
                        void translateFrom(idx);
                      }}
                    >
                      <Languages className="size-4" /> Dịch câu này
                    </button>
                  )}
                  {current && (trError || tr[current.text] === "") && (
                    <a
                      className="inline-flex items-center gap-1 text-xs font-bold text-red-400 hover:underline"
                      target="_blank"
                      rel="noreferrer"
                      href={`https://translate.google.com/?sl=de&tl=vi&text=${encodeURIComponent(current.text)}`}
                      title={trError}
                    >
                      {trError || "Chưa dịch được."} Mở Google Dịch ↗
                    </a>
                  )}
                  <span className="ml-auto text-xs font-bold text-amber">
                    {gap ? (isRecording ? "🎙 Đến lượt bạn — đang ghi âm…" : "🗣 Đến lượt bạn nói…") : ""}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  {gap && (
                    <div
                      key={gap.id}
                      className="gap-bar h-full bg-amber"
                      style={{ animationDuration: `${gap.ms}ms` }}
                    />
                  )}
                </div>
              </div>

              {/* Ghi âm */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  className={`btn btn-red py-3 ${isRecording ? "animate-pulse bg-red text-white" : ""}`}
                  onClick={() => (isRecording ? recorder.stop() : recorder.start(idx))}
                >
                  {isRecording ? <Square className="size-5" /> : <Mic className="size-5" />}
                  {isRecording ? "Dừng ghi" : "Ghi âm"}
                </button>
                <button
                  className="btn py-3 uppercase"
                  disabled={!recorder.recordings[idx]}
                  onClick={() => recorder.play(idx)}
                >
                  <Volume2 className="size-5" /> Nghe lại
                </button>
              </div>

              <button className="btn btn-primary py-3.5 text-base" disabled={idx >= segments.length - 1} onClick={next}>
                Câu tiếp theo <ChevronRight className="size-5" />
              </button>
            </>
          )}
        </div>

        {/* Cột 3: toàn bộ transcript */}
        <div className="card flex max-h-[80vh] flex-col gap-3 lg:col-span-2 xl:sticky xl:top-4 xl:col-span-1 xl:max-h-[calc(100vh-7rem)]">
          <div className="flex items-center justify-between">
            <span className="label">Transcript</span>
            <span className="pill bg-card-2 px-3 py-1 text-sm">{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-card-2">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div ref={listRef} className="relative -mx-1 flex flex-1 flex-col gap-3 overflow-y-auto px-1 py-1">
            {segments.map((s, i) => (
              <div
                key={i}
                data-idx={i}
                onClick={() => go(i)}
                className={`cursor-pointer rounded-2xl border-2 p-4 transition ${
                  i === idx ? "border-accent bg-accent/10" : "border-border hover:border-accent/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="pill bg-card-2 text-foreground">#{i + 1}</span>
                  <span className="font-mono text-xs text-muted">{formatTime(s.start)}</span>
                  {dictation && dictDone[i] && (
                    <span className="pill bg-accent/15 text-accent">
                      ✓ {dictDone[i].correct}/{dictDone[i].total}
                    </span>
                  )}
                  {recorder.recordings[i] && (
                    <button
                      className="ml-auto cursor-pointer text-link hover:text-foreground"
                      title="Nghe bản ghi của bạn"
                      onClick={(e) => {
                        e.stopPropagation();
                        recorder.play(i);
                      }}
                    >
                      <Volume2 className="size-5" />
                    </button>
                  )}
                </div>
                {/* Chính tả: câu chưa làm thì che chữ; shadowing: theo nút "Ẩn chữ" */}
                {(() => {
                  const hidden = dictation ? !dictDone[i] : settings.hideText;
                  return (
                    <p
                      className={`mt-2 text-sm leading-relaxed ${hidden ? "font-mono tracking-wider text-muted" : ""}`}
                    >
                      {hidden ? mask(s.text) : s.text}
                      {!hidden && settings.showTranslation && tr[s.text] && (
                        <span className="mt-1 block text-xs text-muted">{tr[s.text]}</span>
                      )}
                    </p>
                  );
                })()}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function downloadSrt(title: string, segments: Segment[]) {
  const url = URL.createObjectURL(new Blob([toSrt(segments)], { type: "text/plain" }));
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: `${title}.srt`,
  });
  a.click();
  URL.revokeObjectURL(url);
}
