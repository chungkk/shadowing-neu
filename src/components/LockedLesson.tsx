"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { unlockLessonAction } from "@/app/lesson-actions";
import { FREE_PICKS, type LockInfo } from "@/lib/lesson-lock";
import { emitPoints } from "@/lib/points";
import LevelBadge from "./LevelBadge";
import { LoginLink } from "./LoginDialog";
import { Gem } from "./PointsBadge";

const fmt = (n: number) => n.toLocaleString("vi-VN");

/**
 * Bài đang bị khoá (admin bật khoá bài học): khách → đăng nhập · còn lượt chọn → mở miễn phí · hết lượt → trả kim cương.
 * Kèm link các bài miễn phí để học thử ngay.
 */
export default function LockedLesson({
  lesson,
  lock,
  freeLessons,
}: {
  lesson: { id: number; title: string; level: string; videoId: string; description: string };
  lock: LockInfo;
  freeLessons: { title: string; slug: string }[];
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const short = lock.points < lock.price;

  const unlock = () => {
    const ask =
      lock.picksLeft > 0
        ? `Dùng 1 lượt chọn miễn phí (còn ${lock.picksLeft}) để mở “${lesson.title}”?`
        : `Mở “${lesson.title}” với ${fmt(lock.price)} kim cương? Bạn đang có ${fmt(lock.points)}.`;
    if (!confirm(ask)) return;
    start(async () => {
      setError("");
      const r = await unlockLessonAction(lesson.id);
      if (r.error) setError(r.error);
      else if (r.points !== undefined) emitPoints({ total: r.points });
    });
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 md:p-6">
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`https://i.ytimg.com/vi/${lesson.videoId}/hqdefault.jpg`} alt="" className="size-full object-cover opacity-40 blur-[2px]" />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-black/60 text-white">
            <Lock className="size-8" />
          </span>
        </span>
      </div>

      <div className="flex items-start gap-2">
        <h1 className="flex-1 text-xl font-extrabold sm:text-2xl">{lesson.title}</h1>
        <LevelBadge level={lesson.level} className="mt-1 shrink-0" />
      </div>
      {lesson.description && <p className="whitespace-pre-line text-sm text-muted">{lesson.description}</p>}

      <section className="card flex flex-col gap-3 p-4 sm:p-5">
        {!lock.loggedIn ? (
          <>
            <p className="font-bold">Đăng nhập để mở khoá bài này</p>
            <p className="text-sm text-muted">Tài khoản mới được tự chọn thêm {FREE_PICKS} bài bất kỳ để học miễn phí.</p>
            <LoginLink href="/login" className="btn btn-primary self-start">
              Đăng nhập / Đăng ký
            </LoginLink>
          </>
        ) : lock.picksLeft > 0 ? (
          <>
            <p className="font-bold">Bạn còn {lock.picksLeft} lượt chọn bài miễn phí</p>
            <p className="text-sm text-muted">Dùng 1 lượt để mở bài này — mở rồi thì học mãi.</p>
            <button onClick={unlock} disabled={pending} className="btn btn-primary self-start">
              {pending ? "Đang mở…" : "Mở bài này miễn phí"}
            </button>
          </>
        ) : (
          <>
            <p className="flex flex-wrap items-center gap-1.5 font-bold">
              Mở khoá với <Gem className="size-5" /> <span className="text-gem">{fmt(lock.price)}</span>
            </p>
            <p className="text-sm text-muted">
              Bạn đang có <span className="font-bold text-gem">{fmt(lock.points)}</span> kim cương.
              {short && " Chép chính tả đúng hết 1 câu được +2 — luyện thêm ở các bài đã mở để đủ kim cương."}
            </p>
            <button onClick={unlock} disabled={pending || short} className="btn btn-primary self-start">
              {pending ? "Đang mở…" : short ? `Cần thêm ${fmt(lock.price - lock.points)} kim cương` : `Mở khoá · ${fmt(lock.price)}`}
            </button>
          </>
        )}
        {error && <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-400">{error}</p>}
      </section>

      {freeLessons.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold text-muted">Học thử miễn phí</h2>
          <div className="flex flex-wrap gap-2">
            {freeLessons.map((l) => (
              <Link key={l.slug} href={`/${l.slug}`} className="btn">
                {l.title}
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
