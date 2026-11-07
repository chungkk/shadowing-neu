"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Delete, Pencil, Undo2 } from "lucide-react";
import { SUDOKU_LEVEL_LABEL } from "@/lib/play";
import { clientApi } from "@/lib/client-api";
import { Diamonds } from "./PlayLobby";
import { GameClock, MascotSay, PausedCover, ResignButton, useCountdown, type MascotMood, type Send, type View } from "./PlayParts";

/**
 * Bàn Sudoku như Solo Games: điền / xoá / hoàn tác / ghi chú tự do trên máy, số trùng hàng / cột / khối tô đỏ và tính 1 lỗi.
 * Bàn được lưu lên server (để người khác thấy tiến độ, mở lại trang vẫn còn); điền kín bàn không trùng thì tự nộp, server so với lời giải.
 */

type Board = { grid: number[]; notes: number[][]; errors: number };

const SYNC_MS = 700;
const row = (i: number) => Math.floor(i / 9);
const col = (i: number) => i % 9;
const box = (i: number) => Math.floor(row(i) / 3) * 3 + Math.floor(col(i) / 3);
const peers = (a: number, b: number) => a !== b && (row(a) === row(b) || col(a) === col(b) || box(a) === box(b));

/** Các ô có số trùng với 1 ô khác cùng hàng / cột / khối */
function conflictsOf(grid: number[]): Set<number> {
  const bad = new Set<number>();
  for (let a = 0; a < 81; a++) {
    if (!grid[a]) continue;
    for (let b = a + 1; b < 81; b++) if (grid[b] === grid[a] && peers(a, b)) bad.add(a).add(b);
  }
  return bad;
}

const notesKey = (code: string) => `play-notes-${code}`;
function loadNotes(code: string): number[][] {
  try {
    const raw = JSON.parse(localStorage.getItem(notesKey(code)) ?? "null");
    if (Array.isArray(raw) && raw.length === 81) return raw;
  } catch {}
  return Array.from({ length: 81 }, () => []);
}

export default function SudokuPlay({ v, send, apply }: { v: View; send: Send; apply: (v: View) => void }) {
  const s = v.sudoku!;
  const me = v.players.find((p) => p.me);
  const ended = v.status === "ended";
  const canPlay = v.status === "playing" && !!me && !me.out && !v.pause;
  // Ghi chú chỉ nằm trên máy này: lưu theo mã phòng để mở lại trang vẫn còn (component chỉ hiện sau khi tải ván ở trình duyệt)
  const [board, setBoard] = useState<Board>(() => ({ grid: s.mine, notes: loadNotes(v.code), errors: s.errors }));
  const [history, setHistory] = useState<Board[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [noteMode, setNoteMode] = useState(false);
  const [msg, setMsg] = useState("");
  const [startled, setStartled] = useState(false); // linh vật giật mình một thoáng khi vừa điền số trùng
  const startleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const left = useCountdown(v.msLeft, v.version, v.status === "playing" && !v.pause);

  useEffect(() => {
    try {
      localStorage.setItem(notesKey(v.code), JSON.stringify(board.notes));
    } catch {}
  }, [board.notes, v.code]);

  const conflicts = conflictsOf(board.grid);
  const selVal = sel !== null ? board.grid[sel] : 0;
  const counts = Array.from({ length: 10 }, (_, n) => board.grid.filter((x) => x === n).length);

  function upload(b: Board, submit: boolean) {
    clearTimeout(timer.current);
    const go = () =>
      clientApi<View>("/games/play", { method: "POST", body: { action: submit ? "submit" : "progress", code: v.code, grid: b.grid, errors: b.errors } })
        .then((r) => {
          if (submit && r.ok === false) setMsg("Bàn đã kín nhưng chưa đúng, kiểm tra lại nhé.");
          apply(r);
        })
        .catch((e: Error) => setMsg(e.message));
    if (submit) void go();
    else timer.current = setTimeout(go, SYNC_MS);
  }
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      clearTimeout(startleTimer.current);
    },
    [],
  );

  function commit(next: Board) {
    setHistory((h) => [...h.slice(-199), board]);
    setBoard(next);
    setMsg("");
    const full = next.grid.every(Boolean);
    if (full && conflictsOf(next.grid).size) setMsg("Bàn đã kín nhưng còn số trùng (tô đỏ).");
    if (next.grid !== board.grid || next.errors !== board.errors) upload(next, full && !conflictsOf(next.grid).size);
  }

  function input(n: number) {
    if (!canPlay || sel === null || s.givens[sel]) return;
    if (noteMode) {
      if (board.grid[sel]) return;
      const cur = board.notes[sel];
      const notes = board.notes.map((x, i) => (i === sel ? (cur.includes(n) ? cur.filter((k) => k !== n) : [...cur, n].sort()) : x));
      return commit({ ...board, notes });
    }
    if (board.grid[sel] === n) return erase();
    const grid = board.grid.map((x, i) => (i === sel ? n : x));
    // Điền số → xoá ghi chú của ô đó và số này khỏi ghi chú các ô liên quan
    const notes = board.notes.map((x, i) => (i === sel ? [] : peers(i, sel) ? x.filter((k) => k !== n) : x));
    const clash = grid.some((x, i) => x === n && peers(i, sel));
    if (clash) {
      setStartled(true);
      clearTimeout(startleTimer.current);
      startleTimer.current = setTimeout(() => setStartled(false), 1300);
    }
    commit({ grid, notes, errors: board.errors + (clash ? 1 : 0) });
  }

  function erase() {
    if (!canPlay || sel === null || s.givens[sel] || (!board.grid[sel] && !board.notes[sel].length)) return;
    commit({ ...board, grid: board.grid.map((x, i) => (i === sel ? 0 : x)), notes: board.notes.map((x, i) => (i === sel ? [] : x)) });
  }

  function undo() {
    if (!canPlay || !history.length) return;
    const prev = { ...history[history.length - 1], errors: board.errors }; // hoàn tác không xoá lỗi đã tính
    setHistory((h) => h.slice(0, -1));
    setBoard(prev);
    setMsg("");
    if (prev.grid !== board.grid) upload(prev, false);
  }

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement) return;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      return undo();
    }
    if (/^[1-9]$/.test(e.key)) return input(Number(e.key));
    if (e.key === "n" || e.key === "N") return setNoteMode((m) => !m);
    if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") return erase();
    const move = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 }[e.key];
    if (move) {
      e.preventDefault();
      setSel((x) => (x === null ? 40 : Math.min(80, Math.max(0, x + move))));
    }
  });
  useEffect(() => {
    const on = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);

  const total = s.givens.filter((g) => !g).length;
  const showPlayers = v.players.length > 1;
  const mine = board.grid.filter((x, i) => x && !s.givens[i]).length;
  const leader = v.players.filter((p) => !p.me && !p.out).sort((a, b) => b.progress - a.progress)[0];
  const [mood, say]: [MascotMood, string] = v.pause
    ? ["sleep", v.pause.byId === v.meId ? "Nghỉ chút nhé, bàn được che lại rồi." : `${v.pause.byName} xin nghỉ một chút…`]
    : me?.out
      ? ["sad", "Bạn đã bỏ cuộc, xem mọi người chơi tiếp nhé."]
      : startled
        ? ["wow", "Ối! Số này bị trùng rồi."]
        : msg
          ? ["think", "Kín bàn rồi mà chưa đúng… soát lại các ô xem."]
          : total - mine > 0 && total - mine <= 5
            ? ["cheer", `Còn ${total - mine} ô nữa thôi, cố lên!`]
            : leader && leader.progress > mine + 5
              ? ["think", `${leader.name} đang dẫn trước đó!`]
              : noteMode
                ? ["think", "Đang ghi chú: bấm số để đánh dấu các khả năng."]
                : sel === null
                  ? ["happy", "Chọn một ô rồi bấm số nhé."]
                  : ["happy", "Bình tĩnh, từng ô một."];

  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_20rem] md:grid-rows-[auto_1fr] md:gap-x-5">
      <div className="flex flex-col gap-2 md:col-start-2 md:row-start-1">
        {v.status === "playing" && <MascotSay mood={mood}>{say}</MascotSay>}
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-bold">
          <span className="rounded-full border-2 border-ink bg-card px-2.5 py-0.5">
            {SUDOKU_LEVEL_LABEL[v.level || "easy"]} · {v.mode === "solo" ? "thắng" : "hũ"} <Diamonds n={v.pot} />
          </span>
          <span className="rounded-full border-2 border-ink bg-card px-2.5 py-0.5 tabular-nums">{board.errors} lỗi</span>
          {v.status === "playing" && <GameClock v={v} send={send} ms={left} warn={left < 60_000} />}
        </div>
        {showPlayers && (
          <ul className="flex flex-col gap-1.5">
            {v.players.map((p) => (
              <li key={p.id} className="flex items-center gap-2 text-xs font-bold">
                <span className={`w-24 truncate ${p.out ? "text-muted line-through" : ""}`}>{p.me ? "Bạn" : p.name}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-card-2">
                  <span
                    className={`block h-full rounded-full transition-[width] ${p.me ? "bg-gem" : "bg-gold"}`}
                    style={{ width: `${((p.me ? board.grid.filter((x, i) => x && !s.givens[i]).length : p.progress) / total) * 100}%` }}
                  />
                </span>
                <span className="w-12 text-right text-muted tabular-nums">{p.errors} lỗi</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="relative md:col-start-1 md:row-span-2 md:row-start-1">
        <div className="mx-auto grid aspect-square w-full max-w-[32rem] grid-cols-9 grid-rows-9 overflow-hidden rounded-2xl border-[3px] border-ink bg-card shadow-[0_4px_0_var(--ink)] select-none">
          {board.grid.map((n, i) => {
            const r = row(i);
            const c = col(i);
            const given = !!s.givens[i];
            const conflict = !given && conflicts.has(i);
            const wrong = ended && !given && n !== 0 && s.solution && n !== s.solution[i];
            const missing = ended && !n && s.solution;
            const tint = (Math.floor(r / 3) + Math.floor(c / 3)) % 2 === 1;
            const bg =
              sel === i
                ? "bg-gem/35"
                : conflict || wrong
                  ? "bg-red-500/15"
                  : selVal && n === selVal
                    ? "bg-gem/20"
                    : sel !== null && peers(sel, i)
                      ? "bg-gem/10"
                      : tint
                        ? "bg-card-2/70"
                        : "";
            return (
              <button
                key={i}
                onClick={() => setSel(i)}
                aria-label={`Ô hàng ${r + 1}, cột ${c + 1}${n ? `, số ${n}` : ", trống"}${given ? ", số đề bài" : ""}${conflict ? ", bị trùng" : ""}`}
                className={`relative flex min-h-0 min-w-0 items-center justify-center text-[clamp(1.05rem,5.2vw,1.75rem)] leading-none tabular-nums transition-colors ${
                  c % 3 === 2 && c < 8 ? "border-r-2 border-r-ink" : c < 8 ? "border-r border-r-border" : ""
                } ${r % 3 === 2 && r < 8 ? "border-b-2 border-b-ink" : r < 8 ? "border-b border-b-border" : ""} ${bg}`}
              >
                {n ? (
                  given ? (
                    <span className="font-black">{n}</span>
                  ) : (
                    <span key={n} className={`play-drop font-extrabold ${conflict || wrong ? "text-red-500 dark:text-red-400" : "text-gem"}`}>
                      {n}
                    </span>
                  )
                ) : missing ? (
                  <span className="font-bold text-muted opacity-60">{s.solution![i]}</span>
                ) : board.notes[i]?.length ? (
                  <span className="grid h-full w-full grid-cols-3 grid-rows-3 p-0.5 text-[clamp(0.45rem,1.9vw,0.7rem)] leading-none font-bold text-muted">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => (
                      <span key={k} className="flex items-center justify-center">
                        {board.notes[i].includes(k) ? k : ""}
                      </span>
                    ))}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        <PausedCover v={v} send={send} />
      </div>

      {v.status === "playing" && me && !me.out && (
        <div className="flex flex-col gap-2 md:col-start-2 md:row-start-2">
          <div className="grid grid-cols-3 gap-1.5">
            <button className="btn px-1 whitespace-nowrap" disabled={!canPlay || !history.length} onClick={undo}>
              <Undo2 className="size-4" /> Hoàn tác
            </button>
            <button aria-pressed={noteMode} className={`btn px-1 whitespace-nowrap ${noteMode ? "bg-gold/60" : ""}`} disabled={!canPlay} onClick={() => setNoteMode(!noteMode)}>
              <Pencil className="size-4" /> Ghi chú
            </button>
            <ResignButton send={send} className="px-1 whitespace-nowrap" />
          </div>
          <div className="grid grid-cols-5 gap-1.5 md:grid-cols-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <button
                key={n}
                aria-label={`Số ${n}`}
                disabled={!canPlay}
                onClick={() => input(n)}
                className={`btn relative aspect-square px-0 text-2xl font-black md:aspect-auto md:py-3 ${selVal === n ? "bg-gem/25 ring-2 ring-gem" : ""} ${counts[n] >= 9 ? "opacity-50" : ""}`}
              >
                {n}
              </button>
            ))}
            <button aria-label="Xoá ô đang chọn" disabled={!canPlay} onClick={erase} className="btn aspect-square bg-candy/60 px-0 md:col-start-2 md:aspect-auto md:py-3">
              <Delete className="size-6" />
            </button>
          </div>
          {noteMode && <p className="text-center text-xs font-bold text-muted">Đang ghi chú: bấm số để ghi / bỏ ghi chú ở ô đang chọn.</p>}
          {msg && <p className="text-center text-sm font-bold text-red-500 dark:text-red-400">{msg}</p>}
        </div>
      )}
      {me?.out && v.status === "playing" && <p className="text-center text-sm font-bold text-muted md:col-start-2">Bạn đã bỏ cuộc, đang chờ những người khác…</p>}
    </div>
  );
}
