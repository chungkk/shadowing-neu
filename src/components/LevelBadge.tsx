/** Nhãn cấp độ A1–C2 — mẩu băng dính màu theo nhóm (A xanh lá, B xanh lam, C tím), dùng token chung để hợp theme sáng / tối */
const COLORS: Record<string, string> = {
  A: "bg-ok-soft text-ok-text",
  B: "bg-accent-soft text-accent-text",
  C: "bg-grape-soft text-grape-text",
};

export default function LevelBadge({ level, className = "" }: { level: string; className?: string }) {
  return (
    <span className={`badge font-bold tabular-nums ${COLORS[level[0]] ?? COLORS.A} ${className}`}>
      {level}
    </span>
  );
}
