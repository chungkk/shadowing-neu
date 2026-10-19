"use client";

import { useActionState } from "react";
import Link from "next/link";
import { KeyRound, MailCheck } from "lucide-react";
import { forgotPassword, resetPasswordAction, type ForgotState, type ResetState } from "@/app/auth-actions";

function Shell({ icon, title, sub, children }: { icon: React.ReactNode; title: string; sub: React.ReactNode; children: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center p-4 md:p-8">
      <div className="flex w-full max-w-md flex-col gap-5 rounded-3xl border border-border bg-card p-8 shadow-2xl shadow-black/40 md:p-10">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-accent text-white">{icon}</div>
          <h1 className="text-2xl font-extrabold">{title}</h1>
          <p className="text-link">{sub}</p>
        </div>
        {children}
      </div>
    </main>
  );
}

const ErrorBox = ({ children }: { children?: string }) =>
  children ? <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-400">{children}</p> : null;

/** Trang "Quên mật khẩu": nhập email → gửi link đặt lại */
export function ForgotForm() {
  const [state, action, pending] = useActionState<ForgotState, FormData>(forgotPassword, {});

  if (state.sent) {
    return (
      <Shell icon={<MailCheck className="size-7" />} title="Kiểm tra email" sub="Link có hiệu lực trong 30 phút.">
        <p className="text-center text-sm text-muted">
          Nếu <b className="text-foreground">{state.sent}</b> đã có tài khoản, chúng tôi đã gửi link đặt lại mật khẩu. Kiểm tra cả thư mục Spam.
        </p>
        <Link href="/login" className="btn py-3 uppercase">
          Quay lại đăng nhập
        </Link>
      </Shell>
    );
  }

  return (
    <Shell icon={<KeyRound className="size-7" />} title="Quên mật khẩu" sub="Nhập email đã đăng ký, chúng tôi sẽ gửi link đặt mật khẩu mới.">
      <form key={JSON.stringify(state)} action={action} className="flex flex-col gap-3">
        <input name="email" type="email" placeholder="Email" className="input" defaultValue={state.email} autoComplete="email" autoFocus required />
        <ErrorBox>{state.error}</ErrorBox>
        <button className="btn btn-primary mt-1 py-3.5 text-base" disabled={pending}>
          {pending ? "Đang gửi…" : "Gửi link đặt lại"}
        </button>
      </form>
      <Link href="/login" className="text-center text-sm font-bold text-link">
        ← Quay lại đăng nhập
      </Link>
    </Shell>
  );
}

/** Trang mở từ link trong email: đặt mật khẩu mới */
export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ResetState, FormData>(resetPasswordAction, {});

  if (state.done) {
    return (
      <Shell icon={<KeyRound className="size-7" />} title="Đã đặt mật khẩu mới" sub="Bạn đã được đăng nhập trên trang web.">
        <p className="text-center text-sm text-muted">Dùng ứng dụng iPhone? Mở ứng dụng và đăng nhập bằng mật khẩu mới.</p>
        <Link href="/" className="btn btn-primary py-3.5 text-base">
          Bắt đầu học
        </Link>
      </Shell>
    );
  }

  return (
    <Shell icon={<KeyRound className="size-7" />} title="Đặt mật khẩu mới" sub="Mật khẩu mới cần ít nhất 8 ký tự.">
      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="token" value={token} />
        <input name="password" type="password" placeholder="Mật khẩu mới" className="input" autoComplete="new-password" minLength={8} autoFocus required />
        <input name="confirm" type="password" placeholder="Nhập lại mật khẩu mới" className="input" autoComplete="new-password" minLength={8} required />
        <ErrorBox>{state.error}</ErrorBox>
        <button className="btn btn-primary mt-1 py-3.5 text-base" disabled={pending}>
          {pending ? "Đang lưu…" : "Lưu mật khẩu mới"}
        </button>
      </form>
      {state.error?.startsWith("Link") && (
        <Link href="/forgot-password" className="text-center text-sm font-bold text-link">
          Gửi link mới
        </Link>
      )}
    </Shell>
  );
}
