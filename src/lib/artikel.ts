/**
 * Luật game Der Die Das (chơi trên trình duyệt, chỉ để vui — không cược, không đổi kim cương): chọn đúng mạo từ cho từng danh từ,
 * đúng liên tiếp càng nhiều càng tốt. Sai hoặc hết giờ là hết ván; điểm = số từ đúng liên tiếp, kỷ lục lưu trong trình duyệt.
 */

export const ARTIKEL_GOAL = 10; // bộ từ cần ít nhất chừng này danh từ mới chơi được
export const ARTIKEL_SECONDS = 6; // thời gian cho mỗi từ

export const ARTIKELS = ["der", "die", "das"] as const;
export type Artikel = (typeof ARTIKELS)[number];

export type ArtikelGameWord = { word: string; gender: Artikel; meaning: string };
