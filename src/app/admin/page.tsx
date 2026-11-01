import { Suspense } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listLessons } from "@/lib/db";
import { removeLesson, toggleLessonPublished } from "./actions";
import DeleteButton from "./DeleteButton";
import LevelBadge from "@/components/LevelBadge";
import { ListSkeleton } from "@/components/Skeleton";

async function Dashboard() {
  await requireAdmin();
  const lessons = listLessons({ includeDrafts: true });

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="flex-1 text-2xl font-extrabold max-sm:basis-full">Bài học ({lessons.length})</h1>
        <Link href="/admin/transcripts" className="btn">
          Phụ đề đã lưu
        </Link>
        <Link href="/admin/users" className="btn">
          Người dùng
        </Link>
        <Link href="/admin/new" className="btn btn-primary">
          + Bài mới
        </Link>
      </div>

      <div className="card divide-y divide-border p-0">
        {lessons.map((l) => (
          <div key={l.id} className="flex flex-wrap items-center gap-3 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://i.ytimg.com/vi/${l.videoId}/default.jpg`} alt="" className="h-12 w-20 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{l.title}</div>
              <div className="flex gap-2 text-xs text-muted">
                <LevelBadge level={l.level} className="text-xs" />
                <span>{l.segmentCount} câu</span>
              </div>
            </div>
            {/* Điện thoại: các nút xuống hàng riêng dưới tiêu đề */}
            <div className="flex flex-wrap gap-2 max-sm:basis-full max-sm:justify-end">
              <form action={toggleLessonPublished.bind(null, l.id, !l.published)}>
                <button
                  title={l.published ? "Bấm để chuyển về bản nháp" : "Bấm để đăng công khai"}
                  className={`btn ${l.published ? "text-accent" : "text-muted"}`}
                >
                  {l.published ? "● Đã đăng" : "○ Nháp"}
                </button>
              </form>
              <Link href={`/${l.slug}`} className="btn">
                Xem
              </Link>
              <Link href={`/admin/${l.id}`} className="btn">
                Sửa
              </Link>
              <DeleteButton action={removeLesson.bind(null, l.id)} />
            </div>
          </div>
        ))}
        {!lessons.length && <p className="p-6 text-center text-sm text-muted">Chưa có bài nào. Bấm “+ Bài mới”.</p>}
      </div>
    </>
  );
}

export default function AdminPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 md:p-6">
      <Suspense fallback={<ListSkeleton thumb />}>
        <Dashboard />
      </Suspense>
    </main>
  );
}
