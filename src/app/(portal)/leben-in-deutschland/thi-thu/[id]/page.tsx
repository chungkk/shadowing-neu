import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getQuizExam, quizBookmarks } from "@/lib/db";
import { EXAM, forClient, prefs } from "@/lib/lid";
import LidRunner from "@/components/lid/LidRunner";
import { LidShell } from "@/components/lid/LidParts";
import { ListSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = { title: "Xem lại bài thi · Leben in Deutschland", robots: { index: false } };

async function Review({ params }: PageProps<"/leben-in-deutschland/thi-thu/[id]">) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/leben-in-deutschland/thi-thu/${id}`);
  const exam = /^\d+$/.test(id) ? getQuizExam(user.id, "lid", Number(id)) : null;
  if (!exam) notFound();
  const { lang } = await prefs();
  return (
    <LidRunner
      mode="review"
      title="Test"
      backHref="/leben-in-deutschland/thong-ke"
      questions={await forClient(exam.answers.map((a) => a.qid), lang)}
      loggedIn
      lang={lang}
      bookmarks={quizBookmarks(user.id, "lid")}
      exam={{ ref: exam.ref, cls: exam.cls, minutes: EXAM.minutes, maxWrong: exam.maxErrorPoints }}
      review={{
        picked: Object.fromEntries(exam.answers.map((a) => [a.qid, a.picked])),
        result: { correct: exam.correct, total: exam.total, errorPoints: exam.errorPoints, fiveWrong: 0, passed: exam.passed, failReason: exam.failReason },
      }}
    />
  );
}

export default function Page(props: PageProps<"/leben-in-deutschland/thi-thu/[id]">) {
  return (
    <LidShell>
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <Review {...props} />
      </Suspense>
    </LidShell>
  );
}
