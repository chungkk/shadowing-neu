/**
 * Luật Sudoku & Caro (dùng được cả trình duyệt lẫn server). Chỉ để chơi vui: không cược, không đổi kim cương
 * (kim cương chỉ đến từ việc học nên bảng xếp hạng phản ánh đúng việc học).
 * - Phòng (mode "room"): chơi với bạn bằng mã phòng. Khách chưa đăng nhập chỉ cần nhập tên tạm.
 * - Một mình (mode "solo"): Sudoku một mình, Caro đấu với máy.
 */

export type PlayGame = "sudoku" | "caro";
export type PlayMode = "room" | "solo";
export type SudokuLevel = "easy" | "medium" | "hard";

export const SUDOKU_LEVELS: SudokuLevel[] = ["easy", "medium", "hard"];
export const SUDOKU_LEVEL_LABEL: Record<SudokuLevel, string> = { easy: "Dễ", medium: "Vừa", hard: "Khó" };
/** Thời gian giải tối đa (phút) — cả một mình lẫn phòng */
export const SUDOKU_MINUTES: Record<SudokuLevel, number> = { easy: 20, medium: 30, hard: 45 };
export const PLAY_PAUSE_SECONDS = 180; // quỹ tạm dừng của mỗi người trong 1 ván (như Solo Games); hết quỹ thì ván tự chạy tiếp
export const CARO_SIZE = 15;
export const CARO_TURN_SECONDS = 60; // mỗi nước (đấu với người); hết giờ là thua
export const CARO_BOT_TURN_SECONDS = 180; // mỗi nước khi đấu với máy
export const ROOM_MAX_PLAYERS = 4; // Sudoku; Caro luôn 2
export const ROOM_WAIT_MINUTES = 15; // phòng chờ quá lâu chưa bắt đầu → huỷ

export type PlayPlayer = {
  id: number;
  name: string;
  guest: boolean; // khách chơi bằng tên tạm (chưa đăng nhập)
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
};

export type CaroCell = "X" | "O" | null;

export type PlayView = {
  code: string;
  game: PlayGame;
  mode: PlayMode;
  level: SudokuLevel | "";
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

export type PlayState = { active: { code: string; game: PlayGame } | null };
