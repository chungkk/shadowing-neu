"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckCircle2, ChevronRight, X } from "lucide-react";
import { setLidState } from "@/app/(portal)/lai-xe/actions";
import { Wappen } from "./LidParts";

type S = { code: string; name: string; capital: string };

/** Thẻ "BANG CỦA BẠN" + bảng chọn bang trắng trượt lên — như màn chính app LiD */
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
        className="flex w-full items-center gap-3.5 rounded-[18px] border border-white/10 bg-white/[0.06] p-5 text-left shadow-[0_8px_16px_rgba(0,0,0,0.4)] transition hover:bg-white/[0.09] active:opacity-80"
      >
        <span className="flex size-13 shrink-0 items-center justify-center overflow-hidden rounded-[13px] bg-white/[0.07]">
          <Wappen code={current} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="mb-1 text-[11px] font-semibold tracking-[0.1em] text-white/35">BANG CỦA BẠN</span>
          <span className="truncate text-lg font-bold">{pending ? "Đang đổi…" : (cur?.name ?? current)}</span>
        </span>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.07]">
          <ChevronRight className="size-4 text-white/40" />
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/65 sm:items-center" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Chọn bang"
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85dvh] w-full flex-col overflow-hidden rounded-t-[26px] bg-white text-[#111] sm:max-w-3xl sm:rounded-[20px]"
          >
            <div className="flex items-center justify-between border-b border-[#f0f0f0] p-6">
              <h2 className="text-lg font-bold">Chọn bang</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Đóng" className="flex size-[34px] items-center justify-center rounded-[10px] bg-[#f0f0f0] text-[#333]">
                <X className="size-[18px]" />
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
                      className={`relative flex w-full items-center gap-4 border-b border-[#f2f2f2] px-6 py-4 text-left sm:flex-col sm:gap-2 sm:rounded-[14px] sm:border-[1.5px] sm:px-2 sm:py-3.5 sm:text-center ${
                        on ? "bg-[#eef4ff] sm:border-[2.5px] sm:border-[#003399]" : "hover:bg-[#f7f7f7] sm:border-[#eee]"
                      }`}
                    >
                      <Wappen code={s.code} className="h-11 w-9 sm:h-13 sm:w-11" />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className={on ? "font-bold text-[#003399]" : "font-medium"}>{s.name}</span>
                        <span className="text-sm text-[#888]">{s.capital}</span>
                      </span>
                      {on && <CheckCircle2 className="size-[22px] shrink-0 fill-[#003399] text-white sm:absolute sm:top-1.5 sm:right-1.5 sm:size-5" />}
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
