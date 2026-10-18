import { Suspense } from "react";
import { notFound } from "next/navigation";
import ShadowPlayer from "@/components/ShadowPlayer";
import { getLesson } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

async function LessonView({ params }: PageProps<"/lesson/[id]">) {
  const { id } = await params;
  const lesson = getLesson(Number(id));
  // Bài nháp chỉ admin xem được
  if (!lesson || (!lesson.published && !(await isAdmin()))) notFound();

  return (
    <ShadowPlayer title={lesson.title} media={{ kind: "youtube", videoId: lesson.videoId }} segments={lesson.segments}>
      <div className="flex flex-col gap-1 text-sm">
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded bg-accent/15 px-1.5 py-0.5 font-semibold text-accent">{lesson.level}</span>
          {!lesson.published && <span className="text-muted">(Bản nháp)</span>}
        </div>
        {lesson.description && <p className="whitespace-pre-line text-muted">{lesson.description}</p>}
      </div>
    </ShadowPlayer>
  );
}

export default function Page(props: PageProps<"/lesson/[id]">) {
  return (
    <Suspense fallback={<p className="p-10 text-center text-muted">Đang tải bài học…</p>}>
      <LessonView {...props} />
    </Suspense>
  );
}
