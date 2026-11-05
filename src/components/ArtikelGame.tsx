"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Check, Clock, Gem as GemIcon, Play, Volume2, VolumeX, X } from "lucide-react";
import { ARTIKEL_GOAL, ARTIKEL_LADDER, ARTIKEL_SECONDS, ARTIKEL_STAKES, ARTIKELS, type Artikel, type ArtikelState } from "@/lib/artikel";
import { clientApi } from "@/lib/client-api";
import { emitPoints } from "@/lib/points";
import { speakGerman, stopSpeaking } from "@/lib/speak";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { GameHeader, LevelTile } from "./GameParts";
import { LoginLink } from "./LoginDialog";
import { Gem } from "./PointsBadge";

/**
 * Game Der Die Das: đặt kim cương, chọn mạo từ từng từ, đúng thì chọn chốt hay chơi tiếp. Mọi lượt đều hỏi server (đáp án và kim cương nằm ở server),
 * mở lại trang thì chơi tiếp ván đang dở. Đồng hồ ở đây chỉ để hiện, hạn thật do server giữ.
 */

type DeckOption = { slug: string; title: string; level: string; wordCount: number };

const STORE = "artikel"; // tiền tố khoá localStorage
const fmt = (n: number) => n.toLocaleString("vi-VN");
const COLOR: Record<Artikel, string> = {
  der: "bg-sky-500 text-white",
  die: "bg-rose-500 text-white",
  das: "bg-emerald-600 text-white",
};
const TEXT: Record<Artikel, string> = { der: "text-sky-600 dark:text-sky-300", die: "text-rose-600 dark:text-rose-300", das: "text-emerald-600 dark:text-emerald-300" };

const Diamonds = ({ n }: { n: number }) => (
  <span className="inline-flex items-center gap-1 font-extrabold text-gem tabular-nums">
    <Gem className="size-4" /> {fmt(n)}
  </span>
);

function Rules() {
  return (
    <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted">
      <li>Mỗi từ có {ARTIKEL_SECONDS} giây. Sai, hết giờ hoặc rời đi khi từ đang hiện là mất phần đã đặt.</li>
      <li>Đúng thì chọn chốt lấy kim cương về, hoặc chơi tiếp để tăng hệ số. Tối đa {ARTIKEL_GOAL} từ một ván.</li>
      <li>
        Hệ số theo số từ đúng:{" "}
        {[1, 3, 5, 10].map((n) => `${n} từ ×${ARTIKEL_LADDER[n] / 100}`).join(" · ")}.
      </li>
    </ul>
  );
}

export default function ArtikelGame({ decks, loggedIn }: { decks: DeckOption[]; loggedIn: boolean }) {
  const [deck, setDeck] = useLocalStorage(`${STORE}-deck`, decks[0]?.slug ?? "");
  const [stake, setStake] = useLocalStorage(`${STORE}-stake`, ARTIKEL_STAKES[0]);
  const [sound, setSound] = useLocalStorage(`${STORE}-sound`, true);
  const [state, setState] = useState<ArtikelState | null>(null);
  const [error, setError] = useState("");
  const [left, setLeft] = useState(0); // ms còn lại của từ đang hiện
  const busy = useRef(false); // đang chờ server → bỏ qua lượt bấm thêm
  const current = decks.find((d) => d.slug === deck) ?? decks[0];
  const round = state?.round ?? null;
  const reveal = state?.reveal;
  const result = state?.result;

  useEffect(() => {
    if (!loggedIn) return;
    clientApi<ArtikelState>("/games/artikel")
      .then(setState)
      .catch((e: Error) => setError(e.message));
    return stopSpeaking;
  }, [loggedIn]);

  async function send(payload: { action: string; deck?: string; stake?: number; article?: Artikel | null }) {
    if (busy.current) return;
    busy.current = true;
    setError("");
    try {
      const s = await clientApi<ArtikelState>("/games/artikel", { method: "POST", body: payload });
      setState(s);
      const payout = s.result?.payout ?? 0;
      emitPoints(payout ? { total: s.total - payout, delta: payout, earned: true } : { total: s.total });
      if (sound && s.reveal) void speakGerman(`${s.reveal.gender} ${s.reveal.word}`);
    } catch (e) {
      setError((e as Error).message);
      // Ván đã đổi ở nơi khác (tab khác, hết giờ) → lấy lại đúng tình trạng
      clientApi<ArtikelState>("/games/artikel").then(setState).catch(() => {});
    } finally {
      busy.current = false;
    }
  }

  const onTimeout = useEffectEvent(() => void send({ action: "answer", article: null }));
  const wordKey = round?.phase === "word" ? `${round.correct}|${round.word?.word}` : "";
  const msLeft = round?.msLeft ?? 0;
  useEffect(() => {
    if (!wordKey) return;
    const end = performance.now() + msLeft;
    const tick = () => {
      const ms = Math.max(0, end - performance.now());
      setLeft(ms);
      if (ms === 0) {
        clearInterval(timer);
        onTimeout();
      }
    };
    const timer = setInterval(tick, 100);
    tick();
    return () => clearInterval(timer);
  }, [wordKey, msLeft]);

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (round?.phase === "word" && ["1", "2", "3"].includes(e.key)) void send({ action: "answer", article: ARTIKELS[Number(e.key) - 1] });
    if (round?.phase === "choose" && e.key === "Enter") void send({ action: "next" });
  });
  useEffect(() => {
    const on = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);

  const header = (
    <GameHeader
      icon={GemIcon}
      tone="cyan"
      title="Der Die Das"
      subtitle="Chọn đúng mạo từ, chốt trước khi sai"
      right={
        <button className="btn-icon" title={sound ? "Tắt tiếng" : "Bật tiếng"} onClick={() => setSound(!sound)}>
          {sound ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
        </button>
      }
    />
  );
  const errorLine = error && <p className="text-center text-sm font-bold text-red-500 dark:text-red-400">{error}</p>;

  if (!loggedIn) {
    return (
      <>
        {header}
        <div className="sticker flex flex-col gap-3 p-4">
          <Rules />
          <p className="text-sm font-bold">
            Game dùng kim cương của tài khoản —{" "}
            <LoginLink href={`/login?next=/games/der-die-das`} className="text-link hover:underline">
              đăng nhập
            </LoginLink>{" "}
            để chơi.
          </p>
        </div>
      </>
    );
  }

  if (!state) {
    return (
      <>
        {header}
        {errorLine || <p className="text-center text-sm text-muted">Đang tải…</p>}
      </>
    );
  }

  if (round?.phase === "word" && round.word) {
    return (
      <>
        {header}
        <div className="sticker flex flex-col gap-5 p-5">
          <div className="flex items-center justify-between text-sm font-bold">
            <span>
              Từ {round.correct + 1}/{ARTIKEL_GOAL}
            </span>
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Clock className="size-4" /> {Math.ceil(left / 1000)}s
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-card-2">
            <div className="h-full rounded-full bg-cyan-500" style={{ width: `${(left / (ARTIKEL_SECONDS * 1000)) * 100}%` }} />
          </div>
          <div className="py-4 text-center">
            <p className="text-3xl font-black break-words md:text-4xl">{round.word.word}</p>
            <p className="mt-2 text-muted">{round.word.meaning}</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {ARTIKELS.map((a, i) => (
              <button key={a} className={`btn py-4 text-lg font-extrabold ${COLOR[a]}`} onClick={() => send({ action: "answer", article: a })}>
                {a} <span className="text-xs opacity-70 max-md:hidden">({i + 1})</span>
              </button>
            ))}
          </div>
        </div>
        {errorLine}
      </>
    );
  }

  if (round?.phase === "choose") {
    return (
      <>
        {header}
        <div className="sticker flex flex-col gap-4 p-5 text-center">
          {reveal && (
            <div>
              <p className="inline-flex items-center gap-1.5 text-sm font-extrabold text-emerald-600 dark:text-emerald-300">
                <Check className="size-4" strokeWidth={3} /> Chính xác
              </p>
              <p className="mt-1 text-2xl font-black break-words">
                <span className={TEXT[reveal.gender]}>{reveal.gender}</span> {reveal.word}
              </p>
              <p className="text-muted">{reveal.meaning}</p>
            </div>
          )}
          <p className="text-sm font-bold">
            Đúng {round.correct}/{ARTIKEL_GOAL} từ · đã đặt {fmt(round.stake)}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button className="btn btn-amber py-3" onClick={() => send({ action: "cash" })}>
              Chốt lấy <Gem className="size-5" /> {fmt(round.pot)}
            </button>
            <button className="btn py-3" onClick={() => send({ action: "next" })}>
              Chơi tiếp, đúng thì <Gem className="size-5" /> {fmt(round.nextPot)}
            </button>
          </div>
          {round.nextPot === round.pot && <p className="text-xs text-muted">Đã chạm trần lời 24 giờ, chơi tiếp không tăng thêm kim cương.</p>}
        </div>
        {errorLine}
      </>
    );
  }

  const short = state.total < stake;
  const blocked = !state.limits.roundsLeft || !state.limits.winLeft;
  return (
    <>
      {header}
      {result && (
        <div className="sticker flex flex-col gap-2 p-5 text-center">
          {reveal && !reveal.correct && (
            <>
              <p className="inline-flex items-center justify-center gap-1.5 text-sm font-extrabold text-red-500 dark:text-red-400">
                <X className="size-4" strokeWidth={3} /> {reveal.timedOut ? "Hết giờ" : "Chưa đúng"}
              </p>
              <p className="text-2xl font-black break-words">
                <span className={TEXT[reveal.gender]}>{reveal.gender}</span> {reveal.word}
              </p>
              <p className="text-muted">{reveal.meaning}</p>
            </>
          )}
          {result.won ? (
            <p className="font-bold">
              Đúng {result.correct} từ, nhận về <Diamonds n={result.payout} /> (lời {fmt(result.payout - result.stake)})
              {result.capped && " · đã chạm trần lời 24 giờ"}
            </p>
          ) : (
            <p className="font-bold">
              Đúng {result.correct} từ, mất <Diamonds n={result.stake} />
            </p>
          )}
        </div>
      )}
      <div className="sticker flex flex-col gap-4 p-4">
        <p className="font-bold">
          Bạn đang có <Diamonds n={state.total} />
        </p>
        <div>
          <p className="mb-2 text-sm font-extrabold">Mức đặt</p>
          <div className="grid grid-cols-4 gap-2">
            {ARTIKEL_STAKES.map((n) => (
              <button
                key={n}
                aria-pressed={n === stake}
                className={`btn px-0 py-2.5 ${n === stake ? "bg-gem/20 ring-2 ring-gem" : ""}`}
                disabled={state.total < n}
                onClick={() => setStake(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
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
                  <span className="text-xs text-muted">{fmt(d.wordCount)} danh từ</span>
                </span>
              </button>
            ))}
          </div>
        </div>
        <Rules />
        {errorLine}
        {blocked ? (
          <p className="text-center text-sm font-bold text-muted">Bạn đã chơi đủ giới hạn trong 24 giờ qua, quay lại sau nhé.</p>
        ) : (
          <button className="btn btn-amber py-3" disabled={short || !current} onClick={() => current && send({ action: "start", deck: current.slug, stake })}>
            {short ? (
              "Không đủ kim cương"
            ) : (
              <>
                <Play className="size-4 fill-current" /> Đặt <Gem className="size-5" /> {stake} và bắt đầu
              </>
            )}
          </button>
        )}
        <p className="text-center text-xs text-muted">
          Trong 24 giờ còn chơi được {state.limits.roundsLeft} ván, còn lời được tối đa {fmt(state.limits.winLeft)} kim cương.
        </p>
      </div>
    </>
  );
}
