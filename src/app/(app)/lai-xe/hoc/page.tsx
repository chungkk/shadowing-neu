import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, BookOpen, ChevronDown, RotateCcw, Star } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { quizBookmarks, quizStats } from "@/lib/db";
import { DEFAULT_CLASS, classQuestionIds, learnTree, prefs } from "@/lib/laixe";
import { JsonLd, breadcrumbLd, fmtNum, quizPageMeta } from "@/lib/laixe/seo";
import { summarize } from "@/lib/quiz/types";
import { ActionCard, ProgressBar, SubHeader } from "@/components/quiz/QuizParts";
import { ListSkeleton } from "@/components/Skeleton";

const B_TREE = learnTree(DEFAULT_CLASS);

export const metadata: Metadata = quizPageMeta({
  path: "/lai-xe/hoc",
  title: "Học lý thuyết lái xe Đức theo chủ đề – Grundstoff & Zusatzstoff",
  description: `Học ${fmtNum(classQuestionIds(DEFAULT_CLASS).length)} câu lý thuyết lái xe Đức hạng B theo ${B_TREE.reduce((n, p) => n + p.themes.length, 0)} chủ đề và từng chương, dịch tiếng Việt, có giải thích, chế độ Đọc lướt và Luyện.`,
});

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
          locked={!user}
          disabled={!!user && !marked}
          text={!user ? "Đăng nhập để đánh dấu câu" : marked ? `${marked} câu` : "Bấm ngôi sao ở câu hỏi để đánh dấu"}
        />
        <ActionCard
          href="/lai-xe/cau-sai"
          icon={RotateCcw}
          title="Ôn câu sai"
          locked={!user}
          disabled={!!user && !all.wrong}
          text={!user ? "Đăng nhập để lưu câu sai" : all.wrong ? `${all.wrong} câu đang sai` : "Chưa có câu sai nào"}
        />
        <ActionCard href="/lai-xe/hoc/grund?mode=lesen" icon={BookOpen} title="Đọc lướt đáp án" text="Câu hỏi có sẵn đáp án đúng" />
      </div>

      {/* Học theo chủ đề: phần cơ bản / phần riêng → chủ đề (hàng thu gọn) → chương. Không lồng thẻ: mỗi phần là một danh sách kẻ dòng */}
      {tree.map((part) => {
        const ps = summarize(part.ids, stats);
        return (
          <section key={part.key} className="flex flex-col gap-3" aria-labelledby={`part-${part.key}`}>
            <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
              <div className="min-w-0 flex-1">
                <h2 id={`part-${part.key}`} className="section-title">
                  {part.title}
                </h2>
                <p className="text-sm text-muted">
                  {part.subtitle} · {user ? `${ps.done}/` : ""}
                  {ps.total} câu · {part.themes.length} chủ đề
                </p>
              </div>
              <div className="flex gap-2 max-sm:w-full">
                <Link href={`/lai-xe/hoc/${part.key}?mode=lesen`} className="btn max-sm:flex-1">
                  Đọc cả phần
                </Link>
                <Link href={`/lai-xe/hoc/${part.key}`} className="btn btn-soft max-sm:flex-1">
                  Luyện cả phần <ArrowRight className="size-4" />
                </Link>
              </div>
              {user && (
                <div className="w-full">
                  <ProgressBar {...ps} />
                </div>
              )}
            </div>
            <div className="card overflow-hidden p-0">
              {part.themes.map((t) => {
                const ts = summarize(t.ids, stats);
                return (
                  <details key={t.id} className="group border-b border-line last:border-b-0 dark:border-border">
                    <summary className="flex min-h-14 cursor-pointer list-none flex-col gap-2 px-4 py-3 transition-colors hover:bg-card-2/60 [&::-webkit-details-marker]:hidden">
                      <span className="flex items-center gap-3">
                        <ChevronDown className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="font-semibold">{t.vi || t.de}</span> <span className="text-sm text-muted">· {t.de}</span>
                        </span>
                        <span className="badge badge-muted shrink-0 tabular-nums">
                          {user ? `${ts.done}/` : ""}
                          {ts.total}
                        </span>
                      </span>
                      {user && (
                        <span className="block pl-7">
                          <ProgressBar {...ts} />
                        </span>
                      )}
                    </summary>
                    <div className="flex flex-col border-t border-line bg-card-2/50 dark:border-border">
                      <div className="flex flex-wrap justify-end gap-2 px-4 pt-3 pb-1">
                        <Link href={`/lai-xe/hoc/${t.id}?mode=lesen`} className="btn btn-sm btn-ghost">
                          Đọc cả chủ đề
                        </Link>
                        <Link href={`/lai-xe/hoc/${t.id}`} className="btn btn-sm btn-ghost text-link">
                          Luyện cả chủ đề <ArrowRight className="size-3.5" />
                        </Link>
                      </div>
                      <ul className="flex flex-col px-4 pb-2">
                        {t.chapters.map((c) => {
                          const cs = summarize(c.ids, stats);
                          return (
                            <li key={c.id} className="flex flex-col gap-2 border-b border-line py-3 last:border-b-0 sm:flex-row sm:items-center sm:gap-4 sm:pl-7">
                              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                                <Link href={`/lai-xe/hoc/${c.id}`} className="flex flex-col underline-offset-2 hover:underline">
                                  <span className="font-semibold">{c.vi || c.de}</span>
                                  <span className="text-xs text-muted">
                                    {c.id} · {c.de}
                                  </span>
                                </Link>
                                {user && <ProgressBar {...cs} />}
                              </div>
                              <span className="flex items-center gap-2">
                                <span className="flex-1 text-xs font-semibold text-muted tabular-nums sm:w-16 sm:flex-none sm:text-right">
                                  {user ? `${cs.done}/` : ""}
                                  {cs.total} câu
                                </span>
                                <Link href={`/lai-xe/hoc/${c.id}?mode=lesen`} className="btn btn-sm">
                                  Đọc
                                </Link>
                                <Link href={`/lai-xe/hoc/${c.id}`} className="btn btn-sm btn-soft">
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
    <main className="page" data-sec="laixe">
      <JsonLd data={breadcrumbLd([["Lý thuyết lái xe", "/lai-xe"], ["Học theo chủ đề", "/lai-xe/hoc"]])} />
      <SubHeader sec="laixe" back="/lai-xe" backLabel="Lái xe" icon={BookOpen} title="Học theo chủ đề" sub="Phần cơ bản (Grundstoff) và phần riêng của hạng, chia theo chủ đề và chương. Đọc lướt đáp án hoặc luyện chấm ngay." />
      <Suspense fallback={<ListSkeleton rows={8} />}>
        <Topics />
      </Suspense>
    </main>
  );
}
