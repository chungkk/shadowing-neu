export type BarPoint = { day: string; value: number };

export default function MiniBarChart({
  data,
  barClass = "bg-sec",
  unit = "lượt",
  heightClass = "h-32",
}: {
  data: BarPoint[];
  barClass?: string;
  unit?: string;
  heightClass?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((s, d) => s + d.value, 0);
  const activeDays = data.filter((d) => d.value > 0).length;
  const first = data[0]?.day.slice(5).split("-").reverse().join("/") ?? "";
  const mid = data[Math.floor(data.length / 2)]?.day.slice(5).split("-").reverse().join("/") ?? "";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-muted">
        <span className="font-mono font-semibold text-foreground tabular-nums">
          {total.toLocaleString("vi-VN")} {unit}
        </span>
        <span className="tabular-nums">
          {activeDays}/{data.length} ngày có hoạt động · đỉnh {max.toLocaleString("vi-VN")}/ngày
        </span>
      </div>
      <div
        className={`flex ${heightClass} items-end gap-[3px] rounded-lg border border-line bg-sidebar/60 px-2.5 pt-3 pb-2`}
        role="img"
        aria-label={`Biểu đồ ${data.length} ngày: tổng ${total} ${unit}`}
      >
        {data.map((d) => {
          const pct = d.value > 0 ? Math.max(8, Math.round((d.value / max) * 100)) : 4;
          const label = d.day.split("-").reverse().join(".");
          return (
            <div key={d.day} className="group relative flex h-full min-w-0 flex-1 items-end">
              <div
                title={`${label}: ${d.value.toLocaleString("vi-VN")} ${unit}`}
                className={`w-full rounded-t-sm transition-opacity ${d.value > 0 ? `${barClass} opacity-85 group-hover:opacity-100` : "bg-card-2"}`}
                style={{ height: `${pct}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between font-mono text-[11px] text-muted tabular-nums">
        <span>{first}</span>
        <span>{mid}</span>
        <span>Hôm nay</span>
      </div>
    </div>
  );
}
