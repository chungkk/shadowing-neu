import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { quizStats } from "@/lib/db";
import { questionsByIds } from "@/lib/fuehrerschein";
import QuizRunner from "@/components/QuizRunner";
import { ListSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = { title: "Ôn câu sai · Lý thuyết lái xe", robots: { index: false } };

async function Review() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/lai-xe/on-tap");
  const stats = quizStats(user.id, "fuehrerschein");
  const wrong = Object.keys(stats).filter((id) => !stats[id].lastOk);
  return <QuizRunner module="fuehrerschein" title="Ôn câu sai" backHref="/lai-xe" questions={questionsByIds(wrong)} loggedIn stats={stats} multi />;
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
