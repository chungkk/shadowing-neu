import { NextResponse } from "next/server";
import { getChannel } from "@/lib/db";
import {
  buildDubChannelInfo,
  DEFAULT_DUB_CHANNEL_LIMIT,
  fetchDubChannelVideos,
  listDubChannels,
  MAX_DUB_CHANNEL_LIMIT,
  MIN_DUB_CHANNEL_LIMIT,
  resolveChannelVideosUrl,
} from "@/lib/dub-channels";
import { allow, clientIp } from "@/lib/rate-limit";
import { channelIdVideosUrl, channelVideosUrl } from "@/lib/ytdlp";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const idParam = searchParams.get("id")?.trim();
  const channelParam = searchParams.get("channel")?.trim();
  const refresh = searchParams.get("refresh") === "1";

  const rawLimit = Number(searchParams.get("limit"));
  const limit = Number.isFinite(rawLimit) && rawLimit > 0
    ? Math.min(MAX_DUB_CHANNEL_LIMIT, Math.max(MIN_DUB_CHANNEL_LIMIT, Math.round(rawLimit)))
    : DEFAULT_DUB_CHANNEL_LIMIT;

  if (!idParam && !channelParam) {
    return NextResponse.json({ channels: listDubChannels() });
  }

  const allChannels = listDubChannels();
  let videosUrl: string | null = null;
  let existing = null as (typeof allChannels)[number] | null;

  if (idParam) {
    const numId = Number(idParam);
    if (!Number.isInteger(numId) || numId <= 0) {
      return NextResponse.json({ error: "Mã kênh không hợp lệ." }, { status: 400 });
    }
    const dbChannel = getChannel(numId);
    if (!dbChannel) {
      return NextResponse.json({ error: "Không tìm thấy kênh YouTube này." }, { status: 404 });
    }
    videosUrl = channelIdVideosUrl(dbChannel.channelId);
    existing = allChannels.find((c) => c.dbId === dbChannel.id || c.channelId === dbChannel.channelId) ?? {
      key: `uc:${dbChannel.channelId}`,
      dbId: dbChannel.id,
      channelId: dbChannel.channelId,
      title: dbChannel.title,
      handle: dbChannel.handle,
      avatar: dbChannel.avatar,
      url: dbChannel.handle ? `https://www.youtube.com/${dbChannel.handle}` : `https://www.youtube.com/channel/${dbChannel.channelId}`,
    };
  } else if (channelParam) {
    videosUrl = channelVideosUrl(channelParam);
    if (!videosUrl) {
      return NextResponse.json(
        { error: "Link hoặc @handle kênh YouTube không hợp lệ (ví dụ: https://www.youtube.com/@EasyGerman)." },
        { status: 400 },
      );
    }
    const lowerUrl = videosUrl.toLowerCase();
    const lowerInput = channelParam.toLowerCase();
    existing =
      allChannels.find(
        (c) =>
          resolveChannelVideosUrl(c)?.toLowerCase() === lowerUrl ||
          (c.handle && c.handle.toLowerCase() === lowerInput) ||
          (c.channelId && c.channelId.toLowerCase() === lowerInput),
      ) ?? null;
  }

  if (!videosUrl) {
    return NextResponse.json({ error: "Không xác định được URL danh sách video của kênh." }, { status: 400 });
  }

  const ip = await clientIp();
  if (refresh && !allow(`dub:ch:refresh:${ip}`, 6, 10 * 60_000)) {
    return NextResponse.json(
      { error: "Bạn làm mới danh sách kênh hơi nhanh, vui lòng chờ ít phút nhé." },
      { status: 429 },
    );
  }
  const bucketOk = existing
    ? allow(`dub:ch:saved:${ip}`, 60, 10 * 60_000)
    : allow(`dub:ch:custom:${ip}`, 15, 10 * 60_000);
  if (!bucketOk) {
    return NextResponse.json(
      { error: "Bạn tải danh sách kênh quá nhiều lần trong thời gian ngắn, thử lại sau ít phút nhé." },
      { status: 429 },
    );
  }

  try {
    const listing = await fetchDubChannelVideos({
      videosUrl,
      channelId: existing?.channelId,
      limit,
      forceRefresh: refresh,
    });
    const channel = buildDubChannelInfo(listing, existing);
    return NextResponse.json({
      channel,
      videos: listing.videos,
    });
  } catch (e) {
    const msg = (e as Error)?.message || "Không lấy được danh sách video từ YouTube.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
