import { Suspense } from "react";
import { connection } from "next/server";
import { MonitorPlay } from "lucide-react";
import { listLessons } from "@/lib/db";
import YouTubeUrlForm from "@/components/YouTubeUrlForm";
import LessonGrid from "@/components/LessonGrid";
import { RecentVideos } from "@/components/RecentVideos";

async function Lessons() {
  await connection(); // đọc DB lúc request, không prerender
  return <LessonGrid lessons={listLessons()} />;
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 p-4 md:p-6">
      <section className="card flex flex-col gap-4 p-6">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-red-500/15 text-red-400">
            <MonitorPlay className="size-6" />
          </span>
          <div>
            <h1 className="text-xl font-extrabold md:text-2xl">Luyện với video YouTube bất kỳ</h1>
            <p className="text-sm text-muted">Nghe từng câu, nói lại theo, ghi âm và so sánh.</p>
          </div>
        </div>
        <YouTubeUrlForm />
      </section>

      <RecentVideos />

      <Suspense fallback={<p className="text-sm text-muted">Đang tải bài học…</p>}>
        <Lessons />
      </Suspense>
    </main>
  );
}
