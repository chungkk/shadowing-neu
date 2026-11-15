import { Suspense } from "react";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { quizBookmarks } from "@/lib/db";
import { EXAM, EXAM_MAX_WRONG, examQuestionIds, forClient, prefs } from "@/lib/lid";
import LidRunner from "@/components/lid/LidRunner";
import { ExamLoginGate, LidShell } from "@/components/lid/LidParts";
import { ListSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = { title: "Đang thi thử · Leben in Deutschland", robots: { index: false } };

async function Exam() {
  const { state, lang } = await prefs(); // đọc cookie → trang động, đề ngẫu nhiên mỗi lần mở
  const user = await getCurrentUser();
  // Thi thử cần tài khoản: khách không nhận đề (không đồng hồ, không hỏi khi rời trang, không lộ đề)
  if (!user) return <ExamLoginGate next="/leben-in-deutschland/thi-thu" />;
  const ids = examQuestionIds(state.code);
  return (
    <LidRunner
      key={ids.join()} // đề mới = màn mới (Activity giữ state của lượt thi trước)
      mode="exam"
      title="Thi thử"
      backHref="/leben-in-deutschland/thi-thu"
      questions={await forClient(ids, { withAnswers: false })}
      loggedIn
      lang={lang}
      bookmarks={quizBookmarks(user.id, "lid")}
      exam={{ ref: state.code, cls: state.code, minutes: EXAM.minutes, maxWrong: EXAM_MAX_WRONG }}
    />
  );
}

export default function Page() {
  return (
    <LidShell>
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <Exam />
      </Suspense>
    </LidShell>
  );
}
