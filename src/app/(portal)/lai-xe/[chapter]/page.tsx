import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { quizStats } from "@/lib/db";
import { getChapter } from "@/lib/fuehrerschein";
import QuizRunner from "@/components/QuizRunner";
import { ListSkeleton } from "@/components/Skeleton";

export async function generateMetadata({ params }: PageProps<"/lai-xe/[chapter]">): Promise<Metadata> {
  const c = getChapter((await params).chapter);
  if (!c) return { title: "Không tìm thấy chương", robots: { index: false, follow: false } };
  return { title: `${c.chapter.name} · Lý thuyết lái xe`, description: `${c.questions.length} câu hỏi thi lý thuyết lái xe Đức (${c.topic.de}) kèm bản dịch tiếng Việt.` };
}

async function Chapter({ params }: PageProps<"/lai-xe/[chapter]">) {
  const c = getChapter((await params).chapter);
  if (!c) notFound();
  const user = await getCurrentUser();
  return (
    <QuizRunner
      module="fuehrerschein"
      title={c.chapter.name}
      backHref="/lai-xe"
      questions={c.questions}
      loggedIn={!!user}
      stats={user ? quizStats(user.id, "fuehrerschein") : {}}
      multi
    />
  );
}

export default function Page(props: PageProps<"/lai-xe/[chapter]">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4 md:p-6">
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <Chapter {...props} />
      </Suspense>
    </main>
  );
}
