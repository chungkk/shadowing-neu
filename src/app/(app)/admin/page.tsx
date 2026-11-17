import { Suspense } from "react";
import Link from "next/link";
import { Circle, CircleCheck, ListVideo, Lock, Plus } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { lessonUnlockStats, listLessons } from "@/lib/db";
import { earnableFreePoints, lockSettings } from "@/lib/access";
import { FREE_PICKS, LESSON_PRICE } from "@/lib/lesson-lock";
import { removeLesson, setLessonLock, toggleFreeLesson, toggleLessonPublished } from "./actions";
import DeleteButton from "./DeleteButton";
import AdminNav from "./AdminNav";
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
    <div className="surface flex flex-wrap items-start gap-3 p-4">
      <Lock className={`mt-0.5 size-5 shrink-0 ${enabled ? "text-ok-text" : "text-muted"}`} aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
        <p className="flex flex-wrap items-center gap-2 font-semibold">
          Khoá bài học:{" "}
          {enabled ? <span className="badge badge-ok">đang bật</span> : <span className="badge badge-muted">đang tắt — mọi bài đều mở</span>}
        </p>
        <p className="text-xs leading-relaxed text-muted">
          Khách chỉ học {freeCount} bài “Miễn phí” (chọn ở từng bài bên dưới). Người đã đăng nhập chọn thêm {FREE_PICKS} bài, sau đó{" "}
          {fmt(LESSON_PRICE)} kim cương / bài. Bài ai đang học dở lúc bật vẫn học tiếp được.
        </p>
        {short && (
          <p className="alert alert-warn mt-1 text-xs">
            Các bài “Miễn phí” có bật Dictation chỉ kiếm được tối đa {fmt(earnable)} kim cương, chưa đủ {fmt(LESSON_PRICE)} để mở 1 bài. Hãy bật Dictation hoặc thêm bài miễn phí.
          </p>
        )}
        {s.users > 0 && (
          <p className="text-xs text-muted">
            Đã mở khoá: {fmt(s.pick)} lượt miễn phí · {fmt(s.buy)} lượt mua ({fmt(s.spent)} kim cương) · {fmt(s.legacy)} bài học dở · {fmt(s.users)} người
          </p>
        )}
      </div>
      <form action={setLessonLock.bind(null, !enabled)} className="self-center max-sm:basis-full max-sm:*:w-full">
        <button
          className={`btn ${enabled ? "" : "btn-soft"}`}
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
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="page-title flex-1">
          Bài học <span className="text-muted tabular-nums">{lessons.length}</span>
        </h1>
        <Link href="/admin/new" className="btn btn-primary max-sm:w-full">
          <Plus className="size-4" /> Bài mới
        </Link>
      </div>

      <LockPanel enabled={lock.enabled} freeCount={free.size} />

      <div className="card overflow-hidden p-0">
        {lessons.length ? (
          <ul className="divide-y divide-line">
            {lessons.map((l) => (
              <li
                key={l.id}
                className="flex flex-wrap items-center gap-3 p-3 transition-colors hover:bg-card-2/60 sm:px-4"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://i.ytimg.com/vi/${l.videoId}/default.jpg`}
                  alt=""
                  className="h-12 w-20 shrink-0 rounded-lg bg-card-2 object-cover"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="truncate font-semibold">{l.title}</div>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                    <LevelBadge level={l.level} className="text-xs" />
                    <span className="badge badge-muted">{l.sentenceCount} câu</span>
                    {l.dictation && <span className="badge badge-gem">Dictation</span>}
                  </div>
                </div>
                {/* Điện thoại: các nút xuống hàng riêng dưới tiêu đề */}
                <div className="flex flex-wrap items-center gap-1.5 max-sm:basis-full max-sm:justify-end">
                  <form action={toggleLessonPublished.bind(null, l.id, !l.published)}>
                    <button
                      title={l.published ? "Bấm để chuyển về bản nháp" : "Bấm để đăng công khai"}
                      aria-pressed={l.published}
                      className={`badge hit-44 min-h-7 cursor-pointer gap-1 px-2.5 transition-shadow hover:ring-1 hover:ring-current/40 ${l.published ? "badge-ok" : "badge-muted"}`}
                    >
                      {l.published ? <CircleCheck className="size-3.5" aria-hidden /> : <Circle className="size-3.5" aria-hidden />}
                      {l.published ? "Đã đăng" : "Nháp"}
                    </button>
                  </form>
                  {/* Bài miễn phí (khoá bài học): khách cũng học được */}
                  <form action={toggleFreeLesson.bind(null, l.id, !free.has(l.id))}>
                    <button
                      title={free.has(l.id) ? "Bấm để bỏ miễn phí" : "Bấm để cho khách học miễn phí bài này"}
                      aria-pressed={free.has(l.id)}
                      className={`badge hit-44 min-h-7 cursor-pointer gap-1 px-2.5 transition-shadow hover:ring-1 hover:ring-current/40 ${free.has(l.id) ? "badge-gold" : "badge-muted"}`}
                    >
                      {free.has(l.id) ? <CircleCheck className="size-3.5" aria-hidden /> : <Circle className="size-3.5" aria-hidden />}
                      Miễn phí
                    </button>
                  </form>
                  <Link href={lessonPath(l.slug)} className="btn btn-ghost btn-sm">
                    Xem
                  </Link>
                  <Link href={`/admin/${l.id}`} className="btn btn-sm">
                    Sửa
                  </Link>
                  <DeleteButton action={removeLesson.bind(null, l.id)} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty">
            <span className="icon-bubble tint-muted">
              <ListVideo className="size-5" aria-hidden />
            </span>
            <p>Chưa có bài học nào.</p>
            <Link href="/admin/new" className="btn btn-sm">
              <Plus className="size-4" /> Bài mới
            </Link>
          </div>
        )}
      </div>
    </>
  );
}

export default function AdminPage() {
  return (
    <main className="page page-narrow">
      <AdminNav />
      <Suspense fallback={<ListSkeleton thumb />}>
        <Dashboard />
      </Suspense>
    </main>
  );
}
