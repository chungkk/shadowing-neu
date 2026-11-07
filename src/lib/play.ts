/**
 * Luật Sudoku & Caro cược kim cương (dùng được cả trình duyệt lẫn server).
 * - Phòng (mode "room"): ai vào phòng cũng đặt đúng mức cược của phòng, người thắng nhận cả hũ, hoà / huỷ phòng thì hoàn lại.
 *   Kim cương chỉ chuyển giữa người chơi với nhau nên không có trần lời.
 * - Một mình (mode "solo": Sudoku một mình, Caro đấu với máy): thắng nhận về stake × hệ số, thua mất phần đã đặt.
 *   Kim cương sinh thêm ra nên có trần lời & số ván trong 24 giờ như Der Die Das (kim cương mua được bài).
 */

export type PlayGame = "sudoku" | "caro";
export type PlayMode = "room" | "solo";
export type SudokuLevel = "easy" | "medium" | "hard";

export const PLAY_STAKES = [5, 10, 25, 50, 100];
export const SUDOKU_LEVELS: SudokuLevel[] = ["easy", "medium", "hard"];
export const SUDOKU_LEVEL_LABEL: Record<SudokuLevel, string> = { easy: "Dễ", medium: "Vừa", hard: "Khó" };
/** Sudoku một mình: % nhận về khi giải xong */
export const SUDOKU_SOLO_PAYOUT: Record<SudokuLevel, number> = { easy: 150, medium: 200, hard: 300 };
/** Thời gian giải tối đa (phút) — cả một mình lẫn phòng */
export const SUDOKU_MINUTES: Record<SudokuLevel, number> = { easy: 20, medium: 30, hard: 45 };
export const PLAY_PAUSE_SECONDS = 180; // quỹ tạm dừng của mỗi người trong 1 ván (như Solo Games); hết quỹ thì ván tự chạy tiếp
export const CARO_BOT_PAYOUT = 200; // % nhận về khi thắng máy
export const CARO_SIZE = 15;
export const CARO_TURN_SECONDS = 60; // mỗi nước (đấu với người); hết giờ là thua
export const CARO_BOT_TURN_SECONDS = 180; // mỗi nước khi đấu với máy
export const ROOM_MAX_PLAYERS = 4; // Sudoku; Caro luôn 2
export const ROOM_WAIT_MINUTES = 15; // phòng chờ quá lâu chưa bắt đầu → huỷ, hoàn kim cương
export const SOLO_WIN_CAP = 300; // kim cương lời tối đa trong 24 giờ (chơi một mình / với máy)
export const SOLO_ROUND_CAP = 30; // số ván một mình / với máy tối đa trong 24 giờ

export type PlayLimits = { roundsLeft: number; winLeft: number };

export type PlayPlayer = {
  id: number;
  name: string;
  seat: number;
  me: boolean;
  out: boolean; // bỏ cuộc
  ready: boolean; // phòng chờ: đã bấm Sẵn sàng (chủ phòng luôn sẵn sàng)
  progress: number; // Sudoku: số ô đã điền (không cho biết đúng sai)
  errors: number; // Sudoku: số lần điền trùng số (hàng / cột / khối), chỉ để xem
};

export type PlayResult = {
  winnerId: number | null; // null = hoà / huỷ · 0 = máy thắng
  reason: "solved" | "five" | "timeout" | "resign" | "out" | "draw" | "canceled" | "time"; // out = những người khác đã bỏ cuộc
  payout: number; // kim cương mình nhận về
  stake: number;
  capped: boolean; // chạm trần lời 24 giờ
};

export type CaroCell = "X" | "O" | null;

export type PlayView = {
  code: string;
  game: PlayGame;
  mode: PlayMode;
  level: SudokuLevel | "";
  stake: number;
  pot: number; // tổng kim cương trong hũ (phòng) / nhận về nếu thắng (một mình)
  capacity: number;
  status: "waiting" | "playing" | "ended" | "canceled";
  hostId: number;
  meId: number;
  players: PlayPlayer[];
  msLeft: number; // waiting: còn bao lâu thì huỷ · playing: Sudoku còn bao lâu hết giờ, Caro còn bao lâu hết lượt
  version: number; // đổi mỗi khi ván đổi
  pause: { byId: number; byName: string; msLeft: number } | null; // ván đang tạm dừng: ai dừng, còn bao lâu thì tự chạy tiếp
  pauseLeft: number; // quỹ tạm dừng còn lại của mình (ms)
  sudoku?: {
    givens: number[]; // 81 ô, 0 = trống
    mine: number[]; // 81 ô: đề + các ô mình đã điền (lưu ở server để mở lại trang vẫn còn)
    errors: number;
    solution?: number[]; // chỉ có khi ván đã xong
  };
  caro?: {
    board: CaroCell[]; // 15×15, theo hàng
    turn: "X" | "O";
    mySymbol: "X" | "O" | null;
    last: number | null; // ô vừa đánh
    line: number[]; // 5 ô thắng
  };
  result?: PlayResult;
};

export type PlayState = { total: number; limits: PlayLimits; active: { code: string; game: PlayGame } | null };

export const fmtDiamonds = (n: number) => n.toLocaleString("vi-VN");
