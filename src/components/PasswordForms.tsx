"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { requestPasswordReset, resetPasswordAction, type ResetState } from "@/app/auth-actions";

const ErrorBox = ({ children }: { children?: string }) =>
  children ? <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-400">{children}</p> : null;

/** Trang "Quên mật khẩu": nhập email → nhận mã 6 số → nhập mã + mật khẩu mới (đặt xong là đăng nhập luôn) */
export function ForgotForm() {
  const [state, action, pending] = useActionState<ResetState, FormData>(resetPasswordAction, {});
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const send = async () => {
    setSending(true);
    setError("");
    const err = await requestPasswordReset(email);
    setSending(false);
    if (err) return setError(err);
    setStep("code");
    setCode("");
    setCooldown(60);
  };

  const err = step === "code" ? error || state.error : error;

  return (
    <main className="flex flex-1 items-center justify-center p-4 md:p-8">
      <div className="flex w-full max-w-md flex-col gap-5 rounded-3xl border border-border bg-card p-8 shadow-2xl shadow-black/40 md:p-10">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-accent text-white">
            <KeyRound className="size-7" />
          </div>
          <h1 className="text-2xl font-extrabold">{step === "email" ? "Quên mật khẩu" : "Đặt mật khẩu mới"}</h1>
          <p className="text-link">
            {step === "email" ? (
              "Nhập email đã đăng ký, chúng tôi sẽ gửi mã 6 số để đặt mật khẩu mới."
            ) : (
              <>
                Nếu <b className="text-foreground">{email}</b> đã có tài khoản, mã đã được gửi tới email. Kiểm tra cả thư mục Spam.
              </>
            )}
          </p>
        </div>

        {step === "email" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex flex-col gap-3"
          >
            <input
              type="email"
              placeholder="Email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
              required
            />
            <ErrorBox>{err}</ErrorBox>
            <button className="btn btn-primary mt-1 py-3.5 text-base" disabled={sending}>
              {sending ? "Đang gửi…" : "Gửi mã"}
            </button>
          </form>
        ) : (
          <form action={action} className="flex flex-col gap-3">
            <input type="hidden" name="email" value={email} />
            <input
              name="code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="______"
              className="input text-center text-2xl font-extrabold tracking-[0.5em]"
              autoFocus
              required
            />
            <input name="password" type="password" placeholder="Mật khẩu mới (ít nhất 8 ký tự)" className="input" autoComplete="new-password" minLength={8} required />
            <input name="confirm" type="password" placeholder="Nhập lại mật khẩu mới" className="input" autoComplete="new-password" minLength={8} required />
            <ErrorBox>{err}</ErrorBox>
            <button className="btn btn-primary mt-1 py-3.5 text-base" disabled={pending || code.length !== 6}>
              {pending ? "Đang lưu…" : "Lưu mật khẩu mới"}
            </button>
            <div className="flex justify-between text-sm font-bold">
              <button type="button" className="text-link" onClick={() => setStep("email")}>
                ← Đổi email
              </button>
              <button type="button" className="text-link disabled:opacity-40" disabled={cooldown > 0 || sending} onClick={send}>
                {cooldown > 0 ? `Gửi lại mã (${cooldown}s)` : sending ? "Đang gửi…" : "Gửi lại mã"}
              </button>
            </div>
          </form>
        )}

        <Link href="/login" className="text-center text-sm font-bold text-link">
          ← Quay lại đăng nhập
        </Link>
      </div>
    </main>
  );
}
