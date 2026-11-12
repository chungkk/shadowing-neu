import { Suspense } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { lessonUnlockStats, listLessons } from "@/lib/db";
import { earnableFreePoints, lockSettings } from "@/lib/access";
import { FREE_PICKS, LESSON_PRICE } from "@/lib/lesson-lock";
import { removeLesson, setLessonLock, toggleFreeLesson, toggleLessonPublished } from "./actions";
import DeleteButton from "./DeleteButton";
import LevelBadge from "@/components/LevelBadge";
import { ListSkeleton } from "@/components/Skeleton";
import { lessonPath } from "@/lib/slug";

const fmt = (n: number) => n.toLocaleString("vi-VN");

/** Khoá bài học: bật / tắt + tình trạng. Bài miễn phí chọn bằng nút "Miễn phí" ở từng bài bên dưới */
function LockPanel({ enabled, freeCount }: { enabled: boolean; freeCount: number }) {
  const s = lessonUnlockStats();
  const earnable = earnableFreePoints();
  const short = earnable < LESSON_PRICE; // bài miễn phí không kiếm đủ kim cương để mở 1 bài
  return (
    <div className="card flex flex-wrap items-center gap-3 p-4">
      <Lock className={`size-5 shrink-0 ${enabled ? "text-accent-text" : "text-muted"}`} />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-bold">
          Khoá bài học: {enabled ? <span className="text-accent-text">đang bật</span> : <span className="text-muted">đang tắt — mọi bài đều mở</span>}
        </p>
        <p className="text-xs text-muted">
          Khách chỉ học {freeCount} bài “Miễn phí” (chọn ở từng bài bên dưới). Người đã đăng nhập chọn thêm {FREE_PICKS} bài, sau đó{" "}
          {fmt(LESSON_PRICE)} kim cương / bài. Bài ai đang học dở lúc bật vẫn học tiếp được.
        </p>
        {short && (
          <p className="text-xs font-bold text-amber">
            Các bài “Miễn phí” có bật Dictation chỉ kiếm được tối đa {fmt(earnable)} kim cương, chưa đủ {fmt(LESSON_PRICE)} để mở 1 bài. Hãy bật Dictation hoặc thêm bài miễn phí.
          </p>
        )}
        {s.users > 0 && (
          <p className="text-xs text-muted">
            Đã mở khoá: {fmt(s.pick)} lượt miễn phí · {fmt(s.buy)} lượt mua ({fmt(s.spent)} kim cương) · {fmt(s.legacy)} bài học dở · {fmt(s.users)} người
          </p>
        )}
      </div>
      <form action={setLessonLock.bind(null, !enabled)} className="max-sm:basis-full max-sm:text-right">
        <button
          className={`btn ${enabled ? "" : "btn-primary"}`}
          disabled={!enabled && short}
          title={!enabled && short ? "Các bài “Miễn phí” chưa kiếm đủ kim cương để mở 1 bài" : undefined}
        >
          {enabled ? "Tắt khoá" : "Bật khoá"}
        </button>
      </form>
    </div>
  );
}

async function Dashboard() {
  await requireAdmin();
  const lessons = listLessons({ includeDrafts: true });
  const lock = lockSettings();
  const free = new Set(lock.free.filter((id) => lessons.some((l) => l.id === id))); // bỏ id bài đã xoá

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
        <Link href="/admin/feedback" className="btn">
          Góp ý
        </Link>
        <Link href="/admin/news" className="btn">
          Tin tức
        </Link>
        <Link href="/admin/new" className="btn btn-primary">
          + Bài mới
        </Link>
      </div>

      <LockPanel enabled={lock.enabled} freeCount={free.size} />

      <div className="card divide-y divide-border p-0">
        {lessons.map((l) => (
          <div key={l.id} className="flex flex-wrap items-center gap-3 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://i.ytimg.com/vi/${l.videoId}/default.jpg`} alt="" className="h-12 w-20 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{l.title}</div>
              <div className="flex gap-2 text-xs text-muted">
                <LevelBadge level={l.level} className="text-xs" />
                <span>{l.sentenceCount} câu</span>
                {l.dictation && <span className="text-gem">Dictation</span>}
              </div>
            </div>
            {/* Điện thoại: các nút xuống hàng riêng dưới tiêu đề */}
            <div className="flex flex-wrap gap-2 max-sm:basis-full max-sm:justify-end">
              <form action={toggleLessonPublished.bind(null, l.id, !l.published)}>
                <button
                  title={l.published ? "Bấm để chuyển về bản nháp" : "Bấm để đăng công khai"}
                  className={`btn ${l.published ? "text-accent-text" : "text-muted"}`}
                >
                  {l.published ? "● Đã đăng" : "○ Nháp"}
                </button>
              </form>
              {/* Bài miễn phí (khoá bài học): khách cũng học được */}
              <form action={toggleFreeLesson.bind(null, l.id, !free.has(l.id))}>
                <button
                  title={free.has(l.id) ? "Bấm để bỏ miễn phí" : "Bấm để cho khách học miễn phí bài này"}
                  className={`btn ${free.has(l.id) ? "text-accent-text" : "text-muted"}`}
                >
                  {free.has(l.id) ? "● Miễn phí" : "○ Miễn phí"}
                </button>
              </form>
              <Link href={lessonPath(l.slug)} className="btn">
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
