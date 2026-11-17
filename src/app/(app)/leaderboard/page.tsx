import { Suspense } from "react";
import { Trophy } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getLeaderboard } from "@/lib/db";
import Avatar from "@/components/Avatar";
import { Gem } from "@/components/PointsBadge";
import { LeaderboardSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = { title: "Bảng xếp hạng", robots: { index: false, follow: false } };

const fmt = (n: number) => n.toLocaleString("vi-VN");
/** Huy chương số hạng của 3 người đầu (styles/games.css) */
const PODIUM = ["g-rank-1", "g-rank-2", "g-rank-3"];

async function Board() {
  const user = await requireUser("/leaderboard");
  const { top, me, players } = getLeaderboard(user.id);
  return (
    <>
      <section className="card hero flex flex-wrap items-center gap-x-4 gap-y-3 p-4 sm:p-5" aria-label="Hạng của bạn">
        <Avatar user={user} className="size-14 text-2xl" />
        <div className="min-w-0 flex-1">
          {me.rank === null ? (
            <>
              <p className="font-display text-2xl leading-tight font-bold tracking-[-0.02em]">Chưa có hạng</p>
              <p className="text-sm text-muted">Chép chính tả đúng để có điểm và lên bảng xếp hạng.</p>
            </>
          ) : (
            <>
              <p className="font-display text-4xl leading-none font-extrabold tracking-[-0.03em] tabular-nums">#{fmt(me.rank)}</p>
              <p className="mt-1 text-sm font-semibold text-muted">Hạng của bạn · trong {fmt(players)} người</p>
            </>
          )}
        </div>
        <span className="badge badge-gem shrink-0 gap-1.5 px-3 py-1.5 text-base tabular-nums max-[360px]:w-full max-[360px]:justify-center">
          <Gem className="size-5" /> {fmt(me.total)}
        </span>
      </section>

      {top.length === 0 ? (
        <div className="card empty">
          <span className="icon-bubble tint-gold size-16 rounded-panel">
            <Trophy className="size-8" />
          </span>
          <p className="font-display text-lg font-bold text-foreground">Chưa có ai trên bảng xếp hạng</p>
          <p className="text-sm">Chép chính tả đúng để có điểm và là người đầu tiên.</p>
        </div>
      ) : (
        <ol className="card flex flex-col overflow-hidden p-1.5">
          {top.map((r) => {
            const mine = r.id === user.id;
            return (
              <li
                key={r.id}
                aria-current={mine ? "true" : undefined}
                className={`flex min-h-14 items-center gap-3 rounded-xl px-2.5 py-2 sm:px-3 ${mine ? "g-rank-me" : "[&+&]:border-t [&+&]:border-line"}`}
              >
                <span className={`g-rank ${PODIUM[r.rank - 1] ?? "text-muted"}`}>{r.rank}</span>
                {/* Ảnh đại diện chỉ chính chủ xem được → người khác hiện chữ cái đầu tên */}
                <Avatar user={{ id: r.id, name: r.name, avatarAt: mine ? user.avatarAt : null }} className="size-10 text-base" />
                <span className="min-w-0 flex-1 truncate font-bold">
                  {r.name}
                  {mine && <span className="badge badge-accent ml-2 align-middle">Bạn</span>}
                </span>
                <span className="flex shrink-0 items-center gap-1 font-bold text-gem tabular-nums">
                  <Gem className="size-5" /> {fmt(r.total)}
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
      <PageHeader sec="de" icon={Trophy} compact title="Bảng xếp hạng" sub="Xếp theo tổng kim cương kiếm được khi học." />
      <Suspense fallback={<LeaderboardSkeleton />}>
        <Board />
      </Suspense>
    </main>
  );
}
