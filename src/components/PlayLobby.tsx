"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Bot, Grid3x3, LogIn, Play, User, Users } from "lucide-react";
import {
  CARO_BOT_PAYOUT,
  CARO_TURN_SECONDS,
  fmtDiamonds,
  PLAY_STAKES,
  ROOM_MAX_PLAYERS,
  SOLO_WIN_CAP,
  SUDOKU_LEVEL_LABEL,
  SUDOKU_LEVELS,
  PLAY_PAUSE_SECONDS,
  SUDOKU_MINUTES,
  SUDOKU_SOLO_PAYOUT,
  type PlayGame,
  type PlayState,
  type PlayView,
  type SudokuLevel,
} from "@/lib/play";
import { clientApi } from "@/lib/client-api";
import { emitPoints } from "@/lib/points";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { GameHeader } from "./GameParts";
import { LoginLink } from "./LoginDialog";
import { Gem } from "./PointsBadge";

/** Sảnh Sudoku / Caro: chơi một mình (Caro: với máy) hoặc tạo phòng / vào phòng bằng mã — đều cược kim cương */

export const GAME_TITLE: Record<PlayGame, string> = { sudoku: "Sudoku", caro: "Caro" };

export const Diamonds = ({ n, className = "" }: { n: number; className?: string }) => (
  <span className={`inline-flex items-center gap-1 font-extrabold text-gem tabular-nums ${className}`}>
    <Gem className="size-4" /> {fmtDiamonds(n)}
  </span>
);

function Choice<T extends string | number>({ options, value, onChange, label, disabled }: { options: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; label: string; disabled?: (v: T) => boolean }) {
  return (
    <div>
      <p className="mb-2 text-sm font-extrabold">{label}</p>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((o) => (
          <button
            key={o.value}
            aria-pressed={o.value === value}
            className={`btn px-0 py-2.5 ${o.value === value ? "bg-gem/20 ring-2 ring-gem" : ""}`}
            disabled={disabled?.(o.value)}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Rules({ game }: { game: PlayGame }) {
  return game === "sudoku" ? (
    <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted">
      <li>Điền số 1–9 sao cho mỗi hàng, mỗi cột, mỗi khối 3×3 có đủ 9 số. Điền, xoá, hoàn tác, ghi chú thoải mái; điền kín bàn là tự nộp bài.</li>
      <li>
        Thời gian: dễ {SUDOKU_MINUTES.easy} phút, vừa {SUDOKU_MINUTES.medium} phút, khó {SUDOKU_MINUTES.hard} phút. Mỗi người được tạm dừng tổng cộng {PLAY_PAUSE_SECONDS / 60} phút.
      </li>
      <li>
        Một mình: giải xong nhận về ×{SUDOKU_SOLO_PAYOUT.easy / 100} (dễ), ×{SUDOKU_SOLO_PAYOUT.medium / 100} (vừa), ×{SUDOKU_SOLO_PAYOUT.hard / 100} (khó).
      </li>
      <li>Với bạn (2–{ROOM_MAX_PLAYERS} người, cùng 1 đề): ai giải đúng trước nhận cả hũ. Hết giờ thì ai điền đúng nhiều ô nhất thắng. Tạm dừng thì bàn của cả phòng bị khoá.</li>
    </ul>
  ) : (
    <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted">
      <li>Bàn 15×15, ai có 5 quân liền nhau (ngang, dọc, chéo) trước là thắng. 5 quân bị chặn cả 2 đầu thì không tính.</li>
      <li>Với máy: bạn cầm X đi trước, thắng nhận về ×{CARO_BOT_PAYOUT / 100}.</li>
      <li>Với bạn: mỗi nước {CARO_TURN_SECONDS} giây, hết giờ là thua. Người thắng nhận cả hũ. Mỗi người được tạm dừng tổng cộng {PLAY_PAUSE_SECONDS / 60} phút.</li>
      <li>Hoà (kín bàn) được hoàn lại kim cương. Bỏ cuộc là thua.</li>
    </ul>
  );
}

export default function PlayLobby({ game, loggedIn }: { game: PlayGame; loggedIn: boolean }) {
  const router = useRouter();
  const [stake, setStake] = useLocalStorage(`play-${game}-stake`, PLAY_STAKES[1]);
  const [level, setLevel] = useLocalStorage<SudokuLevel>("play-sudoku-level", "easy");
  const [capacity, setCapacity] = useLocalStorage("play-sudoku-capacity", 2);
  const [state, setState] = useState<PlayState | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loggedIn) return;
    clientApi<PlayState>("/games/play")
      .then((s) => {
        setState(s);
        emitPoints({ total: s.total });
      })
      .catch((e: Error) => setError(e.message));
  }, [loggedIn]);

  async function go(payload: Record<string, unknown>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const v = await clientApi<PlayView & { total: number }>("/games/play", { method: "POST", body: payload });
      emitPoints({ total: v.total });
      router.push(`/games/${v.game}/${v.code}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  const header = (
    <GameHeader
      icon={game === "sudoku" ? Grid3x3 : Users}
      tone="cyan"
      title={GAME_TITLE[game]}
      subtitle={game === "sudoku" ? "Giải đề một mình hoặc đua với bạn" : "5 quân liền nhau là thắng, đấu máy hoặc đấu bạn"}
    />
  );
  const errorLine = error && <p className="text-center text-sm font-bold text-red-500 dark:text-red-400">{error}</p>;

  if (!loggedIn) {
    return (
      <>
        {header}
        <div className="sticker flex flex-col gap-3 p-4">
          <Rules game={game} />
          <p className="text-sm font-bold">
            Game dùng kim cương của tài khoản:{" "}
            <LoginLink href={`/login?next=/games/${game}`} className="text-link hover:underline">
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

  const short = state.total < stake;
  const soloBlocked = !state.limits.roundsLeft || !state.limits.winLeft;
  const soloRate = game === "sudoku" ? SUDOKU_SOLO_PAYOUT[level] : CARO_BOT_PAYOUT;
  const stakeChoice = (
    <Choice
      label="Mức cược"
      options={PLAY_STAKES.map((n) => ({ value: n, label: n }))}
      value={stake}
      onChange={setStake}
      disabled={(n) => state.total < n}
    />
  );

  return (
    <>
      {header}
      {state.active && (
        <button className="sticker flex items-center gap-3 p-4 text-left font-bold" onClick={() => router.push(`/games/${state.active!.game}/${state.active!.code}`)}>
          <Play className="size-5 shrink-0 fill-current text-gem" />
          <span className="flex-1">Bạn đang có ván {GAME_TITLE[state.active.game]} chưa xong (phòng {state.active.code})</span>
          <ArrowRight className="size-5" />
        </button>
      )}

      <div className="sticker flex flex-col gap-4 p-4">
        <p className="font-bold">
          Bạn đang có <Diamonds n={state.total} />
        </p>
        {stakeChoice}
        {game === "sudoku" && (
          <Choice label="Độ khó" options={SUDOKU_LEVELS.map((l) => ({ value: l, label: SUDOKU_LEVEL_LABEL[l] }))} value={level} onChange={setLevel} />
        )}
        {errorLine}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="sticker flex flex-col gap-3 p-4">
          <h2 className="flex items-center gap-2 text-lg font-extrabold">
            {game === "sudoku" ? <User className="size-5" /> : <Bot className="size-5" />}
            {game === "sudoku" ? "Chơi một mình" : "Đấu với máy"}
          </h2>
          <p className="flex-1 text-sm text-muted">
            Thắng nhận về <Diamonds n={Math.floor((stake * soloRate) / 100)} /> (×{soloRate / 100}), thua mất phần đã cược.
          </p>
          <button className="btn btn-amber py-3" disabled={busy || short || soloBlocked || !!state.active} onClick={() => go({ action: "create", game, mode: "solo", stake, level })}>
            {short ? (
              "Không đủ kim cương"
            ) : (
              <>
                <Play className="size-4 fill-current" /> Cược <Gem className="size-5" /> {stake}
              </>
            )}
          </button>
          <p className="text-center text-xs text-muted">
            {soloBlocked
              ? "Bạn đã chơi đủ giới hạn một mình trong 24 giờ qua, quay lại sau nhé."
              : `Trong 24 giờ còn chơi được ${state.limits.roundsLeft} ván, còn lời được tối đa ${fmtDiamonds(state.limits.winLeft)}/${SOLO_WIN_CAP} kim cương.`}
          </p>
        </section>

        <section className="sticker flex flex-col gap-3 p-4">
          <h2 className="flex items-center gap-2 text-lg font-extrabold">
            <Users className="size-5" /> Chơi với bạn
          </h2>
          {game === "sudoku" && (
            <Choice
              label="Số người"
              options={Array.from({ length: ROOM_MAX_PLAYERS - 1 }, (_, k) => ({ value: k + 2, label: `${k + 2} người` }))}
              value={capacity}
              onChange={setCapacity}
            />
          )}
          <p className="flex-1 text-sm text-muted">Tạo phòng rồi gửi mã cho bạn. Ai vào cũng cược {stake} kim cương, người thắng nhận cả hũ.</p>
          <button className="btn btn-primary py-3" disabled={busy || short || !!state.active} onClick={() => go({ action: "create", game, mode: "room", stake, level, capacity })}>
            <Users className="size-4" /> Tạo phòng
          </button>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (code.trim()) router.push(`/games/${game}/${code.trim().toUpperCase()}`);
            }}
          >
            <input
              className="input min-w-0 flex-1 font-mono tracking-[0.3em] uppercase"
              placeholder="MÃ PHÒNG"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^a-z0-9]/gi, ""))}
            />
            <button className="btn" disabled={code.length !== 6}>
              <LogIn className="size-4" /> Vào
            </button>
          </form>
        </section>
      </div>

      <div className="sticker p-4">
        <Rules game={game} />
      </div>
    </>
  );
}
