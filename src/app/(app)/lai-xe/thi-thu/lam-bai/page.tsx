import { Suspense } from "react";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { quizBookmarks } from "@/lib/db";
import { classInfo, examQuestionIds, forClient, prefs } from "@/lib/laixe";
import DrivingRunner from "@/components/laixe/DrivingRunner";
import { ExamLoginGate } from "@/components/lid/LidParts";
import { ListSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = { title: "Đang thi thử · Lý thuyết lái xe", robots: { index: false } };

async function Exam() {
  const { cls, lang } = await prefs(); // đọc cookie → trang động, đề ngẫu nhiên mỗi lần mở
  const info = classInfo(cls);
  const user = await getCurrentUser();
  // Thi thử cần tài khoản: chặn ngay ở server (không tạo đề 30 câu và không chạy đồng hồ ngầm)
  if (!user) {
    return (
      <ExamLoginGate
        next="/lai-xe/thi-thu"
        lead={`Đăng ký miễn phí để làm bài thi thử hạng ${cls} (${info.exam.questions} câu · ${info.exam.minutes} phút) như phần mềm thi thật, chấm điểm lỗi và ôn lại câu sai.`}
        secondBenefit="Gom câu làm sai sau mỗi lần thi để ôn lại ngay"
      />
    );
  }
  const ids = examQuestionIds(cls);
  return (
    <DrivingRunner
      key={ids.join()} // đề mới = màn mới (Activity giữ state — đáp án, đồng hồ — của lượt thi trước)
      mode="exam"
      title={`Thi thử hạng ${cls}`}
      subtitle={`${info.exam.questions} câu · ${info.exam.minutes} phút · ≤ ${info.exam.maxErrorPoints} điểm lỗi`}
      backHref="/lai-xe/thi-thu"
      questions={await forClient(ids, lang)}
      loggedIn
      lang={lang}
      bookmarks={quizBookmarks(user.id, "fuehrerschein")}
      exam={{ kind: "random", ref: cls, cls, minutes: info.exam.minutes, maxErrorPoints: info.exam.maxErrorPoints }}
    />
  );
}

export default function Page() {
  return (
    <main className="page" data-sec="laixe">
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <Exam />
      </Suspense>
    </main>
  );
}
