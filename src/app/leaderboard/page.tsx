import { Suspense } from "react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getLeaderboard } from "@/lib/db";
import Avatar from "@/components/Avatar";
import { Gem } from "@/components/PointsBadge";
import { LeaderboardSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = { title: "Bảng xếp hạng" };

const fmt = (n: number) => n.toLocaleString("vi-VN");
/** Màu số hạng của 3 người đầu */
const PODIUM = ["bg-amber text-sidebar", "bg-foreground/15 text-foreground", "bg-amber/25 text-amber"];

async function Board() {
  const user = await requireUser("/leaderboard");
  const { top, me, players } = getLeaderboard(user.id);
  return (
    <>
      <section className="flex items-center gap-4 rounded-2xl border border-gem/35 bg-gem/10 p-4">
        <Avatar user={user} className="size-12 text-xl" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-muted">Hạng của bạn</p>
          {me.rank === null ? (
            <>
              <p className="text-xl font-extrabold">Chưa có hạng</p>
              <p className="text-sm text-muted">Chép chính tả đúng để có điểm và lên bảng xếp hạng.</p>
            </>
          ) : (
            <p className="text-3xl leading-tight font-extrabold tabular-nums">
              #{fmt(me.rank)} <span className="text-sm font-bold text-muted">trong {fmt(players)} người</span>
            </p>
          )}
        </div>
        <span className="flex shrink-0 items-center gap-1.5 text-lg font-extrabold text-gem tabular-nums">
          <Gem className="size-6" /> {fmt(me.total)}
        </span>
      </section>

      {top.length === 0 ? (
        <p className="card p-6 text-center text-muted">Chưa có ai trên bảng xếp hạng.</p>
      ) : (
        <ol className="card flex flex-col divide-y divide-border overflow-hidden">
          {top.map((r) => {
            const mine = r.id === user.id;
            return (
              <li key={r.id} aria-current={mine ? "true" : undefined} className={`flex items-center gap-3 px-3 py-2.5 sm:px-4 ${mine ? "bg-accent/15" : ""}`}>
                <span className={`flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full px-1.5 text-sm font-extrabold tabular-nums ${PODIUM[r.rank - 1] ?? "text-muted"}`}>
                  {r.rank}
                </span>
                {/* Ảnh đại diện chỉ chính chủ xem được → người khác hiện chữ cái đầu tên */}
                <Avatar user={{ id: r.id, name: r.name, avatarAt: mine ? user.avatarAt : null }} className="size-9 text-base" />
                <span className="min-w-0 flex-1 truncate font-bold">
                  {r.name}
                  {mine && <span className="ml-1.5 text-sm font-bold text-accent">(Bạn)</span>}
                </span>
                <span className="flex shrink-0 items-center gap-1 font-extrabold text-gem tabular-nums">
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
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 p-4 md:p-6">
      <h1 className="text-2xl font-extrabold">Bảng xếp hạng</h1>
      <Suspense fallback={<LeaderboardSkeleton />}>
        <Board />
      </Suspense>
    </main>
  );
}
