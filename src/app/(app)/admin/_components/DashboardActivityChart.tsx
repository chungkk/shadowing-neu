"use client";

import { useState } from "react";
import type { AdminActivityDay } from "@/lib/db";
import MiniBarChart from "./MiniBarChart";

type Series = "total" | "deutsch" | "laixe" | "lid";

const SERIES: { id: Series; label: string; bar: string }[] = [
  { id: "total", label: "Tất cả", bar: "bg-link" },
  { id: "deutsch", label: "Tiếng Đức", bar: "bg-accent" },
  { id: "laixe", label: "Lái xe", bar: "bg-gold" },
  { id: "lid", label: "Leben in DE", bar: "bg-coral" },
];

export default function DashboardActivityChart({ days }: { days: AdminActivityDay[] }) {
  const [series, setSeries] = useState<Series>("total");
  const active = SERIES.find((s) => s.id === series) ?? SERIES[0];
  const points = days.map((d) => ({ day: d.day, value: d[series] }));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Chọn sản phẩm">
        {SERIES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSeries(s.id)}
            aria-pressed={series === s.id}
            className="chip px-2.5 py-1 text-xs"
          >
            {s.label}
          </button>
        ))}
      </div>
      <MiniBarChart data={points} barClass={active.bar} unit="lượt học" heightClass="h-36" />
    </div>
  );
}
