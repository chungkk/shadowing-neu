"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CircleCheck, Clock, Lock } from "lucide-react";
import { FREE_PICKS, type LessonAccess, type LockInfo } from "@/lib/lesson-lock";
import LevelBadge from "./LevelBadge";
import Mascot from "./Mascot";
import { Gem } from "./PointsBadge";
import UnlockDialog from "./UnlockDialog";
import { lessonPath } from "@/lib/slug";

type Item = {
  id: number;
  title: string;
  slug: string;
  videoId: string;
  level: string;
  description: string;
  sentences: number;
  duration: number;
  dictation: boolean;
  percent: number; // % đã học — 0: chưa học
  isNew: boolean;
  access: LessonAccess;
};

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

/** Tiêu đề mục: chữ đậm, số lượng nhạt bên cạnh, nội dung phụ (vd. nút lọc) bên phải */
export function SectionHeader({ title, count, children }: { title: string; count?: number; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <h2 className="section-title flex items-baseline gap-2">
        {title}
        {count !== undefined && <span className="text-sm font-bold text-muted">{count}</span>}
      </h2>
      {children && <div className="min-w-0 max-sm:w-full sm:ml-auto">{children}</div>}
    </div>
  );
}

/** Giây → "04:05" (video trên 1 giờ: "1:04:05") */
function formatDuration(total: number) {
  const s = Math.round(total);
  const mmss = `${String(Math.floor(s / 60) % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  return s >= 3600 ? `${Math.floor(s / 3600)}:${mmss}` : mmss;
}

/** onLocked: bấm thẻ bài đang khoá → mở popup mở khoá tại chỗ (mở tab mới / Ctrl+bấm → vẫn sang trang bài) */
function LessonCard({ l, onLocked, className = "" }: { l: Item; onLocked?: (l: Item) => void; className?: string }) {
  return (
    <Link
      href={lessonPath(l.slug)}
      onClick={(e) => {
        if (l.access !== "locked" || !onLocked || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        onLocked(l);
      }}
      className={`group sticker sticker-link flex flex-col overflow-hidden ${className}`}
    >
      <div className="relative aspect-video overflow-hidden border-b-2 border-ink bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://i.ytimg.com/vi/${l.videoId}/hqdefault.jpg`}
          alt=""
          loading="lazy"
          className={`size-full object-cover transition group-hover:scale-105 ${l.access === "locked" ? "opacity-80" : ""}`}
        />
        {l.access === "free" && <span className="pill absolute top-2 left-2 bg-accent text-white">Miễn phí</span>}
        <LevelBadge level={l.level} className="absolute top-2 right-2" />
        {l.access === "locked" && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-black/65 text-white">
              <Lock className="size-5" />
              <span className="sr-only">Khoá</span>
            </span>
          </span>
        )}
        {l.duration > 0 && (
          <span className="pill absolute right-2 bottom-2 bg-black/75 text-white">
            <Clock className="size-3.5" /> {formatDuration(l.duration)}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
        <h3 className="line-clamp-2 min-h-[2.75em] font-extrabold leading-snug">{l.title}</h3>
        {l.description && <p className="line-clamp-2 text-xs text-muted">{l.description}</p>}
        <div className="mt-auto flex flex-col gap-2">
          <p className="flex flex-wrap items-center gap-x-1.5 text-xs font-bold text-muted">
            {l.isNew && <span className="pill bg-gold text-black">Mới</span>}
            Shadowing{l.dictation && " · Dictation"} · {l.sentences} câu
          </p>
          {l.percent >= 100 ? (
            <p className="flex items-center gap-1 text-xs font-bold text-accent-text">
              <CircleCheck className="size-4" /> Đã học xong
            </p>
          ) : (
            l.percent > 0 && (
              <div className="flex items-center gap-2 text-xs font-bold text-accent-text">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-card-2">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${l.percent}%` }} />
                </div>
                {l.percent}%
              </div>
            )
          )}
        </div>
      </div>
    </Link>
  );
}

/** Dòng giải thích khoá bài dưới tiêu đề mục (admin bật khoá bài học) */
function LockNote({ lock, admin }: { lock: LockInfo; admin?: boolean }) {
  const price = (
    <span className="inline-flex items-center gap-1 font-bold text-gem">
      <Gem className="size-4" /> {lock.price.toLocaleString("vi-VN")}
    </span>
  );
  return (
    <p className="flex flex-wrap items-center gap-x-1 text-sm text-muted">
      <Lock className="size-4" />
      {admin ? (
        <>Khoá bài đang bật — nhãn bên dưới là những gì khách thấy. Admin vẫn mở được mọi bài.</>
      ) : !lock.loggedIn ? (
        <>Khách học thử được các bài “Miễn phí” — đăng nhập để tự chọn thêm {FREE_PICKS} bài.</>
      ) : lock.picksLeft > 0 ? (
        <>
          Bạn còn <b className="text-foreground">{lock.picksLeft}</b> lượt chọn bài miễn phí — bấm vào bài có ổ khoá để mở. Sau đó mỗi bài {price}.
        </>
      ) : (
        <>Mở thêm bài: mỗi bài {price} (bạn có {lock.points.toLocaleString("vi-VN")}).</>
      )}
    </p>
  );
}

/** Bài học admin đăng (mới nhất trước) trong 1 lưới liền, lọc theo cấp độ (lưu trên URL: ?level=B1 → chia sẻ link / tải lại trang vẫn giữ) */
export default function LessonGrid({ lessons, lock, admin }: { lessons: Item[]; lock?: LockInfo; admin?: boolean }) {
  const searchParams = useSearchParams();
  const [opening, setOpening] = useState<Item | null>(null); // bài khoá đang hiện popup mở khoá
  const top = useRef<HTMLElement>(null);

  // Trang được giữ lại khi rời đi (cacheComponents) → đóng popup lúc rời, không thì bấm Back vẫn thấy popup mở khoá cũ
  useLayoutEffect(() => () => setOpening(null), []);

  if (!lessons.length)
    return (
      <div className="flex flex-col items-center gap-1 py-6 text-center">
        <Mascot className="size-28" />
        <p className="text-sm font-bold text-muted">Chưa có bài học nào.</p>
      </div>
    );

  // Chỉ hiện cấp độ có bài, kèm số bài
  const levels = LEVELS.map((lv) => ({ level: lv, count: lessons.filter((l) => l.level === lv).length })).filter((g) => g.count);
  const param = searchParams.get("level");
  const level = levels.some((g) => g.level === param) ? param : null; // cấp độ lạ / không còn bài → như chưa lọc
  const setLevel = (lv: string | null) => {
    if (lv === level) return;
    const params = new URLSearchParams(searchParams.toString());
    if (lv) params.set("level", lv);
    else params.delete("level");
    const query = params.toString();
    window.history.pushState(null, "", query ? `?${query}` : window.location.pathname);
  };
  const shown = level ? lessons.filter((l) => l.level === level) : lessons;
  // Admin học được mọi bài → bấm thẻ khoá vẫn vào thẳng bài
  const onLocked = lock?.enabled && !admin ? setOpening : undefined;

  const chip = (lv: string | null, count: number) => (
    <button
      key={lv ?? "all"}
      onClick={() => setLevel(lv)}
      aria-pressed={level === lv}
      className={`flex cursor-pointer items-center gap-1.5 rounded-full border-2 border-ink px-3.5 py-1.5 text-sm font-bold transition ${
        level === lv ? "bg-accent text-white" : "bg-card text-foreground hover:bg-card-2"
      }`}
    >
      {lv ?? "Tất cả"}
      <span className={level === lv ? "text-white/75 dark:text-white" : "text-muted"}>{count}</span>
    </button>
  );

  return (
    <section id="lessons" ref={top} className="flex scroll-mt-4 flex-col gap-4 sm:gap-5">
      <SectionHeader title="Thư viện bài học" count={lessons.length}>
        {/* Điện thoại: 1 hàng cuộn ngang sát mép màn hình thay vì xuống nhiều dòng */}
        <div className="scroll-row flex gap-2 max-sm:-mx-4 max-sm:px-4 sm:flex-wrap">
          {chip(null, lessons.length)}
          {levels.map((g) => chip(g.level, g.count))}
        </div>
      </SectionHeader>
      {lock?.enabled && <LockNote lock={lock} admin={admin} />}
      {/* Điện thoại, chưa lọc: mỗi cấp độ 1 hàng vuốt ngang, thẻ kế tiếp ló ra ở mép để biết còn bài */}
      {!level && (
        <div className="flex flex-col gap-5 sm:hidden">
          {levels.map((g) => (
            <div key={g.level} className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-extrabold">Trình độ {g.level}</h3>
                {g.count > 1 && (
                  <button
                    onClick={() => {
                      top.current?.scrollIntoView();
                      setLevel(g.level);
                    }}
                    className="btn btn-sm rounded-full"
                  >
                    Xem tất cả ({g.count})
                  </button>
                )}
              </div>
              <div className="scroll-row -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 px-4 pt-1.5 pb-2.5">
                {lessons
                  .filter((l) => l.level === g.level)
                  .map((l) => (
                    <LessonCard key={l.id} l={l} onLocked={onLocked} className="w-[78vw] snap-start" />
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${level ? "" : "max-sm:hidden"}`}>
        {shown.map((l) => (
          <LessonCard key={l.id} l={l} onLocked={onLocked} />
        ))}
      </div>
      {opening && lock && <UnlockDialog lesson={opening} lock={lock} onClose={() => setOpening(null)} />}
    </section>
  );
}
