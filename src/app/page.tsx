import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getCurrentUser, type User } from "@/lib/auth";
import { accessOf, lessonsFor, lockInfo } from "@/lib/access";
import { listProgress } from "@/lib/db";
import YouTubeUrlForm from "@/components/YouTubeUrlForm";
import LessonGrid from "@/components/LessonGrid";
import Mascot from "@/components/Mascot";
import ContinueLearning, { percent } from "@/components/ContinueLearning";
import { RecentVideos } from "@/components/RecentVideos";
import { LessonGridSkeleton } from "@/components/Skeleton";
import TodayStrip from "@/components/TodayStrip";

// Link đã lọc (/?level=B1) vẫn là trang chủ với Google
export const metadata: Metadata = { alternates: { canonical: "/" } };

const NEW_MS = 3 * 86_400_000; // bài đăng trong 3 ngày → nhãn "Mới" (lâu hơn thì gần như bài nào cũng "Mới")

/** Dữ liệu thẻ bài: chỉ gửi xuống trình duyệt những gì thẻ cần */
function lessonItems(user: User | null) {
  const now = Date.now();
  // Admin học được mọi bài, nhưng thẻ bài hiện nhãn như khách thấy (🔒 / Miễn phí) để admin kiểm tra
  const access = accessOf(user?.role === "admin" ? null : user);
  const progress = new Map(user ? listProgress(user.id).map((p) => [p.source, p]) : []);
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
      isNew: now - +new Date(l.createdAt.replace(" ", "T") + "Z") < NEW_MS,
      access: access(l.id),
    };
  });
  // Bài học được ngay (miễn phí / đã mở) lên đầu, trong mỗi nhóm vẫn mới nhất trước
  return items.sort((x, y) => +(x.access === "locked") - +(y.access === "locked"));
}

async function Lessons() {
  await connection(); // đọc DB lúc request, không prerender
  const user = await getCurrentUser();
  const admin = user?.role === "admin";
  return <LessonGrid lessons={lessonItems(user)} lock={lockInfo(admin ? null : user)} admin={admin} />;
}

/** Dải "Hôm nay" trong hero — chỉ khi đã đăng nhập (khách giữ hero như cũ) */
async function Today() {
  const user = await getCurrentUser();
  return user ? (
    <div className="col-span-2">
      <TodayStrip userId={user.id} />
    </div>
  ) : null;
}

/** Đã đăng nhập: bài đang học dở (lưu trên server) · khách: video đã mở trong trình duyệt này */
async function Continue() {
  const user = await getCurrentUser();
  return user ? <ContinueLearning userId={user.id} /> : <RecentVideos />;
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 p-4 md:gap-10 md:p-6">
      <section className="sticker grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-3 p-4 sm:gap-x-6 sm:p-6">
        <Mascot className="bob size-20 sm:row-span-2 sm:size-36" />
        <div className="flex flex-col items-start gap-1.5">
          <span className="-rotate-2 rounded-2xl rounded-bl-sm border-2 border-ink bg-gold px-3 py-0.5 text-sm font-extrabold text-black">Hallo! Cùng nói nào!</span>
          <h1 className="text-2xl leading-tight font-extrabold sm:text-3xl">Luyện nói tiếng Đức với video thật</h1>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <YouTubeUrlForm />
        </div>
        <Suspense>
          <Today />
        </Suspense>
      </section>

      <Suspense>
        <Continue />
      </Suspense>

      <Suspense fallback={<LessonGridSkeleton />}>
        <Lessons />
      </Suspense>
    </main>
  );
}
