import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { quizBookmarks, quizStats } from "@/lib/db";
import { forClient, prefs } from "@/lib/lid";
import LidRunner from "@/components/lid/LidRunner";
import { LidShell } from "@/components/lid/LidParts";
import { ListSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = { title: "Câu đánh dấu · Leben in Deutschland", robots: { index: false } };

async function Marked() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/leben-in-deutschland/danh-dau");
  const { lang } = await prefs();
  const ids = quizBookmarks(user.id, "lid");
  return (
    <LidRunner
      mode="ueben"
      title="Đã đánh dấu"
      backHref="/leben-in-deutschland"
      questions={await forClient(ids, lang)}
      loggedIn
      lang={lang}
      stats={quizStats(user.id, "lid")}
      bookmarks={ids}
      resumeKey="lid:danh-dau"
    />
  );
}

export default function Page() {
  return (
    <LidShell>
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <Marked />
      </Suspense>
    </LidShell>
  );
}
