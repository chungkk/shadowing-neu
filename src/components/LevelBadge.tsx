/** Nhãn cấp độ A1–C2, màu theo nhóm (A xanh lá, B xanh dương, C tím) */
const COLORS: Record<string, string> = {
  A: "bg-emerald-100 text-emerald-800 ring-emerald-300 dark:bg-emerald-400/15 dark:text-emerald-200 dark:ring-emerald-400/30",
  B: "bg-sky-100 text-sky-800 ring-sky-300 dark:bg-sky-400/15 dark:text-sky-200 dark:ring-sky-400/30",
  C: "bg-violet-100 text-violet-800 ring-violet-300 dark:bg-violet-400/15 dark:text-violet-200 dark:ring-violet-400/30",
};

export default function LevelBadge({ level, className = "" }: { level: string; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 text-sm font-extrabold tabular-nums ring-1 ring-inset ${COLORS[level[0]] ?? COLORS.A} ${className}`}>
      {level}
    </span>
  );
}
