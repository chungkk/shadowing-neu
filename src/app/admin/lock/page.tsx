import { Suspense } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { lessonUnlockStats, listLessons } from "@/lib/db";
import { lockSettings } from "@/lib/access";
import { SettingsSkeleton } from "@/components/Skeleton";
import LessonLockSettings from "./LessonLockSettings";

const fmt = (n: number) => n.toLocaleString("vi-VN");

async function Lock() {
  await requireAdmin();
  const lock = lockSettings();
  const lessons = listLessons();
  const free = lessons.filter((l) => lock.free.includes(l.id));
  const s = lessonUnlockStats();

  return (
    <>
      <h1 className="text-2xl font-extrabold">Khoá bài học</h1>

      {/* Tình trạng hiện tại */}
      <div className="card flex flex-col gap-2 p-4 text-sm">
        <p>
          Trạng thái:{" "}
          {lock.enabled ? <b className="text-accent">● Đang bật</b> : <b className="text-muted">○ Đang tắt — mọi bài đều mở cho mọi người</b>}
        </p>
        <p>
          Bài miễn phí: {free.length ? free.map((l) => <b key={l.id}>“{l.title}” </b>) : <span className="text-muted">chưa chọn</span>}
        </p>
        <p className="text-muted">
          Đã mở khoá: {fmt(s.pick)} lượt chọn miễn phí · {fmt(s.buy)} lượt mua ({fmt(s.spent)} kim cương) · {fmt(s.legacy)} bài học dở lúc bật khoá ·{" "}
          {fmt(s.users)} người
        </p>
      </div>

      <LessonLockSettings
        enabled={lock.enabled}
        free={lock.free}
        lessons={lessons.map((l) => ({ id: l.id, title: l.title, level: l.level }))}
      />
    </>
  );
}

export default function LockPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 md:p-6">
      <Link href="/admin" className="text-sm text-muted hover:underline">
        ← Quản trị
      </Link>
      <Suspense fallback={<SettingsSkeleton />}>
        <Lock />
      </Suspense>
    </main>
  );
}
