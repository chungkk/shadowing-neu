import Link from "next/link";
import { Play } from "lucide-react";
import { lessonsFor } from "@/lib/access";
import { listProgress, type Progress } from "@/lib/db";
import { SectionHeader } from "./LessonGrid";

const SHOWN = 4;

/**
 * % đã học: số câu đã nghe hoặc đã làm chính tả, lấy cái nhiều hơn (giống app).
 * Làm tròn xuống (199/200 câu chưa là "xong"); đã học ít nhất 1 câu thì tối thiểu 1%
 */
const percent = (p: Progress) => {
  if (!p.total) return 0;
  const done = Math.min(p.total, Math.max(p.seen.length, Object.keys(p.dictDone).length));
  return done ? Math.max(1, Math.floor((done * 100) / p.total)) : 0;
};

/** Các bài / video đang học dở của người đang đăng nhập, mới nhất trước (tiến độ đồng bộ với app) */
export default function ContinueLearning({ userId }: { userId: number }) {
  const lessons = new Map(lessonsFor(userId).map((l) => [String(l.id), l]));
  const items = listProgress(userId)
    .filter((p) => percent(p) < 100)
    .map((p) => {
      const [, kind, id] = p.source.split("/");
      const lesson = kind === "lesson" ? lessons.get(id) : undefined;
      // Bài đã bị xoá / chuyển về nháp → bỏ qua
      return { p, href: lesson ? `/${lesson.slug}` : p.source, title: lesson?.title ?? p.title, videoId: kind === "watch" ? id : lesson?.videoId };
    })
    .filter((x): x is typeof x & { videoId: string } => !!x.videoId)
    .slice(0, SHOWN);
  if (!items.length) return null;

  return (
    <section className="flex flex-col gap-4 sm:gap-5">
      <SectionHeader title="Tiếp tục học" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map(({ p, href, title, videoId }) => {
          const n = percent(p);
          const dictCount = Object.keys(p.dictDone).length;
          const at = p.mode === "dictation" && dictCount ? `Chính tả ${dictCount}/${p.total}` : `Câu ${p.idx + 1}/${p.total}`;
          return (
            <Link
              key={p.source}
              href={href}
              className="group sticker sticker-link flex items-center gap-3 p-3"
            >
              <div className="relative w-24 shrink-0 overflow-hidden rounded-lg bg-black sm:w-28">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`} alt="" className="aspect-video w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 h-1 bg-black/60">
                  <div className="h-full bg-accent" style={{ width: `${n}%` }} />
                </div>
                <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                  <Play className="size-7 fill-white text-white" />
                </span>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <h3 className="line-clamp-2 text-sm font-extrabold leading-snug">{title}</h3>
                <p className="flex items-center gap-2 text-xs text-muted">
                  {at}
                  {!!n && <span className="font-bold text-accent">{n}%</span>}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
