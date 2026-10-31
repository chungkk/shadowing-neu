"use client";

import { useState } from "react";
import Link from "next/link";
import { Headphones } from "lucide-react";
import LevelBadge from "./LevelBadge";

type Item = { id: number; title: string; videoId: string; level: string; description: string; sentences: number; isNew: boolean };

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

function LessonCard({ l }: { l: Item }) {
  return (
    <Link
      href={`/lesson/${l.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-1 hover:border-accent active:scale-[0.99]"
    >
      <div className="relative aspect-video overflow-hidden bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://i.ytimg.com/vi/${l.videoId}/hqdefault.jpg`}
          alt=""
          loading="lazy"
          className="size-full object-cover transition group-hover:scale-105"
        />
        {l.isNew && <span className="pill absolute top-2 left-2 bg-amber text-sidebar">Mới</span>}
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

/** Bài học admin đăng (mới nhất trước) trong 1 lưới liền, lọc theo cấp độ */
export default function LessonGrid({ lessons }: { lessons: Item[] }) {
  const [level, setLevel] = useState<string | null>(null);

  if (!lessons.length) return <p className="text-sm text-muted">Chưa có bài học nào.</p>;

  // Chỉ hiện cấp độ có bài, kèm số bài
  const levels = LEVELS.map((lv) => ({ level: lv, count: lessons.filter((l) => l.level === lv).length })).filter((g) => g.count);
  const shown = level ? lessons.filter((l) => l.level === level) : lessons;

  const chip = (lv: string | null, count: number) => (
    <button
      key={lv ?? "all"}
      onClick={() => setLevel(lv)}
      className={`flex cursor-pointer items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-sm font-bold transition ${
        level === lv ? "border-accent bg-accent text-white" : "border-border bg-card text-foreground hover:border-accent"
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
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
        {shown.map((l) => (
          <LessonCard key={l.id} l={l} />
        ))}
      </div>
    </section>
  );
}
