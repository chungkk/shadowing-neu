import { Suspense } from "react";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { quizBookmarks } from "@/lib/db";
import { EXAM, EXAM_MAX_WRONG, EXAM_TOTAL, examQuestionIds, forClient, prefs } from "@/lib/lid";
import DrivingRunner from "@/components/lai-xe/DrivingRunner";
import { ListSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = { title: "Đang thi thử · Leben in Deutschland", robots: { index: false } };

async function Exam() {
  const { state, lang } = await prefs(); // đọc cookie → trang động, đề ngẫu nhiên mỗi lần mở
  const user = await getCurrentUser();
  return (
    <DrivingRunner
      module="lid"
      mode="exam"
      title={`Thi thử · ${state.name}`}
      subtitle={`${EXAM_TOTAL} câu · ${EXAM.minutes} phút · đúng ≥ ${EXAM.pass} câu`}
      backHref="/leben-in-deutschland/thi-thu"
      questions={await forClient(examQuestionIds(state.code), lang)}
      loggedIn={!!user}
      lang={lang}
      bookmarks={user ? quizBookmarks(user.id, "lid") : []}
      exam={{ kind: "random", ref: state.code, cls: state.code, minutes: EXAM.minutes, maxErrorPoints: EXAM_MAX_WRONG }}
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
