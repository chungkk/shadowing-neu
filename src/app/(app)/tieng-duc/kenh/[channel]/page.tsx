import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronLeft, ExternalLink, Languages } from "lucide-react";
import { connection } from "next/server";
import { lockInfo } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { fillLessonChannels } from "@/lib/channels";
import { lessonGridItems } from "@/lib/lesson-items";
import { CHANNEL_MIN_INDEX, lessonChannels } from "@/lib/lesson-seo";
import { pageMeta } from "@/lib/page-meta";
import { ORGANIZATION_ID, serializeJsonLd } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import { channelPath, channelSlug, lessonPath } from "@/lib/slug";
import LessonGrid from "@/components/LessonGrid";
import PageHeader from "@/components/PageHeader";
import { LessonGridSkeleton } from "@/components/Skeleton";

const findChannel = (slug: string) => lessonChannels().find((c) => c.slug === slug) ?? null;

const levelRange = (levels: string[]) => (levels.length > 1 ? `${levels[0]}–${levels[levels.length - 1]}` : (levels[0] ?? ""));

export async function generateMetadata({ params }: PageProps<"/tieng-duc/kenh/[channel]">): Promise<Metadata> {
  const ch = findChannel((await params).channel);
  if (!ch) return { title: "Không tìm thấy kênh", robots: { index: false, follow: false } };
  const range = levelRange(ch.levels);
  const meta = pageMeta({
    title: `Học tiếng Đức với ${ch.name} – ${ch.count} bài luyện nghe nói${range ? ` ${range}` : ""}`,
    description: `${ch.count} video của kênh ${ch.name} thành bài học tiếng Đức: phụ đề từng câu kèm dịch tiếng Việt, shadowing, ghi âm và chép chính tả${range ? `, trình độ ${range}` : ""}.`,
    path: channelPath(ch.name),
  });
  // Kênh mới có 1–2 bài: chưa cho index (nội dung mỏng), vẫn theo link để Google tìm thấy từng bài
  return ch.count >= CHANNEL_MIN_INDEX ? meta : { ...meta, robots: { index: false, follow: true } };
}

async function ChannelView({ params }: PageProps<"/tieng-duc/kenh/[channel]">) {
  await connection();
  const ch = findChannel((await params).channel);
  if (!ch) notFound();

  const user = await getCurrentUser();
  const admin = user?.role === "admin";
  fillLessonChannels();
  const lessons = lessonGridItems(user, (l) => !!l.channel?.trim() && channelSlug(l.channel) === ch.slug);
  const first = lessons.find((l) => l.access !== "locked");
  const others = lessonChannels().filter((c) => c.slug !== ch.slug).slice(0, 12);
  const avatar = lessons.find((l) => l.channelAvatar)?.channelAvatar ?? null;
  const range = levelRange(ch.levels);
  const url = `${SITE_URL}${channelPath(ch.name)}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: `Học tiếng Đức với ${ch.name}`,
        url,
        inLanguage: ["vi", "de"],
        isPartOf: { "@id": `${SITE_URL}/#website` },
        publisher: { "@id": ORGANIZATION_ID },
        ...(ch.url && { about: { "@type": "Organization", name: ch.name, url: ch.url } }),
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: lessons.length,
          itemListElement: lessons.slice(0, 20).map((l, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: `${SITE_URL}${lessonPath(l.slug)}`,
            name: l.title,
          })),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Trang chủ", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Tiếng Đức", item: `${SITE_URL}/tieng-duc` },
          { "@type": "ListItem", position: 3, name: ch.name, item: url },
        ],
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />

      <div className="flex flex-col gap-4">
        <nav aria-label="Đường dẫn" className="flex items-center gap-1.5 text-sm text-muted">
          <Link href="/tieng-duc" className="inline-flex items-center gap-1 font-bold hover:text-foreground">
            <ChevronLeft className="size-4" /> Tiếng Đức
          </Link>
          <span aria-hidden>/</span>
          <span className="min-w-0 truncate font-semibold text-foreground">{ch.name}</span>
        </nav>

        <PageHeader
          sec="de"
          icon={Languages}
          mascot={!avatar}
          title={`Học tiếng Đức với ${ch.name}`}
          sub={`Các video của kênh YouTube ${ch.name} đã thành bài học: nghe từng câu, nói theo (shadowing), ghi âm so sánh và chép chính tả cùng bản dịch tiếng Việt.`}
          meta={
            <>
              {avatar && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt="" className="size-7 rounded-full border border-line bg-card-2 object-cover" />
              )}
              <span className="badge badge-accent tabular-nums">{lessons.length} bài video</span>
              {range && <span className="badge badge-muted">{range}</span>}
            </>
          }
          actions={
            <>
              {first && (
                <Link href={lessonPath(first.slug)} className="btn btn-primary max-sm:w-full">
                  Học bài đầu tiên <ArrowRight className="size-4" />
                </Link>
              )}
              {ch.url && (
                <a href={ch.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost text-muted max-sm:w-full">
                  <ExternalLink className="size-4" /> Kênh trên YouTube
                </a>
              )}
            </>
          }
        >
          {others.length > 0 && (
            <nav aria-label="Kênh khác" className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs font-semibold text-muted">Kênh khác:</span>
              {others.map((c) => (
                <Link key={c.slug} href={channelPath(c.name)} className="chip hit-44 text-xs">
                  {c.name}
                  <span className="tabular-nums opacity-75">{c.count}</span>
                </Link>
              ))}
            </nav>
          )}
        </PageHeader>
      </div>

      <LessonGrid lessons={lessons} lock={lockInfo(admin ? null : user)} admin={admin} channel={ch.name} />
    </>
  );
}

export default function Page(props: PageProps<"/tieng-duc/kenh/[channel]">) {
  return (
    <main className="page gap-8 md:gap-10" data-sec="de">
      <Suspense fallback={<LessonGridSkeleton />}>
        <ChannelView {...props} />
      </Suspense>
    </main>
  );
}
