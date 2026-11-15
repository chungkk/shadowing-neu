import type { SudokuLevel } from "./play";

/** Sinh đề Sudoku có đúng 1 lời giải (theo dự án Solo Games). Bàn 9×9 lưu phẳng 81 ô theo hàng, 0 = ô trống */

const GIVENS: Record<SudokuLevel, [number, number]> = { easy: [36, 40], medium: [30, 35], hard: [25, 29] };

function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

function canPlace(g: number[], i: number, n: number): boolean {
  const row = Math.floor(i / 9);
  const col = i % 9;
  for (let k = 0; k < 9; k++) if (g[row * 9 + k] === n || g[k * 9 + col] === n) return false;
  const br = row - (row % 3);
  const bc = col - (col % 3);
  for (let r = br; r < br + 3; r++) for (let c = bc; c < bc + 3; c++) if (g[r * 9 + c] === n) return false;
  return true;
}

function fill(g: number[]): boolean {
  const i = g.indexOf(0);
  if (i < 0) return true;
  for (const n of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
    if (!canPlace(g, i, n)) continue;
    g[i] = n;
    if (fill(g)) return true;
  }
  g[i] = 0;
  return false;
}

/** Số lời giải, dừng khi đạt limit */
function countSolutions(g: number[], limit = 2): number {
  const i = g.indexOf(0);
  if (i < 0) return 1;
  let n = 0;
  for (let v = 1; v <= 9 && n < limit; v++) {
    if (!canPlace(g, i, v)) continue;
    g[i] = v;
    n += countSolutions(g, limit - n);
  }
  g[i] = 0;
  return n;
}

export function generateSudoku(level: SudokuLevel): { givens: number[]; solution: number[] } {
  const solution = Array<number>(81).fill(0);
  fill(solution);
  const givens = [...solution];
  const [min, max] = GIVENS[level];
  const target = min + Math.floor(Math.random() * (max - min + 1));
  let left = 81;
  for (const i of shuffle([...Array(81).keys()])) {
    if (left <= target) break;
    const keep = givens[i];
    givens[i] = 0;
    if (countSolutions([...givens]) === 1) left--;
    else givens[i] = keep;
  }
  return { givens, solution };
}
