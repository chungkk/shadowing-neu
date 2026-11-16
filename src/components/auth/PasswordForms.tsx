"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { requestPasswordReset, resetPasswordAction, type ResetState } from "@/app/(app)/auth-actions";

const ErrorBox = ({ children }: { children?: string }) =>
  children ? (
    <p role="alert" className="alert alert-err">
      {children}
    </p>
  ) : null;

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
      <div className="auth-card max-w-md gap-5 p-5 pt-8 sm:p-8 sm:pt-10 md:p-10">
        <div className="flex flex-col items-center text-center">
          <span className="auth-badge" aria-hidden>
            <KeyRound className="size-7" />
          </span>
          <h1 className="page-title">{step === "email" ? "Quên mật khẩu" : "Đặt mật khẩu mới"}</h1>
          <p className="auth-subtitle">
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
              placeholder="Email" aria-label="Email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
              required
            />
            <ErrorBox>{err}</ErrorBox>
            <button className="btn btn-primary btn-lg btn-block mt-1" disabled={sending}>
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
              aria-label="Mã xác nhận 6 số"
              className="input auth-code"
              autoFocus
              required
            />
            <input name="password" type="password" placeholder="Mật khẩu mới (ít nhất 8 ký tự)" aria-label="Mật khẩu mới (ít nhất 8 ký tự)" className="input" autoComplete="new-password" minLength={8} required />
            <input name="confirm" type="password" placeholder="Nhập lại mật khẩu mới" aria-label="Nhập lại mật khẩu mới" className="input" autoComplete="new-password" minLength={8} required />
            <ErrorBox>{err}</ErrorBox>
            <button className="btn btn-primary btn-lg btn-block mt-1" disabled={pending || code.length !== 6}>
              {pending ? "Đang lưu…" : "Lưu mật khẩu mới"}
            </button>
            <div className="auth-links">
              <button type="button" onClick={() => setStep("email")}>
                ← Đổi email
              </button>
              <button type="button" disabled={cooldown > 0 || sending} onClick={send}>
                {cooldown > 0 ? `Gửi lại mã (${cooldown}s)` : sending ? "Đang gửi…" : "Gửi lại mã"}
              </button>
            </div>
          </form>
        )}

        <Link href="/login" className="mx-auto rounded-lg px-2 py-1 text-center text-sm font-bold text-link hover:underline">
          ← Quay lại đăng nhập
        </Link>
      </div>
    </main>
  );
}
