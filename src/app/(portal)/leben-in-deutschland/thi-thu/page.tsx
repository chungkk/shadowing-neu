import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { EXAM, examQuestions, getState } from "@/lib/lid";
import QuizRunner from "@/components/QuizRunner";
import { ListSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = { title: "Thi thử Leben in Deutschland", description: "Đề thi thử Leben in Deutschland 33 câu (30 câu chung + 3 câu của bang), đúng 17 câu là đậu." };

async function Exam({ searchParams }: PageProps<"/leben-in-deutschland/thi-thu">) {
  await connection(); // đề ngẫu nhiên mỗi lần mở
  const bang = (await searchParams).bang;
  const state = typeof bang === "string" ? getState(bang) : null;
  if (!state) redirect("/leben-in-deutschland");
  const user = await getCurrentUser();
  return (
    <QuizRunner
      module="lid"
      title={`Thi thử · ${state.name}`}
      backHref="/leben-in-deutschland"
      questions={examQuestions(state.code)}
      loggedIn={!!user}
      exam={{ kind: "correctCount", pass: EXAM.pass, minutes: EXAM.minutes }}
    />
  );
}

export default function Page(props: PageProps<"/leben-in-deutschland/thi-thu">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4 md:p-6">
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <Exam {...props} />
      </Suspense>
    </main>
  );
}
