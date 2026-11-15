import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getLesson } from "@/lib/db";
import { toSrt } from "@/lib/subtitles";
import LessonForm from "../LessonForm";
import { FormSkeleton } from "@/components/Skeleton";

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
        slug: lesson.slug,
        description: lesson.description,
        level: lesson.level,
        published: lesson.published,
        dictation: lesson.dictation,
        // Đúng các dòng đã lưu (người học thấy bản gộp câu của chúng) — không gộp sẵn ở đây,
        // vì gộp lại lần nữa khi lưu sẽ ra số câu khác → lệch tiến độ / điểm Dictation của người học
        srt: toSrt(lesson.segments),
      }}
    />
  );
}

export default function EditLessonPage(props: PageProps<"/admin/[id]">) {
  return (
    <main className="page page-narrow">
      <h1 className="page-title">Sửa bài học</h1>
      <Suspense fallback={<FormSkeleton />}>
        <Edit {...props} />
      </Suspense>
    </main>
  );
}
