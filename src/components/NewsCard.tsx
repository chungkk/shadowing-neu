import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { NewsItem } from "@/lib/db";
import { sourceOf } from "@/lib/news";

/** "5 phút trước", "3 giờ trước", "hôm qua"… */
export function ago(ms: number, now: number) {
  const min = Math.max(0, Math.round((now - ms) / 60_000));
  if (min < 1) return "vừa xong";
  if (min < 60) return `${min} phút trước`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.round(h / 24);
  return d === 1 ? "hôm qua" : `${d} ngày trước`;
}

export function SourceBadge({ source }: { source: string }) {
  const s = sourceOf(source);
  return (
    <span className="pill border border-ink/20 bg-card-2 font-extrabold text-foreground">
      <span className="size-2 rounded-full" style={{ background: s?.color ?? "var(--muted)" }} aria-hidden />
      {s?.name ?? source}
    </span>
  );
}

export const newsItemPath = (id: number) => `/tin-tuc/bao/${id}`;

/** Tin tự động: tiêu đề + tóm tắt đã dịch, tiêu đề gốc → đọc toàn bài đã dịch trên CKK, kèm link bài gốc */
export default function NewsCard({ item, now }: { item: NewsItem; now: number }) {
  return (
    <article className="sticker flex flex-col gap-2 p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <SourceBadge source={item.source} />
        <time dateTime={new Date(item.publishedAt).toISOString()}>{ago(item.publishedAt, now)}</time>
      </div>
      <h3 className="text-lg leading-snug font-extrabold">
        <Link href={newsItemPath(item.id)} className="hover:underline">
          {item.titleVi}
        </Link>
      </h3>
      {item.summaryVi && <p className="text-sm">{item.summaryVi}</p>}
      {/* Tiêu đề gốc: người học đọc song song */}
      <p className="text-xs text-muted">{item.title}</p>
      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-sm font-extrabold">
        <Link href={newsItemPath(item.id)} className="inline-flex items-center gap-1 text-link">
          Đọc toàn bài <ArrowRight className="size-4" />
        </Link>
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-muted hover:text-foreground">
          Bài gốc · {sourceOf(item.source)?.name ?? item.source} <ArrowUpRight className="size-4" />
        </a>
      </div>
    </article>
  );
}
