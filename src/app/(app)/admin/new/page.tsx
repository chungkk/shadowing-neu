import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import LessonForm from "../LessonForm";
import AdminPageHeader from "../_components/AdminPageHeader";
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
    <>
      <AdminPageHeader
        crumbs={[
          { label: "Nội dung học tập" },
          { label: "Bài học Tiếng Đức", href: "/admin/lessons" },
          { label: "Bài học mới" },
        ]}
        title="Bài học mới"
        description="Dán link YouTube để lấy phụ đề tự động, rà soát câu chữ và chọn trình độ trước khi đăng."
        actions={
          <Link href="/admin/lessons" className="btn btn-sm">
            <ArrowLeft className="size-4" aria-hidden /> Danh sách bài học
          </Link>
        }
      />
      <Suspense fallback={<FormSkeleton />}>
        <New {...props} />
      </Suspense>
    </>
  );
}
