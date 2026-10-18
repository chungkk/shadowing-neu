import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
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
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-4 pt-12">
      <header className="text-center">
        <h1 className="text-3xl font-bold">🇩🇪 Deutsch Shadowing</h1>
        <p className="mt-2 text-muted">Nghe từng câu, nói lại theo, ghi âm và so sánh.</p>
      </header>

      <section className="card flex flex-col gap-3">
        <h2 className="font-semibold">Tự luyện với video YouTube bất kỳ</h2>
        <YouTubeUrlForm />
        <p className="text-xs text-muted">
          Phụ đề tiếng Đức được lấy tự động. Có file audio/video trên máy?{" "}
          <Link href="/local" className="text-accent underline">
            Luyện với file local
          </Link>
        </p>
      </section>

      <RecentVideos />

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Bài học</h2>
        <Suspense fallback={<p className="text-sm text-muted">Đang tải bài học…</p>}>
          <Lessons />
        </Suspense>
      </section>

      <footer className="pb-6 text-center text-xs text-muted">
        <Link href="/admin" className="hover:underline">
          Quản trị
        </Link>
      </footer>
    </main>
  );
}
