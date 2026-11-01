"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { BookmarkPlus, CloudRain, Heart, Pause, Play, RotateCcw, Trophy, Volume2, VolumeX } from "lucide-react";
import { clientApi } from "@/lib/client-api";
import { checkGuess, fullWord, type StudyWord } from "@/lib/deck-study";
import { shuffle } from "@/lib/review";
import { speakGerman } from "@/lib/speak";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import LevelBadge from "./LevelBadge";

/**
 * Game "Mưa từ vựng": nghĩa tiếng Việt rơi từ trên xuống, gõ đúng từ tiếng Đức để bắn trước khi chạm đất.
 * Chạm đất mất 1 mạng (hết 3 mạng là thua); cứ 8 từ đúng lên 1 cấp — rơi nhanh hơn, dày hơn.
 * Từ trượt hiện lại cuối ván, lưu được vào sổ để ôn.
 */

type DeckOption = { slug: string; title: string; level: string; wordCount: number };
type Drop = { id: number; w: StudyWord; x: number; y: number; speed: number; state: "fall" | "hit" | "miss"; at: number; points: number };
type Game = {
  pool: StudyWord[];
  queue: StudyWord[];
  drops: Drop[];
  time: number;
  nextSpawn: number;
  lives: number;
  score: number;
  combo: number;
  hits: number;
  missed: StudyWord[];
  best: number; // kỷ lục trước ván này
};
type View = Omit<Game, "pool" | "queue">;
type Phase = "menu" | "loading" | "play" | "pause" | "over";

const LIVES = 3;
const HITS_PER_LEVEL = 8;
const FADE = 0.7; // giây hiệu ứng nổ / chạm đất trước khi xoá giọt (khớp .rain-hit / .rain-miss)

const levelOf = (hits: number) => 1 + Math.floor(hits / HITS_PER_LEVEL);
/** Tốc độ rơi (phần chiều cao sân / giây): cấp 1 ≈ 14 giây chạm đất */
const fallSpeed = (level: number) => 0.07 + 0.012 * (level - 1);
const spawnEvery = (level: number) => Math.max(1.1, 3.2 - 0.25 * (level - 1));
const maxDrops = (level: number) => Math.min(2 + level, 7);

/** Viền trái theo giống — như trang bộ từ: der xanh dương · die đỏ · das xanh lá */
const GENDER_BORDER: Record<string, string> = { der: "border-l-phrase", die: "border-l-red-400", das: "border-l-accent" };
const GENDER_TEXT: Record<string, string> = { der: "text-phrase", die: "text-red-400", das: "text-accent" };

let nextId = 1;

function newGame(pool: StudyWord[], best: number): Game {
  return { pool, queue: shuffle(pool), drops: [], time: 0, nextSpawn: 0, lives: LIVES, score: 0, combo: 0, hits: 0, missed: [], best };
}

const snapshot = (g: Game): View => ({
  drops: g.drops.map((d) => ({ ...d })),
  time: g.time,
  nextSpawn: g.nextSpawn,
  lives: g.lives,
  score: g.score,
  combo: g.combo,
  hits: g.hits,
  missed: [...g.missed],
  best: g.best,
});

/** Từ kế tiếp — tránh từ đang rơi trên sân */
function nextWord(g: Game): StudyWord {
  const onField = new Set(g.drops.filter((d) => d.state === "fall").map((d) => d.w.word.toLowerCase()));
  for (let i = 0; i < 6; i++) {
    if (!g.queue.length) g.queue = shuffle(g.pool);
    const w = g.queue.pop()!;
    if (!onField.has(w.word.toLowerCase())) return w;
  }
  return g.queue.pop() ?? g.pool[0];
}

function spawn(g: Game) {
  const level = levelOf(g.hits);
  // Chọn cột không đè lên giọt mới rơi gần đó
  const recent = g.drops.filter((d) => d.state === "fall" && d.y < 0.3);
  let x = 2 + Math.random() * 58;
  for (let i = 0; i < 6 && recent.some((d) => Math.abs(d.x - x) < 22); i++) x = 2 + Math.random() * 58;
  g.drops.push({ id: nextId++, w: nextWord(g), x, y: 0, speed: fallSpeed(level) * (0.85 + Math.random() * 0.3), state: "fall", at: 0, points: 0 });
  g.nextSpawn = g.time + spawnEvery(level);
}

/** 1 khung hình: rơi, chạm đất, xoá giọt đã nổ, thả giọt mới */
function step(g: Game, dt: number) {
  g.time += dt;
  for (const d of g.drops) {
    if (d.state !== "fall") continue;
    d.y += d.speed * dt;
    if (d.y >= 1) {
      Object.assign(d, { y: 1, state: "miss", at: g.time });
      g.lives--;
      g.combo = 0;
      g.missed.push(d.w);
    }
  }
  g.drops = g.drops.filter((d) => d.state === "fall" || g.time - d.at < FADE);
  const falling = g.drops.filter((d) => d.state === "fall").length;
  if (!falling || (g.time >= g.nextSpawn && falling < maxDrops(levelOf(g.hits)))) spawn(g);
}

export default function WordRain({ decks }: { decks: DeckOption[] }) {
  const [deck, setDeck] = useLocalStorage("wordrain-deck", decks[0]?.slug ?? "");
  const [sound, setSound] = useLocalStorage("wordrain-sound", true);
  const [best, setBest] = useLocalStorage(`wordrain-best-${deck}`, 0);
  const [phase, setPhase] = useState<Phase>("menu");
  const [view, setView] = useState<View | null>(null);
  const [input, setInput] = useState("");
  const [note, setNote] = useState<{ text: string; tone: "ok" | "warn" } | null>(null);
  const [shake, setShake] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const game = useRef<Game | null>(null);
  const cache = useRef(new Map<string, StudyWord[]>());
  const inputRef = useRef<HTMLInputElement>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const current = decks.find((d) => d.slug === deck) ?? decks[0];

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

  useEffect(() => () => clearTimeout(noteTimer.current), []);

  const flash = (text: string, tone: "ok" | "warn") => {
    clearTimeout(noteTimer.current);
    setNote({ text, tone });
    noteTimer.current = setTimeout(() => setNote(null), 2200);
  };

  const focusInput = () => requestAnimationFrame(() => inputRef.current?.focus());

  async function start() {
    if (!current) return;
    setError("");
    let pool = cache.current.get(current.slug);
    if (!pool) {
      setPhase("loading");
      try {
        pool = (await clientApi<{ words: StudyWord[] }>(`/games/words?deck=${current.slug}`)).words;
        cache.current.set(current.slug, pool);
      } catch (e) {
        setError((e as Error).message);
        setPhase("menu");
        return;
      }
    }
    game.current = newGame(pool, best);
    setView(snapshot(game.current));
    setInput("");
    setNote(null);
    setSaved(null);
    setPhase("play");
    focusInput();
  }

  const resume = () => {
    setPhase("play");
    focusInput();
  };

  /** Bắn giọt thấp nhất khớp câu gõ. submit = bấm Enter: chấp nhận cả sai 1–2 chữ / sai mạo từ */
  function shoot(value: string, submit: boolean) {
    const g = game.current;
    if (!g || phase !== "play" || !value.trim()) return false;
    const falling = g.drops.filter((d) => d.state === "fall").sort((a, b) => b.y - a.y);
    for (const d of falling) {
      const r = checkGuess(value, d.w);
      if (r !== "ok" && !(submit && r !== "wrong")) continue;
      g.combo++;
      g.hits++;
      const level = levelOf(g.hits - 1);
      d.points = 10 * level + 2 * Math.min(g.combo - 1, 10);
      g.score += d.points;
      Object.assign(d, { state: "hit", at: g.time });
      if (sound) speakGerman(fullWord(d.w));
      if (r === "almost") flash(`Gần đúng — viết là: ${fullWord(d.w)}`, "warn");
      else if (r === "article") flash(`Đúng từ, sai mạo từ: ${fullWord(d.w)}`, "warn");
      else if (levelOf(g.hits) > level) flash(`Lên cấp ${levelOf(g.hits)} — mưa nặng hạt hơn!`, "ok");
      return true;
    }
    return false;
  }

  const type = (v: string) => setInput(shoot(v, false) ? "" : v);

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") return setPhase("pause");
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (shoot(input, true)) return setInput("");
    if (!input.trim() || !game.current) return;
    game.current.combo = 0;
    setShake(true);
  };

  /** Nút ä ö ü ß: chèn tại con trỏ, giữ bàn phím đang mở */
  const insert = (ch: string) => {
    const el = inputRef.current;
    const s = el?.selectionStart ?? input.length;
    const e = el?.selectionEnd ?? s;
    type(input.slice(0, s) + ch + input.slice(e));
    requestAnimationFrame(() => el?.setSelectionRange(s + 1, s + 1));
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

  const playing = phase === "play" || phase === "pause";
  const level = levelOf(view?.hits ?? 0);
  const missed = view ? [...new Map(view.missed.map((w) => [w.word, w])).values()] : [];

  return (
    <div className="flex flex-col gap-3">
      {/* Thanh trạng thái */}
      <div className="card flex items-center gap-3 px-3 py-2">
        <div className="flex gap-0.5" aria-label={`${view?.lives ?? LIVES} mạng`}>
          {Array.from({ length: LIVES }, (_, i) => (
            <Heart key={i} className={`size-5 ${i < (view?.lives ?? LIVES) ? "fill-red text-red" : "text-border"}`} />
          ))}
        </div>
        <span className="pill bg-card-2 text-muted">Cấp {level}</span>
        {(view?.combo ?? 0) >= 3 && <span className="pill bg-amber/15 text-amber">Combo ×{view!.combo}</span>}
        <span className="ml-auto text-lg font-extrabold tabular-nums">{view?.score ?? 0}</span>
        <button className="btn-icon" title={sound ? "Tắt đọc từ" : "Bật đọc từ"} onClick={() => setSound(!sound)}>
          {sound ? <Volume2 className="size-5" /> : <VolumeX className="size-5 text-muted" />}
        </button>
        {playing && (
          <button className="btn-icon" title={phase === "play" ? "Tạm dừng (Esc)" : "Tiếp tục"} onClick={() => (phase === "play" ? setPhase("pause") : resume())}>
            {phase === "play" ? <Pause className="size-5" /> : <Play className="size-5" />}
          </button>
        )}
      </div>

      {/* Sân chơi */}
      <div className="relative h-[min(56dvh,520px)] min-h-72 overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-[#0f1c2b] via-card to-background">
        {view?.drops.map((d) => (
          <div key={d.id} className="absolute max-w-[40%] -translate-y-full" style={{ left: `${d.x}%`, top: `${d.y * 100}%` }}>
            <div
              className={`relative rounded-xl border border-l-4 border-border bg-card-2 px-3 py-1.5 text-center text-sm leading-snug font-bold shadow-lg shadow-black/40 sm:text-base ${
                GENDER_BORDER[d.w.gender] ?? "border-l-muted"
              } ${d.state === "hit" ? "rain-hit border-accent" : d.state === "miss" ? "rain-miss border-red" : d.y > 0.8 ? "ring-2 ring-red/60" : ""}`}
            >
              {d.state === "fall" ? d.w.meaning : <span className={d.state === "hit" ? GENDER_TEXT[d.w.gender] ?? "text-accent" : "text-red-400"}>{fullWord(d.w)}</span>}
              {d.state === "hit" && <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-base font-extrabold text-gem">+{d.points}</span>}
            </div>
          </div>
        ))}
        {/* Mặt đất */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2 bg-gradient-to-t from-red/50 to-transparent" />

        {note && (
          <p
            className={`sheet-fade pointer-events-none absolute inset-x-0 top-3 mx-auto w-fit max-w-[90%] rounded-xl px-3 py-1.5 text-center text-sm font-bold ${
              note.tone === "ok" ? "bg-accent text-white" : "bg-amber text-black"
            }`}
          >
            {note.text}
          </p>
        )}

        {phase !== "play" && (
          <div className="absolute inset-0 flex flex-col items-center overflow-y-auto bg-background/85 p-4 backdrop-blur-sm">
            <div className="m-auto flex w-full max-w-md flex-col items-center gap-4 text-center">
              {(phase === "menu" || phase === "loading") && (
                <>
                  <span className="flex size-16 items-center justify-center rounded-full bg-accent text-white shadow-[0_4px_0_var(--accent-dark)]">
                    <CloudRain className="size-8" />
                  </span>
                  <p className="text-sm text-muted">
                    Nghĩa tiếng Việt rơi xuống — gõ từ tiếng Đức tương ứng (không cần mạo từ, gõ <b>ae</b> thay <b>ä</b> cũng được). Để chạm đất 3 lần là thua.
                  </p>
                  <div className="flex w-full flex-col gap-2">
                    {decks.map((d) => (
                      <button
                        key={d.slug}
                        onClick={() => setDeck(d.slug)}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-3 py-2 text-left transition ${
                          d.slug === current?.slug ? "border-accent bg-accent/10" : "border-border bg-card hover:border-accent/60"
                        }`}
                      >
                        {d.level && <LevelBadge level={d.level} />}
                        <span className="flex-1 font-bold">{d.title}</span>
                        <span className="text-sm text-muted">{d.wordCount} từ</span>
                      </button>
                    ))}
                  </div>
                  {best > 0 && (
                    <p className="flex items-center gap-1.5 text-sm font-bold text-amber">
                      <Trophy className="size-4" /> Kỷ lục: {best}
                    </p>
                  )}
                  {error && <p className="text-sm text-red-400">{error}</p>}
                  <button className="btn btn-primary w-full py-3" disabled={phase === "loading" || !current} onClick={start}>
                    <Play className="size-5" /> {phase === "loading" ? "Đang tải từ…" : "Bắt đầu"}
                  </button>
                </>
              )}

              {phase === "pause" && (
                <>
                  <p className="text-xl font-extrabold">Tạm dừng</p>
                  <button className="btn btn-primary w-full py-3" onClick={resume}>
                    <Play className="size-5" /> Tiếp tục
                  </button>
                  <button className="btn w-full" onClick={() => setPhase("menu")}>
                    Thoát ván
                  </button>
                </>
              )}

              {phase === "over" && view && (
                <>
                  <p className="text-xl font-extrabold">Hết mạng!</p>
                  <p className="text-5xl font-extrabold text-gem tabular-nums">{view.score}</p>
                  {view.score > view.best ? (
                    <p className="flex items-center gap-1.5 font-bold text-amber">
                      <Trophy className="size-5" /> Kỷ lục mới!
                    </p>
                  ) : (
                    <p className="text-sm text-muted">Kỷ lục: {best}</p>
                  )}
                  <p className="text-sm text-muted">
                    Bắn trúng {view.hits} từ · đạt cấp {level}
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
                    <button className="btn flex-1" onClick={() => setPhase("menu")}>
                      Đổi bộ từ
                    </button>
                    <button className="btn btn-primary flex-1" onClick={start}>
                      <RotateCcw className="size-4" /> Chơi lại
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Ô gõ */}
      <div className={`flex flex-col gap-2 ${shake ? "shake" : ""}`} onAnimationEnd={() => setShake(false)}>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => type(e.target.value)}
          onKeyDown={onKey}
          disabled={phase !== "play"}
          placeholder={phase === "play" ? "Gõ từ tiếng Đức rồi Enter…" : ""}
          lang="de"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="send"
          className="input w-full text-center text-lg font-bold md:text-lg"
        />
        <div className="flex justify-center gap-2">
          {["ä", "ö", "ü", "ß"].map((ch) => (
            <button
              key={ch}
              className="btn min-w-11 text-base"
              disabled={phase !== "play"}
              onPointerDown={(e) => e.preventDefault()} // giữ con trỏ trong ô gõ
              onClick={() => insert(ch)}
            >
              {ch}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
