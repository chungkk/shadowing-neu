import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { quizBookmarks, quizStats } from "@/lib/db";
import { bogenIds, classInfo, forClient, prefs } from "@/lib/fuehrerschein";
import DrivingRunner from "@/components/lai-xe/DrivingRunner";
import { ListSkeleton } from "@/components/Skeleton";

type P = PageProps<"/lai-xe/de-mau/[n]">;

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { n } = await params;
  return { title: `Đề mẫu ${n} hạng B · Lý thuyết lái xe`, description: `Đề mẫu chính thức số ${n} thi lý thuyết lái xe Đức hạng B, 30 câu kèm bản dịch và giải thích.` };
}

async function Sheet({ params, searchParams }: P) {
  const { n } = await params;
  const num = /^\d+$/.test(n) ? Number(n) : 0;
  const ids = bogenIds(num);
  if (!ids) notFound();
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
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4 md:p-6">
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <Sheet {...props} />
      </Suspense>
    </main>
  );
}
