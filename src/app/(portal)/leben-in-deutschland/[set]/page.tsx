import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { quizStats } from "@/lib/db";
import { getSet } from "@/lib/lid";
import QuizRunner from "@/components/QuizRunner";
import { ListSkeleton } from "@/components/Skeleton";

export async function generateMetadata({ params }: PageProps<"/leben-in-deutschland/[set]">): Promise<Metadata> {
  const s = getSet((await params).set);
  if (!s) return { title: "Không tìm thấy", robots: { index: false, follow: false } };
  return { title: `${s.title} · Leben in Deutschland` };
}

async function SetView({ params }: PageProps<"/leben-in-deutschland/[set]">) {
  const s = getSet((await params).set);
  if (!s) notFound();
  const user = await getCurrentUser();
  return <QuizRunner module="lid" title={s.title} backHref="/leben-in-deutschland" questions={s.questions} loggedIn={!!user} stats={user ? quizStats(user.id, "lid") : {}} />;
}

export default function Page(props: PageProps<"/leben-in-deutschland/[set]">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4 md:p-6">
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <SetView {...props} />
      </Suspense>
    </main>
  );
}
