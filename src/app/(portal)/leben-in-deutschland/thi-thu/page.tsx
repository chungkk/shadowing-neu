import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Clock, Play } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listQuizExams } from "@/lib/db";
import { EXAM, EXAM_TOTAL, getState, prefs } from "@/lib/lid";
import { ExamHistory } from "@/components/lai-xe/ExamHistory";
import { LidShell, LidTopBar, Wappen } from "@/components/lid/LidParts";
import { ListSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = { title: "Thi thử Leben in Deutschland", description: "Thi thử Leben in Deutschland / Einbürgerungstest như thật: 33 câu, 60 phút, đúng 17 câu là đậu." };

/** Màn bắt đầu thi như Lái xe: thẻ luật thi + nút đỏ "Bắt đầu thi" */
async function Start() {
  const { state } = await prefs();
  const user = await getCurrentUser();
  const history = user ? listQuizExams(user.id, "lid", 10) : [];
  return (
    <>
      <section className="card flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-card-2">
            <Wappen code={state.code} className="h-10 w-8" />
          </span>
          <div className="min-w-0">
            <h2 className="section-title">Einbürgerungstest · {state.name}</h2>
            <p className="text-sm text-muted">Thi thử Leben in Deutschland như thật</p>
          </div>
        </div>
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          <li className="rounded-2xl border-2 border-ink/20 p-3">
            <b>{EXAM_TOTAL} câu</b>: {EXAM.general} câu chung + {EXAM.state} câu theo bang {state.name}
          </li>
          <li className="rounded-2xl border-2 border-ink/20 p-3">
            <Clock className="mr-1 inline size-4" />
            <b>{EXAM.minutes} phút</b>, hết giờ tự nộp bài
          </li>
          <li className="rounded-2xl border-2 border-ink/20 p-3 sm:col-span-2">
            Đậu khi <b>đúng ít nhất {EXAM.pass}/{EXAM_TOTAL} câu</b>
          </li>
        </ul>
        <div className="flex flex-wrap gap-2">
          <Link href="/leben-in-deutschland/thi-thu/lam-bai" className="btn btn-lg btn-red">
            <Play className="size-4" /> Bắt đầu thi
          </Link>
          <Link href="/leben-in-deutschland/cai-dat" className="btn btn-lg">
            Đổi bang
          </Link>
        </div>
      </section>
      {user && history.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="section-title">Bài thi gần đây</h2>
          <ExamHistory exams={history} module="lid" stateName={(c) => getState(c)?.name ?? c} />
        </section>
      )}
    </>
  );
}

export default function Page() {
  return (
    <LidShell>
      <LidTopBar back="/leben-in-deutschland" title="Thi thử" />
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <Start />
      </Suspense>
    </LidShell>
  );
}
