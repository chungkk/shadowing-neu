"use client";

import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { CheckCircle2, ChevronRight, MapPin, X } from "lucide-react";
import { setLidState } from "@/app/(app)/lai-xe/actions";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { Wappen } from "./LidParts";

type S = { code: string; name: string; capital: string };

/**
 * Thẻ "Bang của bạn" + bảng chọn bang trượt lên — màu theo giao diện sáng / tối của trang.
 * chosen=false: người học chưa tự chọn (đang dùng bang mặc định) → thẻ nhắc chọn bang.
 * variant="button": chỉ nút "Đổi bang" (màn bắt đầu thi thử).
 */
export function StatePicker({ states, current, chosen = true, variant = "card" }: { states: S[]; current: string; chosen?: boolean; variant?: "card" | "button" }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const panel = useRef<HTMLDivElement>(null);
  const cur = states.find((s) => s.code === current);
  useDialogFocus(panel, open);
  // Rời trang (Activity ẩn trang) → đóng bảng chọn, quay lại không thấy bảng đang mở và trang không bị khoá cuộn
  useLayoutEffect(() => () => setOpen(false), []);

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
      {variant === "button" ? (
        <button type="button" onClick={() => setOpen(true)} className="btn btn-lg" aria-haspopup="dialog">
          <MapPin className="size-4" /> {pending ? "Đang đổi…" : "Đổi bang"}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          className={`group card card-link flex min-h-[4.5rem] w-full cursor-pointer items-center gap-3 text-left ${chosen ? "" : "hero"}`}
        >
          <span className={`icon-bubble size-13 overflow-hidden ${chosen ? "" : "bg-card"}`}>
            <Wappen code={current} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className={`font-display text-lg font-extrabold tracking-[-0.02em] ${chosen ? "truncate" : "leading-tight"}`}>{pending ? "Đang đổi…" : chosen ? (cur?.name ?? current) : "Bạn sống ở bang nào?"}</span>
            <span className="text-sm text-muted">{chosen ? `Bang của bạn · thủ phủ ${cur?.capital ?? ""} · bấm để đổi` : `Chọn bang để học đúng 3 câu riêng của bang trong bài thi · đang tạm dùng ${cur?.name ?? current}`}</span>
          </span>
          {!chosen && <span className="btn btn-sm pointer-events-none max-sm:hidden">Chọn bang</span>}
          <ChevronRight className="size-5 shrink-0 text-muted transition-transform duration-300 ease-[var(--ease-out)] group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden />
        </button>
      )}

      {open && (
        <div className="dialog-backdrop z-[100]" onClick={() => setOpen(false)}>
          <div
            ref={panel}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Chọn bang"
            onClick={(e) => e.stopPropagation()}
            className="dialog max-h-[85dvh] max-w-3xl gap-3 overflow-hidden outline-none"
          >
            <div className="dialog-head items-center">
              <h2 className="dialog-title">Chọn bang</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Đóng" className="btn-icon">
                <X className="size-5" />
              </button>
            </div>
            <ul className="-mx-2 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 pb-1 sm:-mx-3 sm:grid sm:grid-cols-3 sm:gap-2.5 sm:px-3">
              {states.map((s) => {
                const on = s.code === current;
                return (
                  <li key={s.code}>
                    <button
                      type="button"
                      aria-current={on ? "true" : undefined}
                      disabled={pending}
                      onClick={() => {
                        setOpen(false);
                        if (!on) start(() => setLidState(s.code));
                      }}
                      className={`relative flex min-h-14 w-full cursor-pointer items-center gap-4 rounded-ui border px-3 py-2.5 text-left transition-colors sm:flex-col sm:gap-2 sm:px-2 sm:py-3.5 sm:text-center ${
                        on ? "border-sec bg-sec-soft shadow-[inset_0_0_0_1px_var(--sec)]" : "border-transparent hover:bg-card-2 sm:border-line dark:sm:border-border"
                      }`}
                    >
                      <Wappen code={s.code} className="h-11 w-9 sm:h-13 sm:w-11" />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className={on ? "font-bold text-sec-text" : "font-semibold"}>{s.name}</span>
                        <span className="text-sm text-muted">{s.capital}</span>
                      </span>
                      {on && <CheckCircle2 className="size-6 shrink-0 fill-sec-text text-card sm:absolute sm:top-1.5 sm:right-1.5 sm:size-5" aria-label="Đang chọn" />}
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
