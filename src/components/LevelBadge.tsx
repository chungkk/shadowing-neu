/** Nhãn cấp độ CEFR A1–C2: phân biệt rõ 3 nhóm (A xanh ngọc #22C55E · B xanh da trời #38BDF8 · C tím dịu #A78BFA) */
const COLORS: Record<string, string> = {
  A: "border border-ok/25 bg-ok-soft text-ok-text",
  B: "border border-link/25 bg-link-soft text-link",
  C: "border border-grape/25 bg-grape-soft text-grape-text",
};

export default function LevelBadge({ level, className = "" }: { level: string; className?: string }) {
  return (
    <span className={`badge font-bold tabular-nums ${COLORS[level[0]] ?? COLORS.A} ${className}`}>
      {level}
    </span>
  );
}
