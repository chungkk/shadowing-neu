import { Suspense } from "react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getLeaderboard } from "@/lib/db";
import Avatar from "@/components/Avatar";
import Mascot from "@/components/Mascot";
import PageHeader from "@/components/PageHeader";
import { Gem } from "@/components/PointsBadge";
import { LeaderboardSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = { title: "Bảng xếp hạng" };

const fmt = (n: number) => n.toLocaleString("vi-VN");
/** Huy hiệu số hạng của 3 người đầu: vàng · bạc · đồng */
const PODIUM = ["-rotate-6 border-2 border-ink bg-gold text-[#2b1520]", "rotate-3 border-2 border-ink bg-[#dfe3e8] text-[#2b1520]", "-rotate-3 border-2 border-ink bg-[#eeb07a] text-[#2b1520]"];

async function Board() {
  const user = await requireUser("/leaderboard");
  const { top, me, players } = getLeaderboard(user.id);
  return (
    <>
      <section className="sticker flex items-center gap-4 p-4">
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
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <p className="bubble bubble-down bg-card px-4 py-1.5 font-display font-extrabold">Chưa có ai trên bảng xếp hạng.</p>
          <Mascot animated className="size-36" />
        </div>
      ) : (
        <ol className="card flex flex-col divide-y divide-border overflow-hidden">
          {top.map((r) => {
            const mine = r.id === user.id;
            return (
              <li key={r.id} aria-current={mine ? "true" : undefined} className={`flex items-center gap-3 px-3 py-2.5 sm:px-4 ${mine ? "bg-[var(--leaf)]/45" : ""}`}>
                <span className={`flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full px-1.5 text-sm font-extrabold tabular-nums ${PODIUM[r.rank - 1] ?? "text-muted"}`}>
                  {r.rank}
                </span>
                {/* Ảnh đại diện chỉ chính chủ xem được → người khác hiện chữ cái đầu tên */}
                <Avatar user={{ id: r.id, name: r.name, avatarAt: mine ? user.avatarAt : null }} className="size-9 text-base" />
                <span className="min-w-0 flex-1 truncate font-bold">
                  {r.name}
                  {mine && <span className="ml-1.5 text-sm font-bold">(Bạn)</span>}
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
      <PageHeader title="Bảng xếp hạng" say="Weiter so!" pop="pop-lilac" />
      <Suspense fallback={<LeaderboardSkeleton />}>
        <Board />
      </Suspense>
    </main>
  );
}
