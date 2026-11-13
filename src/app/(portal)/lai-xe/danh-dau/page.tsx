import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { quizBookmarks, quizStats } from "@/lib/db";
import { forClient, prefs } from "@/lib/fuehrerschein";
import DrivingRunner from "@/components/lai-xe/DrivingRunner";
import { ListSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = { title: "Câu đánh dấu · Lý thuyết lái xe", robots: { index: false } };

type P = PageProps<"/lai-xe/danh-dau">;

async function Marked({ searchParams }: P) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/lai-xe/danh-dau");
  const { lang } = await prefs();
  const mode = (await searchParams).mode === "lesen" ? "lesen" : "ueben";
  const ids = quizBookmarks(user.id, "fuehrerschein");
  return (
    <DrivingRunner
      key={mode}
      mode={mode}
      title="Câu đánh dấu"
      subtitle={`${ids.length} câu · bấm ⭐ để bỏ đánh dấu`}
      backHref="/lai-xe"
      questions={await forClient(ids, lang)}
      loggedIn
      lang={lang}
      stats={quizStats(user.id, "fuehrerschein")}
      bookmarks={ids}
      modeLinks={{ lesen: "/lai-xe/danh-dau?mode=lesen", ueben: "/lai-xe/danh-dau" }}
    />
  );
}

export default function Page(props: P) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4 md:p-6">
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <Marked {...props} />
      </Suspense>
    </main>
  );
}
