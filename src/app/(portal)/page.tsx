import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { after, connection } from "next/server";
import { ArrowUpRight, Car, Gamepad2, Landmark, Languages, Newspaper } from "lucide-react";
import type { ComponentType } from "react";
import { listNewsItems, listNewsPosts, type NewsItem, type NewsPost } from "@/lib/db";
import { SOURCES, coverUrl, refreshNews, sourceOf } from "@/lib/news";
import { ListSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = {
  title: { absolute: "CKK – Tin tức nước Đức bằng tiếng Việt, học tiếng Đức, lái xe, Leben in Deutschland" },
  description: "Tin tức nước Đức hằng ngày dịch sang tiếng Việt (kèm nguồn), bài viết của CKK, học tiếng Đức với video, ôn thi lái xe và Leben in Deutschland.",
  alternates: { canonical: "/" },
};

const SECTIONS: { href: string; label: string; text: string; icon: ComponentType<{ className?: string }> }[] = [
  { href: "/tieng-duc", label: "Tiếng Đức", text: "Bài học video, từ vựng", icon: Languages },
  { href: "/lai-xe", label: "Lái xe", text: "1.191 câu hạng B", icon: Car },
  { href: "/leben-in-deutschland", label: "Leben in DE", text: "Thi quốc tịch", icon: Landmark },
  { href: "/games", label: "Game", text: "Luyện từ vựng", icon: Gamepad2 },
];

const vnDate = (ms: number) => new Date(ms).toLocaleDateString("vi-VN", { day: "numeric", month: "numeric", year: "numeric", timeZone: "Europe/Berlin" });

/** "5 phút trước", "3 giờ trước", "hôm qua"… (giờ Đức) */
function ago(ms: number, now: number) {
  const min = Math.max(0, Math.round((now - ms) / 60_000));
  if (min < 1) return "vừa xong";
  if (min < 60) return `${min} phút trước`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.round(h / 24);
  return d === 1 ? "hôm qua" : `${d} ngày trước`;
}

function SourceBadge({ source }: { source: string }) {
  const s = sourceOf(source);
  return (
    <span className="pill border border-ink/20 bg-card-2 font-extrabold" style={{ color: "var(--foreground)" }}>
      <span className="size-2 rounded-full" style={{ background: s?.color ?? "var(--muted)" }} aria-hidden />
      {s?.name ?? source}
    </span>
  );
}

function PostCard({ post, big = false }: { post: NewsPost; big?: boolean }) {
  const cover = coverUrl(post.cover);
  return (
    <Link href={`/tin-tuc/${post.slug}`} className={`group sticker sticker-link flex flex-col overflow-hidden ${big ? "md:col-span-2 md:flex-row" : ""}`}>
      {cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt="" className={`aspect-video w-full border-ink object-cover ${big ? "md:w-1/2 md:self-start md:border-r-2 md:border-b-2 md:rounded-br-3xl" : "border-b-2"} max-md:border-b-2`} />
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <span className="flex flex-wrap items-center gap-2 text-xs font-bold text-muted">
          <span className="pill bg-accent text-white">CKK</span>
          {post.category && <span>{post.category}</span>}
          <span>{vnDate(post.createdAt)}</span>
        </span>
        <h3 className={`leading-snug font-extrabold group-hover:underline ${big ? "text-2xl" : "text-lg"}`}>{post.title}</h3>
        {post.summary && <p className="line-clamp-3 text-sm text-muted">{post.summary}</p>}
      </div>
    </Link>
  );
}

function NewsCard({ item, now }: { item: NewsItem; now: number }) {
  return (
    <article className="sticker flex flex-col gap-2 p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <SourceBadge source={item.source} />
        <time dateTime={new Date(item.publishedAt).toISOString()}>{ago(item.publishedAt, now)}</time>
      </div>
      <h3 className="text-lg leading-snug font-extrabold">
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
          {item.titleVi}
        </a>
      </h3>
      {item.summaryVi && <p className="text-sm">{item.summaryVi}</p>}
      {/* Tiêu đề gốc tiếng Đức: người học đọc song song */}
      <p className="text-xs text-muted" lang="de">
        🇩🇪 {item.title}
      </p>
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 self-start text-sm font-extrabold text-link">
        Đọc bài gốc trên {sourceOf(item.source)?.name ?? item.source} <ArrowUpRight className="size-4" />
      </a>
    </article>
  );
}

/** Bài CKK + tin tự động (lọc theo báo thì không hiện bài CKK) */
function loadNews(source: string | null) {
  return { posts: source ? [] : listNewsPosts({ limit: 7 }), items: listNewsItems({ limit: 60, source }), now: Date.now() };
}

async function News({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  await connection();
  // Lấy tin mới sau khi đã trả trang (không bắt người đọc chờ); tự bỏ qua nếu vừa lấy < 30 phút
  after(() => refreshNews()?.catch((e) => console.error("[news]", e)));
  const nguon = (await searchParams).nguon;
  const source = typeof nguon === "string" && sourceOf(nguon) ? nguon : null;
  const { posts, items, now } = loadNews(source);

  return (
    <>
      {posts.length > 0 && (
        <section className="flex flex-col gap-3" aria-labelledby="ckk-posts">
          <h2 id="ckk-posts" className="text-xl font-extrabold">
            Bài viết của CKK
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((p, i) => (
              <PostCard key={p.id} post={p} big={i === 0} />
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3" aria-labelledby="de-news">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="de-news" className="text-xl font-extrabold">
            Tin nước Đức
          </h2>
          <p className="text-xs text-muted">Dịch tự động từ tiêu đề và tóm tắt của báo gốc</p>
        </div>
        <nav aria-label="Lọc theo báo" className="scroll-row flex gap-1.5">
          {[{ key: null, name: "Tất cả" }, ...SOURCES].map((s) => (
            <Link
              key={s.key ?? "all"}
              href={s.key ? `/?nguon=${s.key}` : "/"}
              aria-current={source === s.key ? "page" : undefined}
              className={`rounded-full border-2 px-3 py-1 text-sm font-bold ${source === s.key ? "border-ink bg-accent text-white" : "border-ink/25 hover:border-ink"}`}
            >
              {s.name}
            </Link>
          ))}
        </nav>
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
          Bản dịch do AI thực hiện từ tiêu đề và đoạn tóm tắt mà các báo công bố qua RSS, có thể chưa chính xác hoàn toàn. Nội dung đầy đủ và bản quyền
          thuộc về báo gốc — bấm “Đọc bài gốc” để xem.
        </p>
      </section>
    </>
  );
}

export default function Home(props: PageProps<"/">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-6">
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-gold text-black">
            <Newspaper className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl leading-tight font-extrabold sm:text-3xl">Tin tức nước Đức</h1>
            <p className="text-sm text-muted">Tin mới mỗi ngày từ báo Đức, dịch sang tiếng Việt, kèm nguồn.</p>
          </div>
        </div>
        {/* Lối vào các phần học */}
        <nav aria-label="Học cùng CKK" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SECTIONS.map((s) => (
            <Link key={s.href} href={s.href} className="sticker sticker-link flex items-center gap-2.5 p-3">
              <s.icon className="size-5 shrink-0 text-accent-text" />
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-extrabold">{s.label}</span>
                <span className="truncate text-xs text-muted">{s.text}</span>
              </span>
            </Link>
          ))}
        </nav>
      </section>
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <News searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
