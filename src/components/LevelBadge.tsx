/** Nhãn cấp độ A1–C2, màu theo nhóm (A xanh lá, B xanh dương, C tím) */
const COLORS: Record<string, string> = {
  A: "bg-emerald-200 text-emerald-900",
  B: "bg-sky-200 text-sky-900",
  C: "bg-violet-200 text-violet-900",
};

export default function LevelBadge({ level, className = "" }: { level: string; className?: string }) {
  return (
    <span className={`rounded-lg px-2 py-0.5 text-sm font-extrabold ${COLORS[level[0]] ?? COLORS.A} ${className}`}>
      {level}
    </span>
  );
}
