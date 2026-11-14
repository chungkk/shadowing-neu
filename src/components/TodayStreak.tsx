"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Flame } from "lucide-react";
import { clientApi } from "@/lib/client-api";
import { Gem } from "./PointsBadge";

/** Ô "Chuỗi ngày" của dải Hôm nay (bấm → trang Thành tích). Ngày có học = ôn từ, học bộ từ hoặc chép chính tả được điểm. — chuỗi ngày và điểm hôm nay tính theo giờ máy người học nên tải trên trình duyệt */
export default function TodayStreak() {
  const [s, setS] = useState<{ streak: number; today: number } | null>(null);
  useEffect(() => {
    let alive = true;
    clientApi<{ points: { today: number }; streak: number }>(`/stats?tz=${new Date().getTimezoneOffset()}`)
      .then((r) => alive && setS({ streak: r.streak, today: r.points.today }))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Link href="/stats" className="tile sticker-link flex min-w-0 flex-col gap-0.5">
      <span className="flex items-center gap-1.5 text-xs font-bold text-muted">
        <Flame className="size-4 text-amber" /> Chuỗi ngày
      </span>
      <span className="text-xl font-extrabold tabular-nums">{s ? `${s.streak} ngày` : "…"}</span>
      <span className="flex items-center gap-1 text-xs font-bold text-gem">
        <Gem className="size-4" /> Hôm nay {s ? (s.today > 0 ? `+${s.today}` : s.today) : "…"}
      </span>
    </Link>
  );
}
