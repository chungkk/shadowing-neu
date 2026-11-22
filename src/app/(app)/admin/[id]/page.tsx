import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getLesson } from "@/lib/db";
import { lessonPath } from "@/lib/slug";
import { toSrt } from "@/lib/subtitles";
import LessonForm from "../LessonForm";
import AdminPageHeader from "../_components/AdminPageHeader";
import { FormSkeleton } from "@/components/Skeleton";

async function Edit({ params }: PageProps<"/admin/[id]">) {
  await requireAdmin();
  const lesson = getLesson(Number((await params).id));
  if (!lesson) notFound();

  return (
    <>
      <AdminPageHeader
        crumbs={[
          { label: "Nội dung học tập" },
          { label: "Bài học Tiếng Đức", href: "/admin/lessons" },
          { label: `#${lesson.id}` },
        ]}
        title="Sửa bài học"
        description={lesson.title}
        actions={
          <>
            <Link href={lessonPath(lesson.slug)} className="btn btn-ghost btn-sm">
              <ExternalLink className="size-4" aria-hidden /> Xem bài học
            </Link>
            <Link href="/admin/lessons" className="btn btn-sm">
              <ArrowLeft className="size-4" aria-hidden /> Danh sách
            </Link>
          </>
        }
      />
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
          segments: lesson.segments,
        }}
      />
    </>
  );
}

export default function EditLessonPage(props: PageProps<"/admin/[id]">) {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <Edit {...props} />
    </Suspense>
  );
}
