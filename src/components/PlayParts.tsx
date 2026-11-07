"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Clock, Flag, Pause, Play } from "lucide-react";
import type { PlayView } from "@/lib/play";
import Mascot from "./Mascot";

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
    <span className={`inline-flex items-center gap-1 rounded-full border-2 border-ink bg-card py-0.5 pr-0.5 pl-2.5 font-bold tabular-nums ${warn ? "text-red-400" : ""}`}>
      <Clock className="size-4" /> {clock(ms)}
      {seated && (
        <button
          className="flex size-7 cursor-pointer items-center justify-center rounded-full bg-ink text-white disabled:cursor-not-allowed disabled:opacity-40"
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
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-card/95 p-4 text-center backdrop-blur-sm">
      <p className="text-xl font-black">{mine ? "Bạn đang tạm dừng" : `${v.pause.byName} đang tạm dừng`}</p>
      <p className="text-sm text-muted">Tự chạy tiếp sau {clock(left)}</p>
      {children}
      {mine && (
        <button className="btn btn-amber px-6 py-3" onClick={() => send({ action: "pause", paused: false })}>
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
      Chắc chắn?
    </button>
  ) : (
    <button className={`btn ${className}`} onClick={() => setAsk(true)}>
      <Flag className="size-4" /> Bỏ cuộc
    </button>
  );
}

/**
 * Linh vật kèm lời thoại (như Solo Games). Linh vật của ckk.pro là ảnh nên cảm xúc thể hiện bằng chuyển động:
 * wow = giật mình · cheer = nhảy cẫng · think = nghiêng đầu · sleep = ngủ gật · sad = ủ rũ
 */
export type MascotMood = "happy" | "wow" | "cheer" | "think" | "sleep" | "sad";

export function MascotSay({ mood = "happy", children, className = "" }: { mood?: MascotMood; children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="relative shrink-0">
        <span key={mood} className={`block mascot-${mood}`}>
          <Mascot animated={mood !== "sleep" && mood !== "sad"} className="size-14 md:size-16" />
        </span>
        {mood === "sleep" && (
          <span aria-hidden className="mascot-zzz absolute -top-1 right-0 text-sm font-black text-muted">
            z<span className="text-xs">z</span>
          </span>
        )}
      </span>
      <p
        aria-live="polite"
        className="say-bubble relative min-w-0 flex-1 rounded-2xl border-2 border-ink bg-card px-3 py-2 text-sm leading-snug font-bold text-balance shadow-[0_3px_0_var(--ink)] before:absolute before:top-1/2 before:-left-[7px] before:size-3 before:-translate-y-1/2 before:rotate-45 before:border-b-2 before:border-l-2 before:border-ink before:bg-card md:text-base"
      >
        {children}
      </p>
    </div>
  );
}
