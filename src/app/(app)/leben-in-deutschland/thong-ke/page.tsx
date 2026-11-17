import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowRight, BarChart3, Flag } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listQuizExams, quizBookmarks, quizStats } from "@/lib/db";
import { generalIds, getState, prefs, stateIds } from "@/lib/lid";
import { summarize } from "@/lib/quiz/types";
import { ExamHistory } from "@/components/laixe/ExamHistory";
import { LidShell } from "@/components/lid/LidParts";
import { ListSkeleton } from "@/components/Skeleton";
import Mascot from "@/components/Mascot";
import { SubHeader } from "@/components/quiz/QuizParts";

export const metadata: Metadata = { title: "Thống kê – Leben in Deutschland", robots: { index: false } };

/** Biểu đồ tròn đúng / sai / chưa làm (CSS conic-gradient) */
function Donut({ title, total, ok, wrong }: { title: string; total: number; ok: number; wrong: number }) {
  const p = (n: number) => (total ? (n / total) * 100 : 0);
  const a = p(ok);
  const b = a + p(wrong);
  return (
    <figure className="card flex h-full flex-col items-center gap-3">
      <div
        className="relative size-36 rounded-full"
        style={{ background: `conic-gradient(var(--ok) 0 ${a}%, var(--red) ${a}% ${b}%, color-mix(in srgb, var(--line-strong) 40%, var(--card)) ${b}% 100%)` }}
        role="img"
        aria-label={`${title}: ${ok} đúng, ${wrong} sai, ${total - ok - wrong} chưa làm trên ${total} câu`}
      >
        <div className="stat absolute inset-5 items-center justify-center rounded-full bg-card">
          <span className="stat-value">{Math.round(a)}%</span>
          <span className="stat-label">đúng</span>
        </div>
      </div>
      <figcaption className="flex flex-col items-center gap-1 text-center">
        <span className="font-bold">{title}</span>
        <span className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs font-bold tabular-nums">
          <span className="flex items-center gap-1 text-ok-text">
            <span className="size-2 rounded-full bg-ok" aria-hidden /> {ok} đúng
          </span>
          <span className="flex items-center gap-1 text-red-400">
            <span className="size-2 rounded-full bg-red" aria-hidden /> {wrong} sai
          </span>
          <span className="flex items-center gap-1 text-muted">
            <span className="size-2 rounded-full bg-[color-mix(in_srgb,var(--line-strong)_40%,var(--card))]" aria-hidden /> {total - ok - wrong} chưa làm
          </span>
        </span>
      </figcaption>
    </figure>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="tile stat h-full gap-1.5">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
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

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="section-title">10 bài thi gần nhất</h2>
          {exams.length > 0 && (
            <Link href="/leben-in-deutschland/cau-sai?tu=bai-thi" className="btn btn-sm btn-soft">
              Ôn câu sai của bài gần nhất <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          )}
        </div>
        {exams.length ? (
          <ExamHistory exams={exams.slice(0, 10)} module="lid" stateName={(c) => getState(c)?.name ?? c} />
        ) : (
          <div className="card empty">
            <Mascot className="size-20" />
            <p className="text-base font-semibold text-foreground">Chưa có bài thi nào.</p>
            <p className="-mt-2">Làm một đề thi thử để xem điểm và ôn lại câu sai ở đây.</p>
            <Link href="/leben-in-deutschland/thi-thu" className="btn btn-primary">
              <Flag className="size-4" /> Thi thử ngay
            </Link>
          </div>
        )}
      </section>
    </>
  );
}

export default function Page() {
  return (
    <LidShell>
      <SubHeader sec="lid" back="/leben-in-deutschland" backLabel="Leben in Deutschland" icon={BarChart3} title="Thống kê" sub="Tiến độ câu chung, câu của bang và kết quả các lần thi thử." />
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <Stats />
      </Suspense>
    </LidShell>
  );
}
