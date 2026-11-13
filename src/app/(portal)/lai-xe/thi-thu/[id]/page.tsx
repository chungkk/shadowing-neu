import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getQuizExam, quizBookmarks } from "@/lib/db";
import { forClient, prefs } from "@/lib/fuehrerschein";
import DrivingRunner from "@/components/lai-xe/DrivingRunner";
import { ListSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = { title: "Xem lại bài thi · Lý thuyết lái xe", robots: { index: false } };

async function Review({ params }: PageProps<"/lai-xe/thi-thu/[id]">) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/lai-xe/thi-thu/${id}`);
  const exam = /^\d+$/.test(id) ? getQuizExam(user.id, "fuehrerschein", Number(id)) : null;
  if (!exam) notFound();
  const { lang } = await prefs();
  const orders = Object.fromEntries(exam.answers.map((a) => [a.qid, a.order]));
  const picked = Object.fromEntries(exam.answers.map((a) => [a.qid, a.picked]));
  const when = new Date(exam.at).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" });
  return (
    <DrivingRunner
      mode="review"
      title={exam.kind === "bogen" ? `Đề mẫu ${exam.ref}` : `Thi thử hạng ${exam.cls}`}
      subtitle={`Làm lúc ${when}`}
      backHref="/lai-xe/thong-ke"
      questions={await forClient(exam.answers.map((a) => a.qid), lang, orders)}
      loggedIn
      lang={lang}
      bookmarks={quizBookmarks(user.id, "fuehrerschein")}
      exam={{ kind: exam.kind, ref: exam.ref, cls: exam.cls, minutes: 45, maxErrorPoints: exam.maxErrorPoints }}
      review={{
        picked,
        maxErrorPoints: exam.maxErrorPoints,
        result: { correct: exam.correct, total: exam.total, errorPoints: exam.errorPoints, fiveWrong: 0, passed: exam.passed, failReason: exam.failReason },
      }}
    />
  );
}

export default function Page(props: PageProps<"/lai-xe/thi-thu/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 md:p-6">
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <Review {...props} />
      </Suspense>
    </main>
  );
}
