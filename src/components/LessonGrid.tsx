"use client";

import { useState } from "react";
import Link from "next/link";
import { Headphones, Lock } from "lucide-react";
import { FREE_PICKS, type LessonAccess, type LockInfo } from "@/lib/lesson-lock";
import LevelBadge from "./LevelBadge";
import Mascot from "./Mascot";
import { Gem } from "./PointsBadge";
import UnlockDialog from "./UnlockDialog";

type Item = {
  id: number;
  title: string;
  slug: string;
  videoId: string;
  level: string;
  description: string;
  sentences: number;
  isNew: boolean;
  access: LessonAccess;
};

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

/** Tiêu đề mục: chữ đậm, số lượng nhạt bên cạnh, nội dung phụ (vd. nút lọc) bên phải */
export function SectionHeader({ title, count, children }: { title: string; count?: number; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <h2 className="flex items-baseline gap-2 text-xl font-extrabold md:text-2xl">
        {title}
        {count !== undefined && <span className="text-base font-bold text-muted">{count}</span>}
      </h2>
      {children && <div className="min-w-0 max-sm:w-full sm:ml-auto">{children}</div>}
    </div>
  );
}

/** onLocked: bấm thẻ bài đang khoá → mở popup mở khoá tại chỗ (mở tab mới / Ctrl+bấm → vẫn sang trang bài) */
function LessonCard({ l, onLocked }: { l: Item; onLocked?: (l: Item) => void }) {
  return (
    <Link
      href={`/${l.slug}`}
      onClick={(e) => {
        if (l.access !== "locked" || !onLocked || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        onLocked(l);
      }}
      className="group sticker sticker-link flex flex-col overflow-hidden"
    >
      <div className="relative aspect-video overflow-hidden border-b-2 border-ink bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://i.ytimg.com/vi/${l.videoId}/hqdefault.jpg`}
          alt=""
          loading="lazy"
          className={`size-full object-cover transition group-hover:scale-105 ${l.access === "locked" ? "opacity-50" : ""}`}
        />
        {l.isNew && <span className="pill absolute top-2 left-2 bg-gold text-black">Mới</span>}
        {l.access === "free" && <span className="pill absolute top-2 right-2 bg-accent text-white">Miễn phí</span>}
        {l.access === "locked" && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-black/65 text-white">
              <Lock className="size-5" />
            </span>
          </span>
        )}
        <span className="pill absolute right-2 bottom-2 bg-black/75 text-white">
          <Headphones className="size-3.5" /> {l.sentences} câu
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
        <div className="flex items-start gap-2">
          <h3 className="line-clamp-2 flex-1 font-extrabold leading-snug">{l.title}</h3>
          <LevelBadge level={l.level} className="shrink-0" />
        </div>
        {l.description && <p className="line-clamp-2 text-xs text-muted">{l.description}</p>}
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

/** Bài học admin đăng (mới nhất trước) trong 1 lưới liền, lọc theo cấp độ */
export default function LessonGrid({ lessons, lock, admin }: { lessons: Item[]; lock?: LockInfo; admin?: boolean }) {
  const [level, setLevel] = useState<string | null>(null);
  const [opening, setOpening] = useState<Item | null>(null); // bài khoá đang hiện popup mở khoá

  if (!lessons.length)
    return (
      <div className="flex flex-col items-center gap-1 py-6 text-center">
        <Mascot className="size-28" />
        <p className="text-sm font-bold text-muted">Chưa có bài học nào.</p>
      </div>
    );

  // Chỉ hiện cấp độ có bài, kèm số bài
  const levels = LEVELS.map((lv) => ({ level: lv, count: lessons.filter((l) => l.level === lv).length })).filter((g) => g.count);
  const shown = level ? lessons.filter((l) => l.level === level) : lessons;

  const chip = (lv: string | null, count: number) => (
    <button
      key={lv ?? "all"}
      onClick={() => setLevel(lv)}
      className={`flex cursor-pointer items-center gap-1.5 rounded-full border-2 border-ink px-3.5 py-1.5 text-sm font-bold transition ${
        level === lv ? "bg-accent text-white" : "bg-card text-foreground hover:bg-card-2"
      }`}
    >
      {lv ?? "Tất cả"}
      <span className={level === lv ? "text-white/75" : "text-muted"}>{count}</span>
    </button>
  );

  return (
    <section className="flex flex-col gap-4 sm:gap-5">
      <SectionHeader title="Thư viện bài học" count={lessons.length}>
        {/* Điện thoại: 1 hàng cuộn ngang sát mép màn hình thay vì xuống nhiều dòng */}
        <div className="scroll-row flex gap-2 max-sm:-mx-4 max-sm:px-4 sm:flex-wrap">
          {chip(null, lessons.length)}
          {levels.map((g) => chip(g.level, g.count))}
        </div>
      </SectionHeader>
      {lock?.enabled && <LockNote lock={lock} admin={admin} />}
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
        {shown.map((l) => (
          // Admin học được mọi bài → bấm thẻ khoá vẫn vào thẳng bài
          <LessonCard key={l.id} l={l} onLocked={lock?.enabled && !admin ? setOpening : undefined} />
        ))}
      </div>
      {opening && lock && <UnlockDialog lesson={opening} lock={lock} onClose={() => setOpening(null)} />}
    </section>
  );
}
