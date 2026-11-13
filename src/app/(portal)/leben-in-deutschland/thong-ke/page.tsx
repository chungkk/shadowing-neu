import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listQuizExams, quizBookmarks, quizStats } from "@/lib/db";
import { generalIds, getState, prefs, stateIds } from "@/lib/lid";
import { summarize } from "@/lib/quiz-types";
import { ExamHistory } from "@/components/lai-xe/ExamHistory";
import { LidShell, LidTopBar } from "@/components/lid/LidParts";
import { ListSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = { title: "Thống kê · Leben in Deutschland", robots: { index: false } };

/** Biểu đồ tròn đúng / sai / chưa làm (CSS conic-gradient) */
function Donut({ title, total, ok, wrong }: { title: string; total: number; ok: number; wrong: number }) {
  const p = (n: number) => (total ? (n / total) * 100 : 0);
  const a = p(ok);
  const b = a + p(wrong);
  return (
    <figure className="sticker flex flex-col items-center gap-3 p-4">
      <div
        className="relative size-36 rounded-full"
        style={{ background: `conic-gradient(var(--accent) 0 ${a}%, var(--red) ${a}% ${b}%, color-mix(in srgb, var(--foreground) 12%, transparent) ${b}% 100%)` }}
        role="img"
        aria-label={`${title}: ${ok} đúng, ${wrong} sai, ${total - ok - wrong} chưa làm trên ${total} câu`}
      >
        <div className="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-card">
          <span className="text-2xl font-extrabold tabular-nums">{Math.round(a)}%</span>
          <span className="text-xs text-muted">đúng</span>
        </div>
      </div>
      <figcaption className="flex flex-col items-center gap-1 text-center">
        <span className="font-extrabold">{title}</span>
        <span className="flex flex-wrap justify-center gap-x-3 text-xs font-bold tabular-nums">
          <span className="text-accent-text">● {ok} đúng</span>
          <span className="text-red-400">● {wrong} sai</span>
          <span className="text-muted">● {total - ok - wrong} chưa làm</span>
        </span>
      </figcaption>
    </figure>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="sticker flex flex-col p-3">
      <span className="text-2xl font-extrabold tabular-nums">{value}</span>
      <span className="text-sm text-muted">{label}</span>
    </div>
  );
}

async function Stats() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/leben-in-deutschland/thong-ke");
  const { state } = await prefs();
  const stats = quizStats(user.id, "lid");
  const grund = summarize(generalIds(), stats);
  const zusatz = summarize(stateIds(state.code), stats);
  const all = summarize([...generalIds(), ...stateIds(state.code)], stats);
  const marked = quizBookmarks(user.id, "lid").length;
  const exams = listQuizExams(user.id, "lid");
  const passed = exams.filter((e) => e.passed).length;
  const avgCorrect = exams.length ? exams.reduce((s, e) => s + e.correct, 0) / exams.length : 0;
  const rate = all.done ? Math.round((all.ok / all.done) * 100) : 0;

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <Donut title="Tổng" {...all} />
        <Donut title="300 câu chung" {...grund} />
        <Donut title={`Câu của ${state.name}`} {...zusatz} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Tỉ lệ đúng (câu đã làm)" value={`${rate}%`} />
        <Stat label="Câu đánh dấu" value={String(marked)} />
        <Stat label="Tỉ lệ thi đậu" value={exams.length ? `${Math.round((passed / exams.length) * 100)}%` : "–"} />
        <Stat label={`Số câu đúng trung bình (/${exams[0]?.total ?? 33})`} value={exams.length ? avgCorrect.toFixed(1) : "–"} />
      </div>

      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-extrabold">10 bài thi gần nhất</h2>
          {exams.length > 0 && (
            <Link href="/leben-in-deutschland/cau-sai?tu=bai-thi" className="text-sm font-bold text-accent-text underline-offset-2 hover:underline">
              Ôn câu sai của bài gần nhất →
            </Link>
          )}
        </div>
        {exams.length ? (
          <ExamHistory exams={exams.slice(0, 10)} module="lid" stateName={(c) => getState(c)?.name ?? c} />
        ) : (
          <p className="text-muted">
            Chưa có bài thi nào.{" "}
            <Link href="/leben-in-deutschland/thi-thu" className="font-bold underline">
              Thi thử ngay
            </Link>
          </p>
        )}
      </section>
    </>
  );
}

export default function Page() {
  return (
    <LidShell wide>
      <LidTopBar back="/leben-in-deutschland" title="Thống kê" />
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <Stats />
      </Suspense>
    </LidShell>
  );
}
