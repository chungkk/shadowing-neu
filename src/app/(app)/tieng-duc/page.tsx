import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Languages } from "lucide-react";
import { connection } from "next/server";
import { getCurrentUser, type User } from "@/lib/auth";
import { accessOf, lessonsFor, lockInfo } from "@/lib/access";
import { LEVELS, learningPathStats, listChannels, listProgress } from "@/lib/db";
import { fillLessonChannels } from "@/lib/channels";
import YouTubeUrlForm from "@/components/YouTubeUrlForm";
import LessonGrid from "@/components/LessonGrid";
import LearningPath from "@/components/LearningPath";
import PageHeader from "@/components/PageHeader";
import ContinueLearning from "@/components/ContinueLearning";
import { percent } from "@/lib/progress";
import { RecentVideos } from "@/components/RecentVideos";
import { pageMeta } from "@/lib/page-meta";
import { LessonGridSkeleton } from "@/components/Skeleton";
import TodayStrip from "@/components/TodayStrip";
import { lessonPath } from "@/lib/slug";
import { levelCatalogPath } from "@/lib/lesson-seo";
import OwnLessons from "@/components/OwnLessons";

// Link đã lọc (/tieng-duc?level=B1) vẫn là trang học tiếng Đức với Google
export const metadata: Metadata = pageMeta({
  title: "Học tiếng Đức qua video YouTube – Luyện nghe nói A1–C2",
  description:
    "Luyện nghe nói tiếng Đức theo phương pháp shadowing với video YouTube thật: phụ đề từng câu, dịch tiếng Việt, ghi âm, chép chính tả. Bài theo trình độ A1–C2.",
  path: "/tieng-duc",
});

const NEW_MS = 3 * 86_400_000; // bài đăng trong 3 ngày → nhãn "Mới" (lâu hơn thì gần như bài nào cũng "Mới")

/** Dữ liệu thẻ bài: chỉ gửi xuống trình duyệt những gì thẻ cần */
function lessonItems(user: User | null) {
  const now = Date.now();
  // Admin học được mọi bài, nhưng thẻ bài hiện nhãn như khách thấy (🔒 / Miễn phí) để admin kiểm tra
  const access = accessOf(user?.role === "admin" ? null : user);
  const progress = new Map(user ? listProgress(user.id).map((p) => [p.source, p]) : []);
  // Ảnh kênh: chỉ kênh admin đã lưu (khớp theo @handle trong link kênh)
  const avatars = new Map(listChannels().flatMap((c) => (c.handle && c.avatar ? [[c.handle.toLowerCase(), c.avatar] as const] : [])));
  const items = lessonsFor(user?.role === "admin" ? null : (user?.id ?? null)).map((l) => {
    const p = progress.get(`/lesson/${l.id}`); // khoá tiến độ của bài vẫn theo id
    return {
      id: l.id,
      title: l.title,
      slug: l.slug,
      videoId: l.videoId,
      level: l.level,
      description: l.description,
      sentences: l.sentenceCount ?? l.segmentCount,
      duration: l.duration ?? 0,
      dictation: l.dictation,
      percent: p ? percent(p) : 0,
      dictCount: p ? Object.keys(p.dictDone).length : 0,
      seenCount: p ? p.seen.length : 0,
      isNew: now - +new Date(l.createdAt.replace(" ", "T") + "Z") < NEW_MS,
      access: access(l.id),
      channel: l.channel,
      channelUrl: l.channelUrl || null,
      channelAvatar: avatars.get(l.channelUrl?.match(/\/(@[^/?#]+)/)?.[1]?.toLowerCase() ?? "") ?? null,
    };
  });
  // Bài học được ngay (miễn phí / đã mở) lên đầu, trong mỗi nhóm vẫn mới nhất trước
  return items.sort((x, y) => +(x.access === "locked") - +(y.access === "locked"));
}

async function Lessons() {
  await connection(); // đọc DB lúc request, không prerender
  const user = await getCurrentUser();
  const admin = user?.role === "admin";
  fillLessonChannels(); // bài chưa biết kênh → lấy nền sau khi trả trang
  return <LessonGrid lessons={lessonItems(user)} lock={lockInfo(admin ? null : user)} admin={admin} />;
}

const levelRank = (lv: string) => {
  const i = (LEVELS as readonly string[]).indexOf(lv);
  return i < 0 ? LEVELS.length : i;
};

/** Ô dán link YouTube — lựa chọn phụ: người mới nên bắt đầu từ bài có sẵn */
function OwnVideo() {
  return (
    <section aria-labelledby="own-video" className="surface flex flex-col gap-3 p-4 sm:p-5">
      <h2 id="own-video" className="text-sm font-semibold text-muted">
        Hoặc luyện với video YouTube bất kỳ có phụ đề tiếng Đức
      </h2>
      <YouTubeUrlForm secondary />
      <p className="text-xs text-muted">Học thử miễn phí, không lưu tiến độ — muốn lưu thì đổi kim cương để tạo bài học riêng.</p>
    </section>
  );
}

/** Khách: bìa vở giới thiệu, nút chính = bài dễ nhất học được ngay, chip trình độ lọc thư viện */
function GuestHero({ first, levels }: { first?: { slug: string; title: string; level: string }; levels: string[] }) {
  return (
    <PageHeader
      sec="de"
      icon={Languages}
      mascot
      title="Luyện nói tiếng Đức với video thật"
      sub="Nghe từng câu, nói theo và ghi âm để so với người bản xứ."
      meta={<span className="max-sm:hidden">Shadowing · Chính tả · A1 – C2</span>}
      actions={
        first && (
          <Link href={lessonPath(first.slug)} className="btn btn-primary btn-lg max-sm:w-full">
            Thử bài {first.level} đầu tiên <ArrowRight className="size-5" />
          </Link>
        )
      }
    >
      {levels.length > 1 && (
        <div className="nhan-line flex flex-wrap items-center gap-2 pb-2">
          <span className="text-sm font-semibold text-muted">Trình độ của bạn:</span>
          {levels.map((lv) => (
            <Link key={lv} href={levelCatalogPath(lv)} className="chip hit-44">
              {lv}
            </Link>
          ))}
        </div>
      )}
    </PageHeader>
  );
}

/** Đầu trang: đã đăng nhập → bìa vở chào + dải "Hôm nay" + Lộ trình học; khách → bìa giới thiệu + Lộ trình học */
async function Top() {
  await connection();
  const user = await getCurrentUser();
  const items = lessonItems(user);
  if (user) {
    const pathStats = learningPathStats(user.id);
    return (
      <>
        <div className="flex flex-col gap-4">
          <PageHeader sec="de" icon={Languages} mascot title={`Hallo, ${user.name}!`} sub="Hôm nay học gì? Học tiếp bài dở, ôn từ đến hạn hoặc theo lộ trình bên dưới." />
          <TodayStrip userId={user.id} />
        </div>
        <LearningPath
          lessons={items}
          loggedIn
          sentencesToday={pathStats.sentencesToday}
          reviewsToday={pathStats.reviewsToday}
          weakWords={pathStats.weakWords}
        />
        <ContinueLearning userId={user.id} />
        <OwnLessons userId={user.id} />
      </>
    );
  }
  const open = items.filter((l) => l.access !== "locked");
  const first = [...open].sort((a, b) => levelRank(a.level) - levelRank(b.level) || a.id - b.id)[0];
  const levels = [...new Set(open.map((l) => l.level))].sort((a, b) => levelRank(a) - levelRank(b));
  return (
    <>
      <GuestHero first={first} levels={levels} />
      <LearningPath lessons={items} loggedIn={false} />
      <RecentVideos />
    </>
  );
}

export default function Home() {
  return (
    <main className="page gap-8 md:gap-10">
      <Suspense fallback={<div className="skeleton h-56 rounded-[var(--radius-lg)]" />}>
        <Top />
      </Suspense>

      <Suspense fallback={<LessonGridSkeleton />}>
        <Lessons />
      </Suspense>

      {/* Ô dán link nằm dưới thư viện (lựa chọn phụ) */}
      <OwnVideo />
    </main>
  );
}
