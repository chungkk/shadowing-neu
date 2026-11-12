import Link from "next/link";
import { Clock } from "lucide-react";
import type { NewsPost } from "@/lib/db";
import { categoryLabel, guidePath, readingMinutes } from "@/lib/guides";
import { coverUrl } from "@/lib/news";

/** Thẻ bài hướng dẫn (trang /huong-dan và trang chủ) */
export default function GuideCard({ post }: { post: NewsPost }) {
  const cover = coverUrl(post.cover);
  return (
    <Link href={guidePath(post.slug)} className="group sticker sticker-link flex flex-col overflow-hidden">
      {cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt="" className="aspect-video w-full border-b-2 border-ink object-cover" loading="lazy" />
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        {post.category && <span className="text-xs font-extrabold tracking-wide text-accent-text uppercase">{categoryLabel(post.category)}</span>}
        <h3 className="text-lg leading-snug font-extrabold group-hover:underline">{post.title}</h3>
        {post.summary && <p className="line-clamp-3 flex-1 text-sm text-muted">{post.summary}</p>}
        <span className="inline-flex items-center gap-1 text-xs text-muted">
          <Clock className="size-3.5" /> {readingMinutes(post.body)} phút đọc
        </span>
      </div>
    </Link>
  );
}
