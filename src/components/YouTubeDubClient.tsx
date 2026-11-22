"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Globe, Headphones, Loader2, Play, Sparkles, TriangleAlert, X } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { extractVideoId } from "@/lib/youtube-id";
import KokoroLivePlayer, { type LiveCue } from "./KokoroLivePlayer";

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
  voiceIdx: 0 | 1;
};

const RECENT_KEY = "hallovn-dub-recent";
const EMPTY_RECENT: RecentDub[] = [];

export default function YouTubeDubClient({ suggestions = [] }: { suggestions?: DubSuggestion[] }) {
  const searchParams = useSearchParams();
  const initialV = searchParams.get("v") ?? "";

  const [url, setUrl] = useState(initialV ? `https://youtu.be/${initialV}` : "");
  const [voiceIdx, setVoiceIdx] = useState<0 | 1>(1);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [session, setSession] = useState<LiveSession | null>(null);
  const [recent, setRecent] = useLocalStorage<RecentDub[]>(RECENT_KEY, EMPTY_RECENT);

  const recentRef = useRef(recent);
  useEffect(() => {
    recentRef.current = recent;
  }, [recent]);

  const loadVideo = useCallback(
    async (rawInput: string, voice: 0 | 1) => {
      const videoId = extractVideoId(rawInput.trim());
      if (!videoId) {
        setErr("Link YouTube không hợp lệ. Vui lòng dán link YouTube đầy đủ (ví dụ: https://youtu.be/…)");
        return;
      }

      setLoading(true);
      setErr("");
      try {
        const res = await fetch("/api/v1/dub/prepare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

        const nextSession: LiveSession = {
          videoId: data.videoId,
          title: data.title || data.videoId,
          sourceLang: data.sourceLang,
          cues: data.cues,
          voiceIdx: voice,
        };
        setSession(nextSession);

        // Cập nhật ?v=... để người dùng có thể copy URL / F5 xem tiếp
        if (typeof window !== "undefined") {
          const u = new URL(window.location.href);
          u.searchParams.set("v", data.videoId);
          window.history.replaceState(null, "", u.pathname + u.search);
        }

        // Lưu vào lịch sử xem gần đây
        const cur = recentRef.current;
        setRecent([{ videoId: nextSession.videoId, title: nextSession.title }, ...cur.filter((r) => r.videoId !== nextSession.videoId)].slice(0, 8));
      } catch (e) {
        setErr((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [setRecent],
  );

  // Tự mở khi truy cập link có ?v=...
  const autoLoadedRef = useRef("");
  useEffect(() => {
    const id = extractVideoId(initialV);
    if (id && autoLoadedRef.current !== id) {
      autoLoadedRef.current = id;
      void loadVideo(id, 1);
    }
  }, [initialV, loadVideo]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || loading) return;
    void loadVideo(url, voiceIdx);
  };

  const openQuick = (videoId: string) => {
    setUrl(`https://youtu.be/${videoId}`);
    void loadVideo(videoId, voiceIdx);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const removeRecent = (videoId: string) => {
    setRecent(recent.filter((r) => r.videoId !== videoId));
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Form dán link YouTube */}
      <form onSubmit={handleSubmit} className="card flex flex-col gap-3 p-4 sm:p-5">
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <input
            type="text"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="input min-w-0 flex-1 text-foreground"
            placeholder="Dán link YouTube bất kỳ (tiếng Đức, Anh, Nhật, Hàn…)"
            aria-label="Link video YouTube"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
          <select
            className="input text-foreground sm:w-48"
            value={voiceIdx}
            onChange={(e) => setVoiceIdx(Number(e.target.value) === 0 ? 0 : 1)}
            aria-label="Chọn giọng thuyết minh"
          >
            <option value={1}>Giọng Đức Duy (Nam)</option>
            <option value={0}>Giọng Diễm Trinh (Nữ)</option>
          </select>
          <button type="submit" className="btn btn-primary shrink-0" disabled={loading || !url.trim()}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
            {loading ? "Đang chuẩn bị…" : "Xem thuyết minh"}
          </button>
        </div>

        <p className="text-xs text-muted">
          Tự động lấy phụ đề YouTube, dịch sang tiếng Việt và đọc trực tiếp ngay trên trình duyệt. Lần đầu sẽ tải nhẹ giọng đọc AI vào bộ nhớ trình duyệt để lần sau phát tức thì.
        </p>

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
            key={`${session.videoId}:${session.voiceIdx}`}
            videoId={session.videoId}
            title={session.title}
            sourceLang={session.sourceLang}
            cues={session.cues}
            initialVoice={session.voiceIdx}
            shareUrl={`/thuyet-minh?v=${session.videoId}`}
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
                Xem video tiếng Đức, Anh, Nhật, Hàn… tự động dịch sang tiếng Việt tự nhiên như lời nói.
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
                Chỉnh riêng âm lượng gốc và giọng tiếng Việt, tua thoải mái, bật phụ đề song ngữ khi cần.
              </p>
            </div>
          </div>
          <div className="card flex items-start gap-3 p-4">
            <span className="icon-bubble tint-sec size-9 shrink-0">
              <Sparkles className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Miễn phí trên trình duyệt</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted">
                Giọng đọc AI tiếng Việt chạy trực tiếp ngay trong trình duyệt — không cần cài tiện ích mở rộng.
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
            {recent.map((r) => (
              <div key={r.videoId} className="group card relative flex flex-col overflow-hidden p-0">
                <button
                  type="button"
                  onClick={() => openQuick(r.videoId)}
                  className="flex flex-1 flex-col text-left transition-colors hover:bg-card-2/40"
                >
                  <div className="aspect-video w-full overflow-hidden bg-card-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://i.ytimg.com/vi/${r.videoId}/mqdefault.jpg`}
                      alt=""
                      className="size-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    />
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
            ))}
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
