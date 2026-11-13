import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, BookOpen, RotateCcw, Star } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { quizBookmarks, quizStats } from "@/lib/db";
import { classQuestionIds, learnTree, prefs } from "@/lib/fuehrerschein";
import { summarize } from "@/lib/quiz-types";
import { ActionCard, ProgressBar } from "@/components/QuizParts";
import { ListSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = {
  title: "Học theo chủ đề · Lý thuyết lái xe",
  description: "Học lý thuyết lái xe Đức theo chủ đề và chương: phần cơ bản (Grundstoff) và phần riêng từng hạng (Zusatzstoff), chế độ Đọc và Luyện.",
};

async function Topics() {
  const { cls } = await prefs();
  const user = await getCurrentUser();
  const stats = user ? quizStats(user.id, "fuehrerschein") : {};
  const ids = classQuestionIds(cls);
  const inClass = new Set(ids);
  const all = summarize(ids, stats);
  const marked = user ? quizBookmarks(user.id, "fuehrerschein").filter((id) => inClass.has(id)).length : 0;
  const tree = learnTree(cls);

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <ActionCard
          href="/lai-xe/danh-dau"
          icon={Star}
          title="Câu đánh dấu"
          disabled={!user || !marked}
          text={!user ? "Đăng nhập để đánh dấu câu" : marked ? `${marked} câu` : "Bấm ⭐ ở câu hỏi để đánh dấu"}
        />
        <ActionCard
          href="/lai-xe/cau-sai"
          icon={RotateCcw}
          title="Ôn câu sai"
          disabled={!user || !all.wrong}
          text={!user ? "Đăng nhập để lưu câu sai" : all.wrong ? `${all.wrong} câu đang sai` : "Chưa có câu sai nào"}
        />
        <ActionCard href="/lai-xe/hoc/grund?mode=lesen" icon={BookOpen} title="Đọc lướt đáp án" text="Câu hỏi có sẵn đáp án đúng" />
      </div>

      {/* Học theo chủ đề: phần cơ bản / phần riêng → chủ đề → chương */}
      {tree.map((part) => {
        const ps = summarize(part.ids, stats);
        return (
          <section key={part.key} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
              <div>
                <h2 className="text-xl font-extrabold">{part.title}</h2>
                <p className="text-sm text-muted">{part.subtitle}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted tabular-nums">
                  {user ? `${ps.done}/` : ""}
                  {ps.total} câu
                </span>
                <Link href={`/lai-xe/hoc/${part.key}?mode=lesen`} className="btn px-3 py-1.5">
                  Đọc
                </Link>
                <Link href={`/lai-xe/hoc/${part.key}`} className="btn btn-amber px-3 py-1.5">
                  Luyện
                </Link>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {part.themes.map((t) => {
                const ts = summarize(t.ids, stats);
                return (
                  <details key={t.id} className="sticker group overflow-hidden">
                    <summary className="flex cursor-pointer list-none flex-col gap-2 p-3 [&::-webkit-details-marker]:hidden">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="min-w-0 font-extrabold">
                          <span aria-hidden className="mr-1 inline-block transition group-open:rotate-90">
                            ▸
                          </span>
                          {t.vi || t.de} <span className="text-sm font-bold text-muted">· {t.de}</span>
                        </span>
                        <span className="shrink-0 text-xs text-muted tabular-nums">
                          {user ? `${ts.done}/` : ""}
                          {ts.total}
                        </span>
                      </span>
                      {user && <ProgressBar {...ts} />}
                    </summary>
                    <div className="flex flex-col gap-1 border-t-2 border-ink/10 p-2">
                      <div className="flex justify-end gap-2 px-1 pb-1">
                        <Link href={`/lai-xe/hoc/${t.id}?mode=lesen`} className="text-sm font-bold text-muted underline-offset-2 hover:underline">
                          Đọc cả chủ đề
                        </Link>
                        <Link href={`/lai-xe/hoc/${t.id}`} className="text-sm font-extrabold text-accent-text underline-offset-2 hover:underline">
                          Luyện cả chủ đề →
                        </Link>
                      </div>
                      <ul className="grid gap-2 sm:grid-cols-2">
                        {t.chapters.map((c) => {
                          const cs = summarize(c.ids, stats);
                          return (
                            <li key={c.id} className="flex flex-col gap-2 rounded-2xl border-2 border-ink/20 p-3">
                              <Link href={`/lai-xe/hoc/${c.id}`} className="flex flex-col hover:underline">
                                <span className="font-bold">{c.vi || c.de}</span>
                                <span className="text-xs text-muted">
                                  {c.id} · {c.de}
                                </span>
                              </Link>
                              {user && <ProgressBar {...cs} />}
                              <span className="flex items-center gap-2 text-xs">
                                <span className="flex-1 text-muted tabular-nums">
                                  {user ? `${cs.done}/` : ""}
                                  {cs.total} câu
                                </span>
                                <Link href={`/lai-xe/hoc/${c.id}?mode=lesen`} className="rounded-lg border-2 border-ink/30 px-2 py-0.5 font-bold hover:border-ink">
                                  Đọc
                                </Link>
                                <Link href={`/lai-xe/hoc/${c.id}`} className="rounded-lg border-2 border-ink bg-gold px-2 py-0.5 font-extrabold text-black">
                                  Luyện
                                </Link>
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </details>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <Link href="/lai-xe" className="btn-icon" aria-label="Quay lại">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-2xl font-extrabold">Học theo chủ đề</h1>
      </div>
      <Suspense fallback={<ListSkeleton rows={8} />}>
        <Topics />
      </Suspense>
    </main>
  );
}
