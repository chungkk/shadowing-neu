import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getQuizExam, listQuizExams, quizBookmarks, quizStats } from "@/lib/db";
import { isRight } from "@/lib/fuehrerschein-rules";
import { forClient, generalIds, gradable, prefs, stateIds } from "@/lib/lid";
import DrivingRunner from "@/components/lai-xe/DrivingRunner";
import { ListSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = { title: "Câu sai · Leben in Deutschland", robots: { index: false } };

type P = PageProps<"/leben-in-deutschland/cau-sai">;

async function Wrong({ searchParams }: P) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/leben-in-deutschland/cau-sai");
  const { state, lang } = await prefs();
  const stats = quizStats(user.id, "lid");
  let ids: string[];
  let title = "Ôn câu sai";
  let subtitle = `Các câu lần gần nhất làm sai · câu chung + ${state.name}`;
  if ((await searchParams).tu === "bai-thi") {
    const last = listQuizExams(user.id, "lid", 1)[0];
    const exam = last ? getQuizExam(user.id, "lid", last.id) : null;
    const picked = Object.fromEntries((exam?.answers ?? []).map((a) => [a.qid, a.picked]));
    ids = exam ? gradable(exam.answers.map((a) => a.qid)).filter((q) => !isRight(q, picked[q.id])).map((q) => q.id) : [];
    title = "Câu sai của bài thi gần nhất";
    subtitle = exam ? `${ids.length} câu` : "Chưa có bài thi nào";
  } else {
    ids = [...generalIds(), ...stateIds(state.code)].filter((id) => stats[id] && !stats[id].lastOk);
  }
  return (
    <DrivingRunner
      module="lid"
      mode="ueben"
      title={title}
      subtitle={subtitle}
      backHref="/leben-in-deutschland"
      questions={await forClient(ids, lang)}
      loggedIn
      lang={lang}
      stats={stats}
      bookmarks={quizBookmarks(user.id, "lid")}
    />
  );
}

export default function Page(props: P) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4 md:p-6">
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <Wrong {...props} />
      </Suspense>
    </main>
  );
}
