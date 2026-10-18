"use client";

import { useState } from "react";
import Link from "next/link";

type Item = { id: number; title: string; videoId: string; level: string; description: string; segmentCount: number };

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

export default function LessonGrid({ lessons }: { lessons: Item[] }) {
  const [level, setLevel] = useState<string | null>(null);
  const shown = level ? lessons.filter((l) => l.level === level) : lessons;

  if (!lessons.length) return <p className="text-sm text-muted">Chưa có bài học nào.</p>;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {[null, ...LEVELS].map((lv) => (
          <button
            key={lv ?? "all"}
            onClick={() => setLevel(lv)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              level === lv ? "border-accent bg-accent text-white" : "border-border text-muted"
            }`}
          >
            {lv ?? "Tất cả"}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {shown.map((l) => (
          <Link
            key={l.id}
            href={`/lesson/${l.id}`}
            className="card flex flex-col gap-2 p-0 transition hover:border-accent"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://i.ytimg.com/vi/${l.videoId}/mqdefault.jpg`}
              alt=""
              className="aspect-video w-full rounded-t-lg object-cover"
            />
            <div className="flex flex-col gap-1 px-3 pb-3">
              <div className="flex items-center gap-2 text-xs text-muted">
                <span className="rounded bg-accent/15 px-1.5 py-0.5 font-semibold text-accent">{l.level}</span>
                {l.segmentCount} câu
              </div>
              <h3 className="line-clamp-2 font-medium">{l.title}</h3>
              {l.description && <p className="line-clamp-2 text-xs text-muted">{l.description}</p>}
            </div>
          </Link>
        ))}
      </div>
      {!shown.length && <p className="text-sm text-muted">Chưa có bài ở cấp độ {level}.</p>}
    </div>
  );
}
