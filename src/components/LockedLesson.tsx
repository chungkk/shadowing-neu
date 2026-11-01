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
 * Khung mở khoá 1 bài: khách → đăng nhập · còn lượt chọn → mở miễn phí · hết lượt → đổi kim cương.
 * Dùng ở trang bài bị khoá và popup khi bấm thẻ bài khoá (trang chủ).
 * confirmFirst: hỏi lại trước khi mở (popup tự nó đã là bước xác nhận → không cần) · onLogin: vừa bấm đăng nhập (popup tự đóng)
 */
export function UnlockBox({
  lesson,
  lock,
  confirmFirst,
  onUnlocked,
  onLogin,
}: {
  lesson: { id: number; title: string };
  lock: LockInfo;
  confirmFirst?: boolean;
  onUnlocked?: () => void;
  onLogin?: () => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [done, setDone] = useState(false); // mở xong, đang chuyển vào bài
  const short = lock.points < lock.price;
  const busy = pending || done;

  const unlock = () => {
    const ask =
      lock.picksLeft > 0
        ? `Dùng 1 lượt chọn miễn phí (còn ${lock.picksLeft}) để mở “${lesson.title}”?`
        : `Đổi ${fmt(lock.price)} kim cương để mở “${lesson.title}”? Bạn đang có ${fmt(lock.points)}.`;
    if (confirmFirst && !confirm(ask)) return;
    start(async () => {
      setError("");
      const r = await unlockLessonAction(lesson.id);
      if (r.error) return setError(r.error);
      if (r.points !== undefined) emitPoints({ total: r.points });
      setDone(true);
      onUnlocked?.();
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {!lock.loggedIn ? (
        <>
          <p className="font-bold">Đăng nhập để mở khoá bài này</p>
          <p className="text-sm text-muted">Tài khoản mới được tự chọn thêm {FREE_PICKS} bài bất kỳ để học miễn phí.</p>
          <LoginLink href="/login" onClick={onLogin} className="btn btn-primary self-start">
            Đăng nhập / Đăng ký
          </LoginLink>
        </>
      ) : lock.picksLeft > 0 ? (
        <>
          <p className="font-bold">Bạn còn {lock.picksLeft} lượt chọn bài miễn phí</p>
          <p className="text-sm text-muted">Dùng 1 lượt để mở bài này — mở rồi thì học mãi.</p>
          <button onClick={unlock} disabled={busy} className="btn btn-primary self-start">
            {done ? "Đang vào bài…" : pending ? "Đang mở…" : "Mở bài này miễn phí"}
          </button>
        </>
      ) : (
        <>
          <p className="flex flex-wrap items-center gap-1.5 font-bold">
            Đổi <Gem className="size-5" /> <span className="text-gem">{fmt(lock.price)}</span> kim cương để mở bài này
          </p>
          <p className="text-sm text-muted">
            Bạn đang có <span className="font-bold text-gem">{fmt(lock.points)}</span> kim cương.
            {short && " Chép chính tả đúng hết 1 câu được +2 — luyện thêm ở các bài đã mở để đủ kim cương."}
          </p>
          <button onClick={unlock} disabled={busy || short} className="btn btn-primary self-start">
            {done ? "Đang vào bài…" : pending ? "Đang mở…" : short ? `Cần thêm ${fmt(lock.price - lock.points)} kim cương` : `Đổi ${fmt(lock.price)} kim cương`}
          </button>
        </>
      )}
      {error && <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-400">{error}</p>}
    </div>
  );
}

/** Trang bài đang bị khoá (admin bật khoá bài học): ảnh bìa mờ + khung mở khoá + link các bài miễn phí để học thử ngay */
export default function LockedLesson({
  lesson,
  lock,
  freeLessons,
}: {
  lesson: { id: number; title: string; level: string; videoId: string; description: string };
  lock: LockInfo;
  freeLessons: { title: string; slug: string }[];
}) {
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

      <section className="card p-4 sm:p-5">
        <UnlockBox lesson={lesson} lock={lock} confirmFirst />
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
