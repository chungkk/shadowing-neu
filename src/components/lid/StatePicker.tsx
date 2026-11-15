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
          className={`card sticker-link flex w-full cursor-pointer items-center gap-3 text-left ${chosen ? "" : "border-gold bg-gold/10"}`}
        >
          <span className="flex size-13 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-card-2">
            <Wappen code={current} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-xs font-extrabold tracking-wider text-muted uppercase">{chosen ? "Bang của bạn" : "Bạn sống ở bang nào?"}</span>
            <span className={`text-lg font-extrabold ${chosen ? "truncate" : "leading-tight"}`}>{pending ? "Đang đổi…" : chosen ? (cur?.name ?? current) : "Chọn bang để học đúng câu hỏi"}</span>
            {!chosen && <span className="text-sm text-muted">Bài thi có 3 câu riêng của bang · đang tạm dùng {cur?.name ?? current}</span>}
          </span>
          <ChevronRight className="size-5 shrink-0 text-muted" />
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={() => setOpen(false)}>
          <div
            ref={panel}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Chọn bang"
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85dvh] outline-none w-full flex-col overflow-hidden rounded-t-3xl border-2 border-b-0 border-ink bg-card text-foreground sm:max-w-3xl sm:rounded-3xl sm:border-b-2"
          >
            <div className="flex items-center justify-between border-b-2 border-ink/10 px-5 py-4">
              <h2 className="section-title">Chọn bang</h2>
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
                      aria-current={on ? "true" : undefined}
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
