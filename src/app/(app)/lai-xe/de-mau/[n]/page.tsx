import { randomUUID } from "node:crypto";
import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { quizBookmarks, quizStats } from "@/lib/db";
import { WEB_BOGEN_LIMIT, bogenIds, classInfo, forClient, prefs } from "@/lib/laixe";
import DrivingRunner from "@/components/laixe/DrivingRunner";
import { ExamLoginGate } from "@/components/lid/LidParts";
import { ListSkeleton } from "@/components/Skeleton";

type P = PageProps<"/lai-xe/de-mau/[n]">;

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { n } = await params;
  // Trang chứa trọn 30 câu + đáp án + giải thích → không cho index / lần theo (chống gom bộ đề; xem robots.ts, crawl-guard.ts)
  return { title: `Đề mẫu ${n} hạng B · Lý thuyết lái xe`, robots: { index: false, follow: false } };
}

async function Sheet({ params, searchParams }: P) {
  const { n } = await params;
  const num = /^\d+$/.test(n) ? Number(n) : 0;
  const ids = bogenIds(num);
  // Web chỉ mở vài đề đầu (chống crawl trọn bộ đề); trọn bộ đề sẽ có trên ứng dụng di động đang hoàn thiện
  if (!ids || num > WEB_BOGEN_LIMIT) notFound();
  const m = (await searchParams).mode;
  const mode = m === "lesen" ? "lesen" : m === "ueben" ? "ueben" : "exam";
  const { lang } = await prefs();
  const user = await getCurrentUser();
  if (mode === "exam" && !user) {
    return (
      <ExamLoginGate
        next="/lai-xe/de-mau"
        lead={`Đăng ký miễn phí để thi thử Đề mẫu ${num} hạng B (30 câu · bấm giờ như thi thật), chấm điểm lỗi và ôn lại câu sai.`}
        secondBenefit="Lưu kết quả từng đề mẫu và gom câu sai để ôn lại"
      />
    );
  }
  const exam = classInfo("B").exam;
  return (
    <DrivingRunner
      // Thi: mỗi lần mở = lượt thi mới (Activity giữ state — đáp án, đồng hồ — của lượt trước); Back/Forward lấy lại từ cache nên vẫn giữ bài
      key={mode === "exam" ? `exam-${randomUUID()}` : mode}
      mode={mode}
      title={`Đề mẫu ${num}`}
      subtitle={mode === "exam" ? `Hạng B · 30 câu · ${exam.minutes} phút · ≤ ${exam.maxErrorPoints} điểm lỗi` : "Hạng B · 30 câu"}
      backHref="/lai-xe/de-mau"
      questions={await forClient(ids, lang)}
      loggedIn={!!user}
      lang={lang}
      stats={user ? quizStats(user.id, "fuehrerschein") : {}}
      bookmarks={user ? quizBookmarks(user.id, "fuehrerschein") : []}
      exam={mode === "exam" ? { kind: "bogen", ref: String(num), cls: "B", minutes: exam.minutes, maxErrorPoints: exam.maxErrorPoints } : undefined}
      modeLinks={{ lesen: `/lai-xe/de-mau/${num}?mode=lesen`, ueben: `/lai-xe/de-mau/${num}?mode=ueben` }}
      resumeKey={mode !== "exam" ? `laixe:pos:bogen:${num}:${mode}` : undefined}
    />
  );
}

export default function Page(props: P) {
  return (
    <main className="page" data-sec="laixe">
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <Sheet {...props} />
      </Suspense>
    </main>
  );
}
