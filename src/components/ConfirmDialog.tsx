"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useDialogFocus } from "@/hooks/useDialogFocus";

type Tone = "primary" | "red";
type Ask = { title: string; text?: ReactNode; ok: string; cancel?: string; tone?: Tone; icon?: ReactNode };
type Pending = Ask & { resolve: (v: boolean) => void };

/**
 * Hộp xác nhận thay cho window.confirm() dùng chung toàn app (nộp bài thi, thoát bài thi, xoá tiến độ, thao tác quản trị).
 * const [ask, dialog] = useConfirm();  …  if (!(await ask({ title, text, ok }))) return;  …  render {dialog}
 * Esc / bấm nền / ✕ / Huỷ = không đồng ý.
 */
export function useConfirm() {
  const [pending, setPending] = useState<Pending | null>(null);
  const ask = useCallback((a: Ask) => new Promise<boolean>((resolve) => setPending({ ...a, resolve })), []);
  const done = useCallback(
    (v: boolean) => {
      pending?.resolve(v);
      setPending(null);
    },
    [pending],
  );
  const dialog = pending ? <ConfirmDialog {...pending} onDone={done} /> : null;
  return [ask, dialog] as const;
}

function ConfirmDialog({ title, text, ok, cancel = "Huỷ", tone = "primary", icon, onDone }: Ask & { onDone: (v: boolean) => void }) {
  const panel = useRef<HTMLDivElement>(null);
  useDialogFocus(panel, true);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      onDone(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onDone]);

  return createPortal(
    <div className="dialog-backdrop" onClick={() => onDone(false)}>
      <div
        ref={panel}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={text ? "confirm-text" : undefined}
        tabIndex={-1}
        className="dialog outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-head">
          <div className="flex items-center gap-3">
            {icon && <span className={`icon-bubble ${tone === "red" ? "tint-red" : "tint-accent"}`}>{icon}</span>}
            <h2 id="confirm-title" className="dialog-title">
              {title}
            </h2>
          </div>
          <button type="button" className="btn-icon -mt-1 -mr-2" aria-label="Đóng" onClick={() => onDone(false)}>
            <X className="size-5" />
          </button>
        </div>
        {text && (
          <div id="confirm-text" className="dialog-body text-muted">
            {text}
          </div>
        )}
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={() => onDone(false)}>
            {cancel}
          </button>
          <button type="button" className={`btn ${tone === "red" ? "btn-red" : "btn-primary"}`} onClick={() => onDone(true)}>
            {ok}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
