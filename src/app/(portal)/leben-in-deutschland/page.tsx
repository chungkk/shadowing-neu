import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { BarChart3, BookOpen, ClipboardCheck, RotateCcw, Star } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { quizBookmarks, quizStats } from "@/lib/db";
import { CATEGORIES, EXAM, EXAM_TOTAL, STATES, generalCount, generalIds, listSets, prefs, stateIds } from "@/lib/lid";
import { summarize } from "@/lib/quiz-types";
import { ActionCard, ProgressBar, SectionHero } from "@/components/QuizParts";
import { LangSelect, StateSelect } from "@/components/lai-xe/Settings";
import { ListSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = {
  title: "Leben in Deutschland",
  description: "Luyện thi Leben in Deutschland / Einbürgerungstest: 300 câu chung + câu riêng của 16 bang, có bản dịch tiếng Việt, đánh dấu câu, lịch sử thi và thi thử 33 câu.",
};

async function Overview() {
  const { state, lang } = await prefs();
  const user = await getCurrentUser();
  const stats = user ? quizStats(user.id, "lid") : {};
  const mine = [...generalIds(), ...stateIds(state.code)];
  const all = summarize(mine, stats);
  const inScope = new Set(mine);
  const wrong = mine.filter((id) => stats[id] && !stats[id].lastOk).length;
  const marked = user ? quizBookmarks(user.id, "lid").filter((id) => inScope.has(id)).length : 0;

  return (
    <>
      <section className="sticker flex flex-wrap items-center gap-3 p-4">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-extrabold">Bang: {state.name}</span>
          <span className="text-sm text-muted">
            {generalCount()} câu chung + {stateIds(state.code).length} câu của bang · thi {EXAM_TOTAL} câu, đúng ≥ {EXAM.pass} là đậu
          </span>
        </span>
        <StateSelect states={STATES} current={state.code} />
        <LangSelect lang={lang} />
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
        <ActionCard href="/leben-in-deutschland/thi-thu" icon={ClipboardCheck} tone="bg-red text-white" title="Thi thử" text={`${EXAM_TOTAL} câu · ${EXAM.minutes} phút · đúng ≥ ${EXAM.pass} câu là đậu`} />
        <ActionCard href="/leben-in-deutschland/tat-ca" icon={BookOpen} tone="bg-gold text-black" title="Học tất cả" text={`${generalCount()} câu chung · tiếp tục từ câu đang học`} />
        <ActionCard
          href="/leben-in-deutschland/cau-sai"
          icon={RotateCcw}
          title="Câu sai"
          disabled={!user || !wrong}
          text={!user ? "Đăng nhập để lưu câu sai" : wrong ? `${wrong} câu đang sai` : "Chưa có câu sai nào"}
        />
        <ActionCard
          href="/leben-in-deutschland/danh-dau"
          icon={Star}
          title="Câu đánh dấu"
          disabled={!user || !marked}
          text={!user ? "Đăng nhập để đánh dấu câu" : marked ? `${marked} câu` : "Làm sai sẽ tự đánh dấu ⭐"}
        />
        <ActionCard href="/leben-in-deutschland/thong-ke" icon={BarChart3} title="Thống kê" disabled={!user} text={user ? "Tiến độ và lịch sử thi" : "Đăng nhập để xem thống kê"} />
        <ActionCard href={`/leben-in-deutschland/${state.code}`} icon={BookOpen} title={`Câu của ${state.name}`} text={`${stateIds(state.code).length} câu riêng của bang (câu 301–310)`} />
      </div>

      {CATEGORIES.map((c) => {
        const sets = listSets().filter((s) => s.from >= c.from && s.to <= c.to);
        const cs = summarize(sets.flatMap((s) => s.ids), stats);
        return (
          <section key={c.key} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
              <div>
                <h2 className="text-xl font-extrabold">{c.vi}</h2>
                <p className="text-sm text-muted">
                  {c.de} · câu {c.from}–{c.to}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted tabular-nums">
                  {user ? `${cs.done}/` : ""}
                  {cs.total} câu
                </span>
                <Link href={`/leben-in-deutschland/${c.key}?mode=lesen`} className="btn px-3 py-1.5">
                  Đọc
                </Link>
                <Link href={`/leben-in-deutschland/${c.key}`} className="btn btn-amber px-3 py-1.5">
                  Luyện
                </Link>
              </div>
            </div>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
        );
      })}

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-extrabold">Câu hỏi riêng theo bang</h2>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {STATES.map((s) => {
            const st = summarize(stateIds(s.code), stats);
            return (
              <li key={s.code}>
                <Link href={`/leben-in-deutschland/${s.code}`} className={`sticker sticker-link flex flex-col gap-2 p-3 ${s.code === state.code ? "bg-gold/20" : ""}`}>
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
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-6">
      <SectionHero
        emoji="🇩🇪"
        title="Leben in Deutschland"
        subtitle={`Ôn thi Einbürgerungstest: ${generalCount()} câu chung + 10 câu riêng mỗi bang, có bản dịch, đánh dấu câu, lịch sử thi và thi thử như thật.`}
      />
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <Overview />
      </Suspense>
    </main>
  );
}
