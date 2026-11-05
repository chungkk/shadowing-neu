import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getCurrentUser, type User } from "@/lib/auth";
import { accessOf, lessonsFor, lockInfo } from "@/lib/access";
import { listProgress } from "@/lib/db";
import YouTubeUrlForm from "@/components/YouTubeUrlForm";
import LessonGrid from "@/components/LessonGrid";
import MascotGreeter from "@/components/MascotGreeter";
import { SoundWave } from "@/components/SoundBars";
import ContinueLearning, { percent } from "@/components/ContinueLearning";
import { RecentVideos } from "@/components/RecentVideos";
import { LessonGridSkeleton } from "@/components/Skeleton";

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

/** Đã đăng nhập: bài đang học dở (lưu trên server) · khách: video đã mở trong trình duyệt này */
async function Continue() {
  const user = await getCurrentUser();
  return user ? <ContinueLearning userId={user.id} /> : <RecentVideos />;
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 p-4 md:gap-10 md:p-6">
      <section className="sticker relative mt-2 grid items-center gap-3 bg-gold p-4 sm:p-6 md:mt-8 md:grid-cols-[minmax(0,1fr)_auto] md:gap-6 md:py-5 md:pr-4 md:pl-8">
        {/* Sóng âm phía sau linh vật, tự cắt theo góc bo của khung */}
        <div aria-hidden className="absolute inset-0 overflow-hidden rounded-[calc(1.5rem-2px)] max-md:hidden">
          <SoundWave className="absolute right-0 bottom-0 h-full w-[46%] opacity-70 [mask-image:linear-gradient(to_right,transparent,black_35%)]" />
        </div>
        <div className="relative flex min-w-0 flex-col gap-4 max-md:order-last md:gap-5">
          <h1 className="text-4xl leading-[1.05] font-extrabold text-balance sm:text-5xl lg:text-6xl">Luyện nói tiếng Đức với video thật</h1>
          <YouTubeUrlForm />
        </div>
        <div className="relative md:-mt-14 md:-mb-5">
          <MascotGreeter />
        </div>
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
