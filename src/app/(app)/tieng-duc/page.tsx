import { Suspense } from "react";
import type { Metadata } from "next";
import { Languages, Link2 } from "lucide-react";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listOwnLessons } from "@/lib/db";
import { lessonGridItems } from "@/lib/lesson-items";
import { fillLessonChannels } from "@/lib/channels";
import YouTubeUrlForm from "@/components/YouTubeUrlForm";
import LessonGrid from "@/components/LessonGrid";
import ContinueLearning from "@/components/ContinueLearning";
import PageHeader from "@/components/PageHeader";
import { RecentVideos } from "@/components/RecentVideos";
import { pageMeta } from "@/lib/page-meta";
import { LessonGridSkeleton } from "@/components/Skeleton";
import OwnLessons from "@/components/OwnLessons";

export const metadata: Metadata = pageMeta({
  title: "Học tiếng Đức qua video YouTube – Luyện nghe nói A1–C2",
  description:
    "Luyện nghe nói tiếng Đức theo phương pháp shadowing với video YouTube thật: phụ đề từng câu, dịch tiếng Việt, ghi âm, chép chính tả. Bài theo trình độ A1–C2.",
  path: "/tieng-duc",
});

/** Ô dán link YouTube: gọn, đặt dưới thư viện bài học */
function OwnVideo() {
  return (
    <section id="own-video" aria-labelledby="own-video-title" className="card flex scroll-mt-20 flex-col gap-3.5 p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="icon-bubble tint-link size-8">
            <Link2 className="size-4" aria-hidden />
          </span>
          <h2 id="own-video-title" className="text-base font-bold text-foreground">
            Luyện với video YouTube bất kỳ có phụ đề tiếng Đức
          </h2>
        </div>
        <p className="text-xs leading-relaxed text-muted sm:text-sm">
          Dán đường link YouTube yêu thích của bạn để tách câu tự động và luyện Shadowing ngay lập tức.
        </p>
      </div>
      <YouTubeUrlForm secondary />
      <p className="text-xs text-muted">
        Học thử miễn phí ngay lập tức — lưu thành bài học riêng (miễn phí) để giữ tiến độ và mở chế độ Chính tả.
      </p>
    </section>
  );
}

async function DeutschContent() {
  await connection();
  const user = await getCurrentUser();
  const admin = user?.role === "admin";
  fillLessonChannels();
  const allLessons = lessonGridItems(user);
  const ownVideoIds = user ? listOwnLessons(user.id).map((l) => l.videoId) : undefined;

  return (
    <>
      {/* ── Continue Learning / Own Lessons / Recent Videos ── */}
      {user && (
        <>
          <ContinueLearning userId={user.id} />
          <OwnLessons userId={user.id} />
        </>
      )}
      <RecentVideos excludeVideoIds={ownVideoIds} />

      {/* ── Video Library ── */}
      <LessonGrid lessons={allLessons} admin={admin} />
    </>
  );
}

export default function DeutschPage() {
  return (
    <main className="page gap-8 md:gap-10" data-sec="de">
      <PageHeader
        sec="de"
        compact
        icon={Languages}
        mascot
        title="Học tiếng Đức qua video"
        sub="Luyện nghe nói từng câu với phụ đề Đức–Việt, ghi âm Shadowing và chép chính tả từ A1 đến C2."
        actions={
          <a href="#own-video" className="btn btn-soft btn-sm max-sm:w-full">
            <Link2 className="size-4" aria-hidden /> Dán link YouTube
          </a>
        }
      />

      <Suspense fallback={<LessonGridSkeleton />}>
        <DeutschContent />
      </Suspense>

      <OwnVideo />
    </main>
  );
}
