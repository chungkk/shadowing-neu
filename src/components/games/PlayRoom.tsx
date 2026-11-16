"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  Crown,
  Eye,
  Grid3x3,
  Hourglass,
  LogOut,
  Play,
  Share2,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { SUDOKU_LEVEL_LABEL, type PlayResult } from "@/lib/games/play";
import { clientApi } from "@/lib/client-api";
import { GameHeader } from "./GameParts";
import { usePlayGuest } from "./GuestPlay";
import { LoginLink } from "../auth/LoginDialog";
import { GAME_TITLE } from "./PlayLobby";
import CaroPlay from "./CaroPlay";
import {
  clock,
  MascotSay,
  useCountdown,
  type MascotMood,
  type View,
} from "./PlayParts";
import SudokuPlay from "./SudokuPlay";

/**
 * Màn chơi 1 phòng Sudoku / Caro: phòng chờ → đang chơi → kết quả. Mọi nước đi đều hỏi server; chơi với người thì
 * hỏi lại tình trạng phòng mỗi POLL_MS (không cần WebSocket). Đồng hồ ở đây chỉ để hiện, hạn thật do server giữ.
 */

const POLL_MS = 1500;

const REASON: Record<PlayResult["reason"], string> = {
  solved: "giải xong đề",
  five: "5 quân liền nhau",
  timeout: "đối thủ hết lượt",
  resign: "bỏ cuộc",
  out: "những người khác đã bỏ cuộc",
  draw: "hoà",
  canceled: "phòng bị huỷ",
  time: "hết giờ, điền đúng nhiều ô nhất",
};

function ResultCard({ v, onAgain, loggedIn }: { v: View; onAgain: string; loggedIn: boolean }) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open]);
  const r = v.result!;
  const won = r.winnerId === v.meId;
  const winner = v.players.find((p) => p.id === r.winnerId);
  let title: string;
  let line: string;
  if (v.status === "canceled") {
    title = "Phòng đã huỷ";
    line = "Không ai thắng thua.";
  } else if (r.winnerId === null) {
    title = "Hoà";
    line = "Ngang tài ngang sức!";
  } else if (won) {
    title = "Bạn thắng!";
    line =
      r.reason === "timeout"
        ? "Đối thủ hết thời gian đi nước."
        : r.reason === "resign"
          ? "Đối thủ đã bỏ cuộc."
          : `Thắng vì ${REASON[r.reason]}.`;
  } else {
    title =
      v.mode === "solo"
        ? v.game === "caro"
          ? "Máy thắng"
          : "Chưa giải được"
        : `${winner?.name ?? "Người khác"} thắng`;
    line =
      r.reason === "time" && v.mode === "solo"
        ? "Hết giờ."
        : r.reason === "timeout" && v.mode === "solo"
          ? "Hết thời gian đi nước."
          : r.reason === "timeout"
            ? "Bạn hết thời gian đi nước."
            : r.reason === "resign"
              ? "Bạn đã bỏ cuộc."
              : `Thắng vì ${REASON[r.reason]}.`;
  }
  const mood: MascotMood =
    v.status === "canceled" || r.winnerId === null
      ? "think"
      : won
        ? "cheer"
        : "sad";
  const say =
    mood === "cheer"
      ? r.reason === "solved"
        ? "Giải đẹp quá!"
        : "Tuyệt vời! Bạn thắng rồi!"
      : mood === "sad"
        ? "Tiếc quá… Ván sau gỡ lại nhé!"
        : v.status === "canceled"
          ? "Phòng huỷ rồi, lập phòng khác nhé!"
          : "Ngang tài ngang sức! Làm thêm ván nữa không?";
  if (!open) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn"
        >
          <Trophy className="size-4" /> {title}
        </button>
        <Link href={onAgain} className="btn btn-amber">
          <Play className="size-4 fill-current" /> Chơi ván mới
        </Link>
      </div>
    );
  }
  return (
    <div className="dialog-backdrop" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
      <div role="dialog" aria-modal="true" aria-label={title} className="dialog max-w-sm items-center gap-2 text-center">
        <button type="button" onClick={() => setOpen(false)} className="btn-icon absolute top-3 right-3" aria-label="Đóng">
          <X className="size-5" />
        </button>
        <MascotSay mood={mood} className="mb-1 w-full pr-8 text-left">
          {say}
        </MascotSay>
        <p className={`dialog-title text-2xl ${won ? "text-amber" : ""}`}>
          {won && <Trophy className="mr-1.5 inline size-6 align-[-0.15em]" />}
          {title}
        </p>
        <p className="text-sm text-muted">{line}</p>
        <div className="mt-2 flex w-full flex-col gap-2">
          <Link href={onAgain} className="btn btn-amber btn-lg btn-block">
            <Play className="size-4 fill-current" /> Chơi ván mới
          </Link>
          <button type="button" onClick={() => setOpen(false)} className="btn btn-lg btn-block">
            <Eye className="size-4" /> Xem lại bàn chơi
          </button>
          {!loggedIn && (
            <LoginLink href={`/login?next=/games/${v.game}`} className="mt-1 text-sm font-bold text-link hover:underline">
              Đăng ký miễn phí để học tiếng Đức và nhận kim cương
            </LoginLink>
          )}
        </div>
      </div>
    </div>
  );
}

function Waiting({
  v,
  send,
}: {
  v: View;
  send: (p: Record<string, unknown>) => void;
}) {
  const [copied, setCopied] = useState(false);
  const me = v.players.find((p) => p.me);
  const host = v.hostId === v.meId;
  const left = useCountdown(v.msLeft, v.version);
  const link =
    typeof window !== "undefined"
      ? `${location.origin}/games/${v.game}/${v.code}`
      : "";
  const canShare = typeof navigator !== "undefined" && !!navigator.share;
  const share = async () => {
    const text = `Vào chơi ${GAME_TITLE[v.game]} với mình trên hallovn.de, không cần tài khoản: ${link}`;
    if (canShare) return navigator.share({ text }).catch(() => {});
    await navigator.clipboard.writeText(link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const everyoneReady =
    v.players.length >= 2 && v.players.every((p) => p.ready);
  const say = !me
    ? "Vào chơi cùng không?"
    : host
      ? v.players.length < 2
        ? "Gửi mã phòng cho bạn rồi chờ mọi người vào nhé!"
        : everyoneReady
          ? "Mọi người sẵn sàng hết rồi, bấm Bắt đầu thôi!"
          : "Chờ mọi người bấm Sẵn sàng đã…"
      : me.ready
        ? "Sẵn sàng rồi! Chờ chủ phòng bắt đầu nhé."
        : "Chuẩn bị xong thì bấm Sẵn sàng nhé!";
  return (
    <div className="card flex flex-col gap-4">
      <MascotSay mood={everyoneReady || me?.ready ? "cheer" : "happy"}>
        {say}
      </MascotSay>
      <div className="g-ticket">
        <p className="label text-muted">Mã phòng</p>
        <p className="g-code select-all">{v.code}</p>
        <p className="mt-1 text-sm font-semibold text-muted">
          {GAME_TITLE[v.game]}
          {v.level && ` · ${SUDOKU_LEVEL_LABEL[v.level]}`} · {v.capacity} người
        </p>
      </div>
      {me && (
        <button className="btn mx-auto" onClick={share}>
          {copied ? (
            <Check className="size-4" />
          ) : canShare ? (
            <Share2 className="size-4" />
          ) : (
            <Copy className="size-4" />
          )}
          {copied ? "Đã chép link" : "Gửi link cho bạn"}
        </button>
      )}
      <ul className="flex flex-col gap-2">
        {Array.from({ length: v.capacity }, (_, k) => {
          const p = v.players[k];
          return (
            <li key={k} className={`g-seat ${p ? "" : "g-seat-empty"}`}>
              {p ? (
                <>
                  <span className="g-avatar">{p.id === v.hostId ? <Crown className="size-4 text-amber" /> : <Users className="size-4 text-muted" />}</span>
                  <span className="flex-1 truncate font-bold">
                    {p.name}
                    {p.me && " (bạn)"}
                    {p.guest && <span className="ml-1 text-xs font-bold text-muted">· khách</span>}
                  </span>
                  {p.ready ? (
                    <span className="badge badge-accent">
                      <Check className="size-3.5" strokeWidth={3} />{" "}
                      {p.id === v.hostId ? "Chủ phòng" : "Sẵn sàng"}
                    </span>
                  ) : (
                    <span className="badge bg-card">
                      <Hourglass className="size-3.5" /> Chưa sẵn sàng
                    </span>
                  )}
                </>
              ) : (
                "Đang chờ người vào…"
              )}
            </li>
          );
        })}
      </ul>
      {me ? (
        <div className="flex flex-col gap-2">
          {host ? (
            <button
              className="btn btn-amber btn-lg"
              disabled={!everyoneReady}
              onClick={() => send({ action: "start" })}
            >
              <Play className="size-4 fill-current" /> Bắt đầu
              {v.players.length >= 2 && ` với ${v.players.length} người`}
            </button>
          ) : (
            <button
              className={`btn btn-lg ${me.ready ? "" : "btn-amber"}`}
              onClick={() => send({ action: "ready", ready: !me.ready })}
            >
              {me.ready ? (
                "Huỷ sẵn sàng"
              ) : (
                <>
                  <Check className="size-4" strokeWidth={3} /> Sẵn sàng
                </>
              )}
            </button>
          )}
          <p className="text-center text-xs text-muted">
            {host
              ? "Mọi người bấm Sẵn sàng thì bạn bắt đầu được."
              : "Chủ phòng bắt đầu khi mọi người đã sẵn sàng."}{" "}
            Phòng tự huỷ sau {clock(left)} nếu chưa bắt đầu.
          </p>
          <button
            className={`btn btn-ghost mx-auto ${host ? "text-red-400" : ""}`}
            onClick={() => send({ action: "leave" })}
          >
            <LogOut className="size-4" />{" "}
            {host ? "Huỷ phòng" : "Rời phòng"}
          </button>
        </div>
      ) : (
        <button
          className="btn btn-amber btn-lg"
          onClick={() => send({ action: "join" })}
        >
          <Users className="size-4" /> Vào phòng
        </button>
      )}
    </div>
  );
}

// ---- Khung chung ----

export default function PlayRoom({
  game,
  code,
  loggedIn,
}: {
  game: "sudoku" | "caro";
  code: string;
  loggedIn: boolean;
}) {
  const [v, setV] = useState<View | null>(null);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const guest = usePlayGuest(loggedIn);
  const ready = guest.ready;
  const lobby = `/games/${game}`;

  function apply(next: View) {
    setV((old) => (old && old.version === next.version && old.status === next.status ? old : next));
  }

  const reload = () =>
    clientApi<View>(`/games/play?code=${code}`)
      .then((r) => {
        if (r.game !== game) location.replace(`/games/${r.game}/${r.code}`);
        apply(r);
        setError("");
      })
      .catch((e: Error) => setError(e.message));
  const load = useEffectEvent(reload);

  async function send(payload: Record<string, unknown>): Promise<View | null> {
    if (busy.current) return null;
    busy.current = true;
    setError("");
    try {
      const r = await clientApi<View>("/games/play", {
        method: "POST",
        body: { ...payload, code },
      });
      apply(r);
      return r;
    } catch (e) {
      setError((e as Error).message);
      void reload(); // ván đã đổi ở nơi khác → lấy lại đúng tình trạng
      return null;
    } finally {
      busy.current = false;
    }
  }

  const live =
    v &&
    v.mode === "room" &&
    (v.status === "waiting" || v.status === "playing");
  useEffect(() => {
    if (ready) void load();
  }, [ready, code]);
  // Khách chưa có tên tạm → hỏi tên ngay khi mở link phòng
  useEffect(() => {
    if (!loggedIn) guest.ask();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ hỏi 1 lần lúc mở trang
  }, [loggedIn]);
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => {
      if (!document.hidden && !busy.current) void load();
    }, POLL_MS);
    return () => clearInterval(t);
  }, [live]);
  // Ván một mình: tới hạn thì hỏi lại để server chốt (hết giờ / hết lượt)
  useEffect(() => {
    if (!v || v.mode !== "solo" || v.status !== "playing") return;
    const t = setTimeout(
      () => void load(),
      (v.pause ? v.pause.msLeft : v.msLeft) + 2500,
    );
    return () => clearTimeout(t);
  }, [v]);

  const header = (
    <GameHeader
      icon={game === "sudoku" ? Grid3x3 : Users}
      tone="cyan"
      title={GAME_TITLE[game]}
      subtitle={
        v
          ? v.mode === "solo"
            ? game === "caro"
              ? "Đấu với máy"
              : "Chơi một mình"
            : `Phòng ${v.code}`
          : `Phòng ${code}`
      }
      right={
        <Link href={lobby} className="btn-icon" title="Sảnh" aria-label="Sảnh">
          <LogOut className="size-5" />
        </Link>
      }
    />
  );
  const errorLine = error && (
    <p role="alert" className="alert alert-err">
      {error}
    </p>
  );

  if (!ready && !v) {
    return (
      <>
        {header}
        <div className="card flex flex-col gap-3 text-center">
          <p className="section-title">Vào phòng <span className="font-mono tracking-[0.15em]">{code}</span></p>
          <p className="text-sm text-muted">Không cần tài khoản — nhập tên tạm là vào chơi được.</p>
          {guest.name ? (
            <p className="text-sm text-muted">{guest.error || "Đang vào phòng…"}</p>
          ) : (
            <button className="btn btn-amber btn-lg mx-auto" onClick={() => guest.ask()}>
              <Users className="size-4" /> Nhập tên để vào phòng
            </button>
          )}
        </div>
        {guest.dialog}
      </>
    );
  }
  if (!v) {
    return (
      <>
        {header}
        {errorLine || (
          <div className="card flex flex-col gap-3" aria-busy="true">
            <span className="sr-only">Đang tải…</span>
            <div className="skeleton h-14 w-2/3" />
            <div className="skeleton h-24 w-full" />
            <div className="skeleton h-12 w-full" />
          </div>
        )}
        {error && (
          <Link href={lobby} className="btn mx-auto">
            Về sảnh {GAME_TITLE[game]}
          </Link>
        )}
      </>
    );
  }

  return (
    <>
      {header}
      {v.status === "waiting" && guest.chip}
      {v.status === "waiting" && <Waiting v={v} send={send} />}
      {(v.status === "ended" || v.status === "canceled") && (
        <ResultCard v={v} onAgain={lobby} loggedIn={loggedIn} />
      )}
      {v.status !== "waiting" &&
        v.status !== "canceled" &&
        (v.game === "sudoku" ? (
          <SudokuPlay key={v.code} v={v} send={send} apply={apply} />
        ) : (
          <CaroPlay v={v} send={send} />
        ))}
      {errorLine}
      {guest.dialog}
    </>
  );
}
