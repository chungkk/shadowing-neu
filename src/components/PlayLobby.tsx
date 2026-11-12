"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Bot, Grid3x3, LogIn, Play, User, Users } from "lucide-react";
import {
  CARO_BOT_TURN_SECONDS,
  CARO_TURN_SECONDS,
  ROOM_MAX_PLAYERS,
  SUDOKU_LEVEL_LABEL,
  SUDOKU_LEVELS,
  PLAY_PAUSE_SECONDS,
  SUDOKU_MINUTES,
  type PlayGame,
  type PlayState,
  type PlayView,
  type SudokuLevel,
} from "@/lib/play";
import { clientApi } from "@/lib/client-api";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { GameHeader } from "./GameParts";
import { usePlayGuest } from "./GuestPlay";

/**
 * Sảnh Sudoku / Caro, chỉ để chơi vui (không cược kim cương): chơi một mình (Caro: với máy) hoặc tạo phòng / vào phòng bằng mã.
 * Khách chưa đăng nhập nhập tên tạm là chơi được hết.
 */

export const GAME_TITLE: Record<PlayGame, string> = { sudoku: "Sudoku", caro: "Caro" };

function Choice<T extends string | number>({ options, value, onChange, label }: { options: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div>
      <p className="mb-2 text-sm font-extrabold">{label}</p>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((o) => (
          <button key={o.value} aria-pressed={o.value === value} className={`btn px-0 py-2.5 ${o.value === value ? "bg-gem/20 ring-2 ring-gem" : ""}`} onClick={() => onChange(o.value)}>
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
      <li>Với bạn (2–{ROOM_MAX_PLAYERS} người, cùng 1 đề): ai giải đúng trước thắng. Hết giờ thì ai điền đúng nhiều ô nhất thắng. Tạm dừng thì bàn của cả phòng bị khoá.</li>
      <li>Chơi cho vui, không cược kim cương. Chưa có tài khoản thì nhập tên tạm là chơi được.</li>
    </ul>
  ) : (
    <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted">
      <li>Bàn 15×15, ai có 5 quân liền nhau (ngang, dọc, chéo) trước là thắng. 5 quân bị chặn cả 2 đầu thì không tính.</li>
      <li>Với máy: bạn cầm X đi trước, mỗi nước {CARO_BOT_TURN_SECONDS / 60} phút.</li>
      <li>Với bạn: mỗi nước {CARO_TURN_SECONDS} giây, hết giờ là thua. Mỗi người được tạm dừng tổng cộng {PLAY_PAUSE_SECONDS / 60} phút. Bỏ cuộc là thua.</li>
      <li>Chơi cho vui, không cược kim cương. Chưa có tài khoản thì nhập tên tạm là chơi được.</li>
    </ul>
  );
}

export default function PlayLobby({ game, loggedIn }: { game: PlayGame; loggedIn: boolean }) {
  const router = useRouter();
  const guest = usePlayGuest(loggedIn);
  const [level, setLevel] = useLocalStorage<SudokuLevel>("play-sudoku-level", "easy");
  const [capacity, setCapacity] = useLocalStorage("play-sudoku-capacity", 2);
  const [state, setState] = useState<PlayState | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Ván đang dở (khách: khi server đã nhận tên tạm)
  useEffect(() => {
    if (!guest.ready) return;
    clientApi<PlayState>("/games/play")
      .then(setState)
      .catch((e: Error) => setError(e.message));
  }, [guest.ready]);

  async function create(payload: Record<string, unknown>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const v = await clientApi<PlayView>("/games/play", { method: "POST", body: { action: "create", game, level, ...payload } });
      router.push(`/games/${v.game}/${v.code}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  const go = (payload: Record<string, unknown>) => guest.ask(() => void create(payload));
  const active = state?.active;

  return (
    <>
      <div className="contents">
      <GameHeader
        icon={game === "sudoku" ? Grid3x3 : Users}
        tone="cyan"
        title={GAME_TITLE[game]}
        subtitle={game === "sudoku" ? "Giải đề một mình hoặc đua với bạn" : "5 quân liền nhau là thắng, đấu máy hoặc đấu bạn"}
      />
      </div>
      {guest.chip}
      {active && (
        <button className="sticker flex items-center gap-3 p-4 text-left font-bold" onClick={() => router.push(`/games/${active.game}/${active.code}`)}>
          <Play className="size-5 shrink-0 fill-current text-gem" />
          <span className="flex-1">Bạn đang có ván {GAME_TITLE[active.game]} chưa xong (phòng {active.code})</span>
          <ArrowRight className="size-5" />
        </button>
      )}

      {game === "sudoku" && (
        <div className="sticker p-4">
          <Choice label="Độ khó" options={SUDOKU_LEVELS.map((l) => ({ value: l, label: SUDOKU_LEVEL_LABEL[l] }))} value={level} onChange={setLevel} />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="sticker flex flex-col gap-3 p-4">
          <h2 className="flex items-center gap-2 text-lg font-extrabold">
            {game === "sudoku" ? <User className="size-5" /> : <Bot className="size-5" />}
            {game === "sudoku" ? "Chơi một mình" : "Đấu với máy"}
          </h2>
          <p className="flex-1 text-sm text-muted">{game === "sudoku" ? "Giải 1 đề trong thời gian cho phép." : "Bạn cầm X đi trước, thử xem có thắng nổi máy không."}</p>
          <button className="btn btn-amber py-3" disabled={busy || !!active} onClick={() => go({ mode: "solo" })}>
            <Play className="size-4 fill-current" /> Bắt đầu
          </button>
        </section>

        <section className="sticker flex flex-col gap-3 p-4">
          <h2 className="flex items-center gap-2 text-lg font-extrabold">
            <Users className="size-5" />
            Chơi với bạn
          </h2>
          {game === "sudoku" && (
            <Choice
              label="Số người"
              options={Array.from({ length: ROOM_MAX_PLAYERS - 1 }, (_, k) => ({ value: k + 2, label: `${k + 2} người` }))}
              value={capacity}
              onChange={setCapacity}
            />
          )}
          <p className="flex-1 text-sm text-muted">Tạo phòng rồi gửi mã cho bạn. Bạn bè chưa có tài khoản cũng vào được bằng tên tạm.</p>
          <button className="btn btn-primary py-3" disabled={busy || !!active} onClick={() => go({ mode: "room", capacity })}>
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

      {(error || guest.error) && <p className="text-center text-sm font-bold text-red-500 dark:text-red-400">{error || guest.error}</p>}

      <div className="sticker p-4">
        <Rules game={game} />
      </div>
      {guest.dialog}
    </>
  );
}
