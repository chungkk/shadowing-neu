"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState, type ComponentType, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
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
  Pickaxe,
  Play,
  RotateCcw,
  Trophy,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { clientApi } from "@/lib/client-api";
import { fullWord } from "@/lib/deck-study";
import {
  MILESTONE_GOAL,
  REEL,
  RULES,
  backspace,
  fitField,
  levelOf,
  newGame,
  nextMilestone,
  press,
  reelAt,
  scoreHit,
  snapshot,
  speechLine,
  step,
  untarget,
  type Drop,
  type Game,
  type GameWord,
  type Phase,
  type Topic,
  type Variant,
  type View,
} from "@/lib/falling-words";
import { speakGerman, stopSpeaking } from "@/lib/speak";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { GuestResult, useGuestGate } from "./GuestPlay";
import Mascot from "./Mascot";
import { DeckMenu, GameHeader, ScreenKeyboard, useCoarsePointer, type DeckOption, type Tone } from "./GameParts";

/**
 * Game chữ rơi, 2 biến thể:
 * - "rain" (Mưa từ vựng): giọt hiện nghĩa tiếng Việt, gõ từ tiếng Đức trước khi chạm nước.
 * - "gold" (Đào vàng): cục vàng chỉ phát âm (đọc khi lộ ra, bấm vào / Space để nghe lại), chìm dần xuống lòng đất — gõ lại đúng chính tả
 *   trước khi chìm tới đáy. Bắt đầu chỉ 1 cục mỗi lúc, lên cấp mới thêm; gõ xong thì thợ mỏ quăng móc kéo cục vàng lên.
 * Mỗi chủ đề của bộ từ là 1 mốc: bắn đủ số từ của mốc thì sang chủ đề kế (+1 mạng); tiến độ mốc lưu theo bộ.
 * Chạm đáy mất 1 mạng, hết mạng là thua. Từ trượt hiện lại cuối ván, lưu được vào sổ để ôn.
 *
 * Gõ kiểu "khoá mục tiêu": bắt từng phím (không có ô nhập → bộ gõ tiếng Việt không chen vào), phím đầu chọn giọt,
 * chỉ chữ đúng mới được ghi — gõ sai thì giọt rung, không phải xoá. Sai 2 lần cùng chỗ → lộ chữ kế tiếp.
 */

export type { Variant };

/** Luật chơi (lib/falling-words, dùng chung với app) + phần hiển thị của từng biến thể */
const CONFIG = {
  rain: {
    ...RULES.rain, // store: tiền tố khoá localStorage
    title: "Mưa từ vựng",
    subtitle: "Đọc nghĩa đang rơi, nhớ lại từ tiếng Đức và gõ nó",
    icon: CloudRain,
    tone: "cyan",
    dropW: "min(15rem, 70%)",
  },
  gold: {
    ...RULES.gold,
    title: "Đào vàng",
    subtitle: "Nghe từ, gõ đúng chính tả để quăng móc kéo vàng lên",
    icon: Pickaxe,
    tone: "amber",
    dropW: "min(11rem, 60%)",
  },
} satisfies Record<Variant, (typeof RULES)[Variant] & { title: string; subtitle: string; icon: ComponentType<{ className?: string }>; tone: Tone; dropW: string }>;

/** Cỡ giọt (px) theo chiều rộng vùng rơi = cfg.dropW · chiều cao ước chừng */
const dropWidth = (variant: Variant, w: number) => (variant === "gold" ? Math.min(176, w * 0.6) : Math.min(240, w * 0.7));
const DROP_H = 60;

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
  gold: {
    // trời chạng vạng ở trên, mặt đất ở 7rem, càng xuống sâu đất càng tối
    field: "bg-[linear-gradient(to_bottom,#0e1a26_0,#2a3442_7rem,#6b4520_7rem,#4a2e14_35%,#2e1c0b_70%,#120a04_100%)]",
    drop: "rounded-[0.9rem_1.4rem_1rem_1.5rem] border-yellow-400/60 bg-gradient-to-br from-[#5c4314]/95 to-[#2e1f0b]/95",
    dropTarget: "rounded-[0.9rem_1.4rem_1rem_1.5rem] border-yellow-300 bg-gradient-to-br from-[#7a5a18]/95 to-[#3d2a0e]/95 shadow-[0_0_18px_rgba(250,204,21,0.5)]",
    gone: "rain-miss rounded-[0.9rem_1.4rem_1rem_1.5rem] border-yellow-400/40 bg-[#3a2a10]/90",
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

/** Màu theo giống — như trang bộ từ: der xanh dương · die đỏ · das xanh lá */
const GENDER_TEXT: Record<string, string> = { der: "text-phrase", die: "text-red-400", das: "text-accent-text" };

/** Số giả ngẫu nhiên cố định để server & trình duyệt vẽ nền giống nhau */
const rand = (i: number, n: number) => (((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1) + 1) % 1;
const STREAKS = Array.from({ length: 70 }, (_, i) => ({
  left: rand(i, 1) * 100,
  delay: -rand(i, 2) * 2,
  dur: 0.7 + rand(i, 3) * 0.8,
  h: 12 + rand(i, 4) * 20,
  op: 0.12 + rand(i, 5) * 0.3,
}));
const STARS = Array.from({ length: 24 }, (_, i) => ({
  left: rand(i, 6) * 100,
  top: 4 + rand(i, 7) * 50, // % của dải trời (7rem)
  size: 1.5 + rand(i, 8) * 1.5,
  dur: 2 + rand(i, 9) * 3,
  delay: -rand(i, 10) * 4,
}));
const PEBBLES = Array.from({ length: 40 }, (_, i) => ({
  left: rand(i, 11) * 100,
  top: 10 + rand(i, 12) * 85, // % của phần đất
  w: 6 + rand(i, 13) * 14,
  h: 4 + rand(i, 14) * 8,
  op: 0.15 + rand(i, 15) * 0.25,
}));
const GEMS = Array.from({ length: 6 }, (_, i) => ({ left: 4 + rand(i, 16) * 88, top: 20 + rand(i, 17) * 70, code: i % 2 ? "1f48e" : "1faa8" }));

/** Gợi ý: chữ đầu + ô trống; giọt đang gõ thì hiện phần đã gõ đúng, hint = lộ chữ kế tiếp */
function Slots({ word, typed, hint, theme }: { word: string; typed: string | null; hint: boolean; theme: Theme }) {
  const n = typed?.length ?? 0;
  return (
    // Từ dài: chữ nhỏ lại, vẫn không vừa thì xuống dòng (giữa các chữ cái) — không tràn khỏi giọt
    <span className={`flex flex-wrap justify-center font-mono font-extrabold ${word.length > 12 ? "text-sm tracking-[0.08em]" : "text-base tracking-[0.18em]"}`}>
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

const Emoji = ({ code, className, style }: { code: string; className: string; style?: CSSProperties }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={`/emoji/${code}.webp`} alt="" className={`pointer-events-none ${className}`} style={style} />
);

/** Nền "rain": mây, mưa · đáy: mặt nước, thuyền (kèm nhãn), linh vật */
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
      <Mascot animated className="pointer-events-none absolute bottom-8 left-3 size-14" />
      <div className="pointer-events-none absolute bottom-1.5 left-1/2 flex -translate-x-1/2 flex-col items-center">
        <Emoji code="26f5" className="bob size-12 [animation-delay:-1s]" />
        {label}
      </div>
    </>
  );
}

/** Nền "gold": trời sao, mặt đất có giàn ròng rọc + thợ mỏ, lòng đất sỏi đá tối dần · đáy: nhãn bộ từ */
function GoldScenery({ label, reeling }: { label: ReactNode; reeling: boolean }) {
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28">
        {STARS.map((f, i) => (
          <span
            key={i}
            className="twinkle absolute rounded-full bg-amber-100"
            style={{ left: `${f.left}%`, top: `${f.top}%`, width: f.size, height: f.size, animationDuration: `${f.dur}s`, animationDelay: `${f.delay}s` }}
          />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-28 bottom-0">
        {PEBBLES.map((p, i) => (
          <span key={i} className="absolute rounded-full bg-black" style={{ left: `${p.left}%`, top: `${p.top}%`, width: p.w, height: p.h, opacity: p.op }} />
        ))}
        {GEMS.map((g, i) => (
          <Emoji key={i} code={g.code} className="absolute size-5 opacity-40" style={{ left: `${g.left}%`, top: `${g.top}%` }} />
        ))}
        <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-b from-transparent to-black/70" />
      </div>
      {/* Mặt đất (7rem) + giàn ròng rọc ở giữa (ròng rọc ở 4.25rem) + thợ mỏ đứng cạnh */}
      <div className="pointer-events-none absolute inset-x-0 top-28 h-1.5 border-t-2 border-lime-700/70 bg-[#8b6a3a]" />
      <div className="pointer-events-none absolute top-[4.25rem] left-1/2 h-[2.9rem] w-1.5 origin-top -translate-x-1/2 rotate-[22deg] rounded-full bg-[#7a4e25]" />
      <div className="pointer-events-none absolute top-[4.25rem] left-1/2 h-[2.9rem] w-1.5 origin-top -translate-x-1/2 -rotate-[22deg] rounded-full bg-[#7a4e25]" />
      <div className="pointer-events-none absolute top-[3.85rem] left-1/2 size-3.5 -translate-x-1/2 rounded-full border-2 border-[#3b2410] bg-amber-200" />
      {!reeling && (
        <div className="hook-swing pointer-events-none absolute top-[4.25rem] left-1/2 flex origin-top -translate-x-1/2 flex-col items-center">
          <span className="h-[4.5rem] w-0.5 bg-amber-100/70" />
          <Emoji code="1fa9d" className="-mt-1 size-5" />
        </div>
      )}
      <Emoji code="1f477" className={`absolute top-28 left-1/2 -ml-[4.75rem] size-12 -translate-y-full ${reeling ? "gold-pull" : "bob"}`} />
      <div className="pointer-events-none absolute bottom-1.5 left-1/2 flex -translate-x-1/2 flex-col items-center">{label}</div>
    </>
  );
}

export default function FallingWords({ variant, decks, loggedIn }: { variant: Variant; decks: DeckOption[]; loggedIn: boolean }) {
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
  const [area, setArea] = useState({ w: 0, h: 0 }); // cỡ vùng rơi (px) — "gold" tính đường dây móc
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [full, setFull] = useState(false);
  const [speech] = useState(() => speechLine());
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

  const measure = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setArea({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onFull = () => setFull(document.fullscreenElement === field.current);
    document.addEventListener("fullscreenchange", onFull);
    return () => {
      document.removeEventListener("fullscreenchange", onFull);
      clearTimeout(noteTimer.current);
      clearTimeout(badTimer.current);
      speech.clear();
      stopSpeaking();
    };
  }, [speech]);

  /** Đọc to từ của 1 giọt (biến thể "gold": khi xuất hiện, khi bấm vào, Space) — chạy qua hàng đọc */
  const saying = (d: Pick<Drop, "id" | "w">) => (done: () => void) => {
    setSpeakingId(d.id);
    void speakGerman(fullWord(d.w), {
      onEnd: () => {
        setSpeakingId((id) => (id === d.id ? null : id));
        done();
      },
    });
  };
  const sayDrop = (d: Pick<Drop, "id" | "w">) => speech.now(saying(d));
  /** Nghe lại giọt đang gõ, chưa gõ thì giọt thấp nhất */
  const listenAgain = () => {
    const g = game.current;
    const d = g?.drops.find((d) => d.id === g.targetId) ?? g?.drops.filter((d) => d.state === "fall").sort((a, b) => b.y - a.y)[0];
    if (d) sayDrop(d);
  };
  const onSpawn = useEffectEvent((d: Drop) => cfg.listen && speech.word(saying(d), () => d.state === "fall"));
  const fit = useEffectEvent((g: Game) => fitField(g, area.w, area.h, dropWidth(variant, area.w), DROP_H));

  // Hết lượt chơi: bỏ các câu đang chờ · tạm dừng thì ngừng đọc luôn (thắng / thua: đọc nốt từ vừa gõ xong)
  useEffect(() => {
    if (phase === "play") return;
    speech.clear();
    if (phase === "pause") stopSpeaking();
  }, [phase, speech]);

  // Phím thật: bắt ở cả trang (không có ô nhập → bộ gõ tiếng Việt không đổi "fa" thành "fấ")
  const onWindowKey = useEffectEvent((e: globalThis.KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.isComposing || (e.target as HTMLElement).tagName === "INPUT") return;
    if (e.key === "Escape") return phase === "play" ? setPhase("pause") : resume();
    if (handleKey(e.key)) e.preventDefault();
  });
  useEffect(() => {
    if (!playing) return;
    const on = (e: globalThis.KeyboardEvent) => onWindowKey(e);
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [playing]);

  // Vòng lặp game
  useEffect(() => {
    if (phase !== "play") return;
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const g = game.current!;
      fit(g);
      step(g, Math.min((now - last) / 1000, 0.1)); // tab bị treo lâu → không nhảy cóc
      last = now;
      if (g.fresh) {
        onSpawn(g.fresh);
        g.fresh = null;
      }
      setView(snapshot(g));
      if (g.lives <= 0) {
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
  }, [phase]);

  const flash = (text: string, tone: "ok" | "warn") => {
    clearTimeout(noteTimer.current);
    setNote({ text, tone });
    noteTimer.current = setTimeout(() => setNote(null), text.includes("\n") ? 3500 : 2200);
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
    if (cfg.listen) listenAgain(); // tạm dừng đã ngắt tiếng → đọc lại cho khỏi quên từ
  };

  /** Thoát: đang chơi dở mà đã gõ / trượt từ nào → hiện kết quả để còn lưu từ trượt, không thì về màn chọn bộ từ */
  const quit = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    speech.clear();
    stopSpeaking();
    const g = game.current;
    if (playing && g && (g.hits || g.missed.length)) {
      setView(snapshot(g));
      setPhase("over");
    } else setPhase("menu");
  };

  /** Lời báo lên cấp */
  const levelNote = (level: number) =>
    cfg.drops(level) > cfg.drops(level - 1)
      ? `Lên cấp ${level} — thêm 1 ${variant === "gold" ? "cục vàng" : "từ rơi"} cùng lúc!`
      : `Lên cấp ${level} — ${variant === "gold" ? "chìm" : "rơi"} nhanh hơn!`;

  /** Vượt mốc: sang chủ đề kế (+1 mạng), giọt còn trên sân tan đi; hết chủ đề → thắng */
  function clearMilestone(g: Game, level: number | null) {
    const done = g.milestone + 1;
    if (done > cleared) setCleared(done);
    if (done >= g.topics.length) {
      setView(snapshot(g));
      setPhase("win");
      return;
    }
    flash(`Vượt mốc ${done}: ${g.topics[g.milestone].title} ✓ — +1 mạng${level ? `\n${levelNote(level)}` : ""}`, "ok");
    nextMilestone(g);
  }

  /** Bắn trúng giọt vừa gõ xong */
  function hit(g: Game, d: Drop) {
    const { milestone, levelUp: level } = scoreHit(g, d);
    if (g.score > g.best) setBest(g.score); // lưu ngay: thoát giữa ván / đóng tab vẫn giữ kỷ lục
    if (sound) speech.bonus((done) => void speakGerman(fullWord(d.w), { onEnd: done }));
    if (milestone) clearMilestone(g, level);
    else if (level) flash(levelNote(level), "ok");
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
      const keys = [...new Set(view.missed.map((w) => w.key))];
      const r = await clientApi<{ added: number }>(`/vocab/decks/${current.slug}`, { method: "POST", body: { keys } });
      setSaved(r.added ? `Đã thêm ${r.added} từ vào sổ` : "Các từ này đã có trong sổ");
    } catch (e) {
      setSaved((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const guest = useGuestGate(loggedIn, start); // khách: hỏi tên tạm trước khi vào ván

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
              ? `Mỗi chủ đề là một mốc — đánh vần đúng ${MILESTONE_GOAL} từ để vượt mốc. Từ được đọc khi cục vàng lộ ra; gõ đúng thì thợ mỏ quăng móc kéo nó lên trước khi chìm tới đáy. Bấm vào cục vàng hoặc Space để nghe lại. ${typing}`
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
          onStart={guest.gate}
          notice={guest.chip}
        />
        {guest.dialog}
      </div>
    );
  }

  // ---- Màn chơi ----
  const v = view!;
  const topic = v.topics[v.milestone];
  const target = v.drops.find((d) => d.id === v.targetId && d.state === "fall") ?? null;
  const missed = [...new Map(v.missed.map((w) => [w.key, w])).values()];
  // "gold": vị trí dây móc / cục vàng đang kéo (px trong vùng rơi). Ròng rọc ở giữa SÂN (vùng rơi lệch: left-2, right-14
  // → giữa sân = giữa vùng rơi + (56 - 8) / 2 px), cao hơn vùng rơi 3.75rem
  const pulley = { x: area.w / 2 + 24, y: -60 };
  const dropPx = dropWidth(variant, area.w);
  const reels =
    variant === "gold"
      ? v.drops
          .filter((d) => d.state === "hit")
          .map((d) => {
            const from = { x: (area.w - dropPx) * d.x + dropPx / 2, y: d.y * (area.h - DROP_H) + DROP_H / 2 };
            return { id: d.id, ...reelAt(Math.min((v.time - d.at) / REEL, 1), from, pulley) };
          })
      : [];
  const reelOf = new Map(reels.map((r) => [r.id, r]));
  const label = (
    <span className="-mt-1 max-w-48 truncate rounded-full border border-white/10 bg-black/60 px-2.5 py-0.5 text-[11px] font-bold text-white">
      {bad ? <span className="text-red-300">✕ {bad.key}</span> : current?.title}
    </span>
  );

  return (
    <div className="flex flex-col gap-3">
      {header}
      {/* Toàn màn hình: phóng to cả sân lẫn bàn phím trên màn hình */}
      <div ref={field} className={`flex flex-col ${full ? "gap-1.5 bg-background p-1.5" : "gap-3"}`}>
        <div
          onPointerDown={() => phase === "play" && nativeKeyboard && focusInput()}
          className={`theme-night relative overflow-hidden select-none ${theme.field} ${
            full ? "min-h-0 flex-1 rounded-xl" : `rounded-2xl border border-white/5 ${keyboard ? "h-[calc(100dvh-24rem)] md:h-[calc(100dvh-20rem)]" : "h-[calc(100dvh-14rem)] md:h-[calc(100dvh-10rem)]"} min-h-[420px]`
          }`}
        >
          {variant === "gold" ? <GoldScenery label={label} reeling={!!reels.length} /> : <RainScenery label={label} />}

          {/* Vùng rơi: dưới HUD (gold: dưới mặt đất), chừa cột nút bên phải; đáy = mặt nước / đáy mỏ */}
          <div ref={measure} className={`absolute right-14 left-2 ${variant === "gold" ? "top-32 bottom-9" : "top-14 bottom-12"}`}>
            {v.drops.map((d) => {
              const isTarget = d.id === target?.id;
              const reel = reelOf.get(d.id);
              const done = d.state === "hit" || d.state === "miss";
              return (
                <div
                  key={d.id}
                  className="absolute"
                  style={
                    reel
                      ? { width: cfg.dropW, left: reel.at.x, top: reel.at.y, transform: `translate(-50%, -50%) scale(${reel.scale})`, opacity: reel.opacity, zIndex: 1 }
                      : { width: cfg.dropW, left: `calc((100% - ${cfg.dropW}) * ${d.x})`, top: `${d.y * 100}%`, transform: `translateY(${-d.y * 100}%)` }
                  }
                >
                  <div
                    key={isTarget && bad ? bad.n : 0} // gõ sai → dựng lại để rung lần nữa
                    onClick={cfg.listen && d.state === "fall" ? () => sayDrop(d) : undefined} // "gold": bấm vào cục vàng → nghe lại
                    onPointerDown={cfg.listen ? (e) => e.stopPropagation() : undefined}
                    title={cfg.listen && d.state === "fall" ? "Bấm để nghe lại" : undefined}
                    className={`relative flex flex-col items-center gap-0.5 rounded-xl border ${isTarget && bad ? "shake" : ""} ${cfg.listen && d.state === "fall" ? "cursor-pointer hover:brightness-125" : ""} px-2.5 py-1.5 text-center shadow-lg shadow-black/40 backdrop-blur-sm ${
                      d.state === "hit"
                        ? variant === "gold"
                          ? "rounded-[0.9rem_1.4rem_1rem_1.5rem] border-yellow-200 bg-gradient-to-br from-[#8a6514]/95 to-[#4a3310]/95 shadow-[0_0_24px_rgba(250,204,21,0.7)]"
                          : "rain-hit border-accent bg-accent/20"
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
                      <span className={`w-full font-extrabold [overflow-wrap:anywhere] ${d.state === "hit" ? GENDER_TEXT[d.w.gender] ?? "text-accent-text" : "text-red-400"}`}>{fullWord(d.w)}</span>
                    ) : (
                      <Slots word={d.w.word} typed={isTarget ? v.typed : null} hint={isTarget && v.wrong >= 2} theme={theme} />
                    )}
                    {d.state === "hit" && <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-base font-extrabold text-amber">+{d.points}</span>}
                  </div>
                </div>
              );
            })}
            {/* Dây móc: từ ròng rọc thả xuống cục vàng vừa gõ xong rồi kéo nó lên */}
            {reels.map(({ id, tip }) => {
              // móc nằm ở mép trên cục vàng (cách tâm 1.5rem)
              const dx = tip.x - pulley.x;
              const dy = tip.y - 24 - pulley.y;
              return (
                <div key={id} className="pointer-events-none absolute z-[2]" style={{ left: pulley.x, top: pulley.y }}>
                  <span
                    className="absolute top-0 left-0 h-0.5 origin-left bg-amber-100/80"
                    style={{ width: Math.hypot(dx, dy), transform: `rotate(${Math.atan2(dy, dx)}rad)` }}
                  />
                  <Emoji code="1fa9d" className="absolute size-6 max-w-none -translate-x-1/2 -translate-y-1/2" style={{ left: dx, top: dy }} />
                </div>
              );
            })}
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
                <span className="shrink-0 font-bold text-white/70">· Cấp {levelOf(v.hits)}</span>
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
              className={`sheet-fade pointer-events-none absolute inset-x-0 top-20 z-10 mx-auto w-fit max-w-[90%] rounded-xl px-3 py-1.5 text-center text-sm font-bold whitespace-pre-line ${
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
                    <p className="text-xl font-extrabold">{phase === "win" ? "🎉 Vượt hết các mốc!" : v.lives > 0 ? "Đã thoát ván" : "Hết mạng!"}</p>
                    <p className="text-5xl font-extrabold text-amber tabular-nums">{v.score}</p>
                    {v.score > v.best ? (
                      <p className="flex items-center gap-1.5 font-bold text-amber">
                        <Trophy className="size-5" /> Kỷ lục mới!
                      </p>
                    ) : (
                      <p className="text-sm text-muted">Kỷ lục: {best}</p>
                    )}
                    {!loggedIn && <GuestResult name={guest.name} score={v.score} record={v.score > v.best} />}
                    <p className="text-sm text-muted">
                      {cfg.listen ? `Kéo được ${v.hits} cục vàng` : `Bắn trúng ${v.hits} từ`} ·{" "}
                      {phase === "win" ? `qua cả ${v.topics.length} mốc` : `dừng ở mốc ${v.milestone + 1}/${v.topics.length}`}
                    </p>
                    {!!missed.length && (
                      <div className="w-full text-left">
                        <p className="label mb-2">Từ bị trượt</p>
                        <ul className="card divide-y divide-border p-0">
                          {missed.map((w) => (
                            <li key={w.key} className="flex items-baseline gap-2 px-3 py-2">
                              <button className="cursor-pointer font-bold hover:underline" onClick={() => speakGerman(fullWord(w))}>
                                {GENDER_TEXT[w.gender] ? <span className={GENDER_TEXT[w.gender]}>{w.gender} </span> : null}
                                {w.word}
                              </button>
                              <span className="ml-auto text-right text-sm text-muted">{w.meaning}</span>
                            </li>
                          ))}
                        </ul>
                        {saved ? (
                          <p className="mt-2 text-center text-sm font-bold text-accent-text">{saved}</p>
                        ) : loggedIn ? (
                          <button className="btn btn-amber mt-3 w-full" disabled={saving} onClick={saveMissed}>
                            <BookmarkPlus className="size-4" /> Lưu vào sổ để ôn
                          </button>
                        ) : null}
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
        {keyboard && <ScreenKeyboard onKey={handleKey} disabled={phase !== "play"} enter={{ label: "Bỏ chọn", title: variant === "gold" ? "Chọn cục vàng khác" : "Chọn giọt khác" }} />}
      </div>
    </div>
  );
}
