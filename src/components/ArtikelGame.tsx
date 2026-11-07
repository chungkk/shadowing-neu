"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Check, Clock, Flame, Play, Trophy, Volume2, VolumeX, X } from "lucide-react";
import { ARTIKEL_SECONDS, ARTIKELS, type Artikel, type ArtikelGameWord } from "@/lib/artikel";
import { clientApi } from "@/lib/client-api";
import { speakGerman, stopSpeaking } from "@/lib/speak";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { GameHeader, LevelTile } from "./GameParts";
import { GuestResult, useGuestGate } from "./GuestPlay";

/**
 * Game Der Die Das, chỉ để vui (không cược kim cương): chọn đúng mạo từ cho từng danh từ, đúng liên tiếp càng nhiều càng tốt.
 * Sai hoặc hết giờ là hết ván. Chơi hẳn trên trình duyệt (không có gì để gian lận); kỷ lục từng bộ lưu trong trình duyệt.
 * Khách chơi được bằng tên tạm.
 */

type DeckOption = { slug: string; title: string; level: string; wordCount: number };
type Miss = ArtikelGameWord & { timedOut: boolean };

const STORE = "artikel"; // tiền tố khoá localStorage
const FLASH_MS = 550; // hiện "Chính xác" trước khi sang từ mới
const fmt = (n: number) => n.toLocaleString("vi-VN");
const COLOR: Record<Artikel, string> = {
  der: "bg-sky-500 text-white",
  die: "bg-rose-500 text-white",
  das: "bg-emerald-600 text-white",
};
const TEXT: Record<Artikel, string> = { der: "text-sky-600 dark:text-sky-300", die: "text-rose-600 dark:text-rose-300", das: "text-emerald-600 dark:text-emerald-300" };

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

function Rules() {
  return (
    <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted">
      <li>Mỗi từ có {ARTIKEL_SECONDS} giây để chọn der, die hoặc das (phím 1, 2, 3).</li>
      <li>Đúng liên tiếp càng nhiều càng tốt. Sai hoặc hết giờ là hết ván.</li>
      <li>Chơi cho vui, không cược kim cương. Kỷ lục từng bộ được lưu trên máy này.</li>
    </ul>
  );
}

export default function ArtikelGame({ decks, loggedIn }: { decks: DeckOption[]; loggedIn: boolean }) {
  const [deck, setDeck] = useLocalStorage(`${STORE}-deck`, decks[0]?.slug ?? "");
  const [sound, setSound] = useLocalStorage(`${STORE}-sound`, true);
  const [bests, setBests] = useLocalStorage<Record<string, number>>(`${STORE}-best`, {});
  const [phase, setPhase] = useState<"menu" | "loading" | "word" | "flash" | "over">("menu");
  const [queue, setQueue] = useState<ArtikelGameWord[]>([]);
  const [streak, setStreak] = useState(0);
  const [last, setLast] = useState<{ score: number; best: number; miss: Miss | null } | null>(null);
  const [error, setError] = useState("");
  const [left, setLeft] = useState(0); // ms còn lại của từ đang hiện
  const cache = useRef(new Map<string, ArtikelGameWord[]>());
  const current = decks.find((d) => d.slug === deck) ?? decks[0];
  const word = queue[streak % Math.max(1, queue.length)];
  const best = (current && bests[current.slug]) || 0;

  useEffect(() => stopSpeaking, []);

  async function start() {
    if (!current) return;
    setError("");
    setPhase("loading");
    try {
      let words = cache.current.get(current.slug);
      if (!words) {
        words = (await clientApi<{ words: ArtikelGameWord[] }>(`/games/artikel?deck=${current.slug}`)).words;
        cache.current.set(current.slug, words);
      }
      setQueue(shuffle(words));
      setStreak(0);
      setPhase("word");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError((e as Error).message);
      setPhase("menu");
    }
  }
  const guest = useGuestGate(loggedIn, () => void start()); // khách: hỏi tên tạm trước khi vào ván

  function end(miss: Miss | null) {
    const prev = best;
    if (current && streak > prev) setBests({ ...bests, [current.slug]: streak });
    setLast({ score: streak, best: prev, miss });
    setPhase("over");
  }

  function answer(a: Artikel | null) {
    if (phase !== "word" || !word) return;
    if (sound) void speakGerman(`${word.gender} ${word.word}`);
    if (a !== word.gender) return end({ ...word, timedOut: a === null });
    setPhase("flash");
  }

  // Sau khi đúng: hiện "Chính xác" một chút rồi sang từ mới (hết từ thì trộn lại bộ)
  useEffect(() => {
    if (phase !== "flash") return;
    const t = setTimeout(() => {
      const next = streak + 1;
      if (next % queue.length === 0) setQueue((q) => shuffle(q));
      setStreak(next);
      setPhase("word");
    }, FLASH_MS);
    return () => clearTimeout(t);
  }, [phase, streak, queue.length]);

  const onTimeout = useEffectEvent(() => answer(null));
  useEffect(() => {
    if (phase !== "word") return;
    const until = performance.now() + ARTIKEL_SECONDS * 1000;
    const tick = () => {
      const ms = Math.max(0, until - performance.now());
      setLeft(ms);
      if (ms === 0) {
        clearInterval(timer);
        onTimeout();
      }
    };
    const timer = setInterval(tick, 100);
    tick();
    return () => clearInterval(timer);
  }, [phase, streak]);

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (phase === "word" && ["1", "2", "3"].includes(e.key)) answer(ARTIKELS[Number(e.key) - 1]);
    else if ((phase === "over" || phase === "menu") && e.key === "Enter" && !guest.dialog) guest.gate(0);
  });
  useEffect(() => {
    const on = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);

  const header = (
    <GameHeader
      icon={Flame}
      tone="cyan"
      title="Der Die Das"
      subtitle="Chọn đúng mạo từ, đúng liên tiếp càng lâu càng giỏi"
      right={
        <button className="btn-icon" title={sound ? "Tắt tiếng" : "Bật tiếng"} onClick={() => setSound(!sound)}>
          {sound ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
        </button>
      }
    />
  );
  const errorLine = error && <p className="text-center text-sm font-bold text-red-500 dark:text-red-400">{error}</p>;

  if ((phase === "word" || phase === "flash") && word) {
    return (
      <>
        {header}
        <div className="sticker flex flex-col gap-5 p-5">
          <div className="flex items-center justify-between text-sm font-bold">
            <span className="inline-flex items-center gap-1">
              <Flame className="size-4 text-amber" /> {streak} từ liên tiếp
              {best > 0 && <span className="font-normal text-muted"> · kỷ lục {fmt(best)}</span>}
            </span>
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Clock className="size-4" /> {phase === "flash" ? ARTIKEL_SECONDS : Math.ceil(left / 1000)}s
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-card-2">
            <div className="h-full rounded-full bg-cyan-500" style={{ width: `${phase === "flash" ? 100 : (left / (ARTIKEL_SECONDS * 1000)) * 100}%` }} />
          </div>
          <div className="py-4 text-center">
            {phase === "flash" ? (
              <p className="inline-flex items-center gap-1.5 text-sm font-extrabold text-emerald-600 dark:text-emerald-300">
                <Check className="size-4" strokeWidth={3} /> Chính xác
              </p>
            ) : null}
            <p className="text-3xl font-black break-words md:text-4xl">
              {phase === "flash" && <span className={TEXT[word.gender]}>{word.gender} </span>}
              {word.word}
            </p>
            <p className="mt-2 text-muted">{word.meaning}</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {ARTIKELS.map((a, i) => (
              <button key={a} className={`btn py-4 text-lg font-extrabold ${COLOR[a]}`} disabled={phase !== "word"} onClick={() => answer(a)}>
                {a} <span className="text-xs opacity-70 max-md:hidden">({i + 1})</span>
              </button>
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {header}
      {phase === "over" && last && (
        <div className="sticker flex flex-col items-center gap-2 p-5 text-center">
          {last.miss && (
            <>
              <p className="inline-flex items-center justify-center gap-1.5 text-sm font-extrabold text-red-500 dark:text-red-400">
                <X className="size-4" strokeWidth={3} /> {last.miss.timedOut ? "Hết giờ" : "Chưa đúng"}
              </p>
              <p className="text-2xl font-black break-words">
                <span className={TEXT[last.miss.gender]}>{last.miss.gender}</span> {last.miss.word}
              </p>
              <p className="text-muted">{last.miss.meaning}</p>
            </>
          )}
          <p className="mt-1 inline-flex items-center gap-1.5 font-bold">
            <Trophy className="size-4 text-amber" /> Đúng {fmt(last.score)} từ liên tiếp
            {last.score > last.best && last.score > 0 ? " · kỷ lục mới!" : last.best > 0 ? ` · kỷ lục ${fmt(last.best)}` : ""}
          </p>
          {!loggedIn && <GuestResult name={guest.name} score={last.score} record={last.score > last.best} />}
        </div>
      )}
      <div className="sticker flex flex-col gap-4 p-4">
        {guest.chip}
        <div>
          <p className="mb-2 text-sm font-extrabold">Bộ từ</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {decks.map((d) => (
              <button
                key={d.slug}
                aria-pressed={d.slug === current?.slug}
                onClick={() => setDeck(d.slug)}
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-2.5 text-left transition ${d.slug === current?.slug ? "border-ink bg-cyan-200/60 dark:bg-cyan-400/25" : "border-border bg-card hover:border-cyan-600"}`}
              >
                <LevelTile level={d.level} />
                <span className="min-w-0">
                  <span className="block truncate font-extrabold">{d.title}</span>
                  <span className="text-xs text-muted">
                    {fmt(d.wordCount)} danh từ{bests[d.slug] ? ` · kỷ lục ${fmt(bests[d.slug])}` : ""}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
        <Rules />
        {errorLine}
        <button className="btn btn-amber py-3" disabled={!current || phase === "loading"} onClick={() => guest.gate(0)}>
          <Play className="size-4 fill-current" /> {phase === "over" ? "Chơi lại" : phase === "loading" ? "Đang tải…" : "Bắt đầu"}
        </button>
      </div>
      {guest.dialog}
    </>
  );
}
