"use client";

import { useEffect, useEffectEvent, useRef, useState, type ComponentType, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import {
  BookmarkPlus,
  CloudRain,
  Ear,
  Flag,
  Heart,
  Keyboard,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Trophy,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { clientApi } from "@/lib/client-api";
import { fullWord } from "@/lib/deck-study";
import { shuffle } from "@/lib/review";
import { speakGerman, stopSpeaking } from "@/lib/speak";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { DeckMenu, GameHeader, ScreenKeyboard, sameLetter, useCoarsePointer, type DeckOption, type GameWord, type Tone, type Topic } from "./GameParts";

/**
 * Game chữ rơi, 2 biến thể:
 * - "rain" (Mưa từ vựng): giọt hiện nghĩa tiếng Việt, gõ từ tiếng Đức trước khi chạm nước.
 * - "bee" (Ong đánh vần): giọt chỉ phát âm (đọc khi xuất hiện, bấm vào giọt / Space để nghe lại), gõ lại đúng chính tả trước khi chạm cỏ.
 *   Bắt đầu chỉ 1 giọt mỗi lúc, lên cấp mới thêm giọt; gõ xong thì ong bắn ngòi làm vỡ ô.
 * Mỗi chủ đề của bộ từ là 1 mốc: bắn đủ số từ của mốc thì sang chủ đề kế (+1 mạng); tiến độ mốc lưu theo bộ.
 * Chạm đáy mất 1 mạng, hết mạng là thua. Từ trượt hiện lại cuối ván, lưu được vào sổ để ôn.
 *
 * Gõ kiểu "khoá mục tiêu": bắt từng phím (không có ô nhập → bộ gõ tiếng Việt không chen vào), phím đầu chọn giọt,
 * chỉ chữ đúng mới được ghi — gõ sai thì giọt rung, không phải xoá. Sai 2 lần cùng chỗ → lộ chữ kế tiếp.
 */

export type Variant = "rain" | "bee";

const CONFIG = {
  rain: {
    store: "wordrain", // tiền tố khoá localStorage
    title: "Mưa từ vựng",
    subtitle: "Đọc nghĩa đang rơi, nhớ lại từ tiếng Đức và gõ nó",
    icon: CloudRain,
    tone: "cyan",
    listen: false,
    lives: 4,
    slower: 1, // hệ số thời gian rơi
    spawnBase: 3.6, // giây giữa 2 giọt ở cấp 1
    spawnMin: 1.6,
    drops: (level: number) => Math.min(2 + level, 6), // số giọt tối đa trên sân
    dropW: "min(15rem, 70%)",
  },
  bee: {
    store: "spellingbee",
    title: "Ong đánh vần",
    subtitle: "Nghe từ đang rơi và gõ lại đúng chính tả",
    icon: Volume2,
    tone: "amber",
    listen: true,
    lives: 3,
    slower: 1.4, // phải nghe rồi mới gõ → rơi chậm hơn, thưa hơn
    spawnBase: 6,
    spawnMin: 3.5,
    drops: (level: number) => (level < 3 ? 1 : level < 6 ? 2 : 3), // cấp 1–2: từng từ một
    dropW: "min(11rem, 60%)",
  },
} satisfies Record<Variant, { store: string; title: string; subtitle: string; icon: ComponentType<{ className?: string }>; tone: Tone; listen: boolean; lives: number; slower: number; spawnBase: number; spawnMin: number; drops: (level: number) => number; dropW: string }>;
type Config = (typeof CONFIG)[Variant];

/** Màu của từng biến thể (giọt, ô chữ, HUD, lớp phủ) */
const THEME = {
  rain: {
    field: "bg-gradient-to-b from-[#0a1622] via-[#0c2033] to-[#0b2a40]",
    drop: "border-cyan-400/50 bg-[#0e2a3d]/90",
    dropTarget: "border-cyan-300 bg-[#0f3550]/95 shadow-[0_0_18px_rgba(34,211,238,0.45)]",
    gone: "rain-miss border-cyan-400/40 bg-[#0e2a3d]/90",
    cursor: "text-cyan-200",
    empty: "text-sky-300/50",
    accent: "text-cyan-300",
    bar: "bg-cyan-400",
    on: "border-cyan-300 bg-cyan-400/25 text-cyan-100",
    note: "bg-cyan-500 text-white",
    overlay: "bg-[#06121c]/85",
  },
  bee: {
    field: "bg-[radial-gradient(ellipse_at_15%_0%,#5c4415_0%,#2c1e09_45%,#150d04_100%)]",
    drop: "border-amber/50 bg-[#3a2a10]/90",
    dropTarget: "border-amber bg-[#4d3712]/95 shadow-[0_0_18px_rgba(250,204,21,0.45)]",
    gone: "rain-miss border-amber/40 bg-[#3a2a10]/90",
    cursor: "text-amber-200",
    empty: "text-amber-200/40",
    accent: "text-amber",
    bar: "bg-amber",
    on: "border-amber bg-amber/25 text-amber-100",
    note: "bg-amber text-black",
    overlay: "bg-[#120b04]/85",
  },
} satisfies Record<Variant, Record<string, string>>;
type Theme = (typeof THEME)[Variant];

type Drop = { id: number; w: GameWord; x: number /* 0 = sát trái, 1 = sát phải */; y: number; speed: number; state: "fall" | "hit" | "miss" | "gone"; at: number; points: number };
type Game = {
  cfg: Config;
  words: GameWord[];
  topics: Topic[];
  milestone: number; // chỉ số chủ đề đang chơi
  mHits: number; // số từ đã bắn trong mốc này
  goal: number; // số từ phải bắn để qua mốc này
  queue: GameWord[];
  drops: Drop[];
  fresh: Drop | null; // giọt vừa thả (để đọc to ở biến thể "bee")
  time: number;
  nextSpawn: number;
  lives: number;
  score: number;
  combo: number;
  hits: number;
  missed: GameWord[];
  best: number; // kỷ lục trước ván này
  targetId: number | null; // giọt đang gõ
  typed: string; // phần đã gõ đúng của giọt đó (theo chữ của từ: gõ "a" cho "ä" thì lưu "ä")
  wrong: number; // số lần gõ sai liên tiếp ở chữ hiện tại
};
type View = Omit<Game, "cfg" | "words" | "queue" | "fresh">;
type Phase = "menu" | "loading" | "play" | "pause" | "over" | "win";

const HITS_PER_LEVEL = 10;
const MILESTONE_GOAL = 10; // số từ phải bắn để qua 1 mốc (chủ đề ít từ hơn → bằng số từ của chủ đề)
const FADE = 0.85; // giây hiệu ứng nổ / chạm đáy trước khi xoá giọt (đủ cho .rain-hit, .rain-miss, .bee-hit)

const levelOf = (hits: number) => Math.min(1 + Math.floor(hits / HITS_PER_LEVEL), 12);
/**
 * Thời gian rơi tới đáy (giây): cấp 1 ≈ 24 giây, mỗi cấp nhanh thêm 1 giây, nhanh nhất 13 giây (× cfg.slower).
 * Từ dài cần gõ lâu hơn → rơi chậm hơn (từ 4 chữ ×0.9, 12 chữ ×1.2, tối đa ×1.4)
 */
const fallTime = (cfg: Config, level: number, word: string) => cfg.slower * Math.max(13, 25 - level) * Math.min(Math.max(0.75 + 0.04 * word.length, 0.85), 1.4);
const spawnEvery = (cfg: Config, level: number) => Math.max(cfg.spawnMin, cfg.spawnBase - 0.2 * (level - 1));

const topicWords = (g: Pick<Game, "words" | "topics">, m: number) => g.words.filter((w) => w.topic === g.topics[m].id);
const goalOf = (g: Pick<Game, "words" | "topics">, m: number) => Math.min(MILESTONE_GOAL, topicWords(g, m).length);

/** Màu theo giống — như trang bộ từ: der xanh dương · die đỏ · das xanh lá */
const GENDER_TEXT: Record<string, string> = { der: "text-phrase", die: "text-red-400", das: "text-accent" };

/** Số giả ngẫu nhiên cố định để server & trình duyệt vẽ nền giống nhau */
const rand = (i: number, n: number) => (((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1) + 1) % 1;
const STREAKS = Array.from({ length: 70 }, (_, i) => ({
  left: rand(i, 1) * 100,
  delay: -rand(i, 2) * 2,
  dur: 0.7 + rand(i, 3) * 0.8,
  h: 12 + rand(i, 4) * 20,
  op: 0.12 + rand(i, 5) * 0.3,
}));
const FIREFLIES = Array.from({ length: 45 }, (_, i) => ({
  left: rand(i, 6) * 100,
  top: rand(i, 7) * 85,
  size: 2 + rand(i, 8) * 2,
  dur: 2 + rand(i, 9) * 3,
  delay: -rand(i, 10) * 4,
}));
const FLOWER_COLORS = ["text-pink-300", "text-amber", "text-violet-300", "text-orange-300", "text-rose-300"];
const FLOWERS = Array.from({ length: 30 }, (_, i) => ({ left: 2 + i * 3.3 + rand(i, 11) * 1.5, bottom: 30 + rand(i, 12) * 10, color: FLOWER_COLORS[i % FLOWER_COLORS.length] }));

let nextId = 1;

/** Bỏ chọn giọt đang gõ */
const untarget = (g: Game) => Object.assign(g, { targetId: null, typed: "", wrong: 0 });

/**
 * 1 phím chữ (thường): ưu tiên giọt đang gõ, không khớp thì giọt thấp nhất có cùng phần đã gõ + chữ này.
 * → giọt vừa gõ xong (bắn) · "ok" (đúng, chưa xong) · "wrong" (không ghi gì)
 */
function press(g: Game, key: string): Drop | "ok" | "wrong" {
  const n = g.typed.length;
  const fits = (d: Drop) => d.state === "fall" && n < d.w.word.length && d.w.word.slice(0, n).toLowerCase() === g.typed.toLowerCase() && sameLetter(key, d.w.word[n]);
  const d = g.drops.find((d) => d.id === g.targetId && fits(d)) ?? g.drops.filter(fits).sort((a, b) => b.y - a.y)[0];
  if (!d) {
    g.wrong++;
    g.combo = 0;
    return "wrong";
  }
  let typed = d.w.word.slice(0, n + 1);
  while (typed.length < d.w.word.length && !/\p{L}/u.test(d.w.word[typed.length])) typed += d.w.word[typed.length]; // gạch nối tự điền
  Object.assign(g, { targetId: d.id, typed, wrong: 0 });
  return typed.length >= d.w.word.length ? d : "ok";
}

/** Xoá chữ cuối của giọt đang gõ (kèm gạch nối tự điền) — hết chữ thì bỏ chọn */
function backspace(g: Game) {
  g.typed = g.typed.slice(0, -1).replace(/[^\p{L}]+$/u, "");
  g.wrong = 0;
  if (!g.typed) untarget(g);
}

function newGame(cfg: Config, words: GameWord[], topics: Topic[], milestone: number, best: number): Game {
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
    lives: cfg.lives,
    score: 0,
    combo: 0,
    hits: 0,
    missed: [],
    best,
    targetId: null,
    typed: "",
    wrong: 0,
  };
  g.queue = shuffle(topicWords(g, milestone));
  g.goal = goalOf(g, milestone);
  return g;
}

const snapshot = (g: Game): View => ({
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
  // Chọn cột không đè lên giọt mới rơi gần đó
  const recent = g.drops.filter((d) => d.state === "fall" && d.y < 0.3);
  let x = Math.random();
  for (let i = 0; i < 8 && recent.some((d) => Math.abs(d.x - x) < 0.35); i++) x = Math.random();
  const w = nextWord(g);
  const d: Drop = { id: nextId++, w, x, y: 0, speed: (0.92 + Math.random() * 0.16) / fallTime(g.cfg, level, w.word), state: "fall", at: 0, points: 0 };
  g.drops.push(d);
  g.fresh = d;
  g.nextSpawn = g.time + spawnEvery(g.cfg, level);
}

/** 1 khung hình: rơi, chạm đáy, xoá giọt đã nổ, thả giọt mới */
function step(g: Game, dt: number) {
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
    }
  }
  g.drops = g.drops.filter((d) => d.state === "fall" || g.time - d.at < FADE);
  const falling = g.drops.filter((d) => d.state === "fall").length;
  if (!falling) g.nextSpawn = Math.min(g.nextSpawn, g.time + 1); // sân trống → khỏi chờ lâu
  if (g.time >= g.nextSpawn && falling < g.cfg.drops(levelOf(g.hits))) spawn(g);
}

/** Gợi ý: chữ đầu + ô trống; giọt đang gõ thì hiện phần đã gõ đúng, hint = lộ chữ kế tiếp */
function Slots({ word, typed, hint, theme }: { word: string; typed: string | null; hint: boolean; theme: Theme }) {
  const n = typed?.length ?? 0;
  return (
    <span className="flex justify-center font-mono text-base font-extrabold tracking-[0.18em]">
      {[...word].map((c, i) => {
        if (i < n) return <span key={i} className="text-white">{c}</span>;
        if (!/\p{L}/u.test(c)) return <span key={i}>{c}</span>;
        if (i === 0 || (hint && i === n)) return <span key={i} className="text-amber">{c}</span>;
        return (
          <span key={i} className={typed && i === n ? theme.cursor : theme.empty}>
            _
          </span>
        );
      })}
    </span>
  );
}

const RoundBtn = ({ title, onClick, children, on, theme }: { title: string; onClick: () => void; children: ReactNode; on?: boolean; theme: Theme }) => (
  <button
    title={title}
    onClick={onClick}
    className={`flex size-9 cursor-pointer items-center justify-center rounded-full border backdrop-blur transition ${
      on ? theme.on : "border-white/10 bg-black/40 text-white/85 hover:bg-black/60"
    }`}
  >
    {children}
  </button>
);

const Emoji = ({ code, className }: { code: string; className: string }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={`/emoji/${code}.webp`} alt="" className={`pointer-events-none ${className}`} />
);

/** Nền "rain": mây, mưa · đáy: mặt nước, thuyền (kèm nhãn), chim cánh cụt */
function RainScenery({ label }: { label: ReactNode }) {
  return (
    <>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-16 left-[5%] h-36 w-[45%] rounded-full bg-black/30 blur-2xl" />
        <div className="absolute -top-20 right-[0%] h-40 w-[50%] rounded-full bg-black/25 blur-2xl" />
        <div className="absolute -top-12 left-[35%] h-28 w-[30%] rounded-full bg-slate-700/20 blur-2xl" />
        {STREAKS.map((s, i) => (
          <span
            key={i}
            className="rain-streak absolute -top-10 w-px bg-sky-200"
            style={{ left: `${s.left}%`, height: s.h, opacity: s.op, animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s` }}
          />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 border-t-2 border-cyan-300/80 bg-gradient-to-b from-cyan-500/30 to-[#05233a] shadow-[0_-6px_24px_rgba(34,211,238,0.35)]" />
      <Emoji code="1f427" className="bob absolute bottom-9 left-4 size-12" />
      <div className="pointer-events-none absolute bottom-1.5 left-1/2 flex -translate-x-1/2 flex-col items-center">
        <Emoji code="26f5" className="bob size-12 [animation-delay:-1s]" />
        {label}
      </div>
    </>
  );
}

/** Nền "bee": đêm mật ong có đom đóm · đáy: thảm cỏ hoa, con ong (kèm nhãn), chú chim */
function BeeScenery({ label, fired }: { label: ReactNode; fired: number }) {
  return (
    <>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-16 h-72 w-[55%] rounded-full bg-amber/10 blur-3xl" />
        {FIREFLIES.map((f, i) => (
          <span
            key={i}
            className="twinkle absolute rounded-full bg-amber-200 shadow-[0_0_6px_rgba(253,230,138,0.9)]"
            style={{ left: `${f.left}%`, top: `${f.top}%`, width: f.size, height: f.size, animationDuration: `${f.dur}s`, animationDelay: `${f.delay}s` }}
          />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 border-t-2 border-lime-300/50 bg-gradient-to-b from-[#4d7c1f] to-[#1a330a] [border-radius:50%_50%_0_0/14px_14px_0_0]" />
      {FLOWERS.map((f, i) => (
        <span key={i} className={`pointer-events-none absolute text-xs leading-none ${f.color}`} style={{ left: `${f.left}%`, bottom: f.bottom }}>
          ✿
        </span>
      ))}
      <Emoji code="1f426" className="bob absolute bottom-7 left-4 size-12" />
      <div className="pointer-events-none absolute bottom-1.5 left-1/2 flex -translate-x-1/2 flex-col items-center">
        {/* fired đổi → dựng lại để giật lên mỗi lần bắn */}
        <span key={fired} className={fired ? "bee-fire" : ""}>
          <Emoji code="1f41d" className="bob size-11 [animation-delay:-1s]" />
        </span>
        {label}
      </div>
    </>
  );
}

export default function FallingWords({ variant, decks }: { variant: Variant; decks: DeckOption[] }) {
  const cfg = CONFIG[variant];
  const theme = THEME[variant];
  const [deck, setDeck] = useLocalStorage(`${cfg.store}-deck`, decks[0]?.slug ?? "");
  const [sound, setSound] = useLocalStorage(`${cfg.store}-sound`, true);
  const [osk, setOsk] = useLocalStorage<boolean | null>(`${cfg.store}-osk`, null); // null: tự chọn theo thiết bị
  const [best, setBest] = useLocalStorage(`${cfg.store}-best-${deck}`, 0);
  const [cleared, setCleared] = useLocalStorage(`${cfg.store}-milestone-${deck}`, 0);
  const [phase, setPhase] = useState<Phase>("menu");
  const [view, setView] = useState<View | null>(null);
  const [note, setNote] = useState<{ text: string; tone: "ok" | "warn" } | null>(null);
  const [bad, setBad] = useState<{ key: string; n: number } | null>(null); // phím vừa gõ sai (n: để rung lại mỗi lần sai)
  const [speakingId, setSpeakingId] = useState<number | null>(null); // giọt đang được đọc to
  const [shots, setShots] = useState<{ id: number; x: number; y: number }[]>([]); // ngòi ong đang bay tới giọt vừa gõ xong
  const [fired, setFired] = useState(0);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [full, setFull] = useState(false);
  const coarse = useCoarsePointer();
  const game = useRef<Game | null>(null);
  const cache = useRef(new Map<string, { words: GameWord[]; topics: Topic[] }>());
  const inputRef = useRef<HTMLInputElement>(null);
  const field = useRef<HTMLDivElement>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const badTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const current = decks.find((d) => d.slug === deck) ?? decks[0];
  const keyboard = osk ?? coarse; // bàn phím trên màn hình: mặc định bật trên màn cảm ứng
  const nativeKeyboard = coarse && !keyboard; // màn cảm ứng tắt bàn phím trên màn hình → cần ô nhập ẩn để bật bàn phím hệ thống
  const playing = phase === "play" || phase === "pause";

  useEffect(() => {
    const onFull = () => setFull(document.fullscreenElement === field.current);
    document.addEventListener("fullscreenchange", onFull);
    return () => {
      document.removeEventListener("fullscreenchange", onFull);
      clearTimeout(noteTimer.current);
      clearTimeout(badTimer.current);
      stopSpeaking();
    };
  }, []);

  /** Đọc to từ của 1 giọt (biến thể "bee": khi xuất hiện, khi bấm vào, Space) */
  const sayDrop = (d: Pick<Drop, "id" | "w">) => {
    setSpeakingId(d.id);
    void speakGerman(fullWord(d.w), { onEnd: () => setSpeakingId((id) => (id === d.id ? null : id)) });
  };
  /** Nghe lại giọt đang gõ, chưa gõ thì giọt thấp nhất */
  const listenAgain = () => {
    const g = game.current;
    const d = g?.drops.find((d) => d.id === g.targetId) ?? g?.drops.filter((d) => d.state === "fall").sort((a, b) => b.y - a.y)[0];
    if (d) sayDrop(d);
  };
  const onSpawn = useEffectEvent((d: Drop) => cfg.listen && sayDrop(d));

  // Phím thật: bắt ở cả trang (không có ô nhập → bộ gõ tiếng Việt không đổi "fa" thành "fấ")
  const onWindowKey = useEffectEvent((e: globalThis.KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.isComposing || (e.target as HTMLElement).tagName === "INPUT") return;
    if (e.key === "Escape") return setPhase("pause");
    if (handleKey(e.key)) e.preventDefault();
  });
  useEffect(() => {
    if (phase !== "play") return;
    const on = (e: globalThis.KeyboardEvent) => onWindowKey(e);
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [phase]);

  // Vòng lặp game
  useEffect(() => {
    if (phase !== "play") return;
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const g = game.current!;
      step(g, Math.min((now - last) / 1000, 0.1)); // tab bị treo lâu → không nhảy cóc
      last = now;
      if (g.fresh) {
        onSpawn(g.fresh);
        g.fresh = null;
      }
      setView(snapshot(g));
      if (g.lives <= 0) {
        if (g.score > g.best) setBest(g.score);
        setPhase("over");
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    // Chuyển tab / thu nhỏ cửa sổ → tạm dừng
    const onHide = () => document.hidden && setPhase("pause");
    document.addEventListener("visibilitychange", onHide);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [phase, setBest]);

  const flash = (text: string, tone: "ok" | "warn") => {
    clearTimeout(noteTimer.current);
    setNote({ text, tone });
    noteTimer.current = setTimeout(() => setNote(null), 2200);
  };

  /** Màn cảm ứng dùng bàn phím hệ thống: focus ô nhập ẩn để bàn phím hiện lên */
  const focusInput = () => requestAnimationFrame(() => inputRef.current?.focus());

  /** Vào ván: từ mốc đã lưu (from) — hết mốc rồi thì chơi lại từ đầu */
  async function start(from = cleared) {
    if (!current) return;
    setError("");
    let data = cache.current.get(current.slug);
    if (!data) {
      setPhase("loading");
      try {
        data = await clientApi<{ words: GameWord[]; topics: Topic[] }>(`/games/words?deck=${current.slug}`);
        cache.current.set(current.slug, data);
      } catch (e) {
        setError((e as Error).message);
        setPhase("menu");
        return;
      }
    }
    game.current = newGame(cfg, data.words, data.topics, from < data.topics.length ? from : 0, best);
    setView(snapshot(game.current));
    setBad(null);
    setNote(null);
    setSaved(null);
    setPhase("play");
    focusInput();
  }

  const resume = () => {
    setPhase("play");
    focusInput();
  };

  const quit = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    stopSpeaking();
    setPhase("menu");
  };

  /** Vượt mốc: sang chủ đề kế (+1 mạng), giọt còn trên sân tan đi; hết chủ đề → thắng */
  function clearMilestone(g: Game) {
    const done = g.milestone + 1;
    if (done > cleared) setCleared(done);
    if (done >= g.topics.length) {
      if (g.score > g.best) setBest(g.score);
      setView(snapshot(g));
      setPhase("win");
      return;
    }
    flash(`Vượt mốc ${done}: ${g.topics[g.milestone].title} ✓ — +1 mạng`, "ok");
    for (const d of g.drops) if (d.state === "fall") Object.assign(d, { state: "gone", at: g.time });
    untarget(g);
    g.milestone = done;
    g.mHits = 0;
    g.goal = goalOf(g, done);
    g.queue = shuffle(topicWords(g, done));
    g.lives = Math.min(cfg.lives, g.lives + 1);
    g.nextSpawn = g.time + 1.8;
  }

  /** Bắn trúng giọt vừa gõ xong */
  function hit(g: Game, d: Drop) {
    untarget(g);
    g.combo++;
    g.hits++;
    g.mHits++;
    d.points = 10 * levelOf(g.hits - 1) + 2 * Math.min(g.combo - 1, 10);
    g.score += d.points;
    Object.assign(d, { state: "hit", at: g.time });
    g.nextSpawn = Math.max(g.nextSpawn, g.time + 1.2); // nghỉ chút sau khi bắn trúng
    if (sound) speakGerman(fullWord(d.w));
    if (variant === "bee") {
      setShots((s) => [...s, { id: d.id, x: d.x, y: d.y }]);
      setFired((n) => n + 1);
      setTimeout(() => setShots((s) => s.filter((x) => x.id !== d.id)), 400);
    }
    const level = levelOf(g.hits);
    if (g.mHits >= g.goal) clearMilestone(g);
    else if (level > levelOf(g.hits - 1))
      flash(cfg.drops(level) > cfg.drops(level - 1) ? `Lên cấp ${level} — thêm 1 từ rơi cùng lúc!` : `Lên cấp ${level} — rơi nhanh hơn!`, "ok");
  }

  /** 1 phím (bàn phím thật / trên màn hình / hệ thống) → true nếu game dùng phím đó */
  function handleKey(key: string) {
    const g = game.current;
    if (!g || phase !== "play") return false;
    if (key === "Backspace") backspace(g);
    else if (key === "Enter") untarget(g); // bỏ giọt đang gõ để chọn giọt khác
    else if (key === " " && cfg.listen) listenAgain();
    else if (key.length === 1 && /\p{L}/u.test(key)) {
      const r = press(g, key.toLowerCase());
      clearTimeout(badTimer.current);
      if (r === "wrong") {
        setBad((b) => ({ key, n: (b?.n ?? 0) + 1 }));
        badTimer.current = setTimeout(() => setBad(null), 700);
      } else {
        setBad(null);
        if (r !== "ok") hit(g, r);
      }
    } else return false;
    setView(snapshot(g));
    return true;
  }

  /** Ô nhập ẩn (bàn phím hệ thống): lấy từng chữ rồi để trống lại */
  const onNativeInput = (v: string) => [...v].forEach(handleKey);
  const onNativeKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") setPhase("pause");
    else if (e.key === "Backspace" || e.key === "Enter") {
      e.preventDefault();
      handleKey(e.key);
    }
  };

  const toggleFull = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void field.current?.requestFullscreen().catch(() => {});
    focusInput();
  };

  async function saveMissed() {
    if (!view || !current) return;
    setSaving(true);
    try {
      const words = [...new Set(view.missed.map((w) => w.word))];
      const r = await clientApi<{ added: number }>(`/vocab/decks/${current.slug}`, { method: "POST", body: { words } });
      setSaved(r.added ? `Đã thêm ${r.added} từ vào sổ` : "Các từ này đã có trong sổ");
    } catch (e) {
      setSaved((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const header = (
    <GameHeader
      icon={cfg.icon}
      tone={cfg.tone}
      title={cfg.title}
      subtitle={cfg.subtitle}
      onBack={phase === "menu" || phase === "loading" ? undefined : quit}
      right={
        playing &&
        typeof document !== "undefined" &&
        document.fullscreenEnabled && (
          <button title={full ? "Thoát toàn màn hình" : "Toàn màn hình"} className="btn-icon" onClick={toggleFull}>
            {full ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
          </button>
        )
      }
    />
  );

  // ---- Màn chọn bộ từ ----
  if (phase === "menu" || phase === "loading") {
    const typing = "Gõ từng chữ — gõ sai không bị ghi nên khỏi phải xoá; gõ a/o/u/s thay ä/ö/ü/ß cũng được.";
    return (
      <div className="flex flex-col gap-5">
        {header}
        <DeckMenu
          tone={cfg.tone}
          icon={cfg.icon}
          intro={
            cfg.listen
              ? `Mỗi chủ đề là một mốc — đánh vần đúng ${MILESTONE_GOAL} từ để vượt mốc. Từ được đọc khi rơi xuống; bấm vào giọt hoặc Space để nghe lại. ${typing}`
              : `Mỗi chủ đề là một mốc — bắn đủ ${MILESTONE_GOAL} từ để vượt mốc. ${typing}`
          }
          decks={decks}
          current={current}
          onSelect={setDeck}
          progressKey={(slug) => `${cfg.store}-milestone-${slug}`}
          cleared={cleared}
          best={best}
          loading={phase === "loading"}
          error={error}
          onStart={start}
        />
      </div>
    );
  }

  // ---- Màn chơi ----
  const v = view!;
  const topic = v.topics[v.milestone];
  const target = v.drops.find((d) => d.id === v.targetId && d.state === "fall") ?? null;
  const missed = [...new Map(v.missed.map((w) => [w.word, w])).values()];
  const label = (
    <span className="-mt-1 max-w-48 truncate rounded-full border border-white/10 bg-black/60 px-2.5 py-0.5 text-[11px] font-bold text-white">
      {bad ? <span className="text-red-300">✕ {bad.key}</span> : current?.title}
    </span>
  );

  return (
    <div className="flex flex-col gap-3">
      {header}
      <div
        ref={field}
        onPointerDown={() => phase === "play" && nativeKeyboard && focusInput()}
        className={`relative overflow-hidden select-none ${theme.field} ${
          full ? "" : `rounded-2xl border border-white/5 ${keyboard ? "h-[calc(100dvh-24rem)] md:h-[calc(100dvh-20rem)]" : "h-[calc(100dvh-14rem)] md:h-[calc(100dvh-10rem)]"} min-h-[420px]`
        }`}
      >
        {variant === "bee" ? <BeeScenery label={label} fired={fired} /> : <RainScenery label={label} />}

        {/* Vùng rơi: dưới HUD, chừa cột nút bên phải; đáy = mặt nước / thảm cỏ */}
        <div className="absolute top-14 right-14 bottom-12 left-2">
          {v.drops.map((d) => {
            const isTarget = d.id === target?.id;
            const done = d.state === "hit" || d.state === "miss";
            return (
              <div
                key={d.id}
                className="absolute"
                style={{ width: cfg.dropW, left: `calc((100% - ${cfg.dropW}) * ${d.x})`, top: `${d.y * 100}%`, transform: `translateY(${-d.y * 100}%)` }}
              >
                <div
                  key={isTarget && bad ? bad.n : 0} // gõ sai → dựng lại để rung lần nữa
                  onClick={cfg.listen && d.state === "fall" ? () => sayDrop(d) : undefined} // "bee": bấm vào giọt → nghe lại
                  onPointerDown={cfg.listen ? (e) => e.stopPropagation() : undefined}
                  title={cfg.listen && d.state === "fall" ? "Bấm để nghe lại" : undefined}
                  className={`relative flex flex-col items-center gap-0.5 rounded-xl border ${isTarget && bad ? "shake" : ""} ${cfg.listen && d.state === "fall" ? "cursor-pointer hover:brightness-125" : ""} px-2.5 py-1.5 text-center shadow-lg shadow-black/40 backdrop-blur-sm ${
                    d.state === "hit"
                      ? `${variant === "bee" ? "bee-hit" : "rain-hit"} border-accent bg-accent/20`
                      : d.state === "miss"
                        ? "rain-miss border-red bg-red/20"
                        : d.state === "gone"
                          ? theme.gone
                          : isTarget
                            ? theme.dropTarget
                            : d.y > 0.8
                              ? `${theme.drop} border-red/70`
                              : theme.drop
                  }`}
                >
                  {!cfg.listen ? (
                    <span className="w-full truncate text-sm leading-snug font-bold text-white sm:text-base" title={d.w.meaning}>
                      {d.w.meaning}
                    </span>
                  ) : done ? (
                    <span className="w-full truncate text-xs text-amber-100/80">{d.w.meaning}</span>
                  ) : (
                    <span className={`flex h-6 w-full items-center justify-center rounded-md bg-black/25 ${speakingId === d.id ? "text-amber" : "text-amber-100/80"}`}>
                      <Volume2 className={`size-4 ${speakingId === d.id ? "animate-pulse" : ""}`} />
                    </span>
                  )}
                  {done ? (
                    <span className={`font-extrabold ${d.state === "hit" ? GENDER_TEXT[d.w.gender] ?? "text-accent" : "text-red-400"}`}>{fullWord(d.w)}</span>
                  ) : (
                    <Slots word={d.w.word} typed={isTarget ? v.typed : null} hint={isTarget && v.wrong >= 2} theme={theme} />
                  )}
                  {d.state === "hit" && <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-base font-extrabold text-gem">+{d.points}</span>}
                  {/* "bee": ô vỡ thành mảnh khi ngòi ong tới */}
                  {d.state === "hit" &&
                    variant === "bee" &&
                    Array.from({ length: 10 }, (_, i) => (
                      <span key={i} className="bee-shard" style={{ "--a": `${i * 36 + 10}deg`, "--d": `${60 + (i % 3) * 24}px` } as CSSProperties} />
                    ))}
                </div>
              </div>
            );
          })}
          {/* Ngòi ong bay từ con ong (giữa đáy sân) tới tâm giọt vừa gõ xong — chiều cao giọt ≈ 4rem */}
          {shots.map((s) => (
            <span
              key={s.id}
              className="bee-sting"
              style={
                {
                  "--fx": "calc(50% + 1.5rem)",
                  "--fy": "calc(100% + 1rem)",
                  "--tx": `calc((100% - ${cfg.dropW}) * ${s.x} + ${cfg.dropW} / 2)`,
                  "--ty": `calc(${s.y * 100}% + ${(0.5 - s.y) * 4}rem)`,
                } as CSSProperties
              }
            />
          ))}
        </div>

        {/* HUD: điểm · mốc · mạng */}
        {/* pointer-events-none: khung HUD rộng cả sân, không được chặn cú bấm vào giọt bên dưới */}
        <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2 *:pointer-events-auto">
          <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/45 px-3 py-1 text-sm font-extrabold text-white backdrop-blur">
            <Trophy className="size-4 text-amber" /> <span className="tabular-nums">{v.score}</span>
            {v.combo >= 3 && <span className="text-xs text-amber">×{v.combo}</span>}
          </span>
          <span className="flex min-w-0 flex-col items-center gap-1 rounded-2xl border border-white/10 bg-black/45 px-3 py-1 text-sm text-white backdrop-blur">
            <span className="flex min-w-0 items-center gap-1.5">
              <Flag className={`size-4 shrink-0 ${theme.accent}`} />
              <b className="shrink-0">
                Mốc {v.milestone + 1}/{v.topics.length}
              </b>
              <span className="truncate text-white/70 max-sm:hidden">
                · {topic.icon} {topic.title}
              </span>
            </span>
            <span className="h-1 w-full min-w-24 rounded-full bg-white/10">
              <span className={`block h-full rounded-full transition-[width] ${theme.bar}`} style={{ width: `${Math.min(v.mHits / v.goal, 1) * 100}%` }} />
            </span>
          </span>
          <div className="flex flex-col items-end gap-2">
            <span className="flex gap-0.5 rounded-full border border-white/10 bg-black/45 px-2.5 py-1.5 backdrop-blur" aria-label={`${v.lives} mạng`}>
              {Array.from({ length: cfg.lives }, (_, i) => (
                <Heart key={i} className={`size-4 ${i < v.lives ? "fill-red-500 text-red-500" : "text-white/20"}`} />
              ))}
            </span>
            {playing && (
              <div className="flex flex-col gap-2" onPointerDown={(e) => e.stopPropagation()}>
                {cfg.listen && (
                  <button
                    title="Nghe lại (Space)"
                    onClick={listenAgain}
                    className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-amber bg-gradient-to-b from-amber to-orange-500 text-amber-950 shadow-[0_0_14px_rgba(250,204,21,0.5)]"
                  >
                    <Ear className="size-4" />
                  </button>
                )}
                <RoundBtn theme={theme} title="Thoát ván" onClick={quit}>
                  <X className="size-4" />
                </RoundBtn>
                <RoundBtn theme={theme} title={phase === "play" ? "Tạm dừng (Esc)" : "Tiếp tục"} onClick={() => (phase === "play" ? setPhase("pause") : resume())}>
                  {phase === "play" ? <Pause className="size-4" /> : <Play className="size-4" />}
                </RoundBtn>
                <RoundBtn theme={theme} title="Bàn phím trên màn hình" on={keyboard} onClick={() => setOsk(!keyboard)}>
                  <Keyboard className="size-4" />
                </RoundBtn>
                <RoundBtn theme={theme} title={sound ? "Tắt đọc từ khi bắn trúng" : "Bật đọc từ khi bắn trúng"} onClick={() => setSound(!sound)}>
                  {sound ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
                </RoundBtn>
              </div>
            )}
          </div>
        </div>

        {note && (
          <p
            className={`sheet-fade pointer-events-none absolute inset-x-0 top-20 z-10 mx-auto w-fit max-w-[90%] rounded-xl px-3 py-1.5 text-center text-sm font-bold ${
              note.tone === "ok" ? theme.note : "bg-amber text-black"
            }`}
          >
            {note.text}
          </p>
        )}

        {/* Lớp phủ: tạm dừng / thua / thắng */}
        {phase !== "play" && (
          <div className={`absolute inset-0 z-20 flex flex-col items-center overflow-y-auto p-4 backdrop-blur-sm ${theme.overlay}`} onPointerDown={(e) => e.stopPropagation()}>
            <div className="m-auto flex w-full max-w-md flex-col items-center gap-4 text-center">
              {phase === "pause" ? (
                <>
                  <p className="text-xl font-extrabold">Tạm dừng</p>
                  <button className="btn btn-primary w-full py-3" onClick={resume}>
                    <Play className="size-5" /> Tiếp tục
                  </button>
                  <button className="btn w-full" onClick={quit}>
                    Thoát ván
                  </button>
                </>
              ) : (
                <>
                  <p className="text-xl font-extrabold">{phase === "win" ? "🎉 Vượt hết các mốc!" : "Hết mạng!"}</p>
                  <p className="text-5xl font-extrabold text-gem tabular-nums">{v.score}</p>
                  {v.score > v.best ? (
                    <p className="flex items-center gap-1.5 font-bold text-amber">
                      <Trophy className="size-5" /> Kỷ lục mới!
                    </p>
                  ) : (
                    <p className="text-sm text-muted">Kỷ lục: {best}</p>
                  )}
                  <p className="text-sm text-muted">
                    {cfg.listen ? "Đánh vần đúng" : "Bắn trúng"} {v.hits} từ ·{" "}
                    {phase === "win" ? `qua cả ${v.topics.length} mốc` : `dừng ở mốc ${v.milestone + 1}/${v.topics.length}`}
                  </p>
                  {!!missed.length && (
                    <div className="w-full text-left">
                      <p className="label mb-2">Từ bị trượt</p>
                      <ul className="card divide-y divide-border p-0">
                        {missed.map((w) => (
                          <li key={w.word} className="flex items-baseline gap-2 px-3 py-2">
                            <button className="cursor-pointer font-bold hover:underline" onClick={() => speakGerman(fullWord(w))}>
                              {GENDER_TEXT[w.gender] ? <span className={GENDER_TEXT[w.gender]}>{w.gender} </span> : null}
                              {w.word}
                            </button>
                            <span className="ml-auto text-right text-sm text-muted">{w.meaning}</span>
                          </li>
                        ))}
                      </ul>
                      {saved ? (
                        <p className="mt-2 text-center text-sm font-bold text-accent">{saved}</p>
                      ) : (
                        <button className="btn btn-amber mt-3 w-full" disabled={saving} onClick={saveMissed}>
                          <BookmarkPlus className="size-4" /> Lưu vào sổ để ôn
                        </button>
                      )}
                    </div>
                  )}
                  <div className="flex w-full gap-2">
                    <button className="btn flex-1" onClick={quit}>
                      Đổi bộ từ
                    </button>
                    <button className="btn btn-primary flex-1" onClick={() => start(phase === "win" ? 0 : v.milestone)}>
                      <RotateCcw className="size-4" /> {phase === "win" ? "Chơi lại" : `Chơi lại mốc ${v.milestone + 1}`}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Ô nhập ẩn: chỉ để bật bàn phím hệ thống trên màn cảm ứng (luôn để trống, chữ chuyển ngay cho game) */}
        {nativeKeyboard && (
          <input
            ref={inputRef}
            value=""
            onChange={(e) => onNativeInput(e.target.value)}
            onKeyDown={onNativeKey}
            disabled={phase !== "play"}
            lang="de"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="send"
            aria-label="Gõ từ tiếng Đức"
            className="pointer-events-none absolute bottom-0 left-0 size-px opacity-0"
          />
        )}
      </div>

      {/* Bàn phím trên màn hình (QWERTZ) */}
      {keyboard && <ScreenKeyboard onKey={handleKey} disabled={phase !== "play"} enter={{ label: "Bỏ chọn", title: "Chọn giọt khác" }} />}
    </div>
  );
}
