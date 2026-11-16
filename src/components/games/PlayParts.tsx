"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Clock, Flag, Pause, Play } from "lucide-react";
import type { PlayView } from "@/lib/games/play";
import Mascot from "../Mascot";

/** Phần dùng chung của màn chơi Sudoku / Caro */

export type View = PlayView & { ok?: boolean };
export type Send = (payload: Record<string, unknown>) => Promise<View | null>;

export const clock = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** Đếm ngược từ msLeft (lúc nhận từ server); running = false → đứng yên (đang tạm dừng) */
export function useCountdown(msLeft: number, key: unknown, running = true) {
  const [left, setLeft] = useState(msLeft);
  useEffect(() => {
    const end = performance.now() + msLeft;
    const tick = () => setLeft(running ? Math.max(0, end - performance.now()) : msLeft);
    tick();
    if (!running) return;
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [msLeft, key, running]);
  return left;
}

/** Đồng hồ ván + nút tạm dừng / chạy tiếp (quỹ tạm dừng của mình còn bao nhiêu thì hiện trong title) */
export function GameClock({ v, send, ms, warn = false }: { v: View; send: Send; ms: number; warn?: boolean }) {
  const mine = v.pause?.byId === v.meId;
  const seated = v.players.some((p) => p.me && !p.out);
  const canPause = seated && v.status === "playing" && (mine || (!v.pause && v.pauseLeft > 0));
  return (
    <span className={`g-clock ${warn ? "g-clock-warn" : ""}`}>
      <Clock className="size-4" /> {clock(ms)}
      {seated && (
        <button
          className="hit-44 flex size-7 cursor-pointer items-center justify-center rounded-full bg-foreground text-background transition-transform active:scale-90 disabled:cursor-not-allowed disabled:opacity-30"
          disabled={!canPause}
          title={v.pause ? (mine ? "Chạy tiếp" : `${v.pause.byName} đang tạm dừng`) : `Tạm dừng (còn ${clock(v.pauseLeft)})`}
          aria-label={v.pause ? "Chạy tiếp" : "Tạm dừng"}
          onClick={() => send({ action: "pause", paused: !v.pause })}
        >
          {v.pause ? <Play className="size-3.5 fill-current" /> : <Pause className="size-3.5 fill-current" />}
        </button>
      )}
    </span>
  );
}

/** Lớp che bàn khi ván đang tạm dừng (bàn Sudoku bị che để không giải trộm lúc dừng) */
export function PausedCover({ v, send, children }: { v: View; send: Send; children?: ReactNode }) {
  const left = useCountdown(v.pause?.msLeft ?? 0, v.version, !!v.pause);
  if (!v.pause) return null;
  const mine = v.pause.byId === v.meId;
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] bg-card/90 p-4 text-center backdrop-blur-md sheet-fade">
      <span className="icon-bubble tint-gold size-14 rounded-full">
        <Pause className="size-6 fill-current" />
      </span>
      <p className="font-display text-2xl font-extrabold">{mine ? "Bạn đang tạm dừng" : `${v.pause.byName} đang tạm dừng`}</p>
      <p className="badge badge-muted text-sm tabular-nums">Tự chạy tiếp sau {clock(left)}</p>
      {children}
      {mine && (
        <button className="btn btn-amber btn-lg" onClick={() => send({ action: "pause", paused: false })}>
          <Play className="size-4 fill-current" /> Chạy tiếp
        </button>
      )}
    </div>
  );
}

export function ResignButton({ send, className = "" }: { send: Send; className?: string }) {
  const [ask, setAsk] = useState(false);
  return ask ? (
    <button className={`btn btn-red ${className}`} onClick={() => send({ action: "resign" })} onBlur={() => setAsk(false)} autoFocus>
      <Flag className="size-4" />
      Chắc chắn?
    </button>
  ) : (
    <button className={`btn text-red-400 ${className}`} onClick={() => setAsk(true)}>
      <Flag className="size-4" /> Bỏ cuộc
    </button>
  );
}

/**
 * Linh vật kèm lời thoại (như Solo Games). Linh vật của hallovn.de là ảnh nên cảm xúc thể hiện bằng chuyển động:
 * wow = giật mình · cheer = nhảy cẫng · think = nghiêng đầu · sleep = ngủ gật · sad = ủ rũ
 */
export type MascotMood = "happy" | "wow" | "cheer" | "think" | "sleep" | "sad";

export function MascotSay({ mood = "happy", children, className = "" }: { mood?: MascotMood; children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="relative shrink-0">
        <span key={mood} className={`block mascot-${mood}`}>
          <Mascot animated={mood !== "sleep" && mood !== "sad"} className="size-14 drop-shadow-sm md:size-16" />
        </span>
        {mood === "sleep" && (
          <span aria-hidden className="mascot-zzz absolute -top-1 right-0 text-sm font-black text-muted">
            z<span className="text-xs">z</span>
          </span>
        )}
      </span>
      <p aria-live="polite" className="say-bubble g-say">
        {children}
      </p>
    </div>
  );
}
