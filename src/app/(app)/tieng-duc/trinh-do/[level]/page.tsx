import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookOpen, ChevronLeft, Languages } from "lucide-react";
import { connection } from "next/server";
import { lockInfo } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { lessonGridItems } from "@/lib/lesson-items";
import {
  LEVEL_CATALOG,
  activeLessonLevels,
  deckForLevel,
  levelCatalogPath,
  parseCefrLevel,
} from "@/lib/lesson-seo";
import { pageMeta } from "@/lib/page-meta";
import { ORGANIZATION_ID, serializeJsonLd } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import { lessonPath } from "@/lib/slug";
import LessonGrid from "@/components/LessonGrid";
import PageHeader from "@/components/PageHeader";
import { LessonGridSkeleton } from "@/components/Skeleton";

export async function generateMetadata({ params }: PageProps<"/tieng-duc/trinh-do/[level]">): Promise<Metadata> {
  const lv = parseCefrLevel((await params).level);
  if (!lv) return { title: "Không tìm thấy trình độ", robots: { index: false, follow: false } };
  const info = LEVEL_CATALOG[lv];
  const hasLessons = activeLessonLevels().some((x) => x.info.level === lv);
  const meta = pageMeta({
    title: info.title,
    description: info.description,
    path: levelCatalogPath(lv),
  });
  // Chống nội dung mỏng: chỉ cho Google index những trình độ đã có bài học thật
  return hasLessons ? meta : { ...meta, robots: { index: false, follow: true } };
}

async function LevelCatalogView({ params }: PageProps<"/tieng-duc/trinh-do/[level]">) {
  await connection();
  const lv = parseCefrLevel((await params).level);
  if (!lv) notFound();

  const info = LEVEL_CATALOG[lv];
  const user = await getCurrentUser();
  const admin = user?.role === "admin";
  const lessons = lessonGridItems(user, (l) => l.level === lv);
  const active = activeLessonLevels();
  const deck = deckForLevel(lv);
  const first = lessons.find((l) => l.access !== "locked");

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: info.heading,
        description: info.description,
        url: `${SITE_URL}${levelCatalogPath(lv)}`,
        inLanguage: ["vi", "de"],
        isPartOf: { "@id": `${SITE_URL}/#website` },
        publisher: { "@id": ORGANIZATION_ID },
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
          { "@type": "ListItem", position: 3, name: `Trình độ ${lv}`, item: `${SITE_URL}${levelCatalogPath(lv)}` },
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
          <span className="font-semibold text-foreground">Trình độ {lv}</span>
        </nav>

        <PageHeader
          sec="de"
          icon={Languages}
          mascot
          title={info.heading}
          sub={info.intro}
          meta={
            <span className="badge badge-accent tabular-nums">
              {lessons.length} bài video
            </span>
          }
          actions={
            first && (
              <Link href={lessonPath(first.slug)} className="btn btn-primary max-sm:w-full">
                Bắt đầu bài {lv} đầu tiên <ArrowRight className="size-4" />
              </Link>
            )
          }
        >
          {active.length > 1 && (
            <nav aria-label="Chuyển trình độ" className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs font-semibold text-muted">Trình độ khác:</span>
              {active.map(({ info: other, count }) => (
                <Link
                  key={other.level}
                  href={levelCatalogPath(other.level)}
                  aria-current={other.level === lv ? "page" : undefined}
                  className="chip hit-44 text-xs"
                >
                  {other.level}
                  <span className="tabular-nums opacity-75">{count}</span>
                </Link>
              ))}
            </nav>
          )}
        </PageHeader>
      </div>

      {/* Liên kết nội bộ sang kho Từ vựng tương ứng trình độ */}
      {deck && (
        <Link
          href={`/vocab/decks/${deck.slug}`}
          className="card card-link flex items-center gap-3.5 p-4 sm:px-5"
          data-sec="de"
        >
          <span className="icon-bubble tint-sec size-10 shrink-0">
            <BookOpen className="size-5" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-sm font-semibold text-foreground sm:text-base">
              Từ vựng tiếng Đức {lv}: {deck.title}
            </span>
            <span className="text-xs text-muted sm:text-sm">
              {deck.wordCount.toLocaleString("vi-VN")} từ kèm nghĩa tiếng Việt, phát âm, giống der/die/das và ôn SRS.
            </span>
          </span>
          <ArrowRight className="size-4 shrink-0 text-sec-text" />
        </Link>
      )}

      <LessonGrid lessons={lessons} lock={lockInfo(admin ? null : user)} admin={admin} />
    </>
  );
}

export default function Page(props: PageProps<"/tieng-duc/trinh-do/[level]">) {
  return (
    <main className="page gap-8 md:gap-10" data-sec="de">
      <Suspense fallback={<LessonGridSkeleton />}>
        <LevelCatalogView {...props} />
      </Suspense>
    </main>
  );
}
