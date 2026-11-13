import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { BarChart3, BookOpen, ClipboardCheck, FileStack, RotateCcw, Star } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { bogenProgress, quizBookmarks, quizStats } from "@/lib/db";
import { BOGEN_COUNT, classInfo, classQuestionIds, learnTree, prefs, totalQuestions } from "@/lib/fuehrerschein";
import { summarize } from "@/lib/quiz-types";
import { ActionCard, ProgressBar, SectionHero } from "@/components/QuizParts";
import { LangSelect } from "@/components/lai-xe/Settings";
import { ListSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = {
  title: "Lý thuyết lái xe",
  description: "Luyện thi lý thuyết bằng lái xe Đức mọi hạng (B, A, C, D…): câu hỏi chính thức kèm bản dịch tiếng Việt, giải thích, đề mẫu và thi thử như thật.",
};

async function Overview() {
  const { cls, lang } = await prefs();
  const user = await getCurrentUser();
  const stats = user ? quizStats(user.id, "fuehrerschein") : {};
  const info = classInfo(cls);
  const ids = classQuestionIds(cls);
  const inClass = new Set(ids);
  const all = summarize(ids, stats);
  const marked = user ? quizBookmarks(user.id, "fuehrerschein").filter((id) => inClass.has(id)).length : 0;
  const bogen = user && cls === "B" ? bogenProgress(user.id, "fuehrerschein") : {};
  const bogenPassed = Object.values(bogen).filter((b) => b.everPassed).length;
  const tree = learnTree(cls);

  return (
    <>
      <section className="sticker flex flex-wrap items-center gap-3 p-4">
        <span className="flex h-12 min-w-12 items-center justify-center rounded-2xl border-2 border-ink bg-gold px-2 text-lg font-extrabold text-black">{cls}</span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-extrabold">
            Hạng {info.name} · {info.vi}
          </span>
          <span className="text-sm text-muted">
            {ids.length.toLocaleString("vi-VN")} câu · thi {info.exam.questions} câu, tối đa {info.exam.maxErrorPoints} điểm lỗi
          </span>
        </span>
        <Link href="/lai-xe/hang" className="btn">
          Đổi hạng
        </Link>
        <div className="w-full sm:w-auto">
          <LangSelect lang={lang} />
        </div>
      </section>

      {user && (
        <div className="sticker flex flex-col gap-2 p-4">
          <p className="font-bold">
            Đã làm {all.done}/{all.total} câu · <span className="text-accent-text">{all.ok} đúng</span> · <span className="text-red-400">{all.wrong} sai</span>
          </p>
          <ProgressBar {...all} />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <ActionCard
          href="/lai-xe/thi-thu"
          icon={ClipboardCheck}
          tone="bg-red text-white"
          title="Thi thử"
          text={`${info.exam.questions} câu · ${info.exam.minutes} phút · đậu khi ≤ ${info.exam.maxErrorPoints} điểm lỗi`}
        />
        {cls === "B" && (
          <ActionCard
            href="/lai-xe/de-mau"
            icon={FileStack}
            tone="bg-gold text-black"
            title="Đề mẫu chính thức"
            text={user ? `Đã đậu ${bogenPassed}/${BOGEN_COUNT} đề` : `${BOGEN_COUNT} đề mẫu, mỗi đề 30 câu`}
          />
        )}
        <ActionCard
          href="/lai-xe/cau-sai"
          icon={RotateCcw}
          title="Câu sai"
          disabled={!user || !all.wrong}
          text={!user ? "Đăng nhập để lưu câu sai" : all.wrong ? `${all.wrong} câu đang sai` : "Chưa có câu sai nào"}
        />
        <ActionCard
          href="/lai-xe/danh-dau"
          icon={Star}
          title="Câu đánh dấu"
          disabled={!user || !marked}
          text={!user ? "Đăng nhập để đánh dấu câu" : marked ? `${marked} câu` : "Bấm ⭐ ở câu hỏi để đánh dấu"}
        />
        <ActionCard href="/lai-xe/thong-ke" icon={BarChart3} title="Thống kê" disabled={!user} text={user ? "Tiến độ và lịch sử thi" : "Đăng nhập để xem thống kê"} />
        <ActionCard href={`/lai-xe/hoc/grund?mode=lesen`} icon={BookOpen} title="Đọc lướt đáp án" text="Xem câu hỏi với đáp án đúng đánh dấu sẵn" />
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
      <SectionHero
        emoji="🚗"
        title="Lý thuyết lái xe Đức"
        subtitle={`${totalQuestions().toLocaleString("vi-VN")} câu hỏi thi chính thức cho mọi hạng bằng, kèm bản dịch, giải thích, đề mẫu và thi thử như thật.`}
      />
      <Suspense fallback={<ListSkeleton rows={8} />}>
        <Overview />
      </Suspense>
    </main>
  );
}
