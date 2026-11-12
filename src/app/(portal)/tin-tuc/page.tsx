import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { after, connection } from "next/server";
import { Newspaper } from "lucide-react";
import { listNewsItems, listNewsPosts, type NewsPost } from "@/lib/db";
import { activeSources, coverUrl, refreshNews } from "@/lib/news";
import NewsCard from "@/components/NewsCard";
import { ListSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = {
  title: "Tin tức nước Đức bằng tiếng Việt",
  description: "Tin mới mỗi ngày từ báo Đức — tiêu đề và tóm tắt dịch sang tiếng Việt, kèm link bài gốc.",
  alternates: { canonical: "/tin-tuc" },
};

const vnDate = (ms: number) => new Date(ms).toLocaleDateString("vi-VN", { day: "numeric", month: "numeric", year: "numeric", timeZone: "Europe/Berlin" });

/** Bài do admin tự viết (ckk.biz/tin-tuc/<slug>) */
function PostCard({ post }: { post: NewsPost }) {
  const cover = coverUrl(post.cover);
  return (
    <Link href={`/tin-tuc/${post.slug}`} className="group sticker sticker-link flex flex-col overflow-hidden">
      {cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt="" className="aspect-video w-full border-b-2 border-ink object-cover" loading="lazy" />
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <span className="flex flex-wrap items-center gap-2 text-xs font-bold text-muted">
          <span className="pill bg-accent text-white">CKK</span>
          {post.category && <span>{post.category}</span>}
          <span>{vnDate(post.createdAt)}</span>
        </span>
        <h3 className="text-lg leading-snug font-extrabold group-hover:underline">{post.title}</h3>
        {post.summary && <p className="line-clamp-3 text-sm text-muted">{post.summary}</p>}
      </div>
    </Link>
  );
}

/** Tin tự động của các nguồn đang bật (+ bài tự viết khi không lọc theo nguồn) */
function loadNews(nguon: unknown) {
  const sources = activeSources();
  const source = typeof nguon === "string" && sources.some((s) => s.key === nguon) ? nguon : null;
  return {
    sources,
    source,
    posts: source ? [] : listNewsPosts({ limit: 6 }),
    items: listNewsItems({ limit: 60, sources: source ? [source] : sources.map((s) => s.key) }),
    now: Date.now(),
  };
}

async function News({ searchParams }: { searchParams: PageProps<"/tin-tuc">["searchParams"] }) {
  await connection();
  // Lấy tin mới sau khi đã trả trang (không bắt người đọc chờ); tự bỏ qua nếu vừa lấy < 30 phút
  after(() => refreshNews()?.catch((e) => console.error("[news]", e)));
  const { sources, source, posts, items, now } = loadNews((await searchParams).nguon);
  return (
    <>
      {posts.length > 0 && (
        <section className="flex flex-col gap-3" aria-labelledby="ckk-posts">
          <h2 id="ckk-posts" className="text-xl font-extrabold">
            Bài viết của CKK
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {posts.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        </section>
      )}
      {sources.length > 1 && (
        <nav aria-label="Lọc theo nguồn" className="scroll-row flex gap-1.5">
          {[{ key: null as string | null, name: "Tất cả" }, ...sources].map((s) => (
            <Link
              key={s.key ?? "all"}
              href={s.key ? `/tin-tuc?nguon=${s.key}` : "/tin-tuc"}
              aria-current={source === s.key ? "page" : undefined}
              className={`rounded-full border-2 px-3 py-1 text-sm font-bold ${source === s.key ? "border-ink bg-accent text-white" : "border-ink/25 hover:border-ink"}`}
            >
              {s.name}
            </Link>
          ))}
        </nav>
      )}
      {items.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((it) => (
            <NewsCard key={it.id} item={it} now={now} />
          ))}
        </div>
      ) : (
        <p className="sticker p-6 text-center text-muted">Đang cập nhật tin, bạn quay lại sau ít phút nhé.</p>
      )}
      <p className="text-xs text-muted">
        Bản dịch do AI thực hiện từ tiêu đề và đoạn tóm tắt mà các báo công bố qua RSS, có thể chưa chính xác hoàn toàn. Nội dung đầy đủ và bản quyền thuộc về
        báo gốc — bấm “Đọc bài gốc” để xem.
      </p>
    </>
  );
}

export default function Page(props: PageProps<"/tin-tuc">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-gold text-black">
          <Newspaper className="size-6" />
        </span>
        <div>
          <h1 className="text-2xl leading-tight font-extrabold sm:text-3xl">Tin tức</h1>
          <p className="text-sm text-muted">Tin mới mỗi ngày từ báo Đức, dịch sang tiếng Việt, kèm nguồn.</p>
        </div>
      </div>
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <News searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
