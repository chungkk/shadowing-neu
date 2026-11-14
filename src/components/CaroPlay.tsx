"use client";

import { useEffect, useRef, useState, type TouchEvent } from "react";
import { Bot, Maximize2, Minus, Plus, X } from "lucide-react";
import { CARO_SIZE } from "@/lib/play";
import { GameClock, MascotSay, PausedCover, ResignButton, useCountdown, type MascotMood, type Send, type View } from "./PlayParts";

/** Quân cờ X/O nét vẽ */
const Mark = ({ p, className = "" }: { p: "X" | "O"; className?: string }) => <PlainMark p={p} className={className} />;

/** Bàn Caro 15×15 (như Solo Games): phóng to bằng 2 ngón / nút +− / Ctrl + cuộn chuột, phóng to rồi thì kéo để xem các góc */

const MIN = 1;
const MAX = 3;

const PlainMark = ({ p, className = "" }: { p: "X" | "O"; className?: string }) =>
  p === "X" ? (
    <X className={`text-red-500 ${className}`} strokeWidth={3.5} />
  ) : (
    <span className={`block aspect-square rounded-full border-[3px] border-sky-500 ${className}`} />
  );

function ZoomBoard({ v, myTurn, send }: { v: View; myTurn: boolean; send: Send }) {
  const c = v.caro!;
  const line = new Set(c.line);
  const box = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const pinch = useRef<number | null>(null);
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  /** Giữ bàn không trôi ra ngoài khung */
  const clamp = (scale: number, x: number, y: number) => {
    const w = box.current?.clientWidth ?? 0;
    const lim = ((scale - 1) * w) / 2;
    return { scale, x: Math.max(-lim, Math.min(lim, x)), y: Math.max(-lim, Math.min(lim, y)) };
  };
  const zoom = (scale: number) =>
    setView((v) => {
      const s = Math.max(MIN, Math.min(MAX, scale));
      return s === MIN ? { scale: 1, x: 0, y: 0 } : clamp(s, (v.x * s) / v.scale, (v.y * s) / v.scale);
    });

  // Ctrl + cuộn (cả chụm 2 ngón trên touchpad) → phóng to; cuộn thường vẫn cuộn trang. Gắn tay để preventDefault được
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const on = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      setView((v) => {
        const s = Math.max(MIN, Math.min(MAX, v.scale * (e.deltaY > 0 ? 0.92 : 1.08)));
        return s === MIN ? { scale: 1, x: 0, y: 0 } : clamp(s, (v.x * s) / v.scale, (v.y * s) / v.scale);
      });
    };
    el.addEventListener("wheel", on, { passive: false });
    return () => el.removeEventListener("wheel", on);
  }, []);

  const dist = (e: TouchEvent) => Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      pinch.current = dist(e);
      drag.current = null;
    } else if (e.touches.length === 1 && view.scale > MIN) {
      drag.current = { x: e.touches[0].clientX - view.x, y: e.touches[0].clientY - view.y, moved: false };
    }
  };
  const onTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 2 && pinch.current) {
      const d = dist(e);
      zoom(view.scale * (d / pinch.current));
      pinch.current = d;
      suppressClick.current = true;
    } else if (e.touches.length === 1 && drag.current) {
      const x = e.touches[0].clientX - drag.current.x;
      const y = e.touches[0].clientY - drag.current.y;
      if (Math.hypot(x - view.x, y - view.y) > 4) drag.current.moved = suppressClick.current = true;
      setView(clamp(view.scale, x, y));
    }
  };
  const onTouchEnd = () => {
    pinch.current = null;
    drag.current = null;
    // Vừa kéo / chụm xong thì không tính là bấm đánh quân
    setTimeout(() => (suppressClick.current = false), 50);
  };

  const zoomBtn = "btn size-10 rounded-full p-0";
  return (
    <div className="relative">
      <div className="absolute -top-1 right-1 z-10 flex -translate-y-full gap-1 pb-1">
        <button className={zoomBtn} aria-label="Phóng to bàn cờ" disabled={view.scale >= MAX} onClick={() => zoom(view.scale + 0.4)}>
          <Plus className="size-4" />
        </button>
        <button className={zoomBtn} aria-label="Thu nhỏ bàn cờ" disabled={view.scale <= MIN} onClick={() => zoom(view.scale - 0.4)}>
          <Minus className="size-4" />
        </button>
        {view.scale > MIN && (
          <button className={zoomBtn} aria-label="Xem toàn bộ bàn cờ" onClick={() => zoom(MIN)}>
            <Maximize2 className="size-4" />
          </button>
        )}
      </div>
      <div className="caro-tray overflow-hidden rounded-2xl border-[3px] border-ink bg-board p-1 shadow-[0_4px_0_var(--ink)]">
        <div ref={box} className="relative aspect-square w-full touch-none overflow-hidden" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
          <div
            className="grid aspect-square w-full transition-transform duration-150 ease-out"
            style={{
              gridTemplateColumns: `repeat(${CARO_SIZE}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${CARO_SIZE}, minmax(0, 1fr))`,
              transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
            }}
          >
            {c.board.map((p, i) => {
              const canPlay = myTurn && !p;
              const win = line.has(i);
              return (
                <button
                  key={i}
                  disabled={!canPlay}
                  onClick={() => !suppressClick.current && send({ action: "move", cell: i })}
                  aria-label={`Ô hàng ${Math.floor(i / CARO_SIZE) + 1}, cột ${(i % CARO_SIZE) + 1}${p ? `, quân ${p}` : ", trống"}`}
                  className="group relative flex min-h-0 min-w-0 items-center justify-center p-[9%] disabled:cursor-default"
                >
                  <span
                    aria-hidden
                    className={`absolute inset-[6%] rounded-[30%] transition-colors ${
                      win ? "bg-gold" : i === c.last ? "bg-gold/35 ring-2 ring-ink/50 ring-inset" : canPlay ? "bg-cell ring-1 ring-ink/20 ring-inset group-hover:bg-gem/20" : "bg-cell ring-1 ring-ink/20 ring-inset"
                    }`}
                  />
                  {p && (
                    <span className={`relative block size-full ${win ? "play-bounce" : "play-drop"}`}>
                      <Mark p={p} className="size-full" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CaroPlay({ v, send }: { v: View; send: Send }) {
  const c = v.caro!;
  const playing = v.status === "playing";
  const myTurn = playing && !v.pause && c.mySymbol === c.turn;
  const left = useCountdown(v.msLeft, v.version, playing && !v.pause);
  const opponent = v.players.find((p) => !p.me);
  const turnName = v.mode === "solo" ? (c.turn === "X" ? "Bạn" : "Máy") : (v.players.find((p) => (p.seat === 0 ? "X" : "O") === c.turn)?.name ?? "");

  const lastByFoe = c.last !== null && c.board[c.last] !== c.mySymbol;
  const [mood, say]: [MascotMood, string] = v.pause
    ? ["sleep", v.pause.byId === v.meId ? "Nghỉ chút nhé, bàn cờ được che lại rồi." : `${v.pause.byName} xin nghỉ một chút…`]
    : myTurn && left < 10_000
      ? ["wow", "Nhanh lên, sắp hết giờ rồi!"]
      : myTurn
        ? [lastByFoe ? "think" : "happy", c.last === null ? "Bạn đi trước, đánh vào giữa bàn là chắc nhất." : lastByFoe ? "Tới lượt bạn! Để ý chặn đường của đối thủ nhé." : "Tới lượt bạn!"]
        : ["think", v.mode === "solo" ? "Máy đang nghĩ…" : `Chờ ${opponent?.name ?? "đối thủ"} đi…`];

  return (
    <div className="mx-auto flex w-full max-w-[36rem] flex-col gap-3">
      {playing && c.mySymbol && <MascotSay mood={mood}>{say}</MascotSay>}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-bold">
        <span className="flex items-center gap-2">
          {c.mySymbol && <Mark p={c.mySymbol} className="size-4" />} Bạn
          <span className="text-muted">vs</span>
          {v.mode === "solo" ? <Bot className="size-4" /> : c.mySymbol && <Mark p={c.mySymbol === "X" ? "O" : "X"} className="size-4" />}
          {v.mode === "solo" ? "Máy" : (opponent?.name ?? "")}
        </span>
      </div>
      {playing && (
        <div className={`flex items-center justify-between gap-2 rounded-2xl border-2 px-3 py-1.5 text-sm font-bold ${myTurn ? "border-ink bg-gem/15" : "border-border"}`}>
          <span className="flex items-center gap-2">
            <Mark p={c.turn} className="size-4" /> {myTurn ? "Tới lượt bạn" : `Lượt của ${turnName}`}
          </span>
          <GameClock v={v} send={send} ms={left} warn={left < 10_000} />
        </div>
      )}
      <div className="relative mt-10">
        <ZoomBoard v={v} myTurn={myTurn} send={send} />
        <PausedCover v={v} send={send} />
      </div>
      {playing && c.mySymbol && (
        <div className="mx-auto w-40">
          <ResignButton send={send} className="w-full" />
        </div>
      )}
    </div>
  );
}
