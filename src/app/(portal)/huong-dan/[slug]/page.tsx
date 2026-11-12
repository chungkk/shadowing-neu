import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, ArrowUpRight, Clock, Pencil } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getNewsPost, listNewsPosts } from "@/lib/db";
import { categoryLabel, guideCategory, guidePath, readingMinutes } from "@/lib/guides";
import { coverUrl, parseBody } from "@/lib/news";
import { SITE_URL } from "@/lib/site";
import NewsText from "@/components/NewsText";
import { ListSkeleton } from "@/components/Skeleton";

const vnDate = (ms: number) => new Date(ms).toLocaleDateString("vi-VN", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Berlin" });

/** Bài hướng dẫn: ckk.biz/huong-dan/<slug>. Bản nháp chỉ admin xem được */
async function load(slug: string) {
  const post = getNewsPost({ slug });
  if (!post) return null;
  const admin = (await getCurrentUser())?.role === "admin";
  return post.published || admin ? { post, admin } : null;
}

export async function generateMetadata({ params }: PageProps<"/huong-dan/[slug]">): Promise<Metadata> {
  const post = getNewsPost({ slug: (await params).slug });
  if (!post?.published) return { title: "Không tìm thấy bài viết", robots: { index: false, follow: false } };
  const cover = coverUrl(post.cover);
  return {
    title: post.title,
    description: post.summary || undefined,
    alternates: { canonical: guidePath(post.slug) },
    openGraph: { type: "article", title: post.title, description: post.summary || undefined, ...(cover ? { images: [cover] } : {}) },
  };
}

async function Guide({ params }: PageProps<"/huong-dan/[slug]">) {
  const r = await load((await params).slug);
  if (!r) notFound();
  const { post, admin } = r;
  const cover = coverUrl(post.cover);
  const cat = guideCategory(post.category);
  const related = listNewsPosts({ limit: 20 })
    .filter((p) => p.id !== post.id && p.category === post.category)
    .slice(0, 3);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.summary || undefined,
    datePublished: new Date(post.createdAt).toISOString(),
    dateModified: new Date(post.updatedAt).toISOString(),
    inLanguage: "vi",
    mainEntityOfPage: SITE_URL + guidePath(post.slug),
    publisher: { "@type": "Organization", name: "CKK", url: SITE_URL },
    ...(cover ? { image: SITE_URL + cover } : {}),
  };

  return (
    <article className="flex flex-col gap-5">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav aria-label="Vị trí" className="flex flex-wrap items-center justify-between gap-2 text-sm font-bold">
        <span className="flex flex-wrap items-center gap-1.5 text-muted">
          <Link href="/huong-dan" className="hover:text-foreground hover:underline">
            Hướng dẫn
          </Link>
          {post.category && (
            <>
              <span aria-hidden>›</span>
              <Link href={`/huong-dan?muc=${post.category}`} className="hover:text-foreground hover:underline">
                {categoryLabel(post.category)}
              </Link>
            </>
          )}
        </span>
        {admin && (
          <Link href={`/admin/news/${post.id}`} className="btn px-3 py-1.5">
            <Pencil className="size-4" /> Sửa bài
          </Link>
        )}
      </nav>
      {!post.published && <p className="pill self-start bg-amber/20 text-amber">Bản nháp — chỉ admin thấy. Kiểm tra nội dung rồi bấm “Sửa bài” để đăng.</p>}
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl leading-tight font-extrabold sm:text-4xl">{post.title}</h1>
        {post.summary && <p className="text-lg text-muted">{post.summary}</p>}
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-4" /> {readingMinutes(post.body)} phút đọc
          </span>
          <time dateTime={new Date(post.updatedAt).toISOString()}>Cập nhật {vnDate(post.updatedAt)}</time>
        </p>
      </header>
      {cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt="" className="w-full rounded-3xl border-2 border-ink object-cover" />
      )}
      <NewsText blocks={parseBody(post.body)} />

      {cat?.tool && (
        <Link href={cat.tool.href} className="group sticker sticker-link flex items-center gap-3 bg-accent/10 p-4">
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-extrabold">{cat.tool.label} trên CKK</span>
            <span className="text-sm text-muted">{cat.tool.text}</span>
          </span>
          <ArrowRight className="size-5 shrink-0 text-accent-text transition group-hover:translate-x-1" />
        </Link>
      )}

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
          . Bài viết chỉ để tham khảo, không thay cho tư vấn pháp lý.
        </p>
      )}

      {related.length > 0 && (
        <section className="flex flex-col gap-2 border-t border-border pt-4">
          <h2 className="text-lg font-extrabold">Bài cùng chuyên mục</h2>
          <ul className="flex flex-col gap-2">
            {related.map((p) => (
              <li key={p.id}>
                <Link href={guidePath(p.slug)} className="font-bold text-link hover:underline">
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

export default function Page(props: PageProps<"/huong-dan/[slug]">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4 md:p-6">
      <Suspense fallback={<ListSkeleton rows={5} />}>
        <Guide {...props} />
      </Suspense>
    </main>
  );
}
