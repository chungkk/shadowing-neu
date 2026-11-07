import { CARO_SIZE as N, type CaroCell } from "./play";

/**
 * Luật Caro (theo dự án Solo Games): bàn 15×15, 5 quân liền nhau trở lên là thắng, trừ khi bị chặn cả 2 đầu
 * (quân đối phương hoặc mép bàn). Bàn lưu phẳng N×N theo hàng.
 */

const DIRS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
] as const;

const at = (b: CaroCell[], r: number, c: number): CaroCell | "edge" => (r < 0 || r >= N || c < 0 || c >= N ? "edge" : b[r * N + c]);

/** Quân vừa đánh ở ô i có tạo thành đường thắng không → các ô của đường đó (rỗng = chưa thắng) */
export function caroWinLine(b: CaroCell[], i: number): number[] {
  const p = b[i];
  if (!p) return [];
  const r0 = Math.floor(i / N);
  const c0 = i % N;
  for (const [dr, dc] of DIRS) {
    const line = [i];
    let r = r0 + dr;
    let c = c0 + dc;
    for (; at(b, r, c) === p; r += dr, c += dc) line.push(r * N + c);
    const endA = at(b, r, c);
    r = r0 - dr;
    c = c0 - dc;
    for (; at(b, r, c) === p; r -= dr, c -= dc) line.unshift(r * N + c);
    const endB = at(b, r, c);
    if (line.length >= 5 && !(endA !== null && endB !== null)) return line;
  }
  return [];
}

export const caroFull = (b: CaroCell[]) => b.every((x) => x !== null);

// ---- Máy chơi: chấm điểm từng ô trống gần các quân đã đánh theo các "cửa sổ" 5 ô đi qua ô đó ----

const WINDOW_SCORE = [0, 2, 24, 300, 6000, 0]; // theo số quân của mình trong cửa sổ 5 ô không có quân đối phương

function lineScore(b: CaroCell[], i: number, me: "X" | "O"): number {
  const r0 = Math.floor(i / N);
  const c0 = i % N;
  let total = 0;
  for (const [dr, dc] of DIRS) {
    let best = 0;
    let sum = 0;
    for (let s = -4; s <= 0; s++) {
      let mine = 0;
      let blocked = false;
      for (let k = s; k < s + 5; k++) {
        const v = at(b, r0 + dr * k, c0 + dc * k);
        if (k === 0) continue;
        if (v === "edge" || (v !== null && v !== me)) {
          blocked = true;
          break;
        }
        if (v === me) mine++;
      }
      if (blocked) continue;
      const sc = WINDOW_SCORE[mine + 1] ?? 0;
      sum += sc;
      best = Math.max(best, mine);
    }
    // 2 hướng cùng mạnh (vd. hai đường 3) nguy hiểm hơn cộng thường
    total += sum + (best >= 3 ? 400 * best : 0);
  }
  return total;
}

/** Nước đi của máy (quân `me`) */
export function caroBotMove(b: CaroCell[], me: "X" | "O"): number {
  const foe = me === "X" ? "O" : "X";
  const empty: number[] = [];
  for (let i = 0; i < b.length; i++) {
    if (b[i]) continue;
    const r = Math.floor(i / N);
    const c = i % N;
    let near = false;
    for (let dr = -2; dr <= 2 && !near; dr++) for (let dc = -2; dc <= 2 && !near; dc++) if (at(b, r + dr, c + dc) === "X" || at(b, r + dr, c + dc) === "O") near = true;
    if (near) empty.push(i);
  }
  if (!empty.length) return Math.floor((N * N) / 2);
  const tryWin = (p: "X" | "O") =>
    empty.find((i) => {
      b[i] = p;
      const w = caroWinLine(b, i).length > 0;
      b[i] = null;
      return w;
    });
  const win = tryWin(me);
  if (win !== undefined) return win;
  const block = tryWin(foe);
  if (block !== undefined) return block;
  let scored = empty.map((i) => ({ i, s: lineScore(b, i, me) * 1.1 + lineScore(b, i, foe) }));
  scored.sort((a, z) => z.s - a.s);
  // Chọn ngẫu nhiên trong các nước gần tốt nhất → không lặp lại 1 ván y hệt
  scored = scored.filter((x) => x.s >= scored[0].s * 0.92).slice(0, 3);
  return scored[Math.floor(Math.random() * scored.length)].i;
}
