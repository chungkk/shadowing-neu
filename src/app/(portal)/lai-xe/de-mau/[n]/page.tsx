import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { quizBookmarks, quizStats } from "@/lib/db";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BOGEN_COUNT, WEB_BOGEN_LIMIT, bogenIds, classInfo, forClient, prefs } from "@/lib/fuehrerschein";
import AppOnlyCard from "@/components/lai-xe/AppOnlyCard";
import DrivingRunner from "@/components/lai-xe/DrivingRunner";
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
  if (!ids) notFound();
  if (num > WEB_BOGEN_LIMIT)
    return (
      <>
        <div className="flex items-center gap-2">
          <Link href="/lai-xe/de-mau" className="btn-icon" aria-label="Quay lại">
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="page-title">Đề mẫu {num}</h1>
        </div>
        <AppOnlyCard
          title="Đề này chỉ có trên app"
          text={`Web chỉ mở ${WEB_BOGEN_LIMIT} đề mẫu đầu tiên. Tải app để làm đề ${num} và trọn ${BOGEN_COUNT} đề mẫu chính thức.`}
        />
      </>
    );
  const m = (await searchParams).mode;
  const mode = m === "lesen" ? "lesen" : m === "ueben" ? "ueben" : "exam";
  const { lang } = await prefs();
  const user = await getCurrentUser();
  const exam = classInfo("B").exam;
  return (
    <DrivingRunner
      key={mode}
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
    />
  );
}

export default function Page(props: P) {
  return (
    <main className="page">
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <Sheet {...props} />
      </Suspense>
    </main>
  );
}
