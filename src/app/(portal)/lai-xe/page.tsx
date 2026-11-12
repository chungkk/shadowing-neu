import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { connection } from "next/server";
import { ClipboardCheck, RotateCcw } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { quizStats } from "@/lib/db";
import { EXAM, listTopics, questionCount } from "@/lib/fuehrerschein";
import { summarize } from "@/lib/quiz-types";
import { ActionCard, ProgressBar, SectionHero } from "@/components/QuizParts";
import { ListSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = {
  title: "Lý thuyết lái xe",
  description: "Luyện thi lý thuyết bằng lái xe Đức hạng B: hơn 1.100 câu hỏi chính thức kèm bản dịch tiếng Việt, giải thích và thi thử.",
};

async function Overview() {
  await connection();
  const user = await getCurrentUser();
  const stats = user ? quizStats(user.id, "fuehrerschein") : {};
  const topics = listTopics();
  const all = summarize(topics.flatMap((t) => t.ids), stats);

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <ActionCard
          href="/lai-xe/thi-thu"
          icon={ClipboardCheck}
          tone="bg-gold text-black"
          title="Thi thử"
          text={`${EXAM.questions} câu · ${EXAM.minutes} phút · đậu khi ≤ ${EXAM.maxErrorPoints} điểm lỗi`}
        />
        <ActionCard
          href="/lai-xe/on-tap"
          icon={RotateCcw}
          title="Ôn câu sai"
          disabled={!user || !all.wrong}
          text={!user ? "Đăng nhập để lưu câu sai" : all.wrong ? `${all.wrong} câu đang sai` : "Chưa có câu sai nào"}
        />
      </div>

      {user && (
        <div className="sticker flex flex-col gap-2 p-4">
          <p className="font-bold">
            Đã làm {all.done}/{all.total} câu · <span className="text-accent-text">{all.ok} đúng</span> · <span className="text-red-400">{all.wrong} sai</span>
          </p>
          <ProgressBar {...all} />
        </div>
      )}

      {topics.map((t) => {
        const s = summarize(t.ids, stats);
        return (
          <section key={t.key} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <h2 className="text-lg font-extrabold">
                {t.vi} <span className="text-sm font-bold text-muted">· {t.de}</span>
              </h2>
              <span className="text-sm text-muted tabular-nums">
                {user ? `${s.done}/` : ""}
                {s.total} câu
              </span>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {t.chapters.map((c) => {
                const cs = summarize(c.ids, stats);
                return (
                  <li key={c.id}>
                    <Link href={`/lai-xe/${c.id}`} className="sticker sticker-link flex flex-col gap-2 p-3">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="min-w-0 truncate font-bold">{c.name}</span>
                        <span className="shrink-0 text-xs text-muted tabular-nums">
                          {user ? `${cs.done}/` : ""}
                          {cs.total}
                        </span>
                      </span>
                      <span className="text-xs text-muted">
                        Kapitel {c.id} · {c.id.startsWith("1.") ? "phần cơ bản" : "phần riêng hạng B"}
                      </span>
                      {user && <ProgressBar {...cs} />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </>
  );
}

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-6">
      <SectionHero emoji="🚗" title="Lý thuyết lái xe hạng B" subtitle={`${questionCount().toLocaleString("vi-VN")} câu hỏi thi chính thức (tiếng Đức) kèm bản dịch tiếng Việt và giải thích.`} />
      <Suspense fallback={<ListSkeleton rows={8} />}>
        <Overview />
      </Suspense>
    </main>
  );
}
