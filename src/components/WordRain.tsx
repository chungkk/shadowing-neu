"use client";

import { useEffect, useEffectEvent, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import {
  BookmarkPlus,
  Check,
  ChevronLeft,
  CloudRain,
  Delete,
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
import { fullWord, type StudyWord } from "@/lib/deck-study";
import { shuffle } from "@/lib/review";
import { speakGerman } from "@/lib/speak";
import { useLocalStorage } from "@/hooks/useLocalStorage";

/**
 * Game "Mưa từ vựng": nghĩa tiếng Việt rơi từ trên xuống, gõ đúng từ tiếng Đức để bắn trước khi chạm nước.
 * Mỗi chủ đề của bộ từ là 1 mốc: bắn đủ số từ của mốc thì sang chủ đề kế (+1 mạng); tiến độ mốc lưu theo bộ.
 * Chạm nước mất 1 mạng, hết mạng là thua. Từ trượt hiện lại cuối ván, lưu được vào sổ để ôn.
 *
 * Gõ kiểu "khoá mục tiêu": bắt từng phím (không có ô nhập → bộ gõ tiếng Việt không chen vào), phím đầu chọn giọt,
 * chỉ chữ đúng mới được ghi — gõ sai thì giọt rung, không phải xoá. Sai 2 lần cùng chỗ → lộ chữ kế tiếp.
 */

type DeckOption = { slug: string; title: string; level: string; wordCount: number; topicCount: number };
type GameWord = StudyWord & { topic: string };
type Topic = { id: string; title: string; icon: string };
type Drop = { id: number; w: GameWord; x: number /* 0 = sát trái, 1 = sát phải */; y: number; speed: number; state: "fall" | "hit" | "miss" | "gone"; at: number; points: number };
type Game = {
  words: GameWord[];
  topics: Topic[];
  milestone: number; // chỉ số chủ đề đang chơi
  mHits: number; // số từ đã bắn trong mốc này
  goal: number; // số từ phải bắn để qua mốc này
  queue: GameWord[];
  drops: Drop[];
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
type View = Omit<Game, "words" | "queue">;
type Phase = "menu" | "loading" | "play" | "pause" | "over" | "win";

const LIVES = 4;
const HITS_PER_LEVEL = 10;
const MILESTONE_GOAL = 10; // số từ phải bắn để qua 1 mốc (chủ đề ít từ hơn → bằng số từ của chủ đề)
const FADE = 0.7; // giây hiệu ứng nổ / chạm nước trước khi xoá giọt (khớp .rain-hit / .rain-miss)

const levelOf = (hits: number) => Math.min(1 + Math.floor(hits / HITS_PER_LEVEL), 12);
/**
 * Thời gian rơi tới mặt nước (giây): cấp 1 ≈ 24 giây, mỗi cấp nhanh thêm 1 giây, nhanh nhất 13 giây.
 * Từ dài cần gõ lâu hơn → rơi chậm hơn (từ 4 chữ ×0.9, 12 chữ ×1.2, tối đa ×1.4)
 */
const fallTime = (level: number, word: string) => Math.max(13, 25 - level) * Math.min(Math.max(0.75 + 0.04 * word.length, 0.85), 1.4);
const spawnEvery = (level: number) => Math.max(1.6, 3.6 - 0.2 * (level - 1));
const maxDrops = (level: number) => Math.min(2 + level, 6);

const topicWords = (g: Pick<Game, "words" | "topics">, m: number) => g.words.filter((w) => w.topic === g.topics[m].id);
const goalOf = (g: Pick<Game, "words" | "topics">, m: number) => Math.min(MILESTONE_GOAL, topicWords(g, m).length);

/** Màu theo giống — như trang bộ từ: der xanh dương · die đỏ · das xanh lá */
const GENDER_TEXT: Record<string, string> = { der: "text-phrase", die: "text-red-400", das: "text-accent" };
/** Ô bộ từ: màu theo nhóm trình độ (như DeckCover) */
const LEVEL_TILE: Record<string, string> = { A: "bg-emerald-200 text-emerald-900", B: "bg-sky-200 text-sky-900", C: "bg-violet-200 text-violet-900" };

/** Vệt mưa nền — số giả ngẫu nhiên cố định để server & trình duyệt vẽ giống nhau */
const rand = (i: number, n: number) => (((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1) + 1) % 1;
const STREAKS = Array.from({ length: 70 }, (_, i) => ({
  left: rand(i, 1) * 100,
  delay: -rand(i, 2) * 2,
  dur: 0.7 + rand(i, 3) * 0.8,
  h: 12 + rand(i, 4) * 20,
  op: 0.12 + rand(i, 5) * 0.3,
}));

/** Bàn phím trên màn hình (QWERTZ) — điện thoại khỏi bật bàn phím hệ thống che mất sân */
const OSK_ROWS = ["qwertzuiopü", "asdfghjklöä", "yxcvbnmß"];

let nextId = 1;

/** Bàn phím không có umlaut: gõ a/o/u/s thay ä/ö/ü/ß cũng được */
const BASE: Record<string, string> = { ä: "a", ö: "o", ü: "u", ß: "s" };
const sameLetter = (key: string, want: string) => key === want.toLowerCase() || BASE[want.toLowerCase()] === key;

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

function newGame(words: GameWord[], topics: Topic[], milestone: number, best: number): Game {
  const g: Game = { words, topics, milestone, mHits: 0, goal: 0, queue: [], drops: [], time: 0, nextSpawn: 0, lives: LIVES, score: 0, combo: 0, hits: 0, missed: [], best, targetId: null, typed: "", wrong: 0 };
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
  g.drops.push({ id: nextId++, w, x, y: 0, speed: (0.92 + Math.random() * 0.16) / fallTime(level, w.word), state: "fall", at: 0, points: 0 });
  g.nextSpawn = g.time + spawnEvery(level);
}

/** 1 khung hình: rơi, chạm nước, xoá giọt đã nổ, thả giọt mới */
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
  if (g.time >= g.nextSpawn && falling < maxDrops(levelOf(g.hits))) spawn(g);
}

/** Gợi ý dưới nghĩa: chữ đầu + ô trống; giọt đang gõ thì hiện phần đã gõ đúng, hint = lộ chữ kế tiếp */
function Slots({ word, typed, hint }: { word: string; typed: string | null; hint: boolean }) {
  const n = typed?.length ?? 0;
  return (
    <span className="flex justify-center font-mono text-base font-extrabold tracking-[0.18em]">
      {[...word].map((c, i) => {
        if (i < n) return <span key={i} className="text-white">{c}</span>;
        if (!/\p{L}/u.test(c)) return <span key={i}>{c}</span>;
        if (i === 0 || (hint && i === n)) return <span key={i} className="text-amber">{c}</span>;
        return (
          <span key={i} className={typed && i === n ? "text-cyan-200" : "text-sky-300/50"}>
            _
          </span>
        );
      })}
    </span>
  );
}

const RoundBtn = ({ title, onClick, children, on }: { title: string; onClick: () => void; children: ReactNode; on?: boolean }) => (
  <button
    title={title}
    onClick={onClick}
    className={`flex size-9 cursor-pointer items-center justify-center rounded-full border backdrop-blur transition ${
      on ? "border-cyan-300 bg-cyan-400/25 text-cyan-100" : "border-white/10 bg-black/40 text-white/85 hover:bg-black/60"
    }`}
  >
    {children}
  </button>
);

function LevelTile({ level }: { level: string }) {
  return (
    <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl text-lg font-black shadow-[0_3px_0_rgba(0,0,0,0.35)] ${LEVEL_TILE[level[0]] ?? LEVEL_TILE.A}`}>
      {level || "Aa"}
    </span>
  );
}

/** Thẻ bộ từ ở màn chọn — kèm số mốc đã qua (lưu trong trình duyệt) */
function DeckCard({ deck, selected, onSelect }: { deck: DeckOption; selected: boolean; onSelect: () => void }) {
  const [cleared] = useLocalStorage(`wordrain-milestone-${deck.slug}`, 0);
  const total = Math.max(deck.topicCount, 1);
  return (
    <button
      onClick={onSelect}
      className={`relative flex cursor-pointer flex-col gap-3 rounded-2xl border-2 p-3.5 text-left transition hover:-translate-y-0.5 ${
        selected ? "border-cyan-400 bg-cyan-400/10 shadow-[0_4px_0_rgba(34,211,238,0.35)]" : "border-border bg-card hover:border-cyan-400/50"
      }`}
    >
      {selected && (
        <span className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-cyan-400 text-black">
          <Check className="size-4" strokeWidth={3} />
        </span>
      )}
      <LevelTile level={deck.level} />
      <span className="flex flex-col gap-0.5">
        <span className="font-extrabold">{deck.title}</span>
        <span className="text-sm text-cyan-300/80">
          {deck.wordCount} từ · {total} mốc
        </span>
      </span>
      {cleared > 0 && (
        <span className="flex items-center gap-2 text-xs font-bold text-muted">
          <span className="h-1.5 flex-1 rounded-full bg-card-2">
            <span className="block h-full rounded-full bg-cyan-400" style={{ width: `${Math.min(cleared / total, 1) * 100}%` }} />
          </span>
          {Math.min(cleared, total)}/{total}
        </span>
      )}
    </button>
  );
}

export default function WordRain({ decks }: { decks: DeckOption[] }) {
  const [deck, setDeck] = useLocalStorage("wordrain-deck", decks[0]?.slug ?? "");
  const [sound, setSound] = useLocalStorage("wordrain-sound", true);
  const [osk, setOsk] = useLocalStorage<boolean | null>("wordrain-osk", null); // null: tự chọn theo thiết bị
  const [best, setBest] = useLocalStorage(`wordrain-best-${deck}`, 0);
  const [cleared, setCleared] = useLocalStorage(`wordrain-milestone-${deck}`, 0);
  const [phase, setPhase] = useState<Phase>("menu");
  const [view, setView] = useState<View | null>(null);
  const [note, setNote] = useState<{ text: string; tone: "ok" | "warn" } | null>(null);
  const [bad, setBad] = useState<{ key: string; n: number } | null>(null); // phím vừa gõ sai (n: để rung lại mỗi lần sai)
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [full, setFull] = useState(false);
  const [coarse, setCoarse] = useState(false);
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
    const mq = matchMedia("(pointer: coarse)");
    const sync = () => setCoarse(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    const onFull = () => setFull(document.fullscreenElement === field.current);
    document.addEventListener("fullscreenchange", onFull);
    return () => {
      mq.removeEventListener("change", sync);
      document.removeEventListener("fullscreenchange", onFull);
      clearTimeout(noteTimer.current);
      clearTimeout(badTimer.current);
    };
  }, []);

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
    game.current = newGame(data.words, data.topics, from < data.topics.length ? from : 0, best);
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
    g.lives = Math.min(LIVES, g.lives + 1);
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
    if (sound) speakGerman(fullWord(d.w));
    if (g.mHits >= g.goal) clearMilestone(g);
  }

  /** 1 phím (bàn phím thật / trên màn hình / hệ thống) → true nếu game dùng phím đó */
  function handleKey(key: string) {
    const g = game.current;
    if (!g || phase !== "play") return false;
    if (key === "Backspace") backspace(g);
    else if (key === "Enter") untarget(g); // bỏ giọt đang gõ để chọn giọt khác
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
    <header className="flex items-center gap-3">
      {playing || phase === "over" || phase === "win" ? (
        <button title="Chọn bộ từ" className="btn-icon" onClick={quit}>
          <ChevronLeft className="size-6" />
        </button>
      ) : (
        <Link href="/games" title="Game" className="btn-icon">
          <ChevronLeft className="size-6" />
        </Link>
      )}
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
        <CloudRain className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h1 className="text-lg leading-tight font-extrabold md:text-xl">Mưa từ vựng</h1>
        <p className="truncate text-xs text-cyan-300/80 md:text-sm">Đọc nghĩa đang rơi, nhớ lại từ tiếng Đức và gõ nó</p>
      </div>
      {playing && typeof document !== "undefined" && document.fullscreenEnabled && (
        <button title={full ? "Thoát toàn màn hình" : "Toàn màn hình"} className="btn-icon" onClick={toggleFull}>
          {full ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
        </button>
      )}
    </header>
  );

  // ---- Màn chọn bộ từ ----
  if (phase === "menu" || phase === "loading") {
    const total = Math.max(current?.topicCount ?? 1, 1);
    const from = cleared < total ? cleared : 0;
    return (
      <div className="flex flex-col gap-5">
        {header}
        <div className="flex items-center gap-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
            <CloudRain className="size-6" />
          </span>
          <div>
            <p className="font-extrabold">Chọn bộ từ</p>
            <p className="text-sm text-cyan-300/80">Mỗi chủ đề là một mốc — bắn đủ {MILESTONE_GOAL} từ để vượt mốc. Gõ từng chữ — gõ sai không bị ghi nên khỏi phải xoá; gõ a/o/u/s thay ä/ö/ü/ß cũng được.</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((d) => (
            <DeckCard key={d.slug} deck={d} selected={d.slug === current?.slug} onSelect={() => setDeck(d.slug)} />
          ))}
        </div>
        {!decks.length && <p className="text-center text-sm text-muted">Chưa có bộ từ nào.</p>}
        {error && <p className="text-center text-sm text-red-400">{error}</p>}

        {/* Thanh bắt đầu dính đáy (điện thoại: nằm trên thanh điều hướng) */}
        {current && (
          <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] mt-2 flex items-center gap-3 rounded-2xl border border-border bg-card/95 p-3 shadow-2xl shadow-black/60 backdrop-blur md:bottom-4">
            <LevelTile level={current.level} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-extrabold">{current.title}</p>
              <p className="text-xs text-cyan-300/80">
                {current.wordCount} từ · {from ? `tiếp tục mốc ${from + 1}/${total}` : `${total} mốc`}
                {best > 0 && ` · kỷ lục ${best}`}
              </p>
            </div>
            {from > 0 && (
              <button className="btn max-sm:hidden" disabled={phase === "loading"} onClick={() => start(0)}>
                <RotateCcw className="size-4" /> Từ đầu
              </button>
            )}
            <button
              className="btn border-cyan-400 bg-cyan-500 px-5 py-2.5 tracking-wide text-white uppercase shadow-[0_4px_0_#0e7490] hover:brightness-110 active:translate-y-0.5 active:shadow-[0_2px_0_#0e7490]"
              disabled={phase === "loading"}
              onClick={() => start()}
            >
              <Play className="size-4 fill-current" /> {phase === "loading" ? "Đang tải…" : "Bắt đầu"}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ---- Màn chơi ----
  const v = view!;
  const topic = v.topics[v.milestone];
  const target = v.drops.find((d) => d.id === v.targetId && d.state === "fall") ?? null;
  const missed = [...new Map(v.missed.map((w) => [w.word, w])).values()];

  return (
    <div className="flex flex-col gap-3">
      {header}
      <div
        ref={field}
        onPointerDown={() => phase === "play" && nativeKeyboard && focusInput()}
        className={`relative overflow-hidden bg-gradient-to-b from-[#0a1622] via-[#0c2033] to-[#0b2a40] select-none ${
          full ? "" : `rounded-2xl border border-white/5 ${keyboard ? "h-[calc(100dvh-24rem)] md:h-[calc(100dvh-20rem)]" : "h-[calc(100dvh-14rem)] md:h-[calc(100dvh-10rem)]"} min-h-[420px]`
        }`}
      >
        {/* Mây & mưa */}
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

        {/* Vùng rơi: dưới HUD, chừa cột nút bên phải; đáy = mặt nước */}
        <div className="absolute top-14 right-14 bottom-12 left-2">
          {v.drops.map((d) => {
            const isTarget = d.id === target?.id;
            return (
              <div
                key={d.id}
                className="absolute w-[min(15rem,70%)]"
                style={{ left: `calc((100% - min(15rem, 70%)) * ${d.x})`, top: `${d.y * 100}%`, transform: `translateY(${-d.y * 100}%)` }}
              >
                <div
                  key={isTarget && bad ? bad.n : 0} // gõ sai → dựng lại để rung lần nữa
                  className={`relative flex flex-col gap-0.5 rounded-xl border ${isTarget && bad ? "shake" : ""} px-2.5 py-1.5 text-center shadow-lg shadow-black/40 backdrop-blur-sm ${
                    d.state === "hit"
                      ? "rain-hit border-accent bg-accent/20"
                      : d.state === "miss"
                        ? "rain-miss border-red bg-red/20"
                        : d.state === "gone"
                          ? "rain-miss border-cyan-400/40 bg-[#0e2a3d]/90"
                          : isTarget
                            ? "border-cyan-300 bg-[#0f3550]/95 shadow-[0_0_18px_rgba(34,211,238,0.45)]"
                            : d.y > 0.8
                              ? "border-red/70 bg-[#0e2a3d]/90"
                              : "border-cyan-400/50 bg-[#0e2a3d]/90"
                  }`}
                >
                  <span className="truncate text-sm leading-snug font-bold text-white sm:text-base" title={d.w.meaning}>
                    {d.w.meaning}
                  </span>
                  {d.state === "hit" || d.state === "miss" ? (
                    <span className={`font-extrabold ${d.state === "hit" ? GENDER_TEXT[d.w.gender] ?? "text-accent" : "text-red-400"}`}>{fullWord(d.w)}</span>
                  ) : (
                    <Slots word={d.w.word} typed={isTarget ? v.typed : null} hint={isTarget && v.wrong >= 2} />
                  )}
                  {d.state === "hit" && <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-base font-extrabold text-gem">+{d.points}</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* HUD: điểm · mốc · mạng */}
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/45 px-3 py-1 text-sm font-extrabold text-white backdrop-blur">
            <Trophy className="size-4 text-amber" /> <span className="tabular-nums">{v.score}</span>
            {v.combo >= 3 && <span className="text-xs text-amber">×{v.combo}</span>}
          </span>
          <span className="flex min-w-0 flex-col items-center gap-1 rounded-2xl border border-white/10 bg-black/45 px-3 py-1 text-sm text-white backdrop-blur">
            <span className="flex min-w-0 items-center gap-1.5">
              <Flag className="size-4 shrink-0 text-cyan-300" />
              <b className="shrink-0">
                Mốc {v.milestone + 1}/{v.topics.length}
              </b>
              <span className="truncate text-white/70 max-sm:hidden">
                · {topic.icon} {topic.title}
              </span>
            </span>
            <span className="h-1 w-full min-w-24 rounded-full bg-white/10">
              <span className="block h-full rounded-full bg-cyan-400 transition-[width]" style={{ width: `${Math.min(v.mHits / v.goal, 1) * 100}%` }} />
            </span>
          </span>
          <div className="flex flex-col items-end gap-2">
            <span className="flex gap-0.5 rounded-full border border-white/10 bg-black/45 px-2.5 py-1.5 backdrop-blur" aria-label={`${v.lives} mạng`}>
              {Array.from({ length: LIVES }, (_, i) => (
                <Heart key={i} className={`size-4 ${i < v.lives ? "fill-red-500 text-red-500" : "text-white/20"}`} />
              ))}
            </span>
            {playing && (
              <div className="flex flex-col gap-2" onPointerDown={(e) => e.stopPropagation()}>
                <RoundBtn title="Thoát ván" onClick={quit}>
                  <X className="size-4" />
                </RoundBtn>
                <RoundBtn title={phase === "play" ? "Tạm dừng (Esc)" : "Tiếp tục"} onClick={() => (phase === "play" ? setPhase("pause") : resume())}>
                  {phase === "play" ? <Pause className="size-4" /> : <Play className="size-4" />}
                </RoundBtn>
                <RoundBtn title="Bàn phím trên màn hình" on={keyboard} onClick={() => setOsk(!keyboard)}>
                  <Keyboard className="size-4" />
                </RoundBtn>
                <RoundBtn title={sound ? "Tắt đọc từ" : "Bật đọc từ"} onClick={() => setSound(!sound)}>
                  {sound ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
                </RoundBtn>
              </div>
            )}
          </div>
        </div>

        {note && (
          <p
            className={`sheet-fade pointer-events-none absolute inset-x-0 top-20 z-10 mx-auto w-fit max-w-[90%] rounded-xl px-3 py-1.5 text-center text-sm font-bold ${
              note.tone === "ok" ? "bg-cyan-500 text-white" : "bg-amber text-black"
            }`}
          >
            {note.text}
          </p>
        )}

        {/* Mặt nước · thuyền · chim cánh cụt */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 border-t-2 border-cyan-300/80 bg-gradient-to-b from-cyan-500/30 to-[#05233a] shadow-[0_-6px_24px_rgba(34,211,238,0.35)]" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/emoji/1f427.webp" alt="" className="bob pointer-events-none absolute bottom-9 left-4 size-12" />
        <div className="pointer-events-none absolute bottom-1.5 left-1/2 flex -translate-x-1/2 flex-col items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/emoji/26f5.webp" alt="" className="bob size-12 [animation-delay:-1s]" />
          <span className="-mt-1 max-w-48 truncate rounded-full border border-white/10 bg-black/60 px-2.5 py-0.5 text-[11px] font-bold text-white">
            {bad ? <span className="text-red-300">✕ {bad.key}</span> : current?.title}
          </span>
        </div>

        {/* Lớp phủ: tạm dừng / thua / thắng */}
        {phase !== "play" && (
          <div className="absolute inset-0 z-20 flex flex-col items-center overflow-y-auto bg-[#06121c]/85 p-4 backdrop-blur-sm" onPointerDown={(e) => e.stopPropagation()}>
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
                    Bắn trúng {v.hits} từ · {phase === "win" ? `qua cả ${v.topics.length} mốc` : `dừng ở mốc ${v.milestone + 1}/${v.topics.length}`}
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
      {keyboard && (
        <div className="flex flex-col gap-1.5 select-none" onPointerDown={(e) => e.preventDefault()}>
          {OSK_ROWS.map((row, r) => (
            <div key={row} className="flex justify-center gap-1">
              {r === 2 && (
                <button className="btn h-11 flex-[1.5] px-0" disabled={phase !== "play"} onClick={() => handleKey("Backspace")} title="Xoá">
                  <Delete className="size-5" />
                </button>
              )}
              {[...row].map((ch) => (
                <button key={ch} className="btn h-11 max-w-12 flex-1 px-0 text-base" disabled={phase !== "play"} onClick={() => handleKey(ch)}>
                  {ch}
                </button>
              ))}
              {r === 2 && (
                <button className="btn h-11 flex-[1.5] px-0 text-xs" disabled={phase !== "play"} onClick={() => handleKey("Enter")} title="Chọn giọt khác">
                  Bỏ chọn
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
