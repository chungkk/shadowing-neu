import { Suspense } from "react";
import { ChristmasTrophyIcon as Trophy } from "@/components/FestiveIcons";
import PageHeader from "@/components/PageHeader";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getLeaderboard } from "@/lib/db";
import Avatar from "@/components/Avatar";
import { Gem } from "@/components/PointsBadge";
import { LeaderboardSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = { title: "Bảng xếp hạng", robots: { index: false, follow: false } };

const fmt = (n: number) => n.toLocaleString("vi-VN");
const PODIUM = ["g-rank-1", "g-rank-2", "g-rank-3"];

async function Board() {
  const user = await requireUser("/leaderboard");
  const { top, me, players } = getLeaderboard(user.id);
  return (
    <>
      <section className="card flex flex-wrap items-center gap-x-4 gap-y-3 p-4 sm:p-5" aria-label="Hạng của bạn">
        <Avatar user={user} className="size-12 text-lg" />
        <div className="min-w-0 flex-1">
          {me.rank === null ? (
            <>
              <p className="text-lg leading-tight font-bold">Chưa có hạng</p>
              <p className="mt-0.5 text-sm text-muted">Chép chính tả đúng để tích kim cương và lên bảng xếp hạng.</p>
            </>
          ) : (
            <>
              <p className="font-display text-3xl leading-none font-bold tracking-[-0.03em] tabular-nums">#{fmt(me.rank)}</p>
              <p className="mt-1 text-xs font-medium text-muted">Hạng hiện tại của bạn · trong {fmt(players)} học viên</p>
            </>
          )}
        </div>
        <span className="badge badge-gem shrink-0 gap-1.5 px-3 py-1.5 text-sm tabular-nums max-[360px]:w-full max-[360px]:justify-center">
          <Gem className="size-4" /> {fmt(me.total)}
        </span>
      </section>

      {top.length === 0 ? (
        <div className="card empty">
          <span className="icon-bubble tint-gold size-12 rounded-xl">
            <Trophy className="size-6" />
          </span>
          <p className="text-base font-semibold text-foreground">Chưa có ai trên bảng xếp hạng</p>
          <p className="text-sm">Chép chính tả đúng để tích kim cương và trở thành người đầu tiên.</p>
        </div>
      ) : (
        <ol className="card divide-y divide-line overflow-hidden p-0">
          {top.map((r) => {
            const mine = r.id === user.id;
            return (
              <li
                key={r.id}
                aria-current={mine ? "true" : undefined}
                className={`flex min-h-14 items-center gap-3 px-4 py-2.5 ${mine ? "g-rank-me" : ""}`}
              >
                <span className={`g-rank ${PODIUM[r.rank - 1] ?? "text-muted"}`}>{r.rank}</span>
                <Avatar user={{ id: r.id, name: r.name, avatarAt: mine ? user.avatarAt : null }} className="size-9 text-sm" />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold sm:text-[0.9375rem]">
                  {r.name}
                  {mine && <span className="badge badge-accent ml-2 align-middle">Bạn</span>}
                </span>
                <span className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-gem tabular-nums">
                  <Gem className="size-4" /> {fmt(r.total)}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}

export default function LeaderboardPage() {
  return (
    <main className="page page-narrow" data-sec="de">
      <PageHeader sec="de" icon={Trophy} compact title="Bảng xếp hạng" sub="Xếp theo tổng kim cương kiếm được từ luyện tập." />
      <Suspense fallback={<LeaderboardSkeleton />}>
        <Board />
      </Suspense>
    </main>
  );
}
