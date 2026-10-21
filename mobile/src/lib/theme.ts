/** Màu giống bản web: nền đen ánh xanh lá · xanh lá (chính) · vàng (nhấn) · đỏ (ghi âm / xoá) */
export const C = {
  background: "#0c110e",
  card: "#131b16",
  card2: "#1b261f",
  border: "#26362c",
  text: "#eef5ef",
  muted: "#8ea395",
  accent: "#16a34a",
  accentDark: "#14532d",
  amber: "#facc15",
  phrase: "#38bdf8", // cụm từ cố định AI tìm thấy
  red: "#dc2626",
  redText: "#f87171",
} as const;

export const LEVEL_COLORS: Record<string, { bg: string; fg: string }> = {
  A: { bg: "#a7f3d0", fg: "#064e3b" },
  B: { bg: "#bae6fd", fg: "#0c4a6e" },
  C: { bg: "#ddd6fe", fg: "#4c1d95" },
};

export const LEVELS = [
  { level: "A1", name: "Mới bắt đầu" },
  { level: "A2", name: "Sơ cấp" },
  { level: "B1", name: "Trung cấp" },
  { level: "B2", name: "Trung cấp cao" },
  { level: "C1", name: "Nâng cao" },
  { level: "C2", name: "Thành thạo" },
] as const;
