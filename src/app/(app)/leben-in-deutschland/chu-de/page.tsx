import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ChevronDown } from "lucide-react";
import {
  ChristmasBookIcon as BookOpen,
  ChristmasStarIcon as Star,
  ChristmasWrongIcon as RotateCcw,
} from "@/components/FestiveIcons";
import { getCurrentUser } from "@/lib/auth";
import { quizBookmarks, quizStats } from "@/lib/db";
import { CATEGORIES, generalIds, getSet, hasTopics, listSets, prefs, stateIds } from "@/lib/lid";
import { summarize } from "@/lib/quiz/types";
import type { QuizStat } from "@/lib/quiz/types";
import { ActionCard, ProgressBar, SubHeader } from "@/components/quiz/QuizParts";
import { LidShell, Wappen } from "@/components/lid/LidParts";
import { ListSkeleton } from "@/components/Skeleton";
import { JsonLd, breadcrumbLd, quizPageMeta } from "@/lib/laixe/seo";

export const metadata: Metadata = quizPageMeta({
  path: "/leben-in-deutschland/chu-de",
  title: "Học Leben in Deutschland theo chủ đề – 300 câu + câu của bang",
  description: "Học Leben in Deutschland theo 3 chủ đề BAMF, theo bộ 30 câu và 10 câu riêng của từng bang — mỗi câu có bản dịch tiếng Việt, chế độ Đọc lướt và Luyện chấm ngay.",
});

/** Ô của 1 bộ câu — cùng kiểu thẻ chương ở Lái xe: tên, tiến độ, nút Đọc / Luyện */
function SetCard({ id, title, sub, ids, stats, user, icon }: { id: string; title: string; sub?: string; ids: string[]; stats: Record<string, QuizStat>; user: boolean; icon?: ReactNode }) {
  const s = summarize(ids, stats);
  const href = `/leben-in-deutschland/${id}`;
  return (
    <li className="tile flex flex-col gap-3">
      <Link href={href} prefetch={false} className="flex items-center gap-2 underline-offset-2 hover:underline">
        {icon}
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-semibold">{title}</span>
          {sub && <span className="truncate text-xs text-muted">{sub}</span>}
        </span>
      </Link>
      {user && <ProgressBar {...s} />}
      <span className="flex items-center gap-2">
        <span className="flex-1 text-xs font-semibold text-muted tabular-nums">
          {user ? `${s.done}/` : ""}
          {s.total} câu
        </span>
        <Link href={`${href}?mode=lesen`} prefetch={false} className="btn btn-sm">
          Đọc
        </Link>
        <Link href={href} prefetch={false} className="btn btn-sm btn-soft">
          Luyện
        </Link>
      </span>
    </li>
  );
}

/** Một nhóm bộ câu, thu gọn được như "phần" ở Lái xe — tiêu đề mục + lưới ô, không bọc thêm thẻ */
function Part({ title, subtitle, ids, stats, user, open, children }: { title: string; subtitle: string; ids: string[]; stats: Record<string, QuizStat>; user: boolean; open?: boolean; children: ReactNode }) {
  const ps = summarize(ids, stats);
  return (
    <details className="group/part flex flex-col" open={open}>
      <summary className="flex cursor-pointer list-none flex-col gap-2 rounded-ui py-1 [&::-webkit-details-marker]:hidden">
        <span className="flex min-h-11 items-center gap-3">
          <span className="min-w-0 flex-1">
            <span className="section-title block">{title}</span>
            <span className="block text-sm text-muted">
              {subtitle} · {user ? `${ps.done}/` : ""}
              {ps.total} câu
            </span>
          </span>
          <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-card-2 text-muted transition-transform group-open/part:rotate-180 motion-reduce:transition-none">
            <ChevronDown className="size-4" />
          </span>
        </span>
        {user && <ProgressBar {...ps} />}
      </summary>
      <div className="pt-3">{children}</div>
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
          text={!user ? "Đăng nhập để đánh dấu câu" : marked ? `${marked} câu` : "Bấm ngôi sao ở câu hỏi để đánh dấu"}
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
      <section className="card flex flex-col gap-3 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="icon-bubble tint-sec size-11" aria-hidden>
            <BookOpen className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-xl font-extrabold tracking-[-0.02em]">Học tất cả</span>
            <span className="block text-sm text-muted">
              300 câu chung + 10 câu của {state.name} · {user ? `${all.done}/` : ""}
              {all.total} câu
            </span>
          </span>
          <span className="flex gap-2 max-sm:w-full">
            <Link href="/leben-in-deutschland/hoc?mode=lesen" prefetch={false} className="btn max-sm:flex-1">
              Đọc
            </Link>
            <Link href="/leben-in-deutschland/hoc" prefetch={false} className="btn btn-primary max-sm:flex-1">
              Luyện <ArrowRight className="size-4" />
            </Link>
          </span>
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
      <JsonLd data={breadcrumbLd([["Leben in Deutschland", "/leben-in-deutschland"], ["Học theo chủ đề", "/leben-in-deutschland/chu-de"]])} />
      <SubHeader sec="lid" back="/leben-in-deutschland" backLabel="Leben in Deutschland" icon={BookOpen} title="Học theo chủ đề" sub="300 câu chung theo chủ đề và theo bộ 30 câu, cộng 10 câu của bang. Đọc lướt đáp án hoặc luyện chấm ngay." />
      <Suspense fallback={<ListSkeleton rows={8} />}>
        <Topics />
      </Suspense>
    </LidShell>
  );
}
