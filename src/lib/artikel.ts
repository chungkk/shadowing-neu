/**
 * Luật game Der Die Das (dùng được cả trình duyệt lẫn server): đặt kim cương, chọn mạo từ từng từ. Đúng thì hệ số tăng, chốt để lấy kim cương về, sai / hết giờ mất phần đã đặt.
 * Bảng hệ số chỉ hoà vốn khi đúng từ ~85% từ trở lên (đoán bừa chỉ đúng ~1/3, luôn lỗ); người giỏi có lời nhưng vướng trần ARTIKEL_WIN_CAP vì kim cương mua được bài.
 */

export const ARTIKEL_STAKES = [10, 25, 50, 100];
export const ARTIKEL_GOAL = 10; // số từ tối đa của 1 ván, đúng hết tự chốt
export const ARTIKEL_SECONDS = 6; // thời gian cho mỗi từ
export const ARTIKEL_WIN_CAP = 200; // kim cương lời tối đa trong 24 giờ
export const ARTIKEL_ROUND_CAP = 30; // số ván tối đa trong 24 giờ

/** % kim cương nhận về theo số từ đúng liên tiếp (vị trí 0 = chưa đúng từ nào, chưa chốt được) */
export const ARTIKEL_LADDER = [0, 110, 125, 150, 175, 200, 250, 300, 350, 400, 500];

export const ARTIKELS = ["der", "die", "das"] as const;
export type Artikel = (typeof ARTIKELS)[number];

export type ArtikelLimits = { roundsLeft: number; winLeft: number };
/** Ván đang chơi. phase word = đang hiện từ (phải trả lời) · choose = vừa đúng, chọn chốt hay chơi tiếp — từ tiếp theo chỉ lộ khi chơi tiếp */
export type ArtikelRoundView = {
  stake: number;
  correct: number;
  pot: number; // chốt bây giờ nhận về
  nextPot: number; // đúng thêm 1 từ thì chốt được
  phase: "word" | "choose";
  word: { word: string; meaning: string } | null;
  msLeft: number; // thời gian còn lại của từ đang hiện
};
export type ArtikelReveal = { word: string; gender: Artikel; meaning: string; correct: boolean; timedOut: boolean };
export type ArtikelResult = { won: boolean; stake: number; payout: number; correct: number; capped: boolean };
export type ArtikelState = { total: number; limits: ArtikelLimits; round: ArtikelRoundView | null; reveal?: ArtikelReveal; result?: ArtikelResult };
