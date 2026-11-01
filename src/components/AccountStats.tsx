"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { BookOpen, CalendarClock, Flame, PenLine, PlayCircle, Trophy } from "lucide-react";
import { clientApi } from "@/lib/client-api";
import { Gem } from "./PointsBadge";

export type AccountStatsData = {
  points: number; // tổng kim cương (điểm chính tả)
  words: number; // số từ trong sổ (không tính câu ⭐)
  mastered: number; // từ đã thuộc
  due: number; // từ tới hạn ôn
  lessons: number; // số bài / video đã học
  sentences: number; // số câu đã chép chính tả
};

function Tile({ icon, label, value, sub, href }: { icon: ReactNode; label: string; value: ReactNode; sub?: ReactNode; href?: string }) {
  const body = (
    <>
      <span className="flex items-center gap-1.5 text-xs font-bold text-muted">
        {icon} {label}
      </span>
      <span className="text-2xl font-extrabold tabular-nums">{value}</span>
      {sub && <span className="text-xs text-muted">{sub}</span>}
    </>
  );
  const cls = "flex min-w-0 flex-col gap-1 rounded-xl border border-border bg-card-2/40 p-3 sm:p-4";
  return href ? (
    <Link href={href} className={`${cls} transition hover:border-link/60`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

const fmt = (n: number) => n.toLocaleString("vi-VN");

/**
 * Thành tích học tập trên trang Cài đặt: kim cương, chuỗi ngày, sổ từ, bài đã học, câu đã chép.
 * Số không phụ thuộc múi giờ có sẵn từ server; "hôm nay" và chuỗi ngày tính theo giờ máy → tải thêm /stats.
 */
export default function AccountStats({ stats }: { stats: AccountStatsData }) {
  const [points, setPoints] = useState(stats.points);
  const [today, setToday] = useState<number | null>(null);
  const [streak, setStreak] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    clientApi<{ points: { total: number; today: number }; streak: number }>(`/stats?tz=${new Date().getTimezoneOffset()}`)
      .then((r) => {
        if (!alive) return;
        setPoints(r.points.total);
        setToday(r.points.today);
        setStreak(r.streak);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section className="card flex flex-col gap-4 p-4 sm:p-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-extrabold">
          <Trophy className="size-5 text-link" /> Thành tích học tập
        </h2>
        <p className="mt-0.5 text-sm text-muted">Chép đúng hết 1 câu chính tả +2 kim cương, mỗi từ bấm xem −1.</p>
      </div>

      <div className="flex items-center gap-4 rounded-xl border border-gem/35 bg-gem/10 p-4">
        <Gem className="size-12 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-bold text-gem/80">Kim cương</p>
          <p className="text-3xl leading-tight font-extrabold text-gem tabular-nums">{fmt(points)}</p>
          {!!today && (
            <p className="text-xs font-bold text-gem/80">
              Hôm nay {today > 0 ? `+${fmt(today)}` : `−${fmt(-today)}`}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Tile
          icon={<Flame className="size-4 text-amber" />}
          label="Chuỗi ngày ôn"
          value={streak === null ? "–" : `${fmt(streak)} ngày`}
        />
        <Tile
          icon={<BookOpen className="size-4 text-link" />}
          label="Sổ từ vựng"
          value={fmt(stats.words)}
          sub={`Đã thuộc ${fmt(stats.mastered)}`}
          href="/vocab"
        />
        <Tile icon={<CalendarClock className="size-4 text-link" />} label="Cần ôn hôm nay" value={fmt(stats.due)} href="/vocab" />
        <Tile icon={<PlayCircle className="size-4 text-accent" />} label="Bài đã học" value={fmt(stats.lessons)} />
        <Tile icon={<PenLine className="size-4 text-accent" />} label="Câu đã chép" value={fmt(stats.sentences)} />
      </div>
    </section>
  );
}
