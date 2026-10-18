import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getLesson } from "@/lib/db";
import { toSrt } from "@/lib/subtitles";
import LessonForm from "../LessonForm";

async function Edit({ params }: PageProps<"/admin/[id]">) {
  await requireAdmin();
  const lesson = getLesson(Number((await params).id));
  if (!lesson) notFound();

  return (
    <LessonForm
      initial={{
        id: lesson.id,
        url: `https://www.youtube.com/watch?v=${lesson.videoId}`,
        title: lesson.title,
        description: lesson.description,
        level: lesson.level,
        published: lesson.published,
        srt: toSrt(lesson.segments),
      }}
    />
  );
}

export default function EditLessonPage(props: PageProps<"/admin/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 md:p-6">
      <h1 className="text-2xl font-extrabold">Sửa bài học</h1>
      <Suspense fallback={<p className="text-muted">Đang tải…</p>}>
        <Edit {...props} />
      </Suspense>
    </main>
  );
}
