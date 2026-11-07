import "server-only";
import { randomInt } from "node:crypto";
import { caroBotMove, caroFull, caroWinLine } from "./caro";
import {
  activePlayRoom,
  addPlaySeat,
  createPlayRoom,
  duePlayRooms,
  getPoints,
  playRoomByCode,
  playRoomById,
  playSeats,
  playTx,
  removePlaySeat,
  removePlaySeats,
  soloPlayUsage,
  updatePlayRoom,
  updatePlaySeat,
  type PlayRoomRow,
  type PlaySeatRow,
} from "./db";
import {
  CARO_BOT_PAYOUT,
  CARO_BOT_TURN_SECONDS,
  CARO_SIZE,
  CARO_TURN_SECONDS,
  PLAY_STAKES,
  ROOM_MAX_PLAYERS,
  ROOM_WAIT_MINUTES,
  SOLO_ROUND_CAP,
  SOLO_WIN_CAP,
  SUDOKU_LEVELS,
  PLAY_PAUSE_SECONDS,
  SUDOKU_MINUTES,
  SUDOKU_SOLO_PAYOUT,
  type CaroCell,
  type PlayGame,
  type PlayLimits,
  type PlayMode,
  type PlayResult,
  type PlayState,
  type PlayView,
  type SudokuLevel,
} from "./play";
import { generateSudoku } from "./sudoku";

/**
 * Ván Sudoku / Caro do server giữ: lời giải Sudoku không rời server trước khi xong ván. Như Solo Games, người chơi điền / xoá /
 * hoàn tác tự do trên máy mình, bàn được gửi lên để lưu và cho người khác thấy tiến độ (chỉ số ô đã điền, không lộ đúng sai);
 * điền kín bàn thì nộp, server so với lời giải. Nước đi Caro và kim cương đều tính ở đây chứ không tin máy khách. Mọi thay đổi chạy đồng bộ trong 1 giao dịch (playTx)
 * từ lúc đọc ván tới lúc ghi nên 2 request cùng lúc không chen được vào giữa.
 */

type Failure = { error: string; status: number };
type SudokuData = { givens: number[]; solution: number[]; capped?: boolean };
type SudokuSeat = { grid: number[]; errors: number }; // grid: 81 ô, chỉ các ô người này điền (0 = trống)
type CaroData = { board: CaroCell[]; turn: "X" | "O"; last: number | null; line: number[]; capped?: boolean };
/** Tạm dừng (chung cho cả 2 game, lưu trong data của phòng): left = thời gian còn lại của hạn đang chạy lúc bấm dừng */
type PauseData = { pause?: { by: number; at: number; left: number } | null; pauseUsed?: Record<string, number> };

const WINDOW_MS = 24 * 60 * 60 * 1000;
const GRACE_MS = 2000; // bù độ trễ mạng khi hết giờ
const BOT = 0; // winner_id của máy (Caro) / "không ai" khi thua ván một mình
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // bỏ I, O, 0, 1 cho dễ đọc
const fail = (error: string, status = 400): Failure => ({ error, status });

function limitsOf(userId: number, now: number): PlayLimits {
  const { net, rounds } = soloPlayUsage(userId, now - WINDOW_MS);
  return { roundsLeft: Math.max(0, SOLO_ROUND_CAP - rounds), winLeft: Math.max(0, SOLO_WIN_CAP - net) };
}

const PAUSE_MS = PLAY_PAUSE_SECONDS * 1000;
/** Phòng chờ: id những người đã bấm Sẵn sàng (chủ phòng luôn sẵn sàng, không nằm trong danh sách) */
const readyOf = (r: PlayRoomRow) => ((r.data as { ready?: number[] }).ready ?? []) as number[];
const isReady = (r: PlayRoomRow, userId: number) => userId === r.hostId || readyOf(r).includes(userId);
const allReady = (r: PlayRoomRow, seats: PlaySeatRow[]) => seats.every((s) => isReady(r, s.userId));
const gridOf = (s: PlaySeatRow) => (s.data as SudokuSeat).grid ?? [];
const filled = (s: PlaySeatRow) => gridOf(s).filter(Boolean).length;
const correctCells = (s: PlaySeatRow, solution: number[]) => gridOf(s).filter((v, i) => v && v === solution[i]).length;
const pauseLeftOf = (r: PlayRoomRow, userId: number) => Math.max(0, PAUSE_MS - ((r.data as PauseData).pauseUsed?.[userId] ?? 0));

/** Chạy tiếp ván đang tạm dừng: tính thời gian đã dừng vào quỹ của người dừng, hạn giờ lùi lại đúng bấy nhiêu */
function resume(r: PlayRoomRow, now: number) {
  const d = r.data as PauseData;
  if (!d.pause) return;
  const used = Math.min(now - d.pause.at, pauseLeftOf(r, d.pause.by));
  const data = { ...r.data, pause: null, pauseUsed: { ...d.pauseUsed, [d.pause.by]: (d.pauseUsed?.[d.pause.by] ?? 0) + used } };
  updatePlayRoom(r.id, { data, deadline: now + d.pause.left });
  r.data = data;
  r.deadline = now + d.pause.left;
}
const caroSymbol = (r: PlayRoomRow, seat: PlaySeatRow | undefined) => (seat ? (r.mode === "solo" || seat.seat === 0 ? "X" : "O") : null);

// ---- Kết thúc ván ----

/** winnerId: id người thắng · BOT (máy thắng / thua ván một mình) · null = hoà, hoàn kim cương */
function finish(r: PlayRoomRow, winnerId: number | null, reason: PlayResult["reason"], now: number, data: Record<string, unknown> = r.data) {
  const seats = playSeats(r.id);
  let capped = false;
  if (r.mode === "solo") {
    const s = seats[0];
    if (s && winnerId === s.userId) {
      const rate = r.game === "sudoku" ? SUDOKU_SOLO_PAYOUT[r.level as SudokuLevel] : CARO_BOT_PAYOUT;
      const full = Math.floor((s.stake * rate) / 100);
      const payout = Math.min(full, s.stake + limitsOf(s.userId, now).winLeft);
      capped = payout < full;
      updatePlaySeat(r.id, s.userId, { payout });
    } else if (s && winnerId === null) updatePlaySeat(r.id, s.userId, { payout: s.stake });
  } else {
    const pot = seats.reduce((n, s) => n + s.stake, 0);
    for (const s of seats) updatePlaySeat(r.id, s.userId, { payout: winnerId === null ? s.stake : s.userId === winnerId ? pot : 0 });
  }
  updatePlayRoom(r.id, { status: "ended", winnerId, reason, endedAt: now, deadline: now, data: { ...data, capped } });
}

/** Huỷ phòng chưa bắt đầu: xoá hết ghế = hoàn kim cương */
function cancel(r: PlayRoomRow, now: number) {
  removePlaySeats(r.id);
  updatePlayRoom(r.id, { status: "canceled", reason: "canceled", endedAt: now, deadline: now });
}

/** Sudoku phòng: còn 1 người trong cuộc → người đó thắng; không còn ai → hoà */
function checkLastStanding(r: PlayRoomRow, now: number) {
  const alive = playSeats(r.id).filter((s) => !s.out);
  if (alive.length === 1) finish(r, alive[0].userId, "out", now);
  else if (!alive.length) finish(r, null, "draw", now);
}

/** Ván quá hạn: phòng chờ quá lâu → huỷ · hết quỹ tạm dừng → chạy tiếp · Sudoku hết giờ · Caro hết lượt → người đang tới lượt thua */
function expire(r: PlayRoomRow, now: number) {
  if (r.status === "waiting") return cancel(r, now);
  if ((r.data as PauseData).pause) return resume(r, now);
  const seats = playSeats(r.id);
  if (r.game === "sudoku") {
    if (r.mode === "solo") return finish(r, BOT, "time", now);
    // Hết giờ: ai điền ĐÚNG nhiều ô nhất thắng (đếm theo lời giải, không theo số ô đã điền — điền bừa không được lợi)
    const solution = (r.data as SudokuData).solution;
    const alive = seats.filter((s) => !s.out);
    const best = Math.max(0, ...alive.map((s) => correctCells(s, solution)));
    const top = alive.filter((s) => correctCells(s, solution) === best);
    return finish(r, top.length === 1 ? top[0].userId : null, top.length === 1 ? "time" : "draw", now);
  }
  const d = r.data as CaroData;
  if (r.mode === "solo") return finish(r, BOT, "timeout", now);
  const winner = seats.find((s) => caroSymbol(r, s) !== d.turn);
  finish(r, winner?.userId ?? null, "timeout", now);
}

/** Giải quyết các ván đã quá hạn (gọi đầu mỗi request: không cần tiến trình chạy nền) */
function sweep(now: number) {
  for (const id of duePlayRooms(now))
    playTx(() => {
      const r = playRoomById(id);
      // Hết quỹ tạm dừng thì chạy tiếp ngay, không chờ thêm GRACE_MS
      if (r && (r.status === "waiting" || r.status === "playing") && r.deadline < now - ((r.data as PauseData).pause ? 0 : GRACE_MS)) expire(r, now);
    });
}

// ---- Dữ liệu trả về máy khách ----

function viewOf(r: PlayRoomRow, userId: number, now: number): PlayView {
  const seats = playSeats(r.id);
  const me = seats.find((s) => s.userId === userId);
  const ended = r.status === "ended" || r.status === "canceled";
  const view: PlayView = {
    code: r.code,
    game: r.game,
    mode: r.mode,
    level: r.level as SudokuLevel | "",
    stake: r.stake,
    pot:
      r.mode === "solo"
        ? Math.floor((r.stake * (r.game === "sudoku" ? SUDOKU_SOLO_PAYOUT[r.level as SudokuLevel] : CARO_BOT_PAYOUT)) / 100)
        : seats.reduce((n, s) => n + s.stake, 0),
    capacity: r.capacity,
    status: r.status,
    hostId: r.hostId,
    meId: userId,
    players: seats.map((s) => ({
      id: s.userId,
      name: s.name,
      seat: s.seat,
      me: s.userId === userId,
      out: s.out,
      ready: r.status === "waiting" ? isReady(r, s.userId) : true,
      progress: r.game === "sudoku" ? filled(s) : 0,
      errors: r.game === "sudoku" ? ((s.data as SudokuSeat).errors ?? 0) : 0,
    })),
    msLeft: ended ? 0 : Math.max(0, r.deadline - now),
    version: r.version,
    pause: null,
    pauseLeft: pauseLeftOf(r, userId),
  };
  const p = (r.data as PauseData).pause;
  if (p && r.status === "playing") {
    view.pause = { byId: p.by, byName: seats.find((s) => s.userId === p.by)?.name ?? "", msLeft: Math.max(0, r.deadline - now) };
    view.msLeft = p.left; // đồng hồ ván đứng yên trong lúc dừng
  }
  if (r.game === "sudoku" && r.status !== "waiting" && r.status !== "canceled") {
    const d = r.data as SudokuData;
    const grid = me ? gridOf(me) : [];
    view.sudoku = {
      givens: d.givens,
      mine: d.givens.map((g, i) => g || grid[i] || 0),
      errors: me ? ((me.data as SudokuSeat).errors ?? 0) : 0,
      solution: ended ? d.solution : undefined,
    };
  }
  if (r.game === "caro" && r.status !== "waiting" && r.status !== "canceled") {
    const d = r.data as CaroData;
    view.caro = { board: d.board, turn: d.turn, mySymbol: caroSymbol(r, me), last: d.last, line: d.line };
  }
  if (ended) {
    view.result = {
      winnerId: r.winnerId,
      reason: r.reason as PlayResult["reason"],
      payout: me?.payout ?? (r.status === "canceled" ? r.stake : 0),
      stake: r.stake,
      capped: !!r.data.capped,
    };
  }
  return view;
}

export function playState(userId: number, now = Date.now()): PlayState {
  sweep(now);
  return { total: getPoints(userId).total, limits: limitsOf(userId, now), active: activePlayRoom(userId) };
}

export function playView(userId: number, code: string, now = Date.now()): (PlayView & { total: number }) | Failure {
  sweep(now);
  const r = playRoomByCode(code.toUpperCase());
  if (!r) return fail("Không tìm thấy phòng", 404);
  return { ...viewOf(r, userId, now), total: getPoints(userId).total };
}

// ---- Hành động ----

function newCode(): string {
  for (;;) {
    const code = Array.from({ length: 6 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join("");
    if (!playRoomByCode(code)) return code;
  }
}

function startData(game: PlayGame, level: SudokuLevel): Record<string, unknown> {
  if (game === "sudoku") return generateSudoku(level);
  return { board: Array<CaroCell>(CARO_SIZE * CARO_SIZE).fill(null), turn: "X", last: null, line: [] } satisfies CaroData;
}

const seatData = (game: PlayGame): Record<string, unknown> => (game === "sudoku" ? ({ grid: Array(81).fill(0), errors: 0 } satisfies SudokuSeat) : {});

function playingDeadline(r: Pick<PlayRoomRow, "game" | "mode" | "level">, now: number) {
  if (r.game === "sudoku") return now + SUDOKU_MINUTES[r.level as SudokuLevel] * 60_000;
  return now + (r.mode === "solo" ? CARO_BOT_TURN_SECONDS : CARO_TURN_SECONDS) * 1000;
}

function begin(r: PlayRoomRow, now: number) {
  updatePlayRoom(r.id, { status: "playing", data: startData(r.game, r.level as SudokuLevel), deadline: playingDeadline(r, now), startedAt: now });
}

type CreateInput = { game: string; mode: string; stake: number; level?: string; capacity?: number };

export function createPlay(userId: number, input: CreateInput, now = Date.now()): (PlayView & { total: number }) | Failure {
  sweep(now);
  const game = input.game as PlayGame;
  const mode = input.mode as PlayMode;
  if (game !== "sudoku" && game !== "caro") return fail("Game không hợp lệ");
  if (mode !== "room" && mode !== "solo") return fail("Chế độ chơi không hợp lệ");
  if (!PLAY_STAKES.includes(input.stake)) return fail("Mức cược không hợp lệ");
  const level = (game === "sudoku" ? input.level : "") as SudokuLevel;
  if (game === "sudoku" && !SUDOKU_LEVELS.includes(level)) return fail("Độ khó không hợp lệ");
  const capacity = game === "caro" || mode === "solo" ? (mode === "solo" ? 1 : 2) : Number(input.capacity);
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > ROOM_MAX_PLAYERS) return fail("Số người chơi không hợp lệ");
  return playTx(() => {
    const active = activePlayRoom(userId);
    if (active) return fail("Bạn đang có ván chưa xong", 409);
    if (mode === "solo") {
      const limits = limitsOf(userId, now);
      if (!limits.roundsLeft) return fail(`Bạn đã chơi đủ ${SOLO_ROUND_CAP} ván một mình trong 24 giờ qua, quay lại sau nhé`, 429);
      if (!limits.winLeft) return fail(`Bạn đã lời đủ ${SOLO_WIN_CAP} kim cương trong 24 giờ qua, quay lại sau nhé`, 429);
    }
    if (getPoints(userId).total < input.stake) return fail("Không đủ kim cương");
    const solo = mode === "solo";
    const base = { game, mode, level: level ?? "" };
    const id = createPlayRoom(
      {
        ...base,
        code: newCode(),
        stake: input.stake,
        capacity,
        hostId: userId,
        status: solo ? "playing" : "waiting",
        data: solo ? startData(game, level) : {},
        deadline: solo ? playingDeadline(base, now) : now + ROOM_WAIT_MINUTES * 60_000,
      },
      now,
    );
    addPlaySeat(id, userId, 0, input.stake, seatData(game), now);
    return { ...viewOf(playRoomById(id)!, userId, now), total: getPoints(userId).total };
  });
}

type ActionInput = { action: string; code: string; cell?: number; paused?: boolean; ready?: boolean; grid?: unknown; errors?: unknown };

/** Bàn Sudoku máy khách gửi lên → các ô người chơi điền (0 = trống); sai định dạng / sửa ô đề → null */
function userGrid(raw: unknown, givens: number[]): number[] | null {
  if (!Array.isArray(raw) || raw.length !== 81) return null;
  const grid: number[] = [];
  for (let i = 0; i < 81; i++) {
    const v = raw[i];
    if (!Number.isInteger(v) || v < 0 || v > 9) return null;
    if (givens[i]) {
      if (v !== givens[i]) return null;
      grid.push(0);
    } else grid.push(v);
  }
  return grid;
}

export function playAction(userId: number, input: ActionInput, now = Date.now()): (PlayView & { total: number; ok?: boolean }) | Failure {
  sweep(now);
  return playTx(() => {
    const r = playRoomByCode(input.code.toUpperCase());
    if (!r) return fail("Không tìm thấy phòng", 404);
    const seats = playSeats(r.id);
    const me = seats.find((s) => s.userId === userId);
    const paused = !!(r.data as PauseData).pause;
    let ok: boolean | undefined;
    if (paused && ["progress", "submit", "move"].includes(input.action)) return fail("Ván đang tạm dừng", 409);

    switch (input.action) {
      case "join": {
        if (me) break;
        if (r.mode !== "room") return fail("Ván này không vào được");
        if (r.status !== "waiting") return fail("Phòng đã bắt đầu hoặc đã kết thúc", 409);
        if (seats.length >= r.capacity) return fail("Phòng đã đủ người", 409);
        if (activePlayRoom(userId)) return fail("Bạn đang có ván chưa xong", 409);
        if (getPoints(userId).total < r.stake) return fail("Không đủ kim cương");
        addPlaySeat(r.id, userId, Math.max(...seats.map((s) => s.seat)) + 1, r.stake, seatData(r.game), now);
        updatePlayRoom(r.id, {});
        break;
      }
      case "ready": {
        if (!me || r.status !== "waiting") return fail("Chỉ chọn sẵn sàng được khi phòng chưa bắt đầu", 409);
        if (r.hostId === userId) break; // chủ phòng luôn sẵn sàng
        const ready = new Set(readyOf(r));
        if (input.ready) ready.add(userId);
        else ready.delete(userId);
        updatePlayRoom(r.id, { data: { ...r.data, ready: [...ready] } });
        break;
      }
      case "leave": {
        if (!me || r.status !== "waiting") return fail("Chỉ rời được khi phòng chưa bắt đầu", 409);
        if (r.hostId === userId) cancel(r, now);
        else {
          removePlaySeat(r.id, userId);
          updatePlayRoom(r.id, { data: { ...r.data, ready: readyOf(r).filter((id) => id !== userId) } });
        }
        break;
      }
      case "start": {
        if (r.hostId !== userId || r.status !== "waiting") return fail("Chỉ chủ phòng mới bắt đầu được", 403);
        if (seats.length < 2) return fail("Cần ít nhất 2 người");
        if (!allReady(r, seats)) return fail("Còn người chưa sẵn sàng", 409);
        begin(r, now);
        break;
      }
      case "resign": {
        if (!me || r.status !== "playing" || me.out) return fail("Không có ván nào đang chơi", 409);
        if (paused && (r.data as PauseData).pause!.by === userId) resume(r, now);
        if (r.mode === "solo") finish(r, BOT, "resign", now);
        else if (r.game === "caro") finish(r, seats.find((s) => s.userId !== userId)?.userId ?? null, "resign", now);
        else {
          updatePlaySeat(r.id, userId, { out: true });
          updatePlayRoom(r.id, {});
          checkLastStanding(r, now);
        }
        break;
      }
      case "pause": {
        if (r.status !== "playing" || !me || me.out) return fail("Không có ván nào đang chơi", 409);
        const d = r.data as PauseData;
        if (input.paused) {
          if (d.pause) return fail("Ván đang tạm dừng rồi", 409);
          const budget = pauseLeftOf(r, userId);
          if (budget <= 0) return fail("Bạn đã dùng hết thời gian tạm dừng của ván này", 409);
          updatePlayRoom(r.id, { data: { ...r.data, pause: { by: userId, at: now, left: Math.max(0, r.deadline - now) } }, deadline: now + budget });
        } else {
          if (!d.pause) break;
          if (d.pause.by !== userId) return fail("Chỉ người bấm dừng mới chạy tiếp được", 403);
          resume(r, now);
        }
        break;
      }
      case "progress":
      case "submit": {
        if (r.game !== "sudoku" || r.status !== "playing" || !me || me.out) return fail("Không có ván nào đang chơi", 409);
        const d = r.data as SudokuData;
        const grid = userGrid(input.grid, d.givens);
        if (!grid) return fail("Bàn Sudoku không hợp lệ");
        const errors = Number.isInteger(input.errors) && (input.errors as number) >= 0 ? Math.min(input.errors as number, 9999) : 0;
        updatePlaySeat(r.id, userId, { data: { grid, errors } satisfies SudokuSeat });
        updatePlayRoom(r.id, {});
        if (input.action === "submit") {
          ok = d.givens.every((g, i) => g || grid[i] === d.solution[i]);
          if (ok) finish(r, userId, "solved", now);
        }
        break;
      }
      case "move": {
        if (r.game !== "caro" || r.status !== "playing" || !me) return fail("Không có ván nào đang chơi", 409);
        const d = r.data as CaroData;
        const mine = caroSymbol(r, me)!;
        if (d.turn !== mine) return fail("Chưa tới lượt bạn", 409);
        const i = Number(input.cell);
        if (!Number.isInteger(i) || i < 0 || i >= d.board.length || d.board[i]) return fail("Ô này không đánh được", 409);
        const place = (k: number, p: "X" | "O") => {
          d.board[k] = p;
          d.last = k;
          d.line = caroWinLine(d.board, k);
        };
        place(i, mine);
        if (d.line.length) return done(finish(r, userId, "five", now, d));
        if (caroFull(d.board)) return done(finish(r, null, "draw", now, d));
        if (r.mode === "solo") {
          place(caroBotMove(d.board, "O"), "O");
          if (d.line.length) return done(finish(r, BOT, "five", now, d));
          if (caroFull(d.board)) return done(finish(r, null, "draw", now, d));
        } else d.turn = mine === "X" ? "O" : "X";
        updatePlayRoom(r.id, { data: d, deadline: playingDeadline(r, now) });
        break;
      }
      default:
        return fail("action không hợp lệ");
    }
    return done();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- nhận kết quả finish() (void) để viết gọn `return done(finish(...))`
    function done(_?: void) {
      return { ...viewOf(playRoomById(r!.id)!, userId, now), total: getPoints(userId).total, ok };
    }
  });
}
