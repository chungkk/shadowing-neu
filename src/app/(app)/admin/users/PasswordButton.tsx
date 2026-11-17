"use client";

import { useActionState, useRef, useState } from "react";
import { Check, Copy, Dices, KeyRound } from "lucide-react";
import { resetUserPassword } from "../actions";
import { useConfirm } from "@/components/ConfirmDialog";

/** Mật khẩu ngẫu nhiên dễ đọc (bỏ ký tự dễ nhầm: 0/O, 1/l/I) */
function randomPassword(length = 12) {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

/**
 * Nút "Đổi mật khẩu" trên 1 dòng người dùng: mở ô nhập ngay dưới dòng (chiếm cả hàng).
 * Mật khẩu hiện rõ để admin sao chép gửi cho người dùng; có nút tạo ngẫu nhiên.
 */
export default function PasswordButton({ userId, email }: { userId: number; email: string }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [state, action, pending] = useActionState(resetUserPassword.bind(null, userId), {});
  // Hỏi xác nhận bằng .dialog trước khi gửi (cả khi bấm "Lưu" lẫn Enter trong ô nhập)
  const [ask, dialog] = useConfirm();
  const confirmed = useRef(false);
  const form = useRef<HTMLFormElement>(null);

  const copy = async () => {
    await navigator.clipboard.writeText(password).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <>
      <button className={`btn btn-sm ${open ? "btn-soft" : ""}`} aria-expanded={open} onClick={() => setOpen(!open)}>
        <KeyRound className="size-4" /> Đổi mật khẩu
      </button>
      {open && (
        <form
          ref={form}
          action={action}
          onSubmit={(e) => {
            if (confirmed.current) {
              confirmed.current = false;
              return;
            }
            e.preventDefault();
            void ask({ title: `Đặt mật khẩu mới cho ${email}?`, text: "Người này sẽ bị đăng xuất trên mọi thiết bị.", ok: "Đặt mật khẩu", icon: <KeyRound className="size-5" /> }).then((yes) => {
              if (!yes) return;
              confirmed.current = true;
              form.current?.requestSubmit();
            });
          }}
          className="surface flex basis-full flex-col gap-2"
        >
          <div className="flex flex-wrap gap-2">
            <input
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mật khẩu mới (ít nhất 8 ký tự)"
              className="input min-w-0 flex-1 py-2 font-mono"
              autoComplete="new-password"
              spellCheck={false}
              minLength={8}
              required
              autoFocus
            />
            <button type="button" className="btn" title="Tạo mật khẩu ngẫu nhiên" aria-label="Tạo mật khẩu ngẫu nhiên" onClick={() => setPassword(randomPassword())}>
              <Dices className="size-4" />
            </button>
            <button type="button" className="btn" title="Sao chép" aria-label="Sao chép" onClick={copy} disabled={!password}>
              {copied ? <Check className="size-4 text-ok-text" /> : <Copy className="size-4" />}
            </button>
            <button className="btn btn-primary" disabled={pending || password.length < 8}>
              {pending ? "Đang lưu…" : "Lưu"}
            </button>
          </div>
          {state.error && (
            <p role="alert" className="alert alert-err">
              {state.error}
            </p>
          )}
          {state.ok && (
            <p role="status" className="alert alert-ok">
              {state.ok}
            </p>
          )}
          {dialog}
        </form>
      )}
    </>
  );
}
