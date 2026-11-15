import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { BookOpen, RotateCcw, Star } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { quizBookmarks, quizStats } from "@/lib/db";
import { CATEGORIES, generalIds, getSet, hasTopics, listSets, prefs, stateIds } from "@/lib/lid";
import { summarize } from "@/lib/quiz/types";
import type { QuizStat } from "@/lib/quiz/types";
import { ActionCard, ProgressBar } from "@/components/quiz/QuizParts";
import { LidShell, LidTopBar, Wappen } from "@/components/lid/LidParts";
import { ListSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = {
  title: "Học theo chủ đề · Leben in Deutschland",
  description: "Học Leben in Deutschland theo chủ đề, theo bộ 30 câu của danh mục BAMF và 10 câu riêng của bang — có bản dịch tiếng Việt, chế độ Đọc và Luyện.",
  alternates: { canonical: "/leben-in-deutschland/chu-de" },
  openGraph: { url: "/leben-in-deutschland/chu-de" },
};

/** Ô của 1 bộ câu — cùng kiểu thẻ chương ở Lái xe: tên, tiến độ, nút Đọc / Luyện */
function SetCard({ id, title, sub, ids, stats, user, icon }: { id: string; title: string; sub?: string; ids: string[]; stats: Record<string, QuizStat>; user: boolean; icon?: ReactNode }) {
  const s = summarize(ids, stats);
  const href = `/leben-in-deutschland/${id}`;
  return (
    <li className="flex flex-col gap-2 rounded-2xl border-2 border-ink/20 p-3">
      <Link href={href} prefetch={false} className="flex items-center gap-2 hover:underline">
        {icon}
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-bold">{title}</span>
          {sub && <span className="truncate text-xs text-muted">{sub}</span>}
        </span>
      </Link>
      {user && <ProgressBar {...s} />}
      <span className="flex items-center gap-2">
        <span className="flex-1 text-xs text-muted tabular-nums">
          {user ? `${s.done}/` : ""}
          {s.total} câu
        </span>
        <Link href={`${href}?mode=lesen`} prefetch={false} className="btn btn-sm">
          Đọc
        </Link>
        <Link href={href} prefetch={false} className="btn btn-sm btn-amber">
          Luyện
        </Link>
      </span>
    </li>
  );
}

/** Một nhóm bộ câu, thu gọn như "phần" ở Lái xe */
function Part({ title, subtitle, ids, stats, user, open, children }: { title: string; subtitle: string; ids: string[]; stats: Record<string, QuizStat>; user: boolean; open?: boolean; children: ReactNode }) {
  const ps = summarize(ids, stats);
  return (
    <details className="sticker group/part overflow-hidden" open={open}>
      <summary className="flex cursor-pointer list-none flex-col gap-2 p-4 [&::-webkit-details-marker]:hidden">
        <span className="flex items-baseline gap-2">
          <span aria-hidden className="inline-block transition group-open/part:rotate-90">
            ▸
          </span>
          <span className="min-w-0">
            <span className="block text-xl font-extrabold">{title}</span>
            <span className="block text-sm text-muted">
              {subtitle} · {user ? `${ps.done}/` : ""}
              {ps.total} câu
            </span>
          </span>
        </span>
        {user && <ProgressBar {...ps} />}
      </summary>
      <div className="border-t-2 border-ink/10 p-2">{children}</div>
    </details>
  );
}

async function Topics() {
  const { state } = await prefs();
  const user = await getCurrentUser();
  const stats = user ? quizStats(user.id, "lid") : {};
  const mine = [...generalIds(), ...stateIds(state.code)];
  const inScope = new Set(mine);
  const all = summarize(mine, stats);
  const marked = user ? quizBookmarks(user.id, "lid").filter((id) => inScope.has(id)).length : 0;
  const own = getSet(state.code)!;
  const sets = listSets();

  return (
    <>
      {/* Cùng 3 thẻ, cùng thứ tự với Lái xe › Học theo chủ đề */}
      <div className="grid gap-3 sm:grid-cols-3">
        <ActionCard
          href="/leben-in-deutschland/danh-dau"
          icon={Star}
          title="Câu đánh dấu"
          locked={!user}
          disabled={!!user && !marked}
          text={!user ? "Đăng nhập để đánh dấu câu" : marked ? `${marked} câu` : "Bấm ⭐ ở câu hỏi để đánh dấu"}
        />
        <ActionCard
          href="/leben-in-deutschland/cau-sai"
          icon={RotateCcw}
          title="Ôn câu sai"
          locked={!user}
          disabled={!!user && !all.wrong}
          text={!user ? "Đăng nhập để lưu câu sai" : all.wrong ? `${all.wrong} câu đang sai` : "Chưa có câu sai nào"}
        />
        <ActionCard href="/leben-in-deutschland/tat-ca?mode=lesen" icon={BookOpen} title="Đọc lướt đáp án" text="300 câu chung, đáp án đúng tô sẵn" />
      </div>

      {/* Học tất cả: 300 câu chung + câu của bang, như nút Đọc / Luyện của từng phần ở Lái xe */}
      <section className="sticker flex flex-col gap-2 p-4">
        <div className="flex items-center gap-3">
          <span className="min-w-0 flex-1">
            <span className="block text-xl font-extrabold">Học tất cả</span>
            <span className="block text-sm text-muted">
              300 câu chung + 10 câu của {state.name} · {user ? `${all.done}/` : ""}
              {all.total} câu
            </span>
          </span>
          <Link href="/leben-in-deutschland/hoc?mode=lesen" prefetch={false} className="btn btn-sm">
            Đọc
          </Link>
          <Link href="/leben-in-deutschland/hoc" prefetch={false} className="btn btn-sm btn-amber">
            Luyện
          </Link>
        </div>
        {user && <ProgressBar {...all} />}
      </section>

      <Part title={`Câu của bang ${state.name}`} subtitle="Bài thi có 3 câu riêng của bang" ids={own.ids} stats={stats} user={!!user} open>
        <ul className="grid gap-2 sm:grid-cols-2">
          <SetCard id={state.code} title={own.title} sub={own.subtitle} ids={own.ids} stats={stats} user={!!user} icon={<Wappen code={state.code} className="h-8 w-6 shrink-0" />} />
        </ul>
      </Part>

      {hasTopics() && (
        <Part title="Theo chủ đề" subtitle={`${CATEGORIES.length} chủ đề`} ids={generalIds()} stats={stats} user={!!user} open>
          <ul className="grid gap-2 sm:grid-cols-3">
            {CATEGORIES.map((c) => (
              <SetCard key={c.key} id={c.key} title={c.vi} sub={c.de} ids={getSet(c.key)!.ids} stats={stats} user={!!user} />
            ))}
          </ul>
        </Part>
      )}

      <Part title="Bộ 30 câu theo số câu BAMF" subtitle={`${sets.length} bộ`} ids={generalIds()} stats={stats} user={!!user} open>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {sets.map((s) => (
            <SetCard key={s.id} id={s.id} title={`Câu ${s.from}–${s.to}`} ids={s.ids} stats={stats} user={!!user} />
          ))}
        </ul>
      </Part>
    </>
  );
}

export default function Page() {
  return (
    <LidShell>
      <LidTopBar back="/leben-in-deutschland" title="Học theo chủ đề" />
      <Suspense fallback={<ListSkeleton rows={8} />}>
        <Topics />
      </Suspense>
    </LidShell>
  );
}
