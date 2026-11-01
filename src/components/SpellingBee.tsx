"use client";

import { useEffect, useEffectEvent, useRef, useState, type KeyboardEvent } from "react";
import { ArrowRight, BookmarkPlus, Eye, Flag, Keyboard, Lightbulb, RotateCcw, Snail, Trophy, Volume2, X } from "lucide-react";
import { clientApi } from "@/lib/client-api";
import { fullWord } from "@/lib/deck-study";
import { shuffle } from "@/lib/review";
import { speakGerman, stopSpeaking } from "@/lib/speak";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { DeckMenu, GameHeader, ScreenKeyboard, sameLetter, toneButton, useCoarsePointer, type DeckOption, type GameWord, type Topic } from "./GameParts";

/**
 * Game "Ong đánh vần": nghe phát âm, gõ lại từ đúng chính tả vào các ô chữ.
 * Mỗi chủ đề của bộ từ là 1 mốc (1 lượt 10 từ) — đúng ≥ 70% thì mở mốc kế; tiến độ mốc lưu theo bộ.
 * Gõ bắt từng phím như Mưa từ vựng (không có ô nhập → bộ gõ tiếng Việt không chen vào); gõ được tự do, xoá bằng Backspace.
 * Gợi ý: xem nghĩa (−2 điểm), lộ 1 chữ (−3 điểm). Gõ a/o/u/s thay ä/ö/ü/ß → tính "gần đúng", nửa điểm.
 */

type Mark = "ok" | "near" | "wrong";
type Answer = { w: GameWord; result: "perfect" | "near" | "wrong"; points: number };
type Round = { topics: Topic[]; milestone: number; words: GameWord[] };
type Phase = "menu" | "loading" | "play" | "done";

const ROUND = 10;
const PASS = 0.7; // phần từ phải đúng để qua mốc

const isLetter = (c: string) => /\p{L}/u.test(c);
/** Thêm các ký tự không cần gõ (gạch nối) đứng ngay sau phần đã gõ */
const autoFill = (typed: string, word: string) => {
  while (typed.length < word.length && !isLetter(word[typed.length])) typed += word[typed.length];
  return typed;
};
/** Chấm từng chữ: đúng · gần đúng (thiếu umlaut / ß) · sai */
const marks = (typed: string, word: string): Mark[] =>
  [...word].map((c, i) => {
    const t = typed[i]?.toLowerCase();
    if (!t || !isLetter(c)) return t ? "ok" : "wrong";
    return t === c.toLowerCase() ? "ok" : sameLetter(t, c) ? "near" : "wrong";
  });

/** Màu theo giống — như trang bộ từ: der xanh dương · die đỏ · das xanh lá */
const GENDER_TEXT: Record<string, string> = { der: "text-phrase", die: "text-red-400", das: "text-accent" };
const TILE: Record<Mark, string> = {
  ok: "bg-emerald-400 text-emerald-950 shadow-[0_4px_0_#047857]",
  near: "bg-amber text-amber-950 shadow-[0_4px_0_#a16207]",
  wrong: "bg-red-400 text-red-950 shadow-[0_4px_0_#991b1b]",
};

export default function SpellingBee({ decks }: { decks: DeckOption[] }) {
  const [deck, setDeck] = useLocalStorage("spellingbee-deck", decks[0]?.slug ?? "");
  const [osk, setOsk] = useLocalStorage<boolean | null>("spellingbee-osk", null); // null: tự chọn theo thiết bị
  const [best, setBest] = useLocalStorage(`spellingbee-best-${deck}`, 0);
  const [cleared, setCleared] = useLocalStorage(`spellingbee-milestone-${deck}`, 0);
  const coarse = useCoarsePointer();
  const [phase, setPhase] = useState<Phase>("menu");
  const [error, setError] = useState("");
  const [round, setRound] = useState<Round | null>(null);
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [checked, setChecked] = useState(false);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [meaning, setMeaning] = useState(false); // đã bấm xem nghĩa
  const [reveals, setReveals] = useState(0); // số chữ đã lộ bằng gợi ý
  const [speaking, setSpeaking] = useState(false);
  const [shake, setShake] = useState(0);
  const [saved, setSaved] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const cache = useRef(new Map<string, { words: GameWord[]; topics: Topic[] }>());
  const inputRef = useRef<HTMLInputElement>(null);
  const current = decks.find((d) => d.slug === deck) ?? decks[0];
  const keyboard = osk ?? coarse; // bàn phím trên màn hình: mặc định bật trên màn cảm ứng
  const nativeKeyboard = coarse && !keyboard;
  const word = round?.words[idx];

  useEffect(() => () => stopSpeaking(), []);

  const say = (w: GameWord, slow = false) => {
    setSpeaking(true);
    void speakGerman(fullWord(w), { slow, onEnd: () => setSpeaking(false) });
  };

  const focusInput = () => requestAnimationFrame(() => inputRef.current?.focus());

  const loadWord = (r: Round, i: number) => {
    setIdx(i);
    setTyped(autoFill("", r.words[i].word));
    setChecked(false);
    setMeaning(false);
    setReveals(0);
    say(r.words[i]);
  };

  /** Vào lượt của mốc `from` (hết mốc rồi thì từ đầu) */
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
    const milestone = from < data.topics.length ? from : 0;
    const r = { topics: data.topics, milestone, words: shuffle(data.words.filter((w) => w.topic === data.topics[milestone].id)).slice(0, ROUND) };
    setRound(r);
    setAnswers([]);
    setScore(0);
    setStreak(0);
    setSaved(null);
    setPhase("play");
    loadWord(r, 0);
    focusInput();
  }

  const quit = () => {
    stopSpeaking();
    setPhase("menu");
  };

  function check() {
    if (!word || checked) return;
    if (typed.length < word.word.length) return setShake((n) => n + 1);
    const m = marks(typed, word.word);
    const result = m.includes("wrong") ? "wrong" : m.includes("near") ? "near" : "perfect";
    const base = result === "wrong" ? 0 : 10 + 2 * Math.min(streak, 5) - (meaning ? 2 : 0) - 3 * reveals;
    const points = result === "wrong" ? 0 : Math.max(1, result === "near" ? Math.round(base / 2) : base);
    setChecked(true);
    setScore((s) => s + points);
    setStreak((s) => (result === "wrong" ? 0 : s + 1));
    setAnswers((a) => [...a, { w: word, result, points }]);
    if (result !== "perfect") say(word, true); // sai → đọc chậm lại đáp án
  }

  function next() {
    if (!round) return;
    if (idx + 1 < round.words.length) return loadWord(round, idx + 1);
    stopSpeaking();
    const right = answers.filter((a) => a.result !== "wrong").length;
    if (right >= Math.ceil(round.words.length * PASS) && round.milestone + 1 > cleared) setCleared(round.milestone + 1);
    if (score > best) setBest(score);
    setPhase("done");
  }

  /** Lộ chữ đầu tiên chưa đúng (các chữ trước đó sửa thành đúng) */
  function reveal() {
    if (!word || checked) return;
    const m = marks(typed, word.word);
    const at = m.findIndex((x, i) => x !== "ok" || i >= typed.length);
    if (at < 0) return;
    setTyped(autoFill(word.word.slice(0, at + 1), word.word));
    setReveals((n) => n + 1);
  }

  /** 1 phím (bàn phím thật / trên màn hình / hệ thống) → true nếu game dùng phím đó */
  function handleKey(key: string) {
    if (phase !== "play" || !word) return false;
    if (key === "Enter") {
      if (checked) next();
      else check();
    }
    else if (key === " ") say(word);
    else if (checked) return false;
    else if (key === "Backspace") setTyped(typed.slice(0, -1).replace(/[^\p{L}]+$/u, ""));
    else if (key.length === 1 && isLetter(key)) {
      if (typed.length < word.word.length) setTyped(autoFill(typed + key.toLowerCase(), word.word));
    } else return false;
    return true;
  }

  // Phím thật: bắt ở cả trang (không có ô nhập → bộ gõ tiếng Việt không chen vào)
  const onWindowKey = useEffectEvent((e: globalThis.KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.isComposing || (e.target as HTMLElement).tagName === "INPUT") return;
    if (handleKey(e.key)) e.preventDefault();
  });
  useEffect(() => {
    if (phase !== "play") return;
    const on = (e: globalThis.KeyboardEvent) => onWindowKey(e);
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [phase]);

  /** Ô nhập ẩn (bàn phím hệ thống): lấy từng chữ rồi để trống lại */
  const onNativeKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" || e.key === "Enter") {
      e.preventDefault();
      handleKey(e.key);
    }
  };

  async function saveMissed(words: GameWord[]) {
    if (!current) return;
    setSaving(true);
    try {
      const r = await clientApi<{ added: number }>(`/vocab/decks/${current.slug}`, { method: "POST", body: { words: words.map((w) => w.word) } });
      setSaved(r.added ? `Đã thêm ${r.added} từ vào sổ` : "Các từ này đã có trong sổ");
    } catch (e) {
      setSaved((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const header = (
    <GameHeader
      icon={Volume2}
      tone="amber"
      title="Ong đánh vần"
      subtitle="Nghe phát âm và gõ lại từ đúng chính tả"
      onBack={phase === "menu" || phase === "loading" ? undefined : quit}
    />
  );

  // ---- Màn chọn bộ từ ----
  if (phase === "menu" || phase === "loading" || !round) {
    return (
      <div className="flex flex-col gap-5">
        {header}
        <DeckMenu
          tone="amber"
          icon={Volume2}
          intro={`Mỗi chủ đề là một mốc gồm ${ROUND} từ — đánh vần đúng ${PASS * 100}% để mở mốc kế. Bấm Space để nghe lại, Enter để kiểm tra.`}
          decks={decks}
          current={current}
          onSelect={setDeck}
          progressKey={(slug) => `spellingbee-milestone-${slug}`}
          cleared={cleared}
          best={best}
          loading={phase === "loading"}
          error={error}
          onStart={start}
        />
      </div>
    );
  }

  const topic = round.topics[round.milestone];
  const total = round.words.length;
  const right = answers.filter((a) => a.result !== "wrong").length;
  const passed = right >= Math.ceil(total * PASS);
  const last = answers.at(-1);
  const m = word && checked ? marks(typed, word.word) : null;
  const long = (word?.word.length ?? 0) > 10;

  return (
    <div className="flex flex-col gap-3">
      {header}
      <div
        onPointerDown={() => nativeKeyboard && focusInput()}
        className={`honeycomb relative flex flex-col overflow-hidden rounded-2xl border border-amber/20 bg-[radial-gradient(ellipse_at_top,#7c3e0a_0%,#2a1404_55%,#140a03_100%)] select-none ${
          keyboard ? "min-h-[calc(100dvh-24rem)] md:min-h-[calc(100dvh-20rem)]" : "min-h-[calc(100dvh-14rem)] md:min-h-[calc(100dvh-10rem)]"
        } min-h-[400px]`}
      >
        {/* HUD: điểm · tiến độ lượt · mốc · nút */}
        <div className="relative z-10 flex items-start justify-between gap-2 p-3">
          <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/45 px-3 py-1 text-sm font-extrabold text-white backdrop-blur">
            <Trophy className="size-4 text-amber" /> <span className="tabular-nums">{score}</span>
            {streak >= 3 && <span className="text-xs text-amber">×{streak}</span>}
          </span>
          <span className="flex min-w-0 flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-black/45 px-3 py-1.5 text-sm text-white backdrop-blur">
            <span className="flex min-w-0 items-center gap-1.5">
              <Flag className="size-4 shrink-0 text-amber" />
              <b className="shrink-0">
                Mốc {round.milestone + 1}/{round.topics.length}
              </b>
              <span className="truncate text-white/70 max-sm:hidden">
                · {topic.icon} {topic.title}
              </span>
            </span>
            {/* Mỗi từ 1 chấm: xanh đúng · vàng gần đúng · đỏ sai */}
            <span className="flex gap-1">
              {round.words.map((_, i) => (
                <span
                  key={i}
                  className={`size-2 rounded-full ${
                    answers[i]
                      ? answers[i].result === "perfect"
                        ? "bg-emerald-400"
                        : answers[i].result === "near"
                          ? "bg-amber"
                          : "bg-red-400"
                      : i === idx
                        ? "bg-white"
                        : "bg-white/20"
                  }`}
                />
              ))}
            </span>
          </span>
          <span className="flex gap-2" onPointerDown={(e) => e.stopPropagation()}>
            <button title="Bàn phím trên màn hình" onClick={() => setOsk(!keyboard)} className={`flex size-9 cursor-pointer items-center justify-center rounded-full border backdrop-blur ${keyboard ? "border-amber bg-amber/25 text-amber" : "border-white/10 bg-black/40 text-white/85"}`}>
              <Keyboard className="size-4" />
            </button>
            <button title="Thoát" onClick={quit} className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/85 backdrop-blur">
              <X className="size-4" />
            </button>
          </span>
        </div>

        {/* Hoa trang trí */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/emoji/1f33b.webp" alt="" className="pointer-events-none absolute -bottom-3 -left-3 size-16 opacity-80" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/emoji/1f338.webp" alt="" className="pointer-events-none absolute -right-2 -bottom-2 size-14 opacity-80" />

        {phase === "play" && word ? (
          <div className="relative flex flex-1 flex-col items-center justify-center gap-5 px-4 pb-8">
            {/* Ong · loa · hũ mật */}
            <div className="flex items-center gap-4 sm:gap-10" onPointerDown={(e) => e.stopPropagation()}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/emoji/1f41d.webp" alt="" className="bob size-14 sm:size-20" />
              <button
                title="Nghe lại (Space)"
                onClick={() => say(word)}
                className="relative flex size-24 cursor-pointer items-center justify-center rounded-full bg-gradient-to-b from-amber to-amber-500 text-amber-950 shadow-[0_6px_0_#a16207,0_0_40px_rgba(250,204,21,0.45)] transition active:translate-y-1 active:shadow-[0_2px_0_#a16207] sm:size-28"
              >
                {speaking && <span className="absolute inset-0 animate-ping rounded-full bg-amber/40 motion-reduce:hidden" />}
                <Volume2 className="relative size-12 sm:size-14" />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/emoji/1f36f.webp" alt="" className="bob size-12 [animation-delay:-1.2s] sm:size-16" />
            </div>

            <div className="flex flex-wrap justify-center gap-2" onPointerDown={(e) => e.stopPropagation()}>
              <button className="btn border-white/10 bg-black/40 text-white" onClick={() => say(word, true)}>
                <Snail className="size-4" /> Đọc chậm
              </button>
              <button className="btn border-white/10 bg-black/40 text-white" disabled={meaning || checked} onClick={() => setMeaning(true)}>
                <Eye className="size-4" /> Xem nghĩa
              </button>
              <button className="btn border-white/10 bg-black/40 text-white" disabled={checked} onClick={reveal}>
                <Lightbulb className="size-4" /> Lộ 1 chữ
              </button>
            </div>
            <p className={`min-h-6 text-center font-bold text-amber-100 ${meaning || checked ? "" : "invisible"}`}>“{word.meaning}”</p>

            {/* Ô chữ */}
            <div key={shake} className={`flex max-w-full flex-wrap justify-center gap-1.5 ${shake ? "shake" : ""}`}>
              {[...word.word].map((c, i) => {
                const t = typed[i];
                const size = long ? "h-10 w-8 text-xl sm:h-12 sm:w-10" : "h-12 w-10 text-2xl sm:h-14 sm:w-12 sm:text-3xl";
                if (!isLetter(c)) return <span key={i} className={`flex items-center justify-center font-black text-white ${size}`}>{c}</span>;
                return (
                  <span
                    key={i}
                    className={`flex items-center justify-center rounded-lg font-black ${size} ${
                      m ? TILE[m[i]] : `bg-white text-stone-900 shadow-[0_4px_0_#a8a29e] ${i === typed.length ? "ring-3 ring-amber" : ""}`
                    }`}
                  >
                    {/* Đã kiểm tra: ô sai giữ chữ đã gõ (đáp án hiện bên dưới), ô gần đúng hiện chữ có dấu */}
                    {m ? (m[i] === "near" ? c : t) : (t ?? <span className="text-stone-300">_</span>)}
                  </span>
                );
              })}
            </div>

            {/* Kết quả từ vừa kiểm tra / nút kiểm tra */}
            {checked && last ? (
              <div className="flex flex-col items-center gap-3 text-center">
                <p className="text-lg font-extrabold">
                  {last.result === "perfect" ? (
                    <span className="text-emerald-300">Chính xác! +{last.points}</span>
                  ) : last.result === "near" ? (
                    <span className="text-amber">Gần đúng — nhớ dấu umlaut / ß · +{last.points}</span>
                  ) : (
                    <span className="text-red-300">Chưa đúng</span>
                  )}
                </p>
                <p className="text-2xl font-extrabold">
                  {GENDER_TEXT[word.gender] && <span className={GENDER_TEXT[word.gender]}>{word.gender} </span>}
                  {word.word}
                </p>
                <button className={toneButton("amber")} onClick={next} onPointerDown={(e) => e.stopPropagation()}>
                  {idx + 1 < total ? "Từ tiếp" : "Xem kết quả"} <ArrowRight className="size-4" />
                </button>
              </div>
            ) : (
              <button className={toneButton("amber")} onClick={check} onPointerDown={(e) => e.stopPropagation()}>
                Kiểm tra
              </button>
            )}
          </div>
        ) : (
          // ---- Kết quả lượt ----
          <div className="relative m-auto flex w-full max-w-md flex-col items-center gap-4 px-4 pb-10 text-center">
            <p className="text-xl font-extrabold">{passed ? `🎉 Vượt mốc ${round.milestone + 1}!` : "Chưa qua mốc"}</p>
            <p className="text-5xl font-extrabold text-amber tabular-nums">{score}</p>
            <p className="text-sm text-amber-100/80">
              Đúng {right}/{total} từ{!passed && ` · cần ${Math.ceil(total * PASS)} để qua mốc`}
              {score >= best && score > 0 && " · kỷ lục mới!"}
            </p>
            {answers.some((a) => a.result === "wrong") && (
              <div className="w-full text-left">
                <p className="label mb-2">Từ viết sai</p>
                <ul className="card divide-y divide-border p-0">
                  {answers
                    .filter((a) => a.result === "wrong")
                    .map(({ w }) => (
                      <li key={w.word} className="flex items-baseline gap-2 px-3 py-2">
                        <button className="cursor-pointer font-bold hover:underline" onClick={() => speakGerman(fullWord(w))}>
                          {GENDER_TEXT[w.gender] && <span className={GENDER_TEXT[w.gender]}>{w.gender} </span>}
                          {w.word}
                        </button>
                        <span className="ml-auto text-right text-sm text-muted">{w.meaning}</span>
                      </li>
                    ))}
                </ul>
                {saved ? (
                  <p className="mt-2 text-center text-sm font-bold text-accent">{saved}</p>
                ) : (
                  <button className="btn btn-amber mt-3 w-full" disabled={saving} onClick={() => saveMissed(answers.filter((a) => a.result === "wrong").map((a) => a.w))}>
                    <BookmarkPlus className="size-4" /> Lưu vào sổ để ôn
                  </button>
                )}
              </div>
            )}
            <div className="flex w-full gap-2">
              <button className="btn flex-1" onClick={() => start(round.milestone)}>
                <RotateCcw className="size-4" /> Chơi lại mốc
              </button>
              {passed && round.milestone + 1 < round.topics.length && (
                <button className={`${toneButton("amber")} flex-1`} onClick={() => start(round.milestone + 1)}>
                  Mốc tiếp <ArrowRight className="size-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Ô nhập ẩn: chỉ để bật bàn phím hệ thống trên màn cảm ứng (luôn để trống, chữ chuyển ngay cho game) */}
        {nativeKeyboard && phase === "play" && (
          <input
            ref={inputRef}
            value=""
            onChange={(e) => [...e.target.value].forEach(handleKey)}
            onKeyDown={onNativeKey}
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

      {keyboard && phase === "play" && (
        <ScreenKeyboard onKey={handleKey} enter={{ label: checked ? "Tiếp" : "Kiểm tra", title: checked ? "Từ tiếp" : "Kiểm tra", className: "border-amber bg-amber text-black" }} />
      )}
    </div>
  );
}
