import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { EXAM, examQuestions } from "@/lib/fuehrerschein";
import QuizRunner from "@/components/QuizRunner";
import { ListSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = { title: "Thi thử lý thuyết lái xe", description: "Đề thi thử lý thuyết lái xe Đức hạng B, 30 câu, chấm theo điểm lỗi như thi thật." };

async function Exam() {
  await connection(); // đề ngẫu nhiên mỗi lần mở
  const user = await getCurrentUser();
  return (
    <QuizRunner
      module="fuehrerschein"
      title="Thi thử hạng B"
      backHref="/lai-xe"
      questions={examQuestions()}
      loggedIn={!!user}
      exam={{ kind: "errorPoints", maxErrorPoints: EXAM.maxErrorPoints, minutes: EXAM.minutes }}
      multi
    />
  );
}

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4 md:p-6">
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <Exam />
      </Suspense>
    </main>
  );
}
