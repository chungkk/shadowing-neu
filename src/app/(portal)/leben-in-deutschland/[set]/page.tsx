import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { quizBookmarks, quizStats } from "@/lib/db";
import { forClient, getSet, prefs } from "@/lib/lid";
import DrivingRunner from "@/components/lai-xe/DrivingRunner";
import { ListSkeleton } from "@/components/Skeleton";

type P = PageProps<"/leben-in-deutschland/[set]">;

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const s = getSet((await params).set);
  if (!s) return { title: "Không tìm thấy", robots: { index: false, follow: false } };
  return { title: `${s.title} · Leben in Deutschland`, description: `${s.ids.length} câu hỏi Leben in Deutschland (${s.subtitle}) kèm bản dịch tiếng Việt.` };
}

async function SetView({ params, searchParams }: P) {
  const { set } = await params;
  const s = getSet(set);
  if (!s) notFound();
  const mode = (await searchParams).mode === "lesen" ? "lesen" : "ueben";
  const { lang } = await prefs();
  const user = await getCurrentUser();
  const base = `/leben-in-deutschland/${set}`;
  return (
    <DrivingRunner
      key={mode}
      module="lid"
      mode={mode}
      title={s.title}
      subtitle={s.subtitle}
      backHref="/leben-in-deutschland"
      questions={await forClient(s.ids, lang)}
      loggedIn={!!user}
      lang={lang}
      stats={user ? quizStats(user.id, "lid") : {}}
      bookmarks={user ? quizBookmarks(user.id, "lid") : []}
      modeLinks={{ lesen: `${base}?mode=lesen`, ueben: base }}
      resumeKey={`lid:${set}:${mode}`}
    />
  );
}

export default function Page(props: P) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4 md:p-6">
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <SetView {...props} />
      </Suspense>
    </main>
  );
}
