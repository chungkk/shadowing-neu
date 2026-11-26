"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, KeyRound, Mail } from "lucide-react";
import {
  requestPasswordReset,
  resetPasswordAction,
  type ResetState,
} from "@/app/(app)/auth-actions";

const ErrorBox = ({ children }: { children?: string }) =>
  children ? (
    <p role="alert" className="alert alert-err">
      {children}
    </p>
  ) : null;

/** Trang "Quên mật khẩu": nhập email → nhận mã 6 số → nhập mã + mật khẩu mới (đặt xong là đăng nhập luôn) */
export function ForgotForm() {
  const searchParams = useSearchParams();
  const rawNext = searchParams.get("next") ?? "";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";
  const [state, action, pending] = useActionState<ResetState, FormData>(
    resetPasswordAction,
    {},
  );
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
      <div className="auth-card max-w-md">
        <div className="flex flex-col gap-5 p-5 sm:p-8">
          <div className="flex items-start gap-3">
            <span className="icon-bubble tint-accent size-10 shrink-0" aria-hidden>
              <KeyRound className="size-5" strokeWidth={2} />
            </span>
            <div>
              <h1 className="page-title text-2xl">
                {step === "email" ? "Quên mật khẩu" : "Đặt mật khẩu mới"}
              </h1>
              <p className="auth-subtitle">
                {step === "email"
                  ? "Nhập email đã đăng ký, chúng tôi gửi mã 6 số để bạn đặt mật khẩu mới."
                  : "Nhập mã trong email và chọn mật khẩu mới — đặt xong là đăng nhập luôn."}
              </p>
            </div>
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
                aria-label="Email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                required
              />
              <ErrorBox>{err}</ErrorBox>
              <button
                className="btn btn-primary btn-lg btn-block mt-1"
                disabled={sending}
              >
                {sending ? "Đang gửi…" : "Gửi mã"}
              </button>
            </form>
          ) : (
            <form action={action} className="flex flex-col gap-3">
              <input type="hidden" name="email" value={email} />
              <input type="hidden" name="next" value={next} />
              <p className="alert alert-info">
                <Mail className="mt-px size-4 shrink-0" aria-hidden />
                <span>
                  Nếu <b>{email}</b> đã có tài khoản, mã đã được gửi tới đó.
                  Không thấy thì xem cả thư mục Spam.
                </span>
              </p>
              <input
                name="code"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="______"
                aria-label="Mã xác nhận 6 số"
                className="input auth-code"
                autoFocus
                required
              />
              <input
                name="password"
                type="password"
                placeholder="Mật khẩu mới (ít nhất 8 ký tự)"
                aria-label="Mật khẩu mới (ít nhất 8 ký tự)"
                className="input"
                autoComplete="new-password"
                minLength={8}
                required
              />
              <input
                name="confirm"
                type="password"
                placeholder="Nhập lại mật khẩu mới"
                aria-label="Nhập lại mật khẩu mới"
                className="input"
                autoComplete="new-password"
                minLength={8}
                required
              />
              <ErrorBox>{err}</ErrorBox>
              <button
                className="btn btn-primary btn-lg btn-block mt-1"
                disabled={pending || code.length !== 6}
              >
                {pending ? "Đang lưu…" : "Lưu mật khẩu mới"}
              </button>
              <div className="auth-links">
                <button type="button" onClick={() => setStep("email")}>
                  <ArrowLeft className="size-4" /> Đổi email
                </button>
                <button
                  type="button"
                  disabled={cooldown > 0 || sending}
                  onClick={send}
                >
                  {cooldown > 0
                    ? `Gửi lại mã (${cooldown}s)`
                    : sending
                      ? "Đang gửi…"
                      : "Gửi lại mã"}
                </button>
              </div>
            </form>
          )}

          <Link
            href={next !== "/" ? `/login?next=${encodeURIComponent(next)}` : "/login"}
            className="mx-auto inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-link hover:underline"
          >
            <ArrowLeft className="size-4" /> Quay lại đăng nhập
          </Link>
        </div>
      </div>
    </main>
  );
}
