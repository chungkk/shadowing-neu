"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckCircle2, ChevronRight, X } from "lucide-react";
import { setLidState } from "@/app/(portal)/lai-xe/actions";
import { Wappen } from "./LidParts";

type S = { code: string; name: string; capital: string };

/** Thẻ "Bang của bạn" + bảng chọn bang trượt lên — màu theo giao diện sáng / tối của trang */
export function StatePicker({ states, current }: { states: S[]; current: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const cur = states.find((s) => s.code === current);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="sticker sticker-link flex w-full cursor-pointer items-center gap-3 p-3 text-left"
      >
        <span className="flex size-13 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-card-2">
          <Wappen code={current} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-xs font-extrabold tracking-wider text-muted uppercase">Bang của bạn</span>
          <span className="truncate text-lg font-extrabold">{pending ? "Đang đổi…" : (cur?.name ?? current)}</span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-muted" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Chọn bang"
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85dvh] w-full flex-col overflow-hidden rounded-t-3xl border-2 border-b-0 border-ink bg-card text-foreground sm:max-w-3xl sm:rounded-3xl sm:border-b-2"
          >
            <div className="flex items-center justify-between border-b-2 border-ink/10 px-5 py-4">
              <h2 className="text-lg font-extrabold">Chọn bang</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Đóng" className="btn-icon">
                <X className="size-5" />
              </button>
            </div>
            <ul className="overflow-y-auto sm:grid sm:grid-cols-3 sm:gap-3 sm:p-3">
              {states.map((s) => {
                const on = s.code === current;
                return (
                  <li key={s.code}>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        setOpen(false);
                        if (!on) start(() => setLidState(s.code));
                      }}
                      className={`relative flex w-full cursor-pointer items-center gap-4 border-b-2 border-ink/10 px-5 py-3.5 text-left transition sm:flex-col sm:gap-2 sm:rounded-2xl sm:border-2 sm:px-2 sm:py-3.5 sm:text-center ${
                        on ? "bg-gold/25 sm:border-ink" : "hover:bg-foreground/5 sm:border-ink/20"
                      }`}
                    >
                      <Wappen code={s.code} className="h-11 w-9 sm:h-13 sm:w-11" />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className={on ? "font-extrabold" : "font-bold"}>{s.name}</span>
                        <span className="text-sm text-muted">{s.capital}</span>
                      </span>
                      {on && <CheckCircle2 className="size-6 shrink-0 fill-accent text-white sm:absolute sm:top-1.5 sm:right-1.5 sm:size-5" aria-label="Đang chọn" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
