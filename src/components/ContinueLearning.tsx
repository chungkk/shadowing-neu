import Link from "next/link";
import { Play } from "lucide-react";
import { percent, unfinished } from "@/lib/progress";
import { SectionHeader } from "./LessonGrid";

const SHOWN = 4;

/** Các bài / video đang học dở của người đang đăng nhập, mới nhất trước */
export default function ContinueLearning({ userId }: { userId: number }) {
  const items = unfinished(userId, SHOWN);
  if (!items.length) return null;

  return (
    <section className="flex flex-col gap-3.5" data-sec="de">
      <SectionHeader title="Tiếp tục học" count={items.length} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {items.map(({ p, href, title, videoId }) => {
          const n = percent(p);
          const dictCount = Object.keys(p.dictDone).length;
          const at = p.mode === "dictation" && dictCount ? `Chính tả ${dictCount}/${p.total}` : `Câu ${p.idx + 1}/${p.total}`;
          return (
            <Link
              key={p.source}
              href={href}
              className="group tile card-link flex items-center gap-3 p-2.5 pr-3"
            >
              <div className="relative w-24 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-card-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`} alt="" className="aspect-video w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 h-1 bg-black/40">
                  <div className="progress-bar rounded-none" style={{ width: `${n}%` }} />
                </div>
                <span className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition group-hover:opacity-100 motion-reduce:transition-none">
                  <span className="flex size-8 items-center justify-center rounded-full bg-card text-accent-text shadow-sm">
                    <Play className="size-3.5 translate-x-px fill-current" />
                  </span>
                </span>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <h3 className="line-clamp-2 text-sm leading-snug font-semibold transition-colors group-hover:text-accent-text">{title}</h3>
                <p className="flex items-center gap-2 text-xs text-muted tabular-nums">
                  <span>{at}</span>
                  {!!n && <span className="badge badge-accent">{n}%</span>}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
