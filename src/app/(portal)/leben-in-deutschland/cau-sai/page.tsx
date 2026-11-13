import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getQuizExam, listQuizExams, quizBookmarks, quizStats } from "@/lib/db";
import { isRight } from "@/lib/fuehrerschein-rules";
import { forClient, generalIds, gradable, prefs, stateIds } from "@/lib/lid";
import LidRunner from "@/components/lid/LidRunner";
import { LidShell } from "@/components/lid/LidParts";
import { ListSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = { title: "Câu sai · Leben in Deutschland", robots: { index: false } };

type P = PageProps<"/leben-in-deutschland/cau-sai">;

async function Wrong({ searchParams }: P) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/leben-in-deutschland/cau-sai");
  const { state, lang } = await prefs();
  const stats = quizStats(user.id, "lid");
  let ids: string[];
  let title = "Câu sai";
  if ((await searchParams).tu === "bai-thi") {
    const last = listQuizExams(user.id, "lid", 1)[0];
    const exam = last ? getQuizExam(user.id, "lid", last.id) : null;
    const picked = Object.fromEntries((exam?.answers ?? []).map((a) => [a.qid, a.picked]));
    ids = exam ? gradable(exam.answers.map((a) => a.qid)).filter((q) => !isRight(q, picked[q.id])).map((q) => q.id) : [];
    title = "Câu sai bài thi";
  } else {
    ids = [...generalIds(), ...stateIds(state.code)].filter((id) => stats[id] && !stats[id].lastOk);
  }
  return (
    <LidRunner
      mode="ueben"
      title={title}
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
    <LidShell>
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <Wrong {...props} />
      </Suspense>
    </LidShell>
  );
}
