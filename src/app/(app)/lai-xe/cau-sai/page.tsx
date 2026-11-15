import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getQuizExam, listQuizExams, quizBookmarks, quizStats } from "@/lib/db";
import { classQuestionIds, forClient, gradable, prefs } from "@/lib/fuehrerschein";
import { isRight } from "@/lib/fuehrerschein-rules";
import DrivingRunner from "@/components/lai-xe/DrivingRunner";
import { ListSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = { title: "Câu sai · Lý thuyết lái xe", robots: { index: false } };

type P = PageProps<"/lai-xe/cau-sai">;

async function Wrong({ searchParams }: P) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/lai-xe/cau-sai");
  const { cls, lang } = await prefs();
  const lastExam = (await searchParams).tu === "bai-thi";
  let ids: string[];
  let title = "Ôn câu sai";
  let subtitle = `Các câu lần gần nhất làm sai · hạng ${cls}`;
  if (lastExam) {
    // Câu sai của bài thi gần nhất
    const last = listQuizExams(user.id, "fuehrerschein", 1)[0];
    const exam = last ? getQuizExam(user.id, "fuehrerschein", last.id) : null;
    const picked = Object.fromEntries((exam?.answers ?? []).map((a) => [a.qid, a.picked]));
    ids = exam ? gradable(exam.answers.map((a) => a.qid)).filter((q) => !isRight(q, picked[q.id])).map((q) => q.id) : [];
    title = "Câu sai của bài thi gần nhất";
    subtitle = exam ? `${exam.kind === "bogen" ? `Đề mẫu ${exam.ref}` : `Thi thử hạng ${exam.cls}`} · ${ids.length} câu` : "Chưa có bài thi nào";
  } else {
    const stats = quizStats(user.id, "fuehrerschein");
    ids = classQuestionIds(cls).filter((id) => stats[id] && !stats[id].lastOk);
  }
  return (
    <DrivingRunner
      mode="ueben"
      title={title}
      subtitle={subtitle}
      backHref="/lai-xe"
      questions={await forClient(ids, lang)}
      loggedIn
      lang={lang}
      stats={quizStats(user.id, "fuehrerschein")}
      bookmarks={quizBookmarks(user.id, "fuehrerschein")}
    />
  );
}

export default function Page(props: P) {
  return (
    <main className="page">
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <Wrong {...props} />
      </Suspense>
    </main>
  );
}
