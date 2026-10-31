import { Suspense } from "react";
import { connection } from "next/server";
import { listLessons } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import YouTubeUrlForm from "@/components/YouTubeUrlForm";
import LessonGrid from "@/components/LessonGrid";
import ContinueLearning from "@/components/ContinueLearning";
import { RecentVideos } from "@/components/RecentVideos";

const NEW_MS = 3 * 86_400_000; // bài đăng trong 3 ngày → nhãn "Mới" (lâu hơn thì gần như bài nào cũng "Mới")

/** Dữ liệu thẻ bài: chỉ gửi xuống trình duyệt những gì thẻ cần */
function lessonItems() {
  const now = Date.now();
  return listLessons().map((l) => ({
    id: l.id,
    title: l.title,
    videoId: l.videoId,
    level: l.level,
    description: l.description,
    sentences: l.sentenceCount ?? l.segmentCount,
    isNew: now - +new Date(l.createdAt.replace(" ", "T") + "Z") < NEW_MS,
  }));
}

async function Lessons() {
  await connection(); // đọc DB lúc request, không prerender
  return <LessonGrid lessons={lessonItems()} />;
}

/** Đã đăng nhập: bài đang học dở (lưu trên server) · khách: video đã mở trong trình duyệt này */
async function Continue() {
  const user = await getCurrentUser();
  return user ? <ContinueLearning userId={user.id} /> : <RecentVideos />;
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 p-4 md:p-6">
      <section className="flex flex-col gap-4">
        <h1 className="text-2xl font-extrabold">Luyện nói tiếng Đức với video thật</h1>
        <YouTubeUrlForm />
      </section>

      <Suspense>
        <Continue />
      </Suspense>

      <Suspense fallback={<p className="text-sm text-muted">Đang tải bài học…</p>}>
        <Lessons />
      </Suspense>
    </main>
  );
}
