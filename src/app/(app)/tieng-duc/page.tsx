import { Suspense } from "react";
import type { Metadata } from "next";
import { Link2 } from "lucide-react";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { lockInfo } from "@/lib/access";
import { lessonGridItems } from "@/lib/lesson-items";
import { fillLessonChannels } from "@/lib/channels";
import YouTubeUrlForm from "@/components/YouTubeUrlForm";
import LessonGrid from "@/components/LessonGrid";
import ContinueLearning from "@/components/ContinueLearning";
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
    <section aria-labelledby="own-video" className="card flex flex-col gap-3.5 p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="icon-bubble tint-link size-8">
            <Link2 className="size-4" aria-hidden />
          </span>
          <h2 id="own-video" className="text-base font-bold text-foreground">
            Luyện với video YouTube bất kỳ có phụ đề tiếng Đức
          </h2>
        </div>
        <p className="text-xs leading-relaxed text-muted sm:text-sm">
          Dán đường link YouTube yêu thích của bạn để tách câu tự động, luyện Shadowing và chép chính tả ngay lập tức.
        </p>
      </div>
      <YouTubeUrlForm secondary />
      <p className="text-xs text-muted">Học thử miễn phí (không lưu tiến độ) — hoặc đổi kim cương để lưu thành bài học riêng.</p>
    </section>
  );
}

async function DeutschContent() {
  await connection();
  const user = await getCurrentUser();
  const admin = user?.role === "admin";
  fillLessonChannels();
  const allLessons = lessonGridItems(user);

  return (
    <>
      <h1 className="sr-only">Học tiếng Đức qua video YouTube – Luyện nghe nói A1–C2</h1>

      {/* ── Continue Learning / Own Lessons / Recent Videos ── */}
      {user ? (
        <>
          <ContinueLearning userId={user.id} />
          <OwnLessons userId={user.id} />
        </>
      ) : (
        <RecentVideos />
      )}

      {/* ── Learning Levels (A1–C2) + Explore by Topic + Video Library ── */}
      <LessonGrid lessons={allLessons} lock={lockInfo(admin ? null : user)} admin={admin} showExplore />
    </>
  );
}

export default function DeutschPage() {
  return (
    <main className="page gap-9 md:gap-11" data-sec="de">
      <Suspense fallback={<LessonGridSkeleton />}>
        <DeutschContent />
      </Suspense>

      <OwnVideo />
    </main>
  );
}
