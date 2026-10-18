import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { FileAudio, MonitorPlay } from "lucide-react";
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
      <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="card flex flex-col gap-4 p-6">
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
        </div>
        <Link href="/local" className="card group flex flex-col justify-center gap-2 p-6 transition hover:border-accent">
          <span className="flex size-11 items-center justify-center rounded-xl bg-amber/15 text-amber">
            <FileAudio className="size-6" />
          </span>
          <h2 className="text-lg font-extrabold">File trên máy</h2>
          <p className="text-sm text-muted">Tải lên file audio / video của bạn, kèm phụ đề hoặc để AI tự tạo.</p>
        </Link>
      </section>

      <RecentVideos />

      <Suspense fallback={<p className="text-sm text-muted">Đang tải bài học…</p>}>
        <Lessons />
      </Suspense>
    </main>
  );
}
