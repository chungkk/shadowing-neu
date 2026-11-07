"use client";

import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import { BookmarkPlus, Clock, Flag, Maximize2, Minimize2, Pause, Play, Puzzle, RotateCcw, Trophy, Volume2, VolumeX, X } from "lucide-react";
import { clientApi } from "@/lib/client-api";
import { fullWord } from "@/lib/deck-study";
import type { GameWord, Topic } from "@/lib/falling-words";
import { prefetchGerman, speakGerman, stopSpeaking } from "@/lib/speak";
import { MILESTONE_PAIRS, TIME_BONUS, TIME_PENALTY, newGame, nextMilestone, pick, snapshot, step, type Game, type Phase, type View } from "@/lib/word-match";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { GuestResult, useGuestGate } from "./GuestPlay";
import Mascot from "./Mascot";
import { DeckMenu, GameHeader, type DeckOption } from "./GameParts";

/**
 * Game Nối từ: sân gồm thẻ từ tiếng Đức và thẻ nghĩa tiếng Việt xáo lẫn, bấm 1 từ + 1 nghĩa để nối trước khi hết giờ.
 * Mỗi chủ đề của bộ từ là 1 mốc; tiến độ mốc lưu theo bộ. Từ nối nhầm hiện lại cuối ván, lưu được vào sổ để ôn.
 */

const STORE = "wordmatch"; // tiền tố khoá localStorage
const PAINT_MS = 100; // đồng hồ chạy theo khung hình, giao diện vẽ lại thưa hơn (bấm thẻ thì vẽ ngay)

const RoundBtn = ({ title, onClick, children }: { title: string; onClick: () => void; children: ReactNode }) => (
  <button title={title} onClick={onClick} className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/85 transition hover:bg-black/60">
    {children}
  </button>
);

/** Dòng "đã gặp X/Y từ" trên thẻ bộ từ */
function SeenLine({ deck }: { deck: DeckOption }) {
  const [seen] = useLocalStorage<string[]>(`${STORE}-seen-${deck.slug}`, []);
  if (!seen.length) return null;
  return <span className="text-xs font-bold text-muted">Đã gặp {Math.min(seen.length, deck.wordCount)}/{deck.wordCount} từ</span>;
}

export default function WordMatch({ decks, loggedIn }: { decks: DeckOption[]; loggedIn: boolean }) {
  const [deck, setDeck] = useLocalStorage(`${STORE}-deck`, decks[0]?.slug ?? "");
  const [sound, setSound] = useLocalStorage(`${STORE}-sound`, true);
  const current = decks.find((d) => d.slug === deck) ?? decks[0]; // bộ đã lưu không còn → bộ đầu tiên, kỷ lục / tiến độ theo bộ đang hiện
  const [best, setBest] = useLocalStorage(`${STORE}-best-${current?.slug ?? ""}`, 0);
  const [cleared, setCleared] = useLocalStorage(`${STORE}-milestone-${current?.slug ?? ""}`, 0);
  const [seen, setSeen] = useLocalStorage<string[]>(`${STORE}-seen-${current?.slug ?? ""}`, []);
  const [phase, setPhase] = useState<Phase>("menu");
  const [view, setView] = useState<View | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [full, setFull] = useState(false);
  const game = useRef<Game | null>(null);
  const cache = useRef(new Map<string, { words: GameWord[]; topics: Topic[] }>());
  const field = useRef<HTMLDivElement>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const dealt = useRef(0); // sân đã tải sẵn giọng đọc
  const playing = phase === "play" || phase === "pause";

  useEffect(() => {
    const onFull = () => setFull(document.fullscreenElement === field.current);
    document.addEventListener("fullscreenchange", onFull);
    return () => {
      document.removeEventListener("fullscreenchange", onFull);
      clearTimeout(noteTimer.current);
      stopSpeaking();
    };
  }, []);

  /** Sân mới: tải sẵn giọng đọc để nối đúng là nghe ngay (khách không có giọng neural; tắt tiếng thì khỏi tải) */
  const onDeal = useEffectEvent((g: Game) => {
    if (g.round === dealt.current) return;
    dealt.current = g.round;
    if (sound && loggedIn) for (const c of g.cards) if (c.kind === "word") prefetchGerman(fullWord(c.w));
  });

  // Vòng lặp game
  useEffect(() => {
    if (phase !== "play") return;
    let raf = 0;
    let last = performance.now();
    let painted = last;
    const frame = (now: number) => {
      const g = game.current!;
      step(g, Math.min((now - last) / 1000, 0.1)); // tab bị treo lâu → không nhảy cóc
      last = now;
      onDeal(g);
      if (g.left <= 0) {
        setView(snapshot(g));
        setPhase("over");
        return;
      }
      if (now - painted >= PAINT_MS) {
        painted = now;
        setView(snapshot(g));
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

  const onEscape = useEffectEvent(() => setPhase(phase === "play" ? "pause" : "play"));
  useEffect(() => {
    if (!playing) return;
    const on = (e: KeyboardEvent) => e.key === "Escape" && onEscape();
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [playing]);

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
    const keys = new Set(data.words.map((w) => w.key));
    game.current = newGame(data.words, data.topics, from < data.topics.length ? from : 0, best, seen.filter((k) => keys.has(k))); // bộ từ đã đổi → bỏ khoá cũ
    dealt.current = 0;
    setView(snapshot(game.current));
    setNote("");
    setSaved(null);
    setSaveError("");
    setPhase("play");
  }

  /** Thoát: đang chơi dở mà đã nối cặp nào → hiện kết quả để còn lưu từ nhầm, không thì về màn chọn bộ từ */
  const quit = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    stopSpeaking();
    const g = game.current;
    if (playing && g && (g.pairs || g.missed.length)) {
      setView(snapshot(g));
      setPhase("over");
    } else setPhase("menu");
  };

  /** Vượt mốc: sang chủ đề kế; hết chủ đề → thắng */
  function clearMilestone(g: Game) {
    const done = g.milestone + 1;
    if (done > cleared) setCleared(done);
    if (done >= g.topics.length) {
      setPhase("win");
      return;
    }
    clearTimeout(noteTimer.current);
    setNote(`Vượt mốc ${done}: ${g.topics[g.milestone].title} ✓ — đầy lại đồng hồ`);
    noteTimer.current = setTimeout(() => setNote(""), 2200);
    nextMilestone(g);
  }

  function tap(id: string) {
    const g = game.current;
    if (!g || phase !== "play") return;
    const r = pick(g, id);
    if (r && r !== "wrong") {
      if (g.score > g.best) setBest(g.score); // lưu ngay: thoát giữa ván / đóng tab vẫn giữ kỷ lục
      if (g.seen.size !== seen.length) setSeen([...g.seen]);
      if (sound) void speakGerman(fullWord(r.word));
      if (r.milestone) clearMilestone(g);
    }
    setView(snapshot(g));
  }

  const toggleFull = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void field.current?.requestFullscreen().catch(() => {});
  };

  async function saveMissed() {
    if (!view || !current) return;
    setSaving(true);
    setSaveError("");
    try {
      const keys = [...new Set(view.missed.map((w) => w.key))];
      const r = await clientApi<{ added: number }>(`/vocab/decks/${current.slug}`, { method: "POST", body: { keys } });
      setSaved(r.added ? `Đã thêm ${r.added} từ vào sổ` : "Các từ này đã có trong sổ");
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const guest = useGuestGate(loggedIn, start); // khách: hỏi tên tạm trước khi vào ván

  const header = (
    <GameHeader
      icon={Puzzle}
      tone="cyan"
      title="Nối từ"
      subtitle="Bấm từ tiếng Đức và nghĩa của nó để xoá cặp thẻ"
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
    return (
      <div className="flex flex-col gap-5">
        {header}
        <DeckMenu
          tone="cyan"
          icon={Puzzle}
          intro={`Mỗi chủ đề là một mốc — nối đúng ${MILESTONE_PAIRS} cặp để vượt mốc, từ chưa gặp được ưu tiên. Nối đúng được cộng ${TIME_BONUS} giây, nối sai bị trừ ${TIME_PENALTY} giây; hết giờ là thua.`}
          decks={decks}
          current={current}
          onSelect={setDeck}
          progressKey={(slug) => `${STORE}-milestone-${slug}`}
          cleared={cleared}
          best={best}
          loading={phase === "loading"}
          error={error}
          onStart={guest.gate}
          notice={guest.chip}
          deckExtra={(d) => <SeenLine deck={d} />}
        />
        {guest.dialog}
      </div>
    );
  }

  // ---- Màn chơi ----
  const v = view!;
  const topic = v.topics[v.milestone];
  const missed = [...new Map(v.missed.map((w) => [w.key, w])).values()];
  const low = v.left <= 10;

  return (
    <div className="flex flex-col gap-3">
      {header}
      <div
        ref={field}
        className={`theme-night relative flex flex-col gap-2 overflow-hidden bg-gradient-to-b from-[#0a1f24] to-[#0b2a2a] p-2.5 select-none sm:gap-3 sm:p-3 ${
          full ? "h-full" : "h-[calc(100dvh-14rem)] min-h-[520px] rounded-2xl border border-white/5 md:h-[calc(100dvh-10rem)]"
        }`}
      >
        {/* HUD: đồng hồ · điểm · nút */}
        <div className="flex items-center gap-2 text-white">
          <Mascot animated className="pointer-events-none size-9 max-sm:hidden" />
          <Clock className={`size-5 shrink-0 ${low ? "text-red-400" : "text-cyan-300"}`} />
          <span className="h-2.5 max-w-sm min-w-8 flex-1 rounded-full bg-white/10">
            <span className={`block h-full rounded-full ${low ? "bg-red-500" : "bg-cyan-400"}`} style={{ width: `${(v.left / v.limit) * 100}%` }} />
          </span>
          <b className={`w-9 shrink-0 text-sm tabular-nums ${low ? "text-red-400" : ""}`}>{Math.ceil(v.left)}s</b>
          <span className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-black/45 px-3 py-1 text-sm font-extrabold">
            <Trophy className="size-4 text-amber" /> <span className="tabular-nums">{v.score}</span>
            {v.combo >= 3 && <span className="text-xs text-amber">×{v.combo}</span>}
          </span>
          <RoundBtn title={sound ? "Tắt đọc từ khi nối đúng" : "Bật đọc từ khi nối đúng"} onClick={() => setSound(!sound)}>
            {sound ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
          </RoundBtn>
          <RoundBtn title={phase === "play" ? "Tạm dừng (Esc)" : "Tiếp tục"} onClick={() => setPhase(phase === "play" ? "pause" : "play")}>
            {phase === "play" ? <Pause className="size-4" /> : <Play className="size-4" />}
          </RoundBtn>
          <RoundBtn title="Thoát ván" onClick={quit}>
            <X className="size-4" />
          </RoundBtn>
        </div>

        <p className="flex min-w-0 items-center gap-1.5 text-xs text-white/70">
          <Flag className="size-3.5 shrink-0 text-cyan-300" />
          <b className="shrink-0 text-white">
            Mốc {v.milestone + 1}/{v.topics.length}
          </b>
          <span className="truncate">
            · {topic.icon} {topic.title}
          </span>
          <span className="ml-auto shrink-0 tabular-nums">
            {v.mPairs}/{v.goal} cặp
          </span>
        </p>

        {/* Sân thẻ: chia sẵn hàng để sân ít cặp thẻ vẫn cùng cỡ */}
        <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-6 gap-2 sm:grid-cols-3 sm:grid-rows-4 sm:gap-3">
          {v.cards.map((c) => {
            const isWord = c.kind === "word";
            const wrong = v.wrong.includes(c.id);
            const selected = v.selected === c.id;
            return (
              <button
                key={c.id}
                onClick={() => tap(c.id)}
                disabled={c.done}
                aria-pressed={selected}
                lang={isWord ? "de" : "vi"}
                className={`relative flex min-h-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 px-2 text-center text-sm leading-snug font-bold [overflow-wrap:anywhere] transition-colors focus-visible:outline-2 focus-visible:outline-white sm:px-4 sm:text-base ${
                  c.done
                    ? "rain-hit pointer-events-none border-accent bg-accent/20 text-white"
                    : wrong
                      ? "shake border-red bg-red/25 text-white"
                      : selected
                        ? "border-amber bg-amber/25 text-white shadow-[0_0_16px_rgba(250,204,21,0.45)]"
                        : isWord
                          ? "border-teal-500/60 bg-[#0e1b26] text-cyan-100 hover:border-teal-300 hover:bg-[#13283a]"
                          : "border-orange-500/60 bg-[#33221a] text-amber-100 hover:border-orange-300 hover:bg-[#46301f]"
                }`}
              >
                <span aria-hidden className={`absolute top-1 left-2 text-[10px] font-extrabold ${isWord ? "text-teal-400" : "text-orange-400"}`}>
                  {isWord ? "Aa" : "•••"}
                </span>
                {isWord ? fullWord(c.w) : c.w.meaning}
                {c.points > 0 && <span className="absolute top-1 right-2 text-sm font-extrabold text-gem">+{c.points}</span>}
              </button>
            );
          })}
        </div>

        {note && <p className="sheet-fade pointer-events-none absolute inset-x-0 top-24 z-10 mx-auto w-fit max-w-[90%] rounded-xl bg-cyan-500 px-3 py-1.5 text-center text-sm font-bold text-white">{note}</p>}

        {/* Lớp phủ: tạm dừng / thua / thắng */}
        {phase !== "play" && (
          <div className="absolute inset-0 z-20 flex flex-col items-center overflow-y-auto bg-[#06181c]/95 p-4 backdrop-blur-sm">
            <div className="m-auto flex w-full max-w-md flex-col items-center gap-4 text-center">
              {phase === "pause" ? (
                <>
                  <p className="text-xl font-extrabold">Tạm dừng</p>
                  <button className="btn btn-primary w-full py-3" onClick={() => setPhase("play")}>
                    <Play className="size-5" /> Tiếp tục
                  </button>
                  <button className="btn w-full" onClick={quit}>
                    Thoát ván
                  </button>
                </>
              ) : (
                <>
                  <p className="text-xl font-extrabold">{phase === "win" ? "🎉 Vượt hết các mốc!" : v.left > 0 ? "Đã thoát ván" : "Hết giờ!"}</p>
                  <p className="text-5xl font-extrabold text-gem tabular-nums">{v.score}</p>
                  {v.score > v.best ? (
                    <p className="flex items-center gap-1.5 font-bold text-amber">
                      <Trophy className="size-5" /> Kỷ lục mới!
                    </p>
                  ) : (
                    <p className="text-sm text-muted">Kỷ lục: {best}</p>
                  )}
                  {!loggedIn && <GuestResult name={guest.name} score={v.score} record={v.score > v.best} />}
                  <p className="text-sm text-muted">
                    Nối đúng {v.pairs} cặp · {phase === "win" ? `qua cả ${v.topics.length} mốc` : `dừng ở mốc ${v.milestone + 1}/${v.topics.length}`}
                  </p>
                  {current && (
                    <p className="text-sm text-muted">
                      Đã gặp {Math.min(v.seenCount, current.wordCount)}/{current.wordCount} từ của bộ
                      {v.fresh > 0 && ` · ${v.fresh} từ mới ván này`}
                      {phase === "win" && v.seenCount < current.wordCount && ` · chơi lại để gặp thêm ${current.wordCount - v.seenCount} từ`}
                    </p>
                  )}
                  {!!missed.length && (
                    <div className="w-full text-left">
                      <p className="label mb-2">Từ bị nhầm</p>
                      <ul className="card divide-y divide-border p-0">
                        {missed.map((w) => (
                          <li key={w.key} className="flex items-baseline gap-2 px-3 py-2">
                            <button className="cursor-pointer font-bold hover:underline" onClick={() => speakGerman(fullWord(w))}>
                              {fullWord(w)}
                            </button>
                            <span className="ml-auto text-right text-sm text-muted">{w.meaning}</span>
                          </li>
                        ))}
                      </ul>
                      {saved ? (
                        <p className="mt-2 text-center text-sm font-bold text-accent-text">{saved}</p>
                      ) : loggedIn ? (
                        <>
                          {saveError && <p className="mt-2 text-center text-sm text-red-400">{saveError}</p>}
                          <button className="btn btn-amber mt-3 w-full" disabled={saving} onClick={saveMissed}>
                            <BookmarkPlus className="size-4" /> {saveError ? "Thử lưu lại" : "Lưu vào sổ để ôn"}
                          </button>
                        </>
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
      </div>
    </div>
  );
}
