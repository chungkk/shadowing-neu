import { Suspense } from "react";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { classInfo, examQuestionIds, forClient, prefs } from "@/lib/fuehrerschein";
import DrivingRunner from "@/components/lai-xe/DrivingRunner";
import { ListSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = { title: "Đang thi thử · Lý thuyết lái xe", robots: { index: false } };

async function Exam() {
  const { cls, lang } = await prefs(); // đọc cookie → trang động, đề ngẫu nhiên mỗi lần mở
  const info = classInfo(cls);
  const user = await getCurrentUser();
  return (
    <DrivingRunner
      mode="exam"
      title={`Thi thử hạng ${cls}`}
      subtitle={`${info.exam.questions} câu · ${info.exam.minutes} phút · ≤ ${info.exam.maxErrorPoints} điểm lỗi`}
      backHref="/lai-xe/thi-thu"
      questions={await forClient(examQuestionIds(cls), lang)}
      loggedIn={!!user}
      lang={lang}
      exam={{ kind: "random", ref: cls, cls, minutes: info.exam.minutes, maxErrorPoints: info.exam.maxErrorPoints }}
    />
  );
}

export default function Page() {
  return (
    <main className="page">
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <Exam />
      </Suspense>
    </main>
  );
}
