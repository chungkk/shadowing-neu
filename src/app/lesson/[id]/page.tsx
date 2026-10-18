import { Suspense } from "react";
import { notFound } from "next/navigation";
import ShadowPlayer from "@/components/ShadowPlayer";
import { getLesson } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

async function LessonView({ params }: PageProps<"/lesson/[id]">) {
  const { id } = await params;
  const lesson = getLesson(Number(id));
  // Bài nháp chỉ admin xem được
  const user = await getCurrentUser();
  if (!lesson || (!lesson.published && user?.role !== "admin")) notFound();

  return (
    <ShadowPlayer
      title={lesson.title}
      level={lesson.level}
      media={{ kind: "youtube", videoId: lesson.videoId }}
      segments={lesson.segments}
      loggedIn={!!user}
      sourceUrl={`/lesson/${lesson.id}`}
    >
      {(!lesson.published || lesson.description) && (
        <div className="flex flex-col gap-1 rounded-xl bg-card-2/60 p-3 text-sm">
          {!lesson.published && <span className="font-bold text-amber">Bản nháp — chỉ admin xem được</span>}
          {lesson.description && <p className="whitespace-pre-line text-muted">{lesson.description}</p>}
        </div>
      )}
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
