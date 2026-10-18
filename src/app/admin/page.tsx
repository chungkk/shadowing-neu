import { Suspense } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listLessons } from "@/lib/db";
import { logout, removeLesson } from "./actions";
import DeleteButton from "./DeleteButton";

async function Dashboard() {
  await requireAdmin();
  const lessons = listLessons({ includeDrafts: true });

  return (
    <>
      <div className="flex items-center gap-2">
        <h1 className="flex-1 text-2xl font-bold">Bài học ({lessons.length})</h1>
        <Link href="/admin/new" className="btn btn-primary">
          + Bài mới
        </Link>
        <form action={logout}>
          <button className="btn">Đăng xuất</button>
        </form>
      </div>

      <div className="card divide-y divide-border p-0">
        {lessons.map((l) => (
          <div key={l.id} className="flex items-center gap-3 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://i.ytimg.com/vi/${l.videoId}/default.jpg`} alt="" className="h-12 w-16 rounded object-cover" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{l.title}</div>
              <div className="flex gap-2 text-xs text-muted">
                <span className="font-semibold text-accent">{l.level}</span>
                <span>{l.segmentCount} câu</span>
                <span>{l.published ? "Đã đăng" : "Bản nháp"}</span>
              </div>
            </div>
            <Link href={`/lesson/${l.id}`} className="btn">
              Xem
            </Link>
            <Link href={`/admin/${l.id}`} className="btn">
              Sửa
            </Link>
            <DeleteButton action={removeLesson.bind(null, l.id)} />
          </div>
        ))}
        {!lessons.length && <p className="p-6 text-center text-sm text-muted">Chưa có bài nào. Bấm “+ Bài mới”.</p>}
      </div>
    </>
  );
}

export default function AdminPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 pt-10">
      <Link href="/" className="text-sm text-muted hover:underline">
        ← Trang chủ
      </Link>
      <Suspense fallback={<p className="text-muted">Đang tải…</p>}>
        <Dashboard />
      </Suspense>
    </main>
  );
}
