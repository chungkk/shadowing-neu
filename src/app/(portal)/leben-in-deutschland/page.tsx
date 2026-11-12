import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { connection } from "next/server";
import { ClipboardCheck, RotateCcw } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { quizStats } from "@/lib/db";
import { EXAM, STATES, generalCount, listSets, stateIds } from "@/lib/lid";
import { summarize } from "@/lib/quiz-types";
import { ActionCard, ProgressBar, SectionHero } from "@/components/QuizParts";
import { ListSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = {
  title: "Leben in Deutschland",
  description: "Luyện thi Leben in Deutschland / Einbürgerungstest: 300 câu chung + câu riêng của 16 bang, có bản dịch tiếng Việt và thi thử 33 câu.",
};

/** Chọn bang rồi vào thi thử — form GET, không cần JavaScript */
function ExamForm() {
  return (
    <form action="/leben-in-deutschland/thi-thu" className="sticker flex flex-col gap-3 p-3">
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-gold text-black">
          <ClipboardCheck className="size-5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-extrabold">Thi thử</span>
          <span className="text-sm text-muted">
            {EXAM.general + EXAM.state} câu · {EXAM.minutes} phút · đúng ≥ {EXAM.pass} câu là đậu
          </span>
        </span>
      </div>
      <div className="flex gap-2">
        <select name="bang" aria-label="Bang bạn sống" defaultValue="be" className="min-w-0 flex-1 rounded-xl border-2 border-ink bg-card px-2 py-2 text-base font-bold">
          {STATES.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name}
            </option>
          ))}
        </select>
        <button className="btn btn-amber shrink-0">Bắt đầu</button>
      </div>
    </form>
  );
}

async function Overview() {
  await connection();
  const user = await getCurrentUser();
  const stats = user ? quizStats(user.id, "lid") : {};
  const sets = listSets();
  const general = summarize(sets.flatMap((s) => s.ids), stats);
  const wrong = Object.values(stats).filter((s) => !s.lastOk).length;

  return (
    <>
      <div className="grid gap-3 lg:grid-cols-2">
        <ExamForm />
        <ActionCard
          href="/leben-in-deutschland/on-tap"
          icon={RotateCcw}
          title="Ôn câu sai"
          disabled={!user || !wrong}
          text={!user ? "Đăng nhập để lưu câu sai" : wrong ? `${wrong} câu đang sai` : "Chưa có câu sai nào"}
        />
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <h2 className="text-lg font-extrabold">300 câu chung</h2>
          {user && (
            <span className="text-sm text-muted tabular-nums">
              {general.done}/{general.total} · {general.ok} đúng
            </span>
          )}
        </div>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {sets.map((s) => {
            const st = summarize(s.ids, stats);
            return (
              <li key={s.id}>
                <Link href={`/leben-in-deutschland/${s.id}`} className="sticker sticker-link flex flex-col gap-2 p-3">
                  <span className="font-extrabold tabular-nums">
                    Câu {s.from}–{s.to}
                  </span>
                  {user ? <ProgressBar {...st} /> : <span className="text-xs text-muted">{st.total} câu</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-extrabold">Câu hỏi riêng theo bang</h2>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {STATES.map((s) => {
            const st = summarize(stateIds(s.code), stats);
            return (
              <li key={s.code}>
                <Link href={`/leben-in-deutschland/${s.code}`} className="sticker sticker-link flex flex-col gap-2 p-3">
                  <span className="truncate font-bold">{s.name}</span>
                  {user ? <ProgressBar {...st} /> : <span className="text-xs text-muted">{st.total} câu</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-6">
      <SectionHero
        emoji="🇩🇪"
        title="Leben in Deutschland"
        subtitle={`Ôn thi Einbürgerungstest: ${generalCount()} câu chung + 10 câu riêng mỗi bang, có bản dịch tiếng Việt.`}
      />
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <Overview />
      </Suspense>
    </main>
  );
}
