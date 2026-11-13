import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Clock, Play } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listQuizExams } from "@/lib/db";
import { EXAM, EXAM_TOTAL, STATES, getState, prefs } from "@/lib/lid";
import { ExamHistory } from "@/components/lai-xe/ExamHistory";
import { StateSelect } from "@/components/lai-xe/Settings";
import { ListSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = { title: "Thi thử Leben in Deutschland", description: "Thi thử Leben in Deutschland / Einbürgerungstest như thật: 33 câu, 60 phút, đúng 17 câu là đậu." };

async function Start() {
  const { state } = await prefs();
  const user = await getCurrentUser();
  const history = user ? listQuizExams(user.id, "lid", 10) : [];
  return (
    <>
      <section className="sticker flex flex-col gap-4 p-5">
        <h2 className="text-xl font-extrabold">Einbürgerungstest · {state.name}</h2>
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          <li className="rounded-2xl border-2 border-ink/20 p-3">
            <b>{EXAM_TOTAL} câu</b>: {EXAM.general} câu chung ngẫu nhiên + {EXAM.state} câu của bang {state.name}
          </li>
          <li className="rounded-2xl border-2 border-ink/20 p-3">
            <Clock className="mr-1 inline size-4" />
            <b>{EXAM.minutes} phút</b>, hết giờ tự nộp bài
          </li>
          <li className="rounded-2xl border-2 border-ink/20 p-3">
            Đậu khi <b>đúng ≥ {EXAM.pass} câu</b> (câu bỏ trống tính là sai)
          </li>
          <li className="rounded-2xl border-2 border-ink/20 p-3">Mỗi câu chỉ có 1 đáp án đúng; nộp bài rồi mới xem kết quả</li>
        </ul>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/leben-in-deutschland/thi-thu/lam-bai" className="btn btn-red">
            <Play className="size-4" /> Bắt đầu thi
          </Link>
          <StateSelect states={STATES} current={state.code} />
        </div>
      </section>
      {user && history.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-extrabold">Bài thi gần đây</h2>
          <ExamHistory exams={history} module="lid" stateName={(c) => getState(c)?.name ?? c} />
        </section>
      )}
    </>
  );
}

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <Link href="/leben-in-deutschland" className="btn-icon" aria-label="Quay lại">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-2xl font-extrabold">Thi thử</h1>
      </div>
      <Suspense fallback={<ListSkeleton rows={4} />}>
        <Start />
      </Suspense>
    </main>
  );
}
