/** Màu cấp độ A1–C2 theo nhóm (A xanh lá, B xanh dương, C tím): lớp gán --pop dùng cho nhãn, nút lọc, thẻ bài, bìa bộ từ */
export const levelPop = (level: string) => ({ A: "pop-leaf", B: "pop-aqua", C: "pop-lilac" })[level[0]] ?? "pop-leaf";

export default function LevelBadge({ level, className = "" }: { level: string; className?: string }) {
  return (
    <span className={`rotate-3 rounded-full border-2 border-ink bg-[var(--pop)] px-2 text-sm font-extrabold text-[#2b1520] ${levelPop(level)} ${className}`}>
      {level}
    </span>
  );
}
