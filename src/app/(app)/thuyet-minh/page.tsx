import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { ChristmasChannelIcon } from "@/components/FestiveIcons";
import PageHeader from "@/components/PageHeader";
import { ListSkeleton } from "@/components/Skeleton";
import YouTubeDubClient, { type DubSuggestion } from "@/components/YouTubeDubClient";
import { accessOf } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { listLessons } from "@/lib/db";
import {
  DEFAULT_DUB_CHANNEL_LIMIT,
  getCachedDubChannelVideos,
  listDubChannels,
  resolveChannelVideosUrl,
} from "@/lib/dub-channels";
import { pageMeta } from "@/lib/page-meta";

export const metadata: Metadata = pageMeta({
  title: "Xem YouTube thuyết minh tiếng Việt miễn phí",
  description:
    "Dán link YouTube bất kỳ ngôn ngữ nào để tự động dịch và nghe thuyết minh tiếng Việt trực tiếp ngay trên trình duyệt. Hỗ trợ phụ đề song ngữ, tua nhanh và chỉnh âm lượng gốc.",
  path: "/thuyet-minh",
});

async function DubPageContent() {
  await connection();
  const user = await getCurrentUser();
  const isAdmin = user?.role === "admin";
  // Gợi ý vài bài miễn phí từ thư viện HalloVN để người mới bấm nghe thử ngay
  const access = accessOf(null);
  const seen = new Set<string>();
  const suggestions: DubSuggestion[] = [];
  for (const lesson of listLessons()) {
    if (access(lesson.id) === "locked") continue;
    if (seen.has(lesson.videoId)) continue;
    seen.add(lesson.videoId);
    suggestions.push({
      videoId: lesson.videoId,
      title: lesson.title,
      meta: lesson.level,
    });
    if (suggestions.length >= 4) break;
  }

  const channels = listDubChannels();
  const firstChannel = channels[0];
  const firstUrl = firstChannel ? resolveChannelVideosUrl(firstChannel) : null;
  const cachedFirst = firstUrl ? getCachedDubChannelVideos(firstUrl, DEFAULT_DUB_CHANNEL_LIMIT) : null;
  const initialChannelVideos = firstChannel && cachedFirst ? { key: firstChannel.key, videos: cachedFirst.videos } : null;

  return (
    <YouTubeDubClient
      suggestions={suggestions}
      channels={channels}
      initialChannelVideos={initialChannelVideos}
      isAdmin={isAdmin}
    />
  );
}

export default function ThuyetMinhPage() {
  return (
    <main className="page gap-6 md:gap-8" data-sec="dub">
      <PageHeader
        sec="dub"
        icon={ChristmasChannelIcon}
        title="Xem YouTube thuyết minh tiếng Việt"
        sub="Dán link video YouTube bất kỳ — hệ thống tự dịch sang tiếng Việt và đọc thuyết minh song song trực tiếp trên trình duyệt."
      />

      <Suspense fallback={<ListSkeleton />}>
        <DubPageContent />
      </Suspense>
    </main>
  );
}
