import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getQuizExam, quizBookmarks } from "@/lib/db";
import { EXAM, forClient, getState, prefs } from "@/lib/lid";
import DrivingRunner from "@/components/lai-xe/DrivingRunner";
import { ListSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = { title: "Xem lại bài thi · Leben in Deutschland", robots: { index: false } };

async function Review({ params }: PageProps<"/leben-in-deutschland/thi-thu/[id]">) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/leben-in-deutschland/thi-thu/${id}`);
  const exam = /^\d+$/.test(id) ? getQuizExam(user.id, "lid", Number(id)) : null;
  if (!exam) notFound();
  const { lang } = await prefs();
  const when = new Date(exam.at).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" });
  return (
    <DrivingRunner
      module="lid"
      mode="review"
      title={`Thi thử · ${getState(exam.cls)?.name ?? exam.cls}`}
      subtitle={`Làm lúc ${when}`}
      backHref="/leben-in-deutschland/thong-ke"
      questions={await forClient(exam.answers.map((a) => a.qid), lang)}
      loggedIn
      lang={lang}
      bookmarks={quizBookmarks(user.id, "lid")}
      exam={{ kind: "random", ref: exam.ref, cls: exam.cls, minutes: EXAM.minutes, maxErrorPoints: exam.maxErrorPoints }}
      review={{
        picked: Object.fromEntries(exam.answers.map((a) => [a.qid, a.picked])),
        maxErrorPoints: exam.maxErrorPoints,
        result: { correct: exam.correct, total: exam.total, errorPoints: exam.errorPoints, fiveWrong: 0, passed: exam.passed, failReason: exam.failReason },
      }}
    />
  );
}

export default function Page(props: PageProps<"/leben-in-deutschland/thi-thu/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4 md:p-6">
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <Review {...props} />
      </Suspense>
    </main>
  );
}
