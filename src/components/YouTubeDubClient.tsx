"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Check,
  Globe,
  Headphones,
  Link2,
  Loader2,
  Play,
  Sparkles,
  TriangleAlert,
  X,
} from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { extractVideoId } from "@/lib/youtube-id";
import KokoroLivePlayer, { type LiveCue, type LiveVoiceId } from "./KokoroLivePlayer";

export type DubSuggestion = {
  videoId: string;
  title: string;
  meta?: string;
};

type RecentDub = {
  videoId: string;
  title: string;
};

type LiveSession = {
  videoId: string;
  title: string;
  sourceLang?: string;
  cues: LiveCue[];
  voiceId: LiveVoiceId;
};

type PrepProgress = {
  pct: number;
  stage: string;
  done?: number;
  total?: number;
};

type BgProgress = {
  pct: number;
  done: number;
  total: number;
};

type PrepareResult = {
  videoId: string;
  title?: string;
  sourceLang?: string;
  cues: LiveCue[];
};

const VOICE_PILLS: { id: LiveVoiceId; name: string; tag: string }[] = [
  { id: "edge:vi-VN-NamMinhNeural", name: "Nam Minh", tag: "Nam · Tự nhiên" },
  { id: "edge:vi-VN-HoaiMyNeural", name: "Hoài My", tag: "Nữ · Tự nhiên" },
  { id: "piper:adam_bua", name: "Adam bựa", tag: "Trình duyệt" },
];

const PIPELINE_STEPS = [
  { label: "Lấy phụ đề", minPct: 6, donePct: 29 },
  { label: "Sắp xếp câu", minPct: 30, donePct: 33 },
  { label: "Phân tích văn phong", minPct: 34, donePct: 39 },
  { label: "Dịch lời thoại", minPct: 40, donePct: 99 },
] as const;

const RECENT_KEY = "hallovn-dub-recent";
const EMPTY_RECENT: RecentDub[] = [];

async function fetchPrepareStream(
  endpoint: string,
  payload: object,
  callbacks: {
    onProgress: (p: PrepProgress) => void;
    onReady: (data: PrepareResult, bg: BgProgress) => void;
    onChunk: (start: number, translations: string[], bg: BgProgress) => void;
  },
  signal?: AbortSignal,
): Promise<PrepareResult> {
  const res = await fetch(`${endpoint}?stream=1`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/x-ndjson",
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error((errData as { error?: string }).error || `HTTP ${res.status}`);
  }

  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("ndjson") || !res.body) {
    return (await res.json()) as PrepareResult;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let result: PrepareResult | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl = buf.indexOf("\n");
    while (nl !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (line) {
        const msg = JSON.parse(line) as
          | { type: "progress"; pct: number; stage: string; done?: number; total?: number }
          | { type: "ready"; data: PrepareResult; pct: number; done: number; total: number }
          | { type: "chunk"; start: number; translations: string[]; pct: number; done: number; total: number }
          | { type: "done"; data: PrepareResult }
          | { type: "error"; error: string };
        if (msg.type === "progress") {
          callbacks.onProgress({ pct: msg.pct, stage: msg.stage, done: msg.done, total: msg.total });
        } else if (msg.type === "ready") {
          callbacks.onReady(msg.data, { pct: msg.pct, done: msg.done, total: msg.total });
        } else if (msg.type === "chunk") {
          callbacks.onChunk(msg.start, msg.translations, { pct: msg.pct, done: msg.done, total: msg.total });
        } else if (msg.type === "error") {
          throw new Error(msg.error);
        } else if (msg.type === "done") {
          result = msg.data;
        }
      }
      nl = buf.indexOf("\n");
    }
  }

  if (!result) throw new Error("Kết nối bị gián đoạn trước khi hoàn tất. Vui lòng thử lại.");
  return result;
}

export default function YouTubeDubClient({ suggestions = [] }: { suggestions?: DubSuggestion[] }) {
  const searchParams = useSearchParams();
  const initialV = searchParams.get("v") ?? "";

  const [url, setUrl] = useState(initialV ? `https://youtu.be/${initialV}` : "");
  const [voiceId, setVoiceId] = useState<LiveVoiceId>("edge:vi-VN-NamMinhNeural");
  const [loading, setLoading] = useState(false);
  const [loadingVideoId, setLoadingVideoId] = useState<string | null>(null);
  const [prep, setPrep] = useState<PrepProgress | null>(null);
  const [bgProgress, setBgProgress] = useState<BgProgress | null>(null);
  const [err, setErr] = useState("");
  const [session, setSession] = useState<LiveSession | null>(null);
  const [recent, setRecent] = useLocalStorage<RecentDub[]>(RECENT_KEY, EMPTY_RECENT);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const recentRef = useRef(recent);
  useEffect(() => {
    recentRef.current = recent;
  }, [recent]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const recordOpen = useCallback(
    (vid: string, title: string) => {
      if (typeof window !== "undefined") {
        const u = new URL(window.location.href);
        u.searchParams.set("v", vid);
        window.history.replaceState(null, "", u.pathname + u.search);
      }
      const cur = recentRef.current;
      setRecent([{ videoId: vid, title }, ...cur.filter((r) => r.videoId !== vid)].slice(0, 8));
    },
    [setRecent],
  );

  const loadVideo = useCallback(
    async (rawInput: string, voice: LiveVoiceId) => {
      const videoId = extractVideoId(rawInput.trim());
      if (!videoId) {
        setErr("Link YouTube không hợp lệ. Vui lòng dán link YouTube đầy đủ (ví dụ: https://youtu.be/…)");
        return;
      }

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      const isActive = () => abortRef.current === ac && !ac.signal.aborted;

      setLoading(true);
      setLoadingVideoId(videoId);
      setBgProgress(null);
      setPrep({ pct: 4, stage: "Đang kết nối máy chủ…" });
      setErr("");
      let becameReady = false;

      try {
        const data = await fetchPrepareStream(
          "/api/v1/dub/prepare",
          { videoId },
          {
            onProgress: (p) => {
              if (isActive()) setPrep(p);
            },
            onReady: (partial, bg) => {
              if (!isActive()) return;
              becameReady = true;
              const title = partial.title || partial.videoId;
              setSession({
                videoId: partial.videoId,
                title,
                sourceLang: partial.sourceLang,
                cues: partial.cues,
                voiceId: voice,
              });
              setBgProgress(bg);
              setLoading(false);
              setLoadingVideoId(null);
              setPrep(null);
              recordOpen(partial.videoId, title);
            },
            onChunk: (start, translations, bg) => {
              if (!isActive()) return;
              setBgProgress(bg);
              setSession((prev) => {
                if (!prev || prev.videoId !== videoId) return prev;
                const nextCues = prev.cues.slice();
                translations.forEach((tr, k) => {
                  const idx = start + k;
                  if (nextCues[idx]) {
                    nextCues[idx] = {
                      start_ms: nextCues[idx].start_ms,
                      end_ms: nextCues[idx].end_ms,
                      // "" = AI chưa dịch được → không đọc (đừng thay bằng câu gốc)
                      text: tr,
                      orig: nextCues[idx].orig,
                      ...(tr ? {} : { untranslated: true }),
                    };
                  }
                });
                return { ...prev, cues: nextCues };
              });
            },
          },
          ac.signal,
        );

        if (!isActive()) return;
        const title = data.title || data.videoId;
        setSession({
          videoId: data.videoId,
          title,
          sourceLang: data.sourceLang,
          cues: data.cues,
          voiceId: voice,
        });
        setBgProgress(null);
        if (!becameReady) recordOpen(data.videoId, title);
      } catch (e) {
        if (isActive() && (e as Error).name !== "AbortError") {
          setErr((e as Error).message);
        }
      } finally {
        if (abortRef.current === ac) {
          setLoading(false);
          setLoadingVideoId(null);
          setPrep(null);
          setBgProgress(null);
        }
      }
    },
    [recordOpen],
  );

  // Tự mở khi truy cập link có ?v=...
  const autoLoadedRef = useRef("");
  useEffect(() => {
    const id = extractVideoId(initialV);
    if (id && autoLoadedRef.current !== id) {
      autoLoadedRef.current = id;
      void loadVideo(id, "edge:vi-VN-NamMinhNeural");
    }
  }, [initialV, loadVideo]);

  const parsedInputId = extractVideoId(url.trim());
  const isLoadingCurrent = loading && !!loadingVideoId && parsedInputId === loadingVideoId;
  const isSwitchingLink = loading && !!parsedInputId && parsedInputId !== loadingVideoId;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || isLoadingCurrent) return;
    void loadVideo(url, voiceId);
  };

  const cancelLoad = (clearAndFocus = true) => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    setLoadingVideoId(null);
    setPrep(null);
    setBgProgress(null);
    setErr("");
    if (clearAndFocus) {
      setUrl("");
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  };

  const clearInput = () => {
    setUrl("");
    setErr("");
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const openQuick = (videoId: string) => {
    setUrl(`https://youtu.be/${videoId}`);
    void loadVideo(videoId, voiceId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const removeRecent = (videoId: string) => {
    setRecent(recent.filter((r) => r.videoId !== videoId));
  };

  const pct = prep?.pct ?? 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Bảng điều khiển nhập link & chọn giọng */}
      <form onSubmit={handleSubmit} className="card flex flex-col gap-3.5 p-4 sm:p-5">
        {/* Hàng 1: Ô dán link (có nút xoá nhanh) + Nút chạy / Loading + Huỷ */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-stretch">
          <div className="input-group min-w-0 flex-1 pr-2">
            <Link2 className="size-4 shrink-0 text-muted" aria-hidden />
            <input
              ref={inputRef}
              type="text"
              inputMode="url"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Dán link YouTube bất kỳ (tiếng Đức, Anh, Nhật, Hàn…)"
              aria-label="Link video YouTube"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (err) setErr("");
              }}
              required
            />
            {url && (
              <button
                type="button"
                onClick={clearInput}
                title="Xoá link để dán bài khác"
                aria-label="Xoá link"
                className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-card-2 hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="flex shrink-0 items-stretch gap-2">
            {isLoadingCurrent ? (
              <>
                <div
                  role="status"
                  aria-live="polite"
                  className="btn btn-primary pointer-events-none relative min-w-[168px] flex-1 select-none overflow-hidden tabular-nums sm:flex-none"
                >
                  <span
                    className="pointer-events-none absolute inset-y-0 left-0 bg-white/20 transition-[width] duration-300 ease-out"
                    style={{ width: `${Math.max(6, pct)}%` }}
                  />
                  <Loader2 className="relative size-4 animate-spin" />
                  <span className="relative">Đang chuẩn bị · {pct}%</span>
                </div>
                <button
                  type="button"
                  onClick={() => cancelLoad(true)}
                  className="btn shrink-0 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-500"
                  title="Huỷ bài đang tải để dán link khác"
                >
                  <X className="size-4" />
                  <span>Huỷ</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="submit"
                  className="btn btn-primary min-w-[164px] flex-1 shrink-0 sm:flex-none"
                  disabled={!url.trim()}
                >
                  <Play className="size-4" />
                  <span>{isSwitchingLink ? "Tải bài này" : "Xem thuyết minh"}</span>
                </button>
                {loading && (
                  <button
                    type="button"
                    onClick={() => cancelLoad(false)}
                    className="btn shrink-0 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-500"
                    title="Huỷ bài đang tải"
                  >
                    <X className="size-4" />
                    <span>Huỷ</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Hàng 2: Chọn giọng dạng pill gọn gàng + gợi ý ngắn */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-line/70 pt-3">
          <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Chọn giọng thuyết minh">
            <span className="mr-1 text-xs font-medium text-muted">Giọng đọc:</span>
            {VOICE_PILLS.map((v) => {
              const active = voiceId === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setVoiceId(v.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    active
                      ? "border-sec bg-sec-soft text-sec-text"
                      : "border-line bg-card-2/50 text-muted hover:border-line-strong hover:text-foreground"
                  }`}
                >
                  <span>{v.name}</span>
                  <span className={`text-[10px] font-normal ${active ? "text-sec-text/80" : "text-muted/80"}`}>
                    {v.tag}
                  </span>
                </button>
              );
            })}
          </div>
          <span className="text-[11px] text-muted">
            Phát ngay sau 20 câu đầu · Dán link mới bất kỳ lúc nào
          </span>
        </div>

        {/* Khung tiến trình trực quan khi đang chuẩn bị video */}
        {loading && prep && (
          <div className="flex flex-col gap-3 rounded-xl border border-sec/25 bg-card-2/60 p-3.5 sm:flex-row sm:items-center sm:gap-4">
            {loadingVideoId && (
              <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-lg bg-black sm:w-36">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://i.ytimg.com/vi/${loadingVideoId}/mqdefault.jpg`}
                  alt=""
                  className="size-full object-cover opacity-80"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <span className="flex size-8 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur-xs">
                    <Loader2 className="size-4 animate-spin" />
                  </span>
                </div>
              </div>
            )}

            <div className="flex min-w-0 flex-1 flex-col gap-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex min-w-0 items-center gap-2 text-xs font-semibold text-foreground sm:text-sm">
                  <span className="size-2 shrink-0 animate-pulse rounded-full bg-sec" />
                  <span className="truncate">{prep.stage}</span>
                </span>
                <span className="shrink-0 font-mono text-xs font-bold text-sec-text tabular-nums sm:text-sm">
                  {pct}%
                </span>
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-card">
                <div
                  className="h-full rounded-full bg-sec transition-[width] duration-300 ease-out"
                  style={{ width: `${Math.max(5, pct)}%` }}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                  {PIPELINE_STEPS.map((step, i) => {
                    const done = pct > step.donePct;
                    const active = !done && pct >= step.minPct;
                    return (
                      <span
                        key={step.label}
                        className={`inline-flex items-center gap-1 ${
                          done
                            ? "font-medium text-ok-text"
                            : active
                              ? "font-semibold text-sec-text"
                              : "text-muted/75"
                        }`}
                      >
                        {done ? (
                          <Check className="size-3 shrink-0" />
                        ) : active ? (
                          <Loader2 className="size-3 shrink-0 animate-spin" />
                        ) : (
                          <span className="font-mono text-[10px] opacity-70">{i + 1}.</span>
                        )}
                        <span>{step.label}</span>
                      </span>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => cancelLoad(true)}
                  className="text-[11px] font-medium text-muted underline-offset-2 transition hover:text-red-500 hover:underline"
                >
                  Huỷ &amp; dán link khác
                </button>
              </div>
            </div>
          </div>
        )}

        {err && (
          <p role="alert" className="alert alert-err text-xs sm:text-sm">
            <TriangleAlert className="size-4 shrink-0" />
            <span>{err}</span>
          </p>
        )}
      </form>

      {/* Player thuyết minh trực tiếp */}
      {session && (
        <section className="card p-4 sm:p-5">
          <KokoroLivePlayer
            key={session.videoId}
            videoId={session.videoId}
            title={session.title}
            sourceLang={session.sourceLang}
            cues={session.cues}
            initialVoice={voiceId}
            onVoiceChange={setVoiceId}
            shareUrl={`/thuyet-minh?v=${session.videoId}`}
            bgProgress={bgProgress}
          />
        </section>
      )}

      {/* Giới thiệu ngắn khi chưa mở video nào */}
      {!session && !loading && (
        <section aria-label="Điểm nổi bật" className="grid gap-3 sm:grid-cols-3">
          <div className="card flex items-start gap-3 p-4">
            <span className="icon-bubble tint-sec size-9 shrink-0">
              <Globe className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Hỗ trợ nhiều ngôn ngữ</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted">
                Xem video tiếng Đức, Anh, Nhật, Hàn… tự động gộp câu trọn vẹn và dịch tiếng Việt tự nhiên.
              </p>
            </div>
          </div>
          <div className="card flex items-start gap-3 p-4">
            <span className="icon-bubble tint-sec size-9 shrink-0">
              <Headphones className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Đồng bộ &amp; tuỳ chỉnh dễ dàng</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted">
                Chỉnh riêng âm lượng gốc và giọng tiếng Việt, tua thoải mái, xem lời thoại song song.
              </p>
            </div>
          </div>
          <div className="card flex items-start gap-3 p-4">
            <span className="icon-bubble tint-sec size-9 shrink-0">
              <Sparkles className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Phát nhanh cuốn chiếu</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted">
                Dịch xong 20 câu đầu là xem ngay, phần còn lại dịch song song ở nền cực nhanh.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Video đã xem gần đây */}
      {recent.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground sm:text-base">Đã xem gần đây</h2>
            <span className="text-xs text-muted">{recent.length} video</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {recent.map((r) => {
              const isCurrent = session?.videoId === r.videoId || loadingVideoId === r.videoId;
              return (
                <div
                  key={r.videoId}
                  className={`group card relative flex flex-col overflow-hidden p-0 ${
                    isCurrent ? "ring-1 ring-sec" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => openQuick(r.videoId)}
                    className="flex flex-1 flex-col text-left transition-colors hover:bg-card-2/40"
                  >
                    <div className="relative aspect-video w-full overflow-hidden bg-card-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://i.ytimg.com/vi/${r.videoId}/mqdefault.jpg`}
                        alt=""
                        className="size-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                      {loadingVideoId === r.videoId && (
                        <span className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-md bg-black/75 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          <Loader2 className="size-3 animate-spin" />
                          Đang tải
                        </span>
                      )}
                    </div>
                    <div className="line-clamp-2 p-2.5 text-xs leading-snug font-semibold text-foreground group-hover:text-sec-text sm:p-3 sm:text-sm">
                      {r.title}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeRecent(r.videoId)}
                    title="Xoá khỏi danh sách gần đây"
                    aria-label="Xoá khỏi danh sách gần đây"
                    className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-black/65 text-white opacity-0 transition hover:bg-black/85 group-hover:opacity-100 focus-visible:opacity-100"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Video gợi ý thử nhanh */}
      {suggestions.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground sm:text-base">Thử xem nhanh</h2>
            <span className="text-xs text-muted">Bấm 1 chạm để nghe thử thuyết minh</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {suggestions.map((item) => (
              <button
                key={item.videoId}
                type="button"
                onClick={() => openQuick(item.videoId)}
                className="group card card-link flex flex-col overflow-hidden p-0 text-left"
              >
                <div className="relative aspect-video w-full overflow-hidden bg-card-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://i.ytimg.com/vi/${item.videoId}/mqdefault.jpg`}
                    alt=""
                    className="size-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                  {item.meta && (
                    <span className="absolute top-2 left-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {item.meta}
                    </span>
                  )}
                </div>
                <div className="line-clamp-2 p-2.5 text-xs leading-snug font-semibold text-foreground group-hover:text-sec-text sm:p-3 sm:text-sm">
                  {item.title}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
