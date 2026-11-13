import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { quizBookmarks, quizStats } from "@/lib/db";
import { forClient, getSet, prefs } from "@/lib/lid";
import LidRunner from "@/components/lid/LidRunner";
import { LidShell } from "@/components/lid/LidParts";
import { ListSkeleton } from "@/components/Skeleton";

type P = PageProps<"/leben-in-deutschland/[set]">;

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const s = getSet((await params).set);
  if (!s) return { title: "Không tìm thấy", robots: { index: false, follow: false } };
  return { title: `${s.title} · Leben in Deutschland`, description: `${s.ids.length} câu hỏi Leben in Deutschland (${s.subtitle}) kèm bản dịch tiếng Việt.` };
}

async function SetView({ params, searchParams }: P) {
  const { set } = await params;
  const { state, lang } = await prefs();
  const s = getSet(set, state.code);
  if (!s) notFound();
  const mode = (await searchParams).mode === "lesen" ? "lesen" : "ueben";
  const user = await getCurrentUser();
  return (
    <LidRunner
      key={mode}
      mode={mode}
      title={s.title}
      backHref="/leben-in-deutschland"
      questions={await forClient(s.ids, lang)}
      loggedIn={!!user}
      lang={lang}
      stats={user ? quizStats(user.id, "lid") : {}}
      bookmarks={user ? quizBookmarks(user.id, "lid") : []}
      resumeKey={set === "hoc" ? `lid:hoc:${state.code}` : `lid:${set}:${mode}`}
    />
  );
}

export default function Page(props: P) {
  return (
    <LidShell>
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <SetView {...props} />
      </Suspense>
    </LidShell>
  );
}
