"use client";

import { useEffect, useRef, useState } from "react";
import { BookmarkPlus, Gem, LogIn, Pencil, Play, Trophy, UserRound } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { LoginLink } from "./LoginDialog";
import Mascot from "./Mascot";

/**
 * Chơi không cần tài khoản ở các game từ vựng (Mưa từ vựng, Đào vàng, Nối từ): khách nhập 1 tên tạm (lưu trong trình
 * duyệt) trước khi vào ván; hết ván thì chúc mừng theo tên đó và mời đăng nhập / đăng ký để giữ kết quả.
 */

const MAX_NAME = 20;

/** Tên tạm của khách (dùng chung mọi game) */
export function useGuestName() {
  return useLocalStorage("guest-name", "");
}

/**
 * Bọc nút "Bắt đầu" của khách: chưa có tên tạm → hỏi tên rồi mới vào ván.
 * Trả về hàm gate(from) thay cho start(from) và phần tử popup để render.
 */
export function useGuestGate(loggedIn: boolean, start: (from: number) => void) {
  const [name, setName] = useGuestName();
  const [pending, setPending] = useState<number | null>(null); // mốc định vào khi popup đang mở
  const [editing, setEditing] = useState(false);
  const gate = (from: number) => {
    if (loggedIn || name) return start(from);
    setPending(from);
  };
  const close = () => {
    setPending(null);
    setEditing(false);
  };
  const dialog =
    pending !== null || editing ? (
      <GuestNameDialog
        initial={name}
        editing={editing}
        onCancel={close}
        onSubmit={(n) => {
          setName(n);
          const from = pending;
          close();
          if (from !== null) start(from);
        }}
      />
    ) : null;
  /** Dòng "Đang chơi với tên …" ở màn chọn bộ từ (khách) */
  const chip =
    !loggedIn && name ? (
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border-2 border-ink/15 bg-card-2 px-3 py-2 text-sm">
        <UserRound className="size-4 shrink-0 text-muted" />
        <span>
          Chơi với tên tạm <b>{name}</b>
        </span>
        <button className="inline-flex cursor-pointer items-center gap-1 font-bold text-link hover:underline" onClick={() => setEditing(true)}>
          <Pencil className="size-3.5" /> Đổi tên
        </button>
        <LoginLink href={`/login?next=${typeof location !== "undefined" ? location.pathname : "/games"}`} className="ml-auto font-bold text-link hover:underline">
          Đăng nhập
        </LoginLink>
      </div>
    ) : null;
  return { name, gate, dialog, chip };
}

function GuestNameDialog({ initial, editing, onSubmit, onCancel }: { initial: string; editing: boolean; onSubmit: (name: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState(initial);
  const input = useRef<HTMLInputElement>(null);
  const name = value.trim().replace(/\s+/g, " ").slice(0, MAX_NAME);
  useEffect(() => input.current?.focus(), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [onCancel]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Nhập tên tạm thời">
      <button className="sheet-fade absolute inset-0 cursor-default bg-black/55" onClick={onCancel} aria-label="Đóng" />
      <form
        className="sticker sheet-up relative flex w-full max-w-sm flex-col gap-4 bg-card p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (name) onSubmit(name);
        }}
      >
        <div className="flex items-center gap-3">
          <Mascot animated className="size-14 shrink-0" />
          <div>
            <p className="text-lg font-black">{editing ? "Đổi tên tạm" : "Bạn tên là gì?"}</p>
            <p className="text-sm text-muted">Nhập tên tạm để chơi ngay, không cần tài khoản.</p>
          </div>
        </div>
        <input
          ref={input}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={MAX_NAME}
          placeholder="Ví dụ: Minh"
          autoComplete="nickname"
          className="w-full rounded-xl border-2 border-ink/20 bg-card-2 px-3 py-2.5 text-base font-bold outline-none focus:border-ink"
        />
        <button type="submit" className="btn btn-amber btn-lg font-black" disabled={!name}>
          <Play className="size-4 fill-current" /> {editing ? "Lưu tên" : "Vào chơi"}
        </button>
        <p className="-mt-1 text-center text-sm text-muted">
          Đã có tài khoản?{" "}
          <LoginLink href={`/login?next=${location.pathname}`} className="font-bold text-link hover:underline">
            Đăng nhập
          </LoginLink>
        </p>
      </form>
    </div>
  );
}

/**
 * Khách chơi Sudoku / Caro: tên tạm (dùng chung với các game khác) được báo lên server để nhận cookie khách,
 * vì phòng chơi với người cần server biết ai là ai. ready = đã đăng nhập, hoặc server đã nhận tên tạm.
 * ask(then): chưa có tên → hỏi tên, có rồi → chạy then ngay khi server đã nhận tên.
 */
export function usePlayGuest(loggedIn: boolean) {
  const [name, setName] = useGuestName();
  const [synced, setSynced] = useState("");
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState<"ask" | "edit" | null>(null);
  const pending = useRef<(() => void) | null>(null);
  const ready = loggedIn || (!!name && synced === name);

  useEffect(() => {
    if (loggedIn || !name || synced === name) return;
    let stop = false;
    fetch("/api/v1/games/play/guest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error ?? `Lỗi máy chủ (${r.status})`);
        if (!stop) {
          setSynced(name);
          setError("");
        }
      })
      .catch((e: Error) => !stop && setError(e.message === "Failed to fetch" ? "Không kết nối được máy chủ" : e.message));
    return () => {
      stop = true;
    };
  }, [loggedIn, name, synced]);

  useEffect(() => {
    if (!ready || !pending.current) return;
    const then = pending.current;
    pending.current = null;
    then();
  }, [ready]);

  const ask = (then?: () => void) => {
    if (ready) return then?.();
    pending.current = then ?? null;
    if (!name) setDialog("ask");
  };
  const view =
    dialog && !loggedIn ? (
      <GuestNameDialog
        initial={name}
        editing={dialog === "edit"}
        onCancel={() => {
          pending.current = null;
          setDialog(null);
        }}
        onSubmit={(n) => {
          setName(n);
          setDialog(null);
        }}
      />
    ) : null;
  const chip =
    !loggedIn && name ? (
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border-2 border-ink/15 bg-card-2 px-3 py-2 text-sm">
        <UserRound className="size-4 shrink-0 text-muted" />
        <span>
          Chơi với tên tạm <b>{name}</b>
        </span>
        <button className="inline-flex cursor-pointer items-center gap-1 font-bold text-link hover:underline" onClick={() => setDialog("edit")}>
          <Pencil className="size-3.5" /> Đổi tên
        </button>
        <LoginLink href={`/login?next=${typeof location !== "undefined" ? location.pathname : "/games"}`} className="ml-auto font-bold text-link hover:underline">
          Đăng nhập
        </LoginLink>
      </div>
    ) : null;
  return { name, ready, error, ask, dialog: view, chip };
}

/** Lời chúc + mời đăng ký ở màn kết quả của khách */
export function GuestResult({ name, score, record }: { name: string; score: number; record: boolean }) {
  const who = name || "bạn";
  const title = score <= 0 ? `Cố lên ${who}!` : record ? `Chúc mừng ${who}! 🎉` : `Giỏi lắm ${who}!`;
  const line = score <= 0 ? "Ván sau chắc chắn sẽ tốt hơn." : record ? `Bạn vừa lập kỷ lục mới ${score} điểm.` : `Bạn ghi được ${score} điểm ván này.`;
  return (
    <div className="flex w-full flex-col gap-3 rounded-2xl border-2 border-amber/50 bg-gold/10 p-4 text-left">
      <div className="flex items-center gap-3">
        <Mascot animated className="size-12 shrink-0" />
        <div className="min-w-0">
          <p className="truncate text-lg font-black">{title}</p>
          <p className="text-sm text-muted">{line}</p>
        </div>
      </div>
      <p className="text-sm font-bold">Đăng ký miễn phí để giữ kết quả cho lần sau:</p>
      <ul className="flex flex-col gap-1.5 text-sm">
        <li className="flex items-start gap-2">
          <Trophy className="mt-0.5 size-4 shrink-0 text-amber" /> Có tên riêng trong tài khoản, khỏi nhập tên tạm mỗi lần
        </li>
        <li className="flex items-start gap-2">
          <BookmarkPlus className="mt-0.5 size-4 shrink-0 text-amber" /> Lưu từ bị trượt vào sổ ôn, mở trên máy nào cũng còn
        </li>
        <li className="flex items-start gap-2">
          <Gem className="mt-0.5 size-4 shrink-0 text-gem" /> Luyện bài nhận kim cương, leo bảng xếp hạng
        </li>
      </ul>
      <LoginLink href={`/login?next=${location.pathname}`} className="btn btn-amber btn-lg font-black">
        <LogIn className="size-4" /> Đăng nhập / Đăng ký
      </LoginLink>
    </div>
  );
}
