import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { quizBookmarks, quizStats } from "@/lib/db";
import { DEFAULT_CLASS, forClient, prefs, scopeQuestions } from "@/lib/fuehrerschein";
import DrivingRunner from "@/components/lai-xe/DrivingRunner";
import { ListSkeleton } from "@/components/Skeleton";

type P = PageProps<"/lai-xe/hoc/[scope]">;

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const s = scopeQuestions((await params).scope, DEFAULT_CLASS);
  if (!s) return { title: "Học lý thuyết lái xe" };
  return { title: `${s.title} · Lý thuyết lái xe`, description: `${s.ids.length} câu hỏi thi lý thuyết lái xe Đức (${s.subtitle}) kèm bản dịch tiếng Việt và giải thích.` };
}

async function Learn({ params, searchParams }: P) {
  const { scope } = await params;
  const mode = (await searchParams).mode === "lesen" ? "lesen" : "ueben";
  const { cls, lang } = await prefs();
  const s = scopeQuestions(scope, cls);
  if (!s) notFound();
  const user = await getCurrentUser();
  return (
    <DrivingRunner
      key={mode}
      mode={mode}
      title={s.title}
      subtitle={`${s.subtitle} · hạng ${cls}`}
      backHref="/lai-xe/hoc"
      questions={await forClient(s.ids, lang)}
      loggedIn={!!user}
      lang={lang}
      stats={user ? quizStats(user.id, "fuehrerschein") : {}}
      bookmarks={user ? quizBookmarks(user.id, "fuehrerschein") : []}
      modeLinks={{ lesen: `/lai-xe/hoc/${scope}?mode=lesen`, ueben: `/lai-xe/hoc/${scope}` }}
    />
  );
}

export default function Page(props: P) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4 md:p-6">
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <Learn {...props} />
      </Suspense>
    </main>
  );
}
