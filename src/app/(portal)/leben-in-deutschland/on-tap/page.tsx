import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { quizStats } from "@/lib/db";
import { questionsByIds } from "@/lib/lid";
import QuizRunner from "@/components/QuizRunner";
import { ListSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = { title: "Ôn câu sai · Leben in Deutschland", robots: { index: false } };

async function Review() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/leben-in-deutschland/on-tap");
  const stats = quizStats(user.id, "lid");
  const wrong = Object.keys(stats).filter((id) => !stats[id].lastOk);
  return <QuizRunner module="lid" title="Ôn câu sai" backHref="/leben-in-deutschland" questions={questionsByIds(wrong)} loggedIn stats={stats} />;
}

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4 md:p-6">
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <Review />
      </Suspense>
    </main>
  );
}
