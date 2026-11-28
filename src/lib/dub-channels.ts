import "server-only";
import { after } from "next/server";
import { getCached, listChannels, listLessons, saveChannel, setCached } from "./db";
import { channelIdVideosUrl, channelVideosUrl, clearChannelCache, ytdlpChannel, type ChannelListing, type ChannelVideo } from "./ytdlp";

export const DEFAULT_DUB_CHANNEL_LIMIT = 16;
export const MIN_DUB_CHANNEL_LIMIT = 10;
export const MAX_DUB_CHANNEL_LIMIT = 20;

const FRESH_TTL_MS = 30 * 60_000;
const STALE_TTL_MS = 24 * 60 * 60_000;

export type DubChannelInfo = {
  key: string;
  dbId?: number;
  channelId?: string;
  title: string;
  handle: string;
  avatar: string;
  url: string;
};

export type DubChannelVideo = ChannelVideo;

type CachedChannelEntry = {
  data: ChannelListing;
  fetchedAt: number;
};

const g = globalThis as unknown as { __dubChInflight?: Map<string, Promise<ChannelListing>> };
const inflight = (g.__dubChInflight ??= new Map());

function clampLimit(limit?: number): number {
  const n = Number(limit);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_DUB_CHANNEL_LIMIT;
  return Math.min(MAX_DUB_CHANNEL_LIMIT, Math.max(MIN_DUB_CHANNEL_LIMIT, Math.round(n)));
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

/** Parse Atom RSS feed (`youtube.com/feeds/videos.xml?channel_id=...`) làm fallback nhẹ khi yt-dlp lỗi. */
export function parseChannelRssXml(xml: string, channelId: string, limit: number): ChannelListing | null {
  const max = clampLimit(limit);
  const channelTitleRaw =
    xml.match(/<author>\s*<name>([^<]+)<\/name>/i)?.[1] ??
    xml.match(/<feed[\s\S]*?<title>([^<]+)<\/title>/i)?.[1] ??
    channelId;
  const videos: ChannelVideo[] = [];
  const entryRe = /<entry>([\s\S]*?)<\/entry>/gi;
  let m: RegExpExecArray | null;
  while ((m = entryRe.exec(xml)) !== null && videos.length < max) {
    const block = m[1];
    const vid = block.match(/<yt:videoId>([\w-]{11})<\/yt:videoId>/i)?.[1];
    if (!vid) continue;
    const rawTitle = block.match(/<title>([^<]*)<\/title>/i)?.[1] ?? vid;
    videos.push({
      id: vid,
      title: decodeXmlEntities(rawTitle).trim() || vid,
      duration: null,
    });
  }
  if (!videos.length) return null;
  return {
    channelId,
    title: decodeXmlEntities(channelTitleRaw).trim() || channelId,
    handle: "",
    avatar: "",
    videos,
  };
}

/** Danh sách kênh YouTube hiển thị ở tab Thuyết minh: ưu tiên kênh admin đã lưu (`yt_channels`), bổ sung kênh từ các bài học. */
export function listDubChannels(): DubChannelInfo[] {
  const out: DubChannelInfo[] = [];
  const seenIds = new Set<string>();
  const seenHandles = new Set<string>();
  const seenTitles = new Set<string>();

  for (const c of listChannels()) {
    const handle = c.handle.trim();
    const title = c.title.trim() || c.channelId;
    seenIds.add(c.channelId);
    if (handle) seenHandles.add(handle.toLowerCase());
    seenTitles.add(title.toLowerCase());
    out.push({
      key: `uc:${c.channelId}`,
      dbId: c.id,
      channelId: c.channelId,
      title,
      handle,
      avatar: c.avatar,
      url: handle ? `https://www.youtube.com/${handle}` : `https://www.youtube.com/channel/${c.channelId}`,
    });
  }

  for (const l of listLessons()) {
    const title = l.channel?.trim();
    const rawUrl = l.channelUrl?.trim();
    if (!title || !rawUrl || !channelVideosUrl(rawUrl)) continue;
    const handle = rawUrl.match(/\/(@[^/?#]+)/)?.[1] ?? "";
    const channelId = rawUrl.match(/\/channel\/(UC[\w-]{22})/)?.[1];
    if (channelId && seenIds.has(channelId)) continue;
    if (handle && seenHandles.has(handle.toLowerCase())) continue;
    if (seenTitles.has(title.toLowerCase())) continue;

    if (channelId) seenIds.add(channelId);
    if (handle) seenHandles.add(handle.toLowerCase());
    seenTitles.add(title.toLowerCase());

    out.push({
      key: channelId ? `uc:${channelId}` : handle ? `handle:${handle.toLowerCase()}` : `url:${rawUrl}`,
      ...(channelId ? { channelId } : {}),
      title,
      handle,
      avatar: "",
      url: handle ? `https://www.youtube.com/${handle}` : rawUrl,
    });
  }

  return out;
}

export function resolveChannelVideosUrl(ch: Pick<DubChannelInfo, "channelId" | "handle" | "url">): string | null {
  if (ch.channelId && /^UC[\w-]{22}$/.test(ch.channelId)) {
    return channelIdVideosUrl(ch.channelId);
  }
  return channelVideosUrl(ch.handle || ch.url);
}

export function buildDubChannelInfo(listing: ChannelListing, existing?: Partial<DubChannelInfo> | null): DubChannelInfo {
  const handle = listing.handle || existing?.handle || "";
  const channelId = listing.channelId || existing?.channelId;
  const title = listing.title || existing?.title || channelId || "Kênh YouTube";
  const avatar = listing.avatar || existing?.avatar || "";
  const url =
    existing?.url ||
    (handle ? `https://www.youtube.com/${handle}` : channelId ? `https://www.youtube.com/channel/${channelId}` : "");
  return {
    key: existing?.key || (channelId ? `uc:${channelId}` : handle ? `handle:${handle.toLowerCase()}` : `url:${url}`),
    ...(existing?.dbId !== undefined ? { dbId: existing.dbId } : {}),
    ...(channelId ? { channelId } : {}),
    title,
    handle,
    avatar,
    url,
  };
}

export function getCachedDubChannelVideos(videosUrl: string, limit = DEFAULT_DUB_CHANNEL_LIMIT): ChannelListing | null {
  const clamped = clampLimit(limit);
  const hit = getCached<CachedChannelEntry>(`ytch:v1:${videosUrl}|${clamped}`);
  return hit?.data ?? null;
}

async function fetchRssFallback(videosUrl: string, explicitChannelId: string | undefined, limit: number): Promise<ChannelListing | null> {
  const cid = explicitChannelId || videosUrl.match(/\/channel\/(UC[\w-]{22})/)?.[1];
  if (!cid) return null;
  const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${cid}`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const xml = await res.text();
  return parseChannelRssXml(xml, cid, limit);
}

/**
 * Lấy danh sách video mới nhất của kênh với cache SQLite theo cơ chế stale-while-revalidate:
 * - Tươi (< 30 phút): trả ngay không chạm mạng.
 * - Hết hạn tươi (< 24 giờ): trả ngay cache cũ và làm mới ngầm qua `after()`.
 */
export async function fetchDubChannelVideos(opts: {
  videosUrl: string;
  channelId?: string;
  limit?: number;
  forceRefresh?: boolean;
}): Promise<ChannelListing> {
  const limit = clampLimit(opts.limit);
  const { videosUrl, channelId, forceRefresh = false } = opts;
  const cacheKey = `ytch:v1:${videosUrl}|${limit}`;

  const doFetch = async (clearMemCache: boolean): Promise<ChannelListing> => {
    const existingFlight = inflight.get(cacheKey);
    if (existingFlight) return existingFlight;

    const task = (async () => {
      if (clearMemCache) clearChannelCache(videosUrl);
      let listing: ChannelListing;
      try {
        listing = await ytdlpChannel(videosUrl, limit);
      } catch (err) {
        const rss = await fetchRssFallback(videosUrl, channelId, limit).catch(() => null);
        if (!rss) throw err;
        listing = rss;
      }

      setCached(cacheKey, { data: listing, fetchedAt: Date.now() } satisfies CachedChannelEntry, STALE_TTL_MS);

      const saved = listChannels().find((c) => c.channelId === listing.channelId);
      if (
        saved &&
        ((listing.title && listing.title !== saved.title) ||
          (listing.handle && listing.handle !== saved.handle) ||
          (listing.avatar && listing.avatar !== saved.avatar))
      ) {
        saveChannel({
          channelId: saved.channelId,
          title: listing.title || saved.title,
          handle: listing.handle || saved.handle,
          avatar: listing.avatar || saved.avatar,
        });
      }
      return listing;
    })().finally(() => {
      inflight.delete(cacheKey);
    });

    inflight.set(cacheKey, task);
    return task;
  };

  if (!forceRefresh) {
    const cached = getCached<CachedChannelEntry>(cacheKey);
    if (cached?.data?.videos?.length) {
      if (Date.now() - cached.fetchedAt < FRESH_TTL_MS) {
        return cached.data;
      }
      const bgRefresh = () => {
        void doFetch(true).catch(() => {});
      };
      try {
        after(bgRefresh);
      } catch {
        bgRefresh();
      }
      return cached.data;
    }
  }

  return doFetch(forceRefresh);
}
