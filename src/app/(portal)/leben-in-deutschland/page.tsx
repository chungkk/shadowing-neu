import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { BarChart3, BookOpen, Bookmark, Flag, RotateCcw, Settings } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { quizBookmarks, quizStats } from "@/lib/db";
import { EXAM, EXAM_TOTAL, STATES, generalCount, generalIds, prefs, stateIds } from "@/lib/lid";
import { summarize } from "@/lib/quiz-types";
import { ActionCard, BigCard, ProgressBar } from "@/components/QuizParts";
import { LidInfo } from "@/components/lid/LidParts";
import { StatePicker } from "@/components/lid/StatePicker";
import { ListSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = {
  title: "Leben in Deutschland",
  description: "Luyện thi Leben in Deutschland / Einbürgerungstest: 300 câu chung + câu riêng của 16 bang, có bản dịch tiếng Việt, đánh dấu câu, lịch sử thi và thi thử 33 câu.",
};

async function Home() {
  const { state } = await prefs();
  const user = await getCurrentUser();
  const stats = user ? quizStats(user.id, "lid") : {};
  const mine = [...generalIds(), ...stateIds(state.code)];
  const inScope = new Set(mine);
  const all = summarize(mine, stats);
  const marked = user ? quizBookmarks(user.id, "lid").filter((id) => inScope.has(id)).length : 0;

  return (
    <>
      {/* Đầu trang: tiêu đề + nút cài đặt — như Lái xe */}
      <section className="sticker p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h1 className="text-2xl leading-tight font-extrabold sm:text-3xl">Leben in Deutschland</h1>
            <p className="text-sm text-muted">Ôn thi nhập tịch Đức · Einbürgerungstest</p>
          </div>
          <Link href="/leben-in-deutschland/cai-dat" className="btn-icon" aria-label="Cài đặt Leben in Deutschland">
            <Settings className="size-5" />
          </Link>
        </div>
      </section>

      <StatePicker states={STATES} current={state.code} />

      {/* Tiến trình */}
      <section className="sticker flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-extrabold tracking-wider text-muted uppercase">Tiến trình</span>
          <span className="rounded-full bg-card-2 px-2.5 py-1 text-xs font-bold text-muted">
            {generalCount()} câu chung + {stateIds(state.code).length} câu bang
          </span>
        </div>
        <ProgressBar {...all} />
        <div className="flex items-center gap-4 text-sm text-muted">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-accent" /> Đúng <b className="text-foreground tabular-nums">{all.ok}</b>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-red" /> Sai <b className="text-foreground tabular-nums">{all.wrong}</b>
          </span>
          <span className="ml-auto tabular-nums">
            <b className="text-foreground">{all.done}</b> / {all.total}
          </span>
        </div>
        {!user && (
          <p className="text-sm text-muted">
            <Link href="/login?next=/leben-in-deutschland" className="font-bold underline underline-offset-2">
              Đăng nhập
            </Link>{" "}
            để lưu tiến trình, câu đánh dấu và lịch sử thi.
          </p>
        )}
      </section>

      {/* 2 thẻ lớn: Học / Thi thử (thẻ chính). Cài đặt nằm ở nút bánh răng trên đầu trang */}
      <div className="grid grid-cols-2 gap-3">
        <BigCard href="/leben-in-deutschland/hoc" icon={BookOpen} title="Học" text={`${mine.length} câu hỏi`} />
        <BigCard href="/leben-in-deutschland/thi-thu" icon={Flag} title="Thi thử" text={`${EXAM_TOTAL} câu · ${EXAM.minutes} phút`} primary />
      </div>

      {/* Menu phụ — cùng 3 mục, cùng thứ tự với Lái xe */}
      <div className="grid gap-3 sm:grid-cols-3">
        <ActionCard
          href="/leben-in-deutschland/cau-sai"
          icon={RotateCcw}
          title="Ôn câu sai"
          locked={!user}
          disabled={!!user && !all.wrong}
          text={!user ? "Đăng nhập để lưu câu sai" : all.wrong ? `${all.wrong} câu đang sai` : "Chưa có câu sai nào"}
        />
        <ActionCard href="/leben-in-deutschland/danh-dau" icon={Bookmark} title="Đánh dấu" locked={!user} text={user ? `${marked} câu` : "Đăng nhập để đánh dấu câu"} />
        <ActionCard href="/leben-in-deutschland/thong-ke" icon={BarChart3} title="Thống kê" locked={!user} text={user ? "Tiến độ và lịch sử thi" : "Đăng nhập để xem thống kê"} />
      </div>

      <LidInfo>
        Cần đạt ít nhất {EXAM.pass}/{EXAM_TOTAL} câu đúng để đậu bài thi.
      </LidInfo>
    </>
  );
}

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 md:p-6">
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <Home />
      </Suspense>
    </main>
  );
}
