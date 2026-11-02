/**
 * Luật chơi game Nối từ — TypeScript thuần, phần giao diện ở components/WordMatch.
 * Sân là các cặp thẻ (từ tiếng Đức · nghĩa) xáo lẫn: chọn 1 từ và 1 nghĩa để nối. Đúng +điểm, +giờ; sai -giờ, mất combo.
 * Mỗi chủ đề là 1 mốc gồm vài sân; vượt mốc được đầy lại đồng hồ, hết giờ là thua.
 */

import type { GameWord, Topic } from "./falling-words";
import { shuffle } from "./review";

export const BOARD_PAIRS = 6; // số cặp tối đa trên 1 sân
export const MILESTONE_PAIRS = 12; // số cặp phải nối để qua 1 mốc (chủ đề ít từ hơn → bằng số từ của chủ đề)
export const TIME_BONUS = 2; // giây được cộng khi nối đúng
export const TIME_PENALTY = 3; // giây bị trừ khi nối sai
const WRONG_SHOW = 0.5; // giây hiện 2 thẻ nối sai trước khi trả về như cũ
const DEAL_DELAY = 0.7; // giây chờ hiệu ứng thẻ cuối rồi mới chia sân mới (đồng hồ không chạy)

/** Giờ cho mỗi mốc: 60 giây, mốc sau bớt 2 giây, ít nhất 40 giây */
const limitOf = (milestone: number) => Math.max(40, 60 - 2 * milestone);

export type Card = { id: string; kind: "word" | "meaning"; w: GameWord; done: boolean; points: number };
export type Game = {
  words: GameWord[];
  topics: Topic[];
  milestone: number; // chỉ số chủ đề đang chơi
  mPairs: number; // số cặp đã nối trong mốc này
  goal: number; // số cặp phải nối để qua mốc này
  queue: GameWord[];
  round: number; // số sân đã chia (để id thẻ không trùng giữa các sân)
  cards: Card[];
  selected: string | null; // thẻ đang chọn
  wrong: string[]; // 2 thẻ vừa nối sai
  wrongUntil: number;
  dealAt: number | null; // sân đã xong, đang chờ chia sân mới
  time: number;
  left: number; // số giây còn lại
  limit: number; // giờ tối đa của mốc này
  score: number;
  combo: number;
  pairs: number; // số cặp đã nối cả ván
  missed: GameWord[]; // từ bị nối nhầm
  best: number; // kỷ lục trước ván này
};
export type View = Omit<Game, "words" | "queue" | "round" | "wrongUntil" | "dealAt">;
export type Phase = "menu" | "loading" | "play" | "pause" | "over" | "win";

const topicWords = (g: Pick<Game, "words" | "topics">, m: number) => g.words.filter((w) => w.topic === g.topics[m].id);

/** Lấy từ cho sân: 2 từ cùng cách viết / cùng nghĩa không ở chung 1 sân (không thì không biết nối với thẻ nào) */
function deal(g: Game) {
  const size = Math.min(BOARD_PAIRS, g.goal - g.mPairs);
  const picks: GameWord[] = [];
  const clash = (w: GameWord) => picks.some((p) => p.word.toLowerCase() === w.word.toLowerCase() || p.meaning.toLowerCase() === w.meaning.toLowerCase());
  const take = () => {
    for (const w of g.queue) if (picks.length < size && !clash(w)) picks.push(w);
    g.queue = g.queue.filter((w) => !picks.includes(w));
  };
  take();
  // Hàng đợi không đủ → xáo lại các từ của chủ đề (trừ từ đang có trong hàng đợi / trên sân)
  if (picks.length < size) {
    const used = new Set([...g.queue, ...picks].map((w) => w.key));
    g.queue.push(...shuffle(topicWords(g, g.milestone).filter((w) => !used.has(w.key))));
    take();
  }
  g.round++;
  g.cards = shuffle(picks.flatMap((w) => (["word", "meaning"] as const).map((kind): Card => ({ id: `${g.round}-${kind}-${w.key}`, kind, w, done: false, points: 0 }))));
  g.selected = null;
  g.wrong = [];
  g.dealAt = null;
}

/** Bắt đầu mốc: đầy đồng hồ, hàng đợi là các từ của chủ đề */
function enterMilestone(g: Game, milestone: number) {
  const words = topicWords(g, milestone);
  g.milestone = milestone;
  g.mPairs = 0;
  g.goal = Math.min(MILESTONE_PAIRS, words.length);
  g.queue = shuffle(words);
  g.limit = limitOf(milestone);
  g.left = g.limit;
}

export function newGame(words: GameWord[], topics: Topic[], milestone: number, best: number): Game {
  const g: Game = {
    words,
    topics,
    milestone,
    mPairs: 0,
    goal: 0,
    queue: [],
    round: 0,
    cards: [],
    selected: null,
    wrong: [],
    wrongUntil: 0,
    dealAt: null,
    time: 0,
    left: 0,
    limit: 0,
    score: 0,
    combo: 0,
    pairs: 0,
    missed: [],
    best,
  };
  enterMilestone(g, milestone);
  deal(g);
  return g;
}

export const snapshot = (g: Game): View => ({
  topics: g.topics,
  milestone: g.milestone,
  mPairs: g.mPairs,
  goal: g.goal,
  cards: g.cards.map((c) => ({ ...c })),
  selected: g.selected,
  wrong: g.wrong,
  time: g.time,
  left: g.left,
  limit: g.limit,
  score: g.score,
  combo: g.combo,
  pairs: g.pairs,
  missed: [...g.missed],
  best: g.best,
});

/** 1 khung hình: đồng hồ chạy, trả 2 thẻ nối sai về như cũ, chia sân mới khi tới lúc */
export function step(g: Game, dt: number) {
  g.time += dt;
  if (g.wrong.length && g.time >= g.wrongUntil) g.wrong = [];
  if (g.dealAt !== null) {
    if (g.time >= g.dealAt) deal(g);
    return; // đang chờ chia sân: đồng hồ không chạy
  }
  g.left = Math.max(0, g.left - dt);
}

/**
 * Bấm 1 thẻ: chưa chọn / cùng loại → chọn thẻ đó · bấm lại → bỏ chọn · khác loại → nối.
 * → null khi chưa nối · { word: từ vừa nối đúng, milestone: đủ cặp của mốc } · "wrong"
 */
export function pick(g: Game, id: string): { word: GameWord; milestone: boolean } | "wrong" | null {
  const card = g.cards.find((c) => c.id === id);
  if (!card || card.done || g.dealAt !== null) return null;
  g.wrong = [];
  const first = g.cards.find((c) => c.id === g.selected);
  if (!first || first.kind === card.kind) {
    g.selected = first?.id === id ? null : id;
    return null;
  }
  g.selected = null;
  if (first.w.key !== card.w.key) {
    g.combo = 0;
    g.left = Math.max(0, g.left - TIME_PENALTY);
    g.missed.push(first.w, card.w);
    g.wrong = [first.id, id];
    g.wrongUntil = g.time + WRONG_SHOW;
    return "wrong";
  }
  first.done = card.done = true;
  card.points = 10 + 2 * Math.min(g.combo, 10);
  g.score += card.points;
  g.combo++;
  g.pairs++;
  g.mPairs++;
  g.left = Math.min(g.limit, g.left + TIME_BONUS);
  if (g.cards.every((c) => c.done)) g.dealAt = g.time + DEAL_DELAY;
  return { word: card.w, milestone: g.mPairs >= g.goal };
}

/** Vượt mốc (chưa phải mốc cuối): sang chủ đề kế, đầy lại đồng hồ — sân mới được chia sau hiệu ứng thẻ cuối */
export const nextMilestone = (g: Game) => enterMilestone(g, g.milestone + 1);
