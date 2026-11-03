/** Màu giống bản web (src/app/globals.css): nền kem · viền nâu mận (ink) · xanh lá (chính) · vàng tai nghe (nhấn) · đỏ kẹo (ghi âm / xoá) */
export const C = {
  background: "#fff6e9",
  card: "#fffdf9",
  card2: "#ffedd6",
  border: "#ecd3bb",
  ink: "#55303f",
  text: "#43232f",
  muted: "#7a5a65",
  link: "#0f766e",
  accent: "#17803f",
  accentDark: "#0e5a2b",
  amber: "#a85605", // đủ đậm để làm chữ trên nền kem; nền nút dùng gold
  gold: "#fbbf24",
  phrase: "#0369a1", // cụm từ cố định AI tìm thấy
  gem: "#0369a1", // điểm chính tả (kim cương)
  red: "#e8384f",
  redText: "#c81e3a",
} as const;

/** Màn chơi game: vẽ riêng cho nền đêm nên giữ bảng màu tối (như .theme-night trên web) */
export const NIGHT = {
  background: "#0c110e",
  card: "#131b16",
  card2: "#1b261f",
  border: "#26362c",
  text: "#eef5ef",
  muted: "#8ea395",
  accent: "#16a34a",
  accentDark: "#14532d",
  amber: "#facc15",
  phrase: "#38bdf8",
  red: "#dc2626",
  redText: "#f87171",
} as const;

/** Viền + bóng cứng kiểu sticker như .card / .btn của web */
export const STICKER = { borderWidth: 2, borderColor: C.ink, boxShadow: `0 4px 0 ${C.ink}` } as const;

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
