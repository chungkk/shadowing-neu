import Link from "next/link";
import { ArrowRight, CheckCircle2, Play } from "lucide-react";
import { percent, unfinished } from "@/lib/progress";
import { SectionHeader } from "./LessonGrid";

const SHOWN = 4;

/** Các bài / video đang học dở của người đang đăng nhập, mới nhất trước */
export default function ContinueLearning({ userId }: { userId: number }) {
  const items = unfinished(userId, SHOWN);
  if (!items.length) return null;

  return (
    <section className="flex flex-col gap-4" aria-label="Tiếp tục học" data-sec="de">
      <SectionHeader title="Tiếp tục học" count={items.length} />
      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {items.map(({ p, href, title, videoId }) => {
          const n = percent(p);
          const dictCount = Object.keys(p.dictDone).length;
          const completed = p.mode === "dictation" && dictCount ? dictCount : Math.min(p.total, p.idx + 1);
          const modeLabel = p.mode === "dictation" ? "Chính tả" : "Shadowing";
          return (
            <Link
              key={p.source}
              href={href}
              className="group card card-link flex flex-col overflow-hidden p-0"
            >
              <div className="relative aspect-video overflow-hidden bg-sidebar">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`}
                  alt=""
                  className="size-full object-cover transition duration-300 group-hover:scale-[1.03] motion-reduce:transition-none"
                />
                <span className="badge absolute top-2 left-2 border border-line bg-sidebar/90 text-[11px] text-foreground">
                  {modeLabel}
                </span>
                <div className="absolute inset-x-0 bottom-0 h-1.5 bg-background/80">
                  <div className="progress-bar rounded-none" style={{ width: `${Math.max(n, 4)}%` }} />
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-2.5 p-3.5">
                <h3 className="line-clamp-2 min-h-[2.6em] text-sm leading-snug font-semibold text-foreground transition-colors group-hover:text-accent-text">
                  {title}
                </h3>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs text-muted tabular-nums">
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="size-3.5 text-accent-text" aria-hidden />
                      {completed}/{p.total} câu
                    </span>
                    <span className="font-mono font-semibold text-accent-text">{n}%</span>
                  </div>
                  <div className="progress h-1.5">
                    <div className="progress-bar" style={{ width: `${Math.max(n, 4)}%` }} />
                  </div>
                </div>
                <span className="mt-auto inline-flex items-center justify-between rounded-lg border border-line bg-sidebar px-3 py-2 text-xs font-semibold text-foreground transition-colors group-hover:border-accent/40 group-hover:bg-accent-soft group-hover:text-accent-text">
                  <span className="inline-flex items-center gap-1.5">
                    <Play className="size-3.5 fill-current" aria-hidden /> Tiếp tục học
                  </span>
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
