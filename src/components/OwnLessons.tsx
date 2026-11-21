import Link from "next/link";
import { listOwnLessons, listProgress } from "@/lib/db";
import { percent } from "@/lib/progress";
import { lessonPath } from "@/lib/slug";
import { SectionHeader } from "./LessonGrid";

/** Bài học riêng người dùng đã tự tạo từ video YouTube (trả kim cương) */
export default function OwnLessons({ userId }: { userId: number }) {
  const lessons = listOwnLessons(userId);
  if (!lessons.length) return null;
  const progress = new Map(listProgress(userId).map((p) => [p.source, p]));
  return (
    <section className="flex flex-col gap-3.5" aria-label="Bài học riêng của bạn" data-sec="de">
      <SectionHeader title="Bài học riêng của bạn" count={lessons.length} />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {lessons.map((l) => {
          const p = progress.get(`/lesson/${l.id}`);
          const n = p ? percent(p) : 0;
          return (
            <Link key={l.id} href={lessonPath(l.slug)} className="group card card-link flex flex-col overflow-hidden p-0">
              <div className="relative aspect-video overflow-hidden bg-card-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://i.ytimg.com/vi/${l.videoId}/mqdefault.jpg`} alt="" className="size-full object-cover transition duration-300 group-hover:scale-[1.03] motion-reduce:transition-none" />
                {n > 0 && (
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-black/40">
                    <div className="progress-bar rounded-none" style={{ width: `${n}%` }} />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1 p-3">
                <span className="line-clamp-2 text-sm leading-snug font-semibold transition-colors group-hover:text-accent-text">{l.title}</span>
                <span className="text-xs text-muted tabular-nums">
                  {l.sentenceCount ?? l.segmentCount} câu{n > 0 ? ` · ${n}%` : ""}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
