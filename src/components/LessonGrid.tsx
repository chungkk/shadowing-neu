"use client";

import { useState } from "react";
import Link from "next/link";
import { Headphones, Mic, MonitorPlay } from "lucide-react";
import LevelBadge from "./LevelBadge";

type Item = { id: number; title: string; videoId: string; level: string; description: string; segmentCount: number };

const LEVELS = [
  { level: "A1", name: "Mới bắt đầu" },
  { level: "A2", name: "Sơ cấp" },
  { level: "B1", name: "Trung cấp" },
  { level: "B2", name: "Trung cấp cao" },
  { level: "C1", name: "Nâng cao" },
  { level: "C2", name: "Thành thạo" },
];

export function SectionHeader({ title, count, children }: { title: string; count?: string; children?: React.ReactNode }) {
  return (
    <div className="card flex items-center gap-3 px-5 py-4">
      <span className="h-8 w-1.5 rounded-full bg-accent" />
      <h2 className="text-xl font-extrabold md:text-2xl">{title}</h2>
      {count && <span className="text-sm font-semibold text-link">({count})</span>}
      <div className="ml-auto">{children}</div>
    </div>
  );
}

function LessonCard({ l }: { l: Item }) {
  return (
    <Link
      href={`/lesson/${l.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border-2 border-border bg-card transition hover:-translate-y-1 hover:border-accent"
    >
      <div className="relative aspect-video overflow-hidden bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://i.ytimg.com/vi/${l.videoId}/mqdefault.jpg`}
          alt=""
          className="size-full object-cover transition group-hover:scale-105"
        />
        <span className="pill absolute top-2 left-2 bg-accent/90 text-white">
          <Headphones className="size-3.5" /> {l.segmentCount} câu
        </span>
        <LevelBadge level={l.level} className="absolute top-2 right-2" />
        <span className="pill absolute bottom-2 left-2 bg-white text-red-600">
          <MonitorPlay className="size-3.5" /> YouTube
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="line-clamp-2 font-extrabold">{l.title}</h3>
        {l.description && <p className="line-clamp-2 text-xs text-muted">{l.description}</p>}
        <div className="mt-auto flex items-center gap-1.5 pt-2 text-sm font-bold text-link">
          <Mic className="size-4" /> Shadowing
        </div>
      </div>
    </Link>
  );
}

/** Bài học admin đăng, chia nhóm theo cấp độ, có nút lọc */
export default function LessonGrid({ lessons }: { lessons: Item[] }) {
  const [level, setLevel] = useState<string | null>(null);

  if (!lessons.length) return <p className="text-sm text-muted">Chưa có bài học nào.</p>;

  const groups = LEVELS.map((g) => ({ ...g, items: lessons.filter((l) => l.level === g.level) })).filter(
    (g) => g.items.length && (!level || g.level === level),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        {[null, ...LEVELS.map((g) => g.level)].map((lv) => (
          <button
            key={lv ?? "all"}
            onClick={() => setLevel(lv)}
            className={`cursor-pointer rounded-xl border-2 px-4 py-1.5 text-sm font-bold transition ${
              level === lv ? "border-accent bg-accent text-white" : "border-border text-muted hover:border-accent"
            }`}
          >
            {lv ?? "Tất cả"}
          </button>
        ))}
      </div>

      {groups.map((g) => (
        <section key={g.level} className="flex flex-col gap-4">
          <SectionHeader title={`${g.level} · ${g.name}`} count={`${g.items.length} bài`} />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {g.items.map((l) => (
              <LessonCard key={l.id} l={l} />
            ))}
          </div>
        </section>
      ))}
      {!groups.length && <p className="text-sm text-muted">Chưa có bài ở cấp độ {level}.</p>}
    </div>
  );
}
