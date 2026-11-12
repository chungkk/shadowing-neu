import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Pencil } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getNewsPost } from "@/lib/db";
import { coverUrl, parseBody } from "@/lib/news";
import NewsText from "@/components/NewsText";
import { ListSkeleton } from "@/components/Skeleton";

/** Bài viết của admin: ckk.biz/tin-tuc/<slug>. Bản nháp chỉ admin xem được */
async function load(slug: string) {
  const post = getNewsPost({ slug });
  if (!post) return null;
  if (post.published) return { post, admin: (await getCurrentUser())?.role === "admin" };
  const user = await getCurrentUser();
  return user?.role === "admin" ? { post, admin: true } : null;
}

export async function generateMetadata({ params }: PageProps<"/tin-tuc/[slug]">): Promise<Metadata> {
  const post = getNewsPost({ slug: (await params).slug });
  if (!post?.published) return { title: "Không tìm thấy bài viết", robots: { index: false, follow: false } };
  const cover = coverUrl(post.cover);
  return {
    title: post.title,
    description: post.summary || undefined,
    alternates: { canonical: `/tin-tuc/${post.slug}` },
    openGraph: { type: "article", title: post.title, description: post.summary || undefined, ...(cover ? { images: [cover] } : {}) },
  };
}

async function Post({ params }: PageProps<"/tin-tuc/[slug]">) {
  const r = await load((await params).slug);
  if (!r) notFound();
  const { post, admin } = r;
  const cover = coverUrl(post.cover);
  return (
    <article className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-2">
        <Link href="/" className="btn-icon" aria-label="Về trang tin">
          <ArrowLeft className="size-5" />
        </Link>
        {admin && (
          <Link href={`/admin/news/${post.id}`} className="btn px-3 py-1.5">
            <Pencil className="size-4" /> Sửa bài
          </Link>
        )}
      </div>
      {!post.published && <p className="pill self-start bg-amber/20 text-amber">Bản nháp — chỉ admin thấy</p>}
      <header className="flex flex-col gap-2">
        <p className="flex flex-wrap gap-2 text-sm font-bold text-muted">
          {post.category && <span>{post.category}</span>}
          <time dateTime={new Date(post.createdAt).toISOString()}>
            {new Date(post.createdAt).toLocaleDateString("vi-VN", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Berlin" })}
          </time>
        </p>
        <h1 className="text-3xl leading-tight font-extrabold sm:text-4xl">{post.title}</h1>
        {post.summary && <p className="text-lg text-muted">{post.summary}</p>}
      </header>
      {cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt="" className="w-full rounded-3xl border-2 border-ink object-cover" />
      )}
      <NewsText blocks={parseBody(post.body)} />
      {post.sourceName && (
        <p className="border-t border-border pt-4 text-sm text-muted">
          Nguồn:{" "}
          {post.sourceUrl ? (
            <a href={post.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold text-link underline">
              {post.sourceName} <ArrowUpRight className="size-3.5" />
            </a>
          ) : (
            <span className="font-bold">{post.sourceName}</span>
          )}
        </p>
      )}
    </article>
  );
}

export default function Page(props: PageProps<"/tin-tuc/[slug]">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4 md:p-6">
      <Suspense fallback={<ListSkeleton rows={5} />}>
        <Post {...props} />
      </Suspense>
    </main>
  );
}
