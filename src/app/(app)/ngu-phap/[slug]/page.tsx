import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, GraduationCap } from "lucide-react";
import LevelBadge from "@/components/LevelBadge";
import PageHeader from "@/components/PageHeader";
import GrammarLessonView from "@/components/grammar/GrammarLessonView";
import {
  ALL_GRAMMAR_LESSONS,
  getAdjacentLessons,
  getGrammarCategory,
  getGrammarLesson,
  stripGrammarMarkup,
} from "@/lib/grammar";
import { clip, pageMeta } from "@/lib/page-meta";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return ALL_GRAMMAR_LESSONS.map((lesson) => ({ slug: lesson.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const lesson = getGrammarLesson(slug);
  if (!lesson) return { title: "Không tìm thấy bài ngữ pháp", robots: { index: false, follow: false } };

  return pageMeta({
    // Tên bài thường đã có thuật ngữ tiếng Đức trong ngoặc → không lặp lại germanTitle (title dài, lặp từ)
    title: `${lesson.title.includes("(") ? lesson.title : `${lesson.title} (${lesson.germanTitle})`} – Ngữ pháp tiếng Đức ${lesson.level}`,
    description: clip(stripGrammarMarkup(lesson.summary)),
    path: `/ngu-phap/${lesson.slug}`,
    type: "article",
  });
}

export default async function GrammarLessonPage({ params }: PageProps) {
  const { slug } = await params;
  const lesson = getGrammarLesson(slug);
  if (!lesson) notFound();

  const category = getGrammarCategory(lesson.categoryId);
  const { prev, next } = getAdjacentLessons(lesson.slug);

  return (
    <main className="page gap-6" data-sec="de">
      {/* Đường dẫn phân cấp */}
      <nav
        aria-label="Đường dẫn"
        className="flex flex-wrap items-center gap-1.5 text-xs text-muted"
      >
        <Link href="/ngu-phap" className="font-medium hover:text-foreground hover:underline">
          Ngữ pháp
        </Link>
        {category && (
          <>
            <ChevronRight className="size-3.5 shrink-0 opacity-60" aria-hidden />
            <Link
              href={`/ngu-phap#chuong-${category.id}`}
              className="hover:text-foreground hover:underline"
            >
              Chương {category.order}: {category.title}
            </Link>
          </>
        )}
        <ChevronRight className="size-3.5 shrink-0 opacity-60" aria-hidden />
        <span className="font-mono font-semibold text-foreground">{lesson.code}</span>
      </nav>

      <PageHeader
        sec="de"
        compact
        icon={GraduationCap}
        title={lesson.title}
        sub={
          <>
            <span lang="de" className="font-semibold text-foreground/85">
              {lesson.germanTitle}
            </span>
            <span> — {lesson.summary}</span>
          </>
        }
        meta={
          <>
            <span className="rounded-md border border-line bg-sidebar px-2 py-0.5 font-mono text-[11px] font-bold text-foreground">
              {lesson.code}
            </span>
            <LevelBadge level={lesson.level} />
          </>
        }
      />

      <GrammarLessonView lesson={lesson} category={category} prev={prev} next={next} />
    </main>
  );
}
