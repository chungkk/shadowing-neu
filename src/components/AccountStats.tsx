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

function Tile({
  icon,
  tint,
  label,
  value,
  sub,
  href,
}: {
  icon: ReactNode;
  tint: "accent" | "gold" | "link" | "ok";
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  href?: string;
}) {
  const body = (
    <>
      <span className={`icon-bubble size-8 rounded-lg tint-${tint}`} aria-hidden>
        {icon}
      </span>
      <span className="stat mt-1.5">
        <span className="stat-value text-[1.6rem]">{value}</span>
        <span className="text-sm font-medium">{label}</span>
        {sub && <span className="text-xs text-muted">{sub}</span>}
      </span>
    </>
  );
  const cls = "tile flex min-w-0 flex-col items-start gap-1 sm:p-4";
  return href ? (
    <Link href={href} className={`${cls} card-link`}>
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
      <div className="min-w-0">
        <h2 className="section-title flex items-center gap-2">
          <Trophy className="size-5 shrink-0 text-muted" aria-hidden /> Thành tích học tập
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">Mỗi từ chép chính tả đúng được +1 kim cương, mỗi lần bấm xem từ −2.</p>
      </div>

      <div className="stats-gem">
        <span className="stats-gem-icon" aria-hidden>
          <Gem className="size-8 sm:size-9" />
        </span>
        <div className="flex min-w-0 flex-1 flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <p className="flex flex-col">
            <span className="font-display text-4xl leading-none font-extrabold tracking-[-0.03em] tabular-nums sm:text-5xl">{fmt(points)}</span>
            <span className="mt-1 text-sm font-semibold">kim cương</span>
          </p>
          {!!today && (
            <span className="badge badge-gem bg-card">
              Hôm nay {today > 0 ? `+${fmt(today)}` : `−${fmt(-today)}`}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Tile
          tint="gold"
          icon={<Flame className="size-4" />}
          label="Chuỗi ngày ôn"
          value={streak === null ? "–" : `${fmt(streak)} ngày`}
        />
        <Tile
          tint="link"
          icon={<BookOpen className="size-4" />}
          label="Sổ từ vựng"
          value={fmt(stats.words)}
          sub={`Đã thuộc ${fmt(stats.mastered)}`}
          href="/vocab/notebook"
        />
        <Tile tint="link" icon={<CalendarClock className="size-4" />} label="Cần ôn hôm nay" value={fmt(stats.due)} href="/vocab/notebook" />
        <Tile tint="accent" icon={<PlayCircle className="size-4" />} label="Bài đã học" value={fmt(stats.lessons)} />
        <Tile tint="ok" icon={<PenLine className="size-4" />} label="Câu đã chép" value={fmt(stats.sentences)} />
      </div>
    </section>
  );
}
