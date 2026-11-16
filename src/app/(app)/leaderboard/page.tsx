import { Suspense } from "react";
import { Trophy } from "lucide-react";
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
      <section className="card hero rise-in flex items-center gap-4 p-5" style={{ ["--hero" as string]: "var(--aqua)" }}>
        <Avatar user={user} className="size-14 text-2xl" />
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Hạng của bạn</p>
          {me.rank === null ? (
            <>
              <p className="font-display text-2xl leading-tight font-extrabold">Chưa có hạng</p>
              <p className="text-sm text-muted">Chép chính tả đúng để có điểm và lên bảng xếp hạng.</p>
            </>
          ) : (
            <p className="font-display text-4xl leading-tight font-extrabold tabular-nums">
              #{fmt(me.rank)} <span className="font-sans text-sm font-bold text-muted">trong {fmt(players)} người</span>
            </p>
          )}
        </div>
        <span className="badge badge-gem shrink-0 gap-1.5 px-3 py-1.5 text-base tabular-nums">
          <Gem className="size-5" /> {fmt(me.total)}
        </span>
      </section>

      {top.length === 0 ? (
        <div className="card empty">
          <Trophy className="size-10 text-amber" />
          <p>Chưa có ai trên bảng xếp hạng.</p>
        </div>
      ) : (
        <ol className="card flex flex-col overflow-hidden p-1.5">
          {top.map((r) => {
            const mine = r.id === user.id;
            return (
              <li
                key={r.id}
                aria-current={mine ? "true" : undefined}
                className={`flex items-center gap-3 rounded-2xl px-2.5 py-2.5 sm:px-3 ${mine ? "g-rank-me" : "[&+&]:border-t [&+&]:border-line"}`}
              >
                <span className={`g-rank ${PODIUM[r.rank - 1] ?? "text-muted"}`}>{r.rank}</span>
                {/* Ảnh đại diện chỉ chính chủ xem được → người khác hiện chữ cái đầu tên */}
                <Avatar user={{ id: r.id, name: r.name, avatarAt: mine ? user.avatarAt : null }} className="size-10 text-base" />
                <span className="min-w-0 flex-1 truncate font-bold">
                  {r.name}
                  {mine && <span className="badge badge-accent ml-2 align-middle">Bạn</span>}
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
    <main className="page page-narrow">
      <h1 className="page-title flex items-center gap-3">
        <span className="icon-bubble tint-gold">
          <Trophy className="size-5" />
        </span>
        Bảng xếp hạng
      </h1>
      <Suspense fallback={<LeaderboardSkeleton />}>
        <Board />
      </Suspense>
    </main>
  );
}
