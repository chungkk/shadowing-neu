/**
 * Luật chơi game chữ rơi (Mưa từ vựng · Đào vàng) — TypeScript thuần, dùng chung cho web (components/FallingWords) và app.
 * Phần giao diện (màu, nền, đọc to, lưu kỷ lục) để bên mỗi nền tảng; ở đây chỉ có trạng thái ván và cách nó đổi theo thời gian / phím gõ.
 */

import type { StudyWord } from "./deck-study";
import { shuffle } from "./review";

export type Variant = "rain" | "gold";
export type GameWord = StudyWord & { key: string /* khoá mục trong bộ — phân biệt từ đồng âm */; topic: string };
export type Topic = { id: string; title: string; icon: string };

export const REEL = 1.5; // giây "gold": móc thả xuống (REEL_OUT phần đầu) rồi kéo cục vàng lên tới ròng rọc
export const REEL_OUT = 0.3;

export type Rules = {
  store: string; // tiền tố khoá lưu trên máy (kỷ lục, tiến độ mốc…)
  listen: boolean; // true: giọt chỉ phát âm (gold), false: giọt hiện nghĩa (rain)
  lives: number;
  slower: number; // hệ số thời gian rơi
  spawnBase: number; // giây giữa 2 giọt ở cấp 1
  spawnMin: number;
  drops: (level: number) => number; // số giọt tối đa trên sân
  fade: number; // giây hiệu ứng nổ / chạm đáy trước khi xoá giọt
  rest: number; // giây nghỉ sau khi bắn trúng / để trượt, trước khi thả giọt mới
};

export const RULES: Record<Variant, Rules> = {
  rain: {
    store: "wordrain",
    listen: false,
    lives: 4,
    slower: 1,
    spawnBase: 3.6,
    spawnMin: 1.6,
    drops: (level) => Math.min(2 + level, 6),
    fade: 0.85, // đủ cho hiệu ứng nổ / mờ dần (~0.7 giây)
    rest: 1.2,
  },
  gold: {
    store: "spellingbee", // giữ khoá cũ (game từng tên "Ong đánh vần") → không mất kỷ lục, tiến độ mốc
    listen: true,
    lives: 3,
    slower: 1.4, // phải nghe rồi mới gõ → rơi chậm hơn, thưa hơn
    spawnBase: 6,
    spawnMin: 3.5,
    drops: (level) => (level < 3 ? 1 : level < 6 ? 2 : 3), // cấp 1–2: từng từ một
    fade: REEL, // móc thả xuống + kéo lên
    rest: REEL + 0.3, // kéo xong cục vàng rồi mới lộ cục mới
  },
};

export type Drop = { id: number; w: GameWord; x: number /* 0 = sát trái, 1 = sát phải */; y: number; speed: number; state: "fall" | "hit" | "miss" | "gone"; at: number; points: number };
export type Game = {
  cfg: Rules;
  words: GameWord[];
  topics: Topic[];
  milestone: number; // chỉ số chủ đề đang chơi
  mHits: number; // số từ đã bắn trong mốc này
  goal: number; // số từ phải bắn để qua mốc này
  queue: GameWord[];
  drops: Drop[];
  fresh: Drop | null; // giọt vừa thả (để đọc to ở biến thể "gold")
  time: number;
  nextSpawn: number;
  restUntil: number; // đang nghỉ sau khi bắn trúng / để trượt / vượt mốc: chưa thả giọt mới, kể cả khi sân trống
  lives: number;
  score: number;
  combo: number;
  hits: number;
  missed: GameWord[];
  best: number; // kỷ lục trước ván này
  targetId: number | null; // giọt đang gõ
  typed: string; // phần đã gõ đúng của giọt đó (theo chữ của từ: gõ "a" cho "ä" thì lưu "ä")
  wrong: number; // số lần gõ sai liên tiếp ở chữ hiện tại
  gapX: number; // 2 giọt cách nhau dưới gapX (theo x) là cùng cột — 0: chưa biết cỡ sân
  gapY: number; // giọt phải rơi quá gapY (theo y) thì giọt mới cùng cột mới không đè lên
};
export type View = Omit<Game, "cfg" | "words" | "queue" | "fresh" | "restUntil" | "gapX" | "gapY">;
export type Phase = "menu" | "loading" | "play" | "pause" | "over" | "win";

export const HITS_PER_LEVEL = 10;
export const MILESTONE_GOAL = 10; // số từ phải bắn để qua 1 mốc (chủ đề ít từ hơn → bằng số từ của chủ đề)

export const levelOf = (hits: number) => Math.min(1 + Math.floor(hits / HITS_PER_LEVEL), 12);
/**
 * Thời gian rơi tới đáy (giây): cấp 1 ≈ 24 giây, mỗi cấp nhanh thêm 1 giây, nhanh nhất 13 giây (× cfg.slower).
 * Từ dài cần gõ lâu hơn → rơi chậm hơn (từ 4 chữ ×0.9, 12 chữ ×1.2, tối đa ×1.4)
 */
const fallTime = (cfg: Rules, level: number, word: string) => cfg.slower * Math.max(13, 25 - level) * Math.min(Math.max(0.75 + 0.04 * word.length, 0.85), 1.4);
const spawnEvery = (cfg: Rules, level: number) => Math.max(cfg.spawnMin, cfg.spawnBase - 0.2 * (level - 1));

const topicWords = (g: Pick<Game, "words" | "topics">, m: number) => g.words.filter((w) => w.topic === g.topics[m].id);
const goalOf = (g: Pick<Game, "words" | "topics">, m: number) => Math.min(MILESTONE_GOAL, topicWords(g, m).length);

/** Bàn phím không có umlaut: gõ a/o/u/s thay ä/ö/ü/ß (key: chữ thường) */
const BASE: Record<string, string> = { ä: "a", ö: "o", ü: "u", ß: "s" };
export const sameLetter = (key: string, want: string) => key === want.toLowerCase() || BASE[want.toLowerCase()] === key;

let nextId = 1;

/** Bỏ chọn giọt đang gõ */
export const untarget = (g: Game) => Object.assign(g, { targetId: null, typed: "", wrong: 0 });

/**
 * 1 phím chữ (thường): ưu tiên giọt đang gõ, không khớp thì giọt thấp nhất có cùng phần đã gõ + chữ này.
 * → giọt vừa gõ xong (bắn) · "ok" (đúng, chưa xong) · "wrong" (không ghi gì)
 */
export function press(g: Game, key: string): Drop | "ok" | "wrong" {
  const n = g.typed.length;
  const fits = (d: Drop) => d.state === "fall" && n < d.w.word.length && d.w.word.slice(0, n).toLowerCase() === g.typed.toLowerCase() && sameLetter(key, d.w.word[n]);
  const d = g.drops.find((d) => d.id === g.targetId && fits(d)) ?? g.drops.filter(fits).sort((a, b) => b.y - a.y)[0];
  if (!d) {
    // Sân trống (đang nghỉ sau khi bắn trúng): phím thừa không tính là gõ sai
    if (g.drops.some((d) => d.state === "fall")) {
      g.wrong++;
      g.combo = 0;
    }
    return "wrong";
  }
  let typed = d.w.word.slice(0, n + 1);
  while (typed.length < d.w.word.length && !/\p{L}/u.test(d.w.word[typed.length])) typed += d.w.word[typed.length]; // gạch nối tự điền
  Object.assign(g, { targetId: d.id, typed, wrong: 0 });
  return typed.length >= d.w.word.length ? d : "ok";
}

/** Xoá chữ cuối của giọt đang gõ (kèm gạch nối tự điền) — hết chữ thì bỏ chọn */
export function backspace(g: Game) {
  g.typed = g.typed.slice(0, -1).replace(/[^\p{L}]+$/u, "");
  g.wrong = 0;
  if (!g.typed) untarget(g);
}

export function newGame(cfg: Rules, words: GameWord[], topics: Topic[], milestone: number, best: number): Game {
  const g: Game = {
    cfg,
    words,
    topics,
    milestone,
    mHits: 0,
    goal: 0,
    queue: [],
    drops: [],
    fresh: null,
    time: 0,
    nextSpawn: 0,
    restUntil: 0,
    lives: cfg.lives,
    score: 0,
    combo: 0,
    hits: 0,
    missed: [],
    best,
    targetId: null,
    typed: "",
    wrong: 0,
    gapX: 0,
    gapY: 0,
  };
  g.queue = shuffle(topicWords(g, milestone));
  g.goal = goalOf(g, milestone);
  return g;
}

/** Báo cỡ vùng rơi và cỡ giọt (px) để giọt mới không đè lên giọt cùng cột */
export function fitField(g: Game, w: number, h: number, dropW: number, dropH: number) {
  if (!w || !h) return;
  g.gapX = dropW / Math.max(w - dropW, 1);
  g.gapY = Math.min(dropH / Math.max(h - dropH, 1), 0.5); // sân quá thấp vẫn có chỗ cho 2 giọt
}

export const snapshot = (g: Game): View => ({
  topics: g.topics,
  milestone: g.milestone,
  mHits: g.mHits,
  goal: g.goal,
  drops: g.drops.map((d) => ({ ...d })),
  time: g.time,
  nextSpawn: g.nextSpawn,
  lives: g.lives,
  score: g.score,
  combo: g.combo,
  hits: g.hits,
  missed: [...g.missed],
  best: g.best,
  targetId: g.targetId,
  typed: g.typed,
  wrong: g.wrong,
});

/** Từ kế tiếp của mốc — tránh từ đang rơi trên sân */
function nextWord(g: Game): GameWord {
  const onField = new Set(g.drops.filter((d) => d.state === "fall").map((d) => d.w.word.toLowerCase()));
  for (let i = 0; i < 6; i++) {
    if (!g.queue.length) g.queue = shuffle(topicWords(g, g.milestone));
    const w = g.queue.pop()!;
    if (!onField.has(w.word.toLowerCase())) return w;
  }
  return g.queue.pop() ?? topicWords(g, g.milestone)[0];
}

function spawn(g: Game) {
  const level = levelOf(g.hits);
  const falling = g.drops.filter((d) => d.state === "fall");
  const sameColumn = (d: Drop, x: number) => Math.abs(d.x - x) < g.gapX;
  const blocked = (x: number) => falling.some((d) => sameColumn(d, x) && d.y < g.gapY);
  // Chọn cột không đè lên giọt mới rơi gần đó
  const recent = falling.filter((d) => d.y < 0.3);
  let x = Math.random();
  for (let i = 0; i < 8 && (blocked(x) || recent.some((d) => Math.abs(d.x - x) < 0.35)); i++) x = Math.random();
  if (blocked(x)) return; // chưa có chỗ (sân hẹp): khung hình sau thử lại
  const w = nextWord(g);
  // Giọt cùng cột bên dưới rơi chậm hơn: hãm lại để tới lúc nó chạm đáy vẫn chưa đuổi kịp
  const speed = falling.filter((d) => sameColumn(d, x)).reduce((v, d) => Math.min(v, ((1 - g.gapY) * d.speed) / (1 - d.y)), (0.92 + Math.random() * 0.16) / fallTime(g.cfg, level, w.word));
  const d: Drop = { id: nextId++, w, x, y: 0, speed, state: "fall", at: 0, points: 0 };
  g.drops.push(d);
  g.fresh = d;
  g.nextSpawn = g.time + spawnEvery(g.cfg, level);
}

/** 1 khung hình: rơi, chạm đáy, xoá giọt đã nổ, thả giọt mới */
export function step(g: Game, dt: number) {
  g.time += dt;
  for (const d of g.drops) {
    if (d.state !== "fall") continue;
    d.y += d.speed * dt;
    if (d.y >= 1) {
      Object.assign(d, { y: 1, state: "miss", at: g.time });
      if (d.id === g.targetId) untarget(g);
      g.lives--;
      g.combo = 0;
      g.missed.push(d.w);
      g.restUntil = g.time + g.cfg.rest; // nghỉ để kịp xem đáp án của giọt vừa trượt
      g.nextSpawn = Math.max(g.nextSpawn, g.restUntil);
    }
  }
  g.drops = g.drops.filter((d) => d.state === "fall" || g.time - d.at < g.cfg.fade);
  const falling = g.drops.filter((d) => d.state === "fall").length;
  if (!falling) g.nextSpawn = Math.min(g.nextSpawn, Math.max(g.time + 1, g.restUntil)); // sân trống → khỏi chờ lâu, trừ lúc đang nghỉ
  if (g.time >= g.nextSpawn && falling < g.cfg.drops(levelOf(g.hits))) spawn(g);
}

/**
 * Bắn trúng giọt vừa gõ xong: cộng điểm / combo.
 * → milestone: đủ từ của mốc (gọi nextMilestone, hoặc thắng nếu là mốc cuối) · levelUp: cấp mới (null = chưa lên cấp)
 */
export function scoreHit(g: Game, d: Drop): { milestone: boolean; levelUp: number | null } {
  untarget(g);
  g.combo++;
  g.hits++;
  g.mHits++;
  d.points = 10 * levelOf(g.hits - 1) + 2 * Math.min(g.combo - 1, 10);
  g.score += d.points;
  Object.assign(d, { state: "hit", at: g.time });
  g.restUntil = g.time + g.cfg.rest;
  g.nextSpawn = Math.max(g.nextSpawn, g.restUntil);
  const level = levelOf(g.hits);
  return { milestone: g.mHits >= g.goal, levelUp: level > levelOf(g.hits - 1) ? level : null };
}

/** Vượt mốc (chưa phải mốc cuối): sang chủ đề kế (+1 mạng), giọt còn trên sân tan đi */
export function nextMilestone(g: Game) {
  const done = g.milestone + 1;
  for (const d of g.drops) if (d.state === "fall") Object.assign(d, { state: "gone", at: g.time });
  untarget(g);
  g.milestone = done;
  g.mHits = 0;
  g.goal = goalOf(g, done);
  g.queue = shuffle(topicWords(g, done));
  g.lives = Math.min(g.cfg.lives, g.lives + 1);
  g.restUntil = g.time + 1.8;
  g.nextSpawn = g.restUntil;
}

/**
 * Hàng đọc to của game: tiếng từ của giọt mới là để chơi nên không bị cắt, đọc lần lượt; tiếng thưởng khi bắn trúng thì nhường.
 * say(done): bắt đầu đọc, gọi done khi đọc xong / bị dừng. Giọng đọc treo không báo xong → sau maxMs đọc tiếp.
 * Gọi clear() TRƯỚC khi dừng tiếng, không thì câu đang chờ sẽ đọc tiếp ngay.
 */
export function speechLine(maxMs = 10000) {
  type Say = (done: () => void) => void;
  let turn = 0; // lượt đọc mới nhất (done của lượt cũ bỏ qua)
  let busy: "word" | "bonus" | null = null;
  let waiting: { say: Say; live: () => boolean }[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  const play = (say: Say, kind: "word" | "bonus") => {
    const my = ++turn;
    busy = kind;
    const done = () => {
      if (my !== turn) return;
      turn++;
      busy = null;
      clearTimeout(timer);
      waiting = waiting.filter((w) => w.live());
      const next = waiting.shift();
      if (next) play(next.say, "word");
    };
    clearTimeout(timer);
    timer = setTimeout(done, maxMs);
    say(done);
  };
  return {
    /** Từ của giọt mới: đang có tiếng thì chờ; tới lượt mà live() = false (giọt đã xong) thì bỏ */
    word: (say: Say, live: () => boolean) => (busy ? void waiting.push({ say, live }) : play(say, "word")),
    /** Đọc khi bắn trúng: bỏ qua nếu có từ đang đọc / đang chờ */
    bonus: (say: Say) => (busy === "word" || waiting.length ? undefined : play(say, "bonus")),
    /** Người chơi bấm nghe lại: đọc ngay, câu đang chờ đọc sau */
    now: (say: Say) => play(say, "word"),
    clear: () => {
      turn++;
      busy = null;
      waiting = [];
      clearTimeout(timer);
    },
  };
}

/** "gold": vị trí móc / cục vàng đang được kéo lên, t = 0…1 tính từ lúc gõ xong */
export function reelAt(t: number, from: { x: number; y: number }, pulley: { x: number; y: number }) {
  const ease = (u: number) => u * u * (3 - 2 * u);
  const lerp = (a: { x: number; y: number }, b: { x: number; y: number }, u: number) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
  // Thả móc xuống (cục vàng đứng yên) → kéo lên (cục vàng theo móc), gần tới ròng rọc thì nhỏ lại, mờ đi
  const pull = Math.max(0, (t - REEL_OUT) / (1 - REEL_OUT));
  const tip = t < REEL_OUT ? lerp(pulley, from, ease(t / REEL_OUT)) : lerp(from, pulley, ease(pull));
  return { tip, at: t < REEL_OUT ? from : tip, scale: 1 - 0.45 * pull, opacity: pull > 0.85 ? (1 - pull) / 0.15 : 1 };
}

