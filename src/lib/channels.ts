import "server-only";
import { after } from "next/server";
import { setVideoChannel, videosMissingChannel } from "./db";

/**
 * Kênh YouTube của các bài học (để chia thư viện bài theo kênh). Lấy qua oEmbed của YouTube — không cần API key, không cần yt-dlp —
 * chạy nền sau khi trả trang danh sách bài, mỗi lần vài video, nên bài cũ được điền dần còn bài mới có kênh ngay lần xem sau.
 */

const BATCH = 8; // video / lần
const RETRY_MS = 30 * 60_000; // video lấy lỗi → 30 phút sau mới thử lại

const g = globalThis as unknown as { __chFailed?: Map<string, number>; __chRunning?: boolean };
const failed = (g.__chFailed ??= new Map());

async function fetchChannel(videoId: string): Promise<{ title: string; url: string } | null> {
  const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  // 401 / 404: video riêng tư / bị xoá → không bao giờ có kênh, ghi rỗng để thôi hỏi lại (thư viện xếp vào "Kênh khác")
  if (res.status === 401 || res.status === 403 || res.status === 404) return { title: "", url: "" };
  if (!res.ok) return null;
  const d = (await res.json()) as { author_name?: string; author_url?: string };
  const title = d.author_name?.trim() ?? "";
  const channelUrl = d.author_url?.startsWith("https://www.youtube.com/") ? d.author_url : "";
  return title ? { title: title.slice(0, 120), url: channelUrl } : null;
}

async function fill() {
  if (g.__chRunning) return;
  g.__chRunning = true;
  try {
    const now = Date.now();
    const todo = videosMissingChannel(BATCH * 4).filter((v) => (failed.get(v) ?? 0) < now).slice(0, BATCH);
    for (const v of todo) {
      const c = await fetchChannel(v).catch(() => null);
      if (c) {
        setVideoChannel(v, c.title, c.url);
        failed.delete(v);
      } else failed.set(v, now + RETRY_MS);
    }
  } finally {
    g.__chRunning = false;
  }
}

/** Gọi lúc dựng danh sách bài: còn bài chưa biết kênh → lấy nền sau khi trả trang */
export function fillLessonChannels() {
  if (!videosMissingChannel(1).length) return;
  try {
    after(fill);
  } catch {
    void fill();
  }
}
