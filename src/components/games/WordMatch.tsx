"use client";

import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import { BookmarkPlus, Clock, Flag, Maximize2, Minimize2, Pause, Play, Puzzle, RotateCcw, Trophy, Volume2, VolumeX, X } from "lucide-react";
import { clientApi } from "@/lib/client-api";
import { fullWord } from "@/lib/deck-study";
import type { GameWord, Topic } from "@/lib/games/falling-words";
import { prefetchGerman, speakGerman, stopSpeaking } from "@/lib/speak";
import { MILESTONE_PAIRS, TIME_BONUS, TIME_PENALTY, newGame, nextMilestone, pick, snapshot, step, type Game, type Phase, type View } from "@/lib/games/word-match";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { GuestResult, useGuestGate } from "./GuestPlay";
import Mascot from "../Mascot";
import { DeckMenu, GameHeader, type DeckOption } from "./GameParts";

/**
 * Game Nối từ: sân gồm thẻ từ tiếng Đức và thẻ nghĩa tiếng Việt xáo lẫn, bấm 1 từ + 1 nghĩa để nối trước khi hết giờ.
 * Mỗi chủ đề của bộ từ là 1 mốc; tiến độ mốc lưu theo bộ. Từ nối nhầm hiện lại cuối ván, lưu được vào sổ để ôn.
 */

const STORE = "wordmatch"; // tiền tố khoá localStorage
const PAINT_MS = 100; // đồng hồ chạy theo khung hình, giao diện vẽ lại thưa hơn (bấm thẻ thì vẽ ngay)

const RoundBtn = ({ title, onClick, children }: { title: string; onClick: () => void; children: ReactNode }) => (
  <button title={title} aria-label={title} onClick={onClick} className="g-round size-9">
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
        className={`theme-night g-field-match relative flex flex-col gap-2 overflow-hidden p-2.5 select-none sm:gap-3 sm:p-3 ${
          full ? "h-full" : "g-stage h-[calc(100dvh-14rem)] min-h-[520px] md:h-[calc(100dvh-10rem)]"
        }`}
      >
        {/* HUD: đồng hồ · điểm · nút */}
        <div className="flex items-center gap-2 text-white">
          <Mascot animated className="pointer-events-none size-9 max-sm:hidden" />
          <Clock className={`size-5 shrink-0 ${low ? "text-red-400" : "text-[var(--tone-text)]"}`} />
          <span className="g-hud-bar h-2.5 max-w-sm min-w-8 flex-1">
            <span className={low ? "bg-red" : ""} style={{ width: `${(v.left / v.limit) * 100}%` }} />
          </span>
          <b className={`w-9 shrink-0 text-sm tabular-nums ${low ? "text-red-400" : ""}`}>{Math.ceil(v.left)}s</b>
          <span className="g-hud ml-auto shrink-0">
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
          <Flag className="size-3.5 shrink-0 text-[var(--tone-text)]" />
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
                className={`g-mcard ${isWord ? "g-mcard-word" : "g-mcard-mean"} ${c.done ? "g-mcard-done rain-hit" : wrong ? "g-mcard-wrong shake" : ""}`}
              >
                <span aria-hidden className="g-mcard-tag">
                  {isWord ? "Aa" : "•••"}
                </span>
                {isWord ? fullWord(c.w) : c.w.meaning}
                {c.points > 0 && <span className="absolute top-1 right-2 text-sm font-extrabold text-amber">+{c.points}</span>}
              </button>
            );
          })}
        </div>

        {note && (
          <p role="status" className="g-toast g-toast-ok top-24">
            {note}
          </p>
        )}

        {/* Lớp phủ: tạm dừng / thua / thắng */}
        {phase !== "play" && (
          <div className="g-overlay g-overlay-night">
            <div className="g-panel">
              {phase === "pause" ? (
                <>
                  <p className="font-display text-2xl font-extrabold">Tạm dừng</p>
                  <button className="btn btn-amber btn-lg btn-block" onClick={() => setPhase("play")}>
                    <Play className="size-5" /> Tiếp tục
                  </button>
                  <button className="btn btn-lg btn-block" onClick={quit}>
                    Thoát ván
                  </button>
                </>
              ) : (
                <>
                  <p className="font-display text-2xl font-extrabold">{phase === "win" ? "🎉 Vượt hết các mốc!" : v.left > 0 ? "Đã thoát ván" : "Hết giờ!"}</p>
                  <p className="g-score">{v.score}</p>
                  {v.score > v.best ? (
                    <p className="badge badge-gold px-3 py-1 text-sm">
                      <Trophy className="size-4" /> Kỷ lục mới!
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
                        <p role="status" className="alert alert-ok mt-2 justify-center">
                          {saved}
                        </p>
                      ) : loggedIn ? (
                        <>
                          {saveError && (
                            <p role="alert" className="alert alert-err mt-2">
                              {saveError}
                            </p>
                          )}
                          <button className="btn btn-soft btn-lg btn-block mt-3" disabled={saving} onClick={saveMissed}>
                            <BookmarkPlus className="size-4" /> {saveError ? "Thử lưu lại" : "Lưu vào sổ để ôn"}
                          </button>
                        </>
                      ) : null}
                    </div>
                  )}
                  <div className="flex w-full gap-2">
                    <button className="btn btn-lg flex-1" onClick={quit}>
                      Đổi bộ từ
                    </button>
                    <button className="btn btn-amber btn-lg flex-1" onClick={() => start(phase === "win" ? 0 : v.milestone)}>
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
