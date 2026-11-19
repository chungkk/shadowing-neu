import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import LessonForm from "../LessonForm";
import AdminNav from "../AdminNav";
import { FormSkeleton } from "@/components/Skeleton";

/** ?v=<videoId> (bấm "Thêm bài" ở trang kênh) → điền sẵn link và tự lấy phụ đề */
async function New({ searchParams }: PageProps<"/admin/new">) {
  await requireAdmin();
  const v = (await searchParams).v;
  const videoId = typeof v === "string" && /^[\w-]{11}$/.test(v) ? v : null;
  return <LessonForm presetUrl={videoId ? `https://www.youtube.com/watch?v=${videoId}` : undefined} />;
}

export default function NewLessonPage(props: PageProps<"/admin/new">) {
  return (
    <main className="page page-narrow">
      <AdminNav />
      <h1 className="page-title">Bài học mới</h1>
      <Suspense fallback={<FormSkeleton />}>
        <New {...props} />
      </Suspense>
    </main>
  );
}
