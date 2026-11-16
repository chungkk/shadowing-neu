import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, BookOpen, ChevronDown, RotateCcw, Star } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { quizBookmarks, quizStats } from "@/lib/db";
import { DEFAULT_CLASS, classQuestionIds, learnTree, prefs } from "@/lib/laixe";
import { JsonLd, breadcrumbLd, fmtNum, quizPageMeta } from "@/lib/laixe/seo";
import { summarize } from "@/lib/quiz/types";
import { ActionCard, ProgressBar } from "@/components/quiz/QuizParts";
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
          text={!user ? "Đăng nhập để đánh dấu câu" : marked ? `${marked} câu` : "Bấm ⭐ ở câu hỏi để đánh dấu"}
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

      {/* Học theo chủ đề: phần cơ bản / phần riêng → chủ đề → chương */}
      {tree.map((part) => {
        const ps = summarize(part.ids, stats);
        return (
          // Mỗi phần thu gọn thành 1 thẻ, bấm mới xổ ra các chủ đề. Nút Đọc/Luyện nằm ngoài <summary> để không lồng link trong nút
          <section key={part.key} className="relative">
            <details className="sticker group/part overflow-hidden">
              <summary className="flex cursor-pointer list-none flex-col gap-2 p-4 sm:pr-44 [&::-webkit-details-marker]:hidden">
                {/* Điện thoại: chỉ dòng tiêu đề chừa chỗ cho nút Đọc/Luyện, dòng mô tả dùng hết bề ngang */}
                <span className="flex min-h-9 items-center gap-3 pr-32 sm:pr-0">
                  <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-card-2 text-muted transition-transform group-open/part:rotate-180 motion-reduce:transition-none">
                    <ChevronDown className="size-4" />
                  </span>
                  <span className="block min-w-0 font-display text-xl leading-tight font-extrabold">{part.title}</span>
                </span>
                <span className="-mt-1 block pl-11 text-sm text-muted">
                  {part.subtitle} · {user ? `${ps.done}/` : ""}
                  {ps.total} câu · {part.themes.length} chủ đề
                </span>
                {user && <ProgressBar {...ps} />}
              </summary>
              <div className="flex flex-col gap-2 border-t border-line p-3">
                {part.themes.map((t) => {
                  const ts = summarize(t.ids, stats);
                  return (
                    <details key={t.id} className="quiz-group group">
                      <summary className="flex cursor-pointer list-none flex-col gap-2 p-3 [&::-webkit-details-marker]:hidden">
                        <span className="flex items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-2 font-extrabold">
                            <ChevronDown className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
                            <span className="min-w-0">
                              {t.vi || t.de} <span className="text-sm font-bold text-muted">· {t.de}</span>
                            </span>
                          </span>
                          <span className="badge badge-muted shrink-0 tabular-nums">
                            {user ? `${ts.done}/` : ""}
                            {ts.total}
                          </span>
                        </span>
                        {user && <ProgressBar {...ts} />}
                      </summary>
                      <div className="flex flex-col gap-2 border-t border-line p-2.5">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Link href={`/lai-xe/hoc/${t.id}?mode=lesen`} className="btn btn-sm btn-ghost">
                            Đọc cả chủ đề
                          </Link>
                          <Link href={`/lai-xe/hoc/${t.id}`} className="btn btn-sm btn-ghost text-accent-text">
                            Luyện cả chủ đề <ArrowRight className="size-3.5" />
                          </Link>
                        </div>
                        <ul className="grid gap-2 sm:grid-cols-2">
                          {t.chapters.map((c) => {
                            const cs = summarize(c.ids, stats);
                            return (
                              <li key={c.id} className="tile flex flex-col gap-2.5">
                                <Link href={`/lai-xe/hoc/${c.id}`} className="flex flex-col underline-offset-2 hover:underline">
                                  <span className="font-bold">{c.vi || c.de}</span>
                                  <span className="text-xs text-muted">
                                    {c.id} · {c.de}
                                  </span>
                                </Link>
                                {user && <ProgressBar {...cs} />}
                                <span className="flex items-center gap-2">
                                  <span className="flex-1 text-xs font-semibold text-muted tabular-nums">
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
            </details>
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <Link href={`/lai-xe/hoc/${part.key}?mode=lesen`} className="btn btn-sm">
                Đọc
              </Link>
              <Link href={`/lai-xe/hoc/${part.key}`} className="btn btn-sm btn-soft">
                Luyện
              </Link>
            </div>
          </section>
        );
      })}
    </>
  );
}

export default function Page() {
  return (
    <main className="page">
      <JsonLd data={breadcrumbLd([["Lý thuyết lái xe", "/lai-xe"], ["Học theo chủ đề", "/lai-xe/hoc"]])} />
      <div className="flex items-center gap-2">
        <Link href="/lai-xe" className="btn-icon" aria-label="Quay lại">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="page-title">Học theo chủ đề</h1>
      </div>
      <Suspense fallback={<ListSkeleton rows={8} />}>
        <Topics />
      </Suspense>
    </main>
  );
}
