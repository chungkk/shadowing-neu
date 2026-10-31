"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { login, register, requestSignupCode, type AuthState } from "@/app/auth-actions";
import SocialLogin from "./SocialLogin";

/** Đăng ký 2 bước: điền thông tin → nhận mã 6 số qua email → nhập mã để tạo tài khoản */
function RegisterForm({ next, close }: { next: string; close?: () => void }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(register, {});
  useEffect(() => {
    if (state.ok) close?.();
  }, [state.ok, close]);
  const [step, setStep] = useState<"info" | "code">("info");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    const err = await requestSignupCode({ name, email, password });
    setSending(false);
    if (err) return setError(err);
    setStep("code");
    setCode("");
    setCooldown(60);
  };

  const err = step === "code" ? error || state.error : error;

  if (step === "info") {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex flex-col gap-3"
      >
        <input placeholder="Tên của bạn" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
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
        <input
          type="password"
          placeholder="Mật khẩu (ít nhất 8 ký tự)"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
        {err && <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-400">{err}</p>}
        <button className="btn btn-primary mt-1 py-3.5 text-base" disabled={sending}>
          {sending ? "Đang gửi mã…" : "Gửi mã xác nhận"}
        </button>
      </form>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="next" value={next} />
      {close && <input type="hidden" name="stay" value="1" />}
      <input type="hidden" name="name" value={name} />
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="password" value={password} />
      <p className="text-center text-sm text-muted">
        Đã gửi mã 6 số tới <b className="text-foreground">{email}</b>.<br />
        Kiểm tra cả thư mục Spam.
      </p>
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
      {err && <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-400">{err}</p>}
      <button className="btn btn-primary mt-1 py-3.5 text-base" disabled={pending || code.length !== 6}>
        {pending ? "Đang xử lý…" : "Xác nhận & đăng ký"}
      </button>
      <div className="flex justify-between text-sm font-bold">
        <button type="button" className="text-link" onClick={() => setStep("info")}>
          ← Đổi email
        </button>
        <button type="button" className="text-link disabled:opacity-40" disabled={cooldown > 0 || sending} onClick={send}>
          {cooldown > 0 ? `Gửi lại mã (${cooldown}s)` : sending ? "Đang gửi…" : "Gửi lại mã"}
        </button>
      </div>
    </form>
  );
}

/** Đăng nhập kiểu nhập email trước: "Tiếp tục với email" → nhập mật khẩu */
function LoginForm({ next, close }: { next: string; close?: () => void }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(login, {});
  useEffect(() => {
    if (state.ok) close?.();
  }, [state.ok, close]);
  const [step, setStep] = useState<"email" | "password">("email");
  const [email, setEmail] = useState("");

  if (step === "email") {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setStep("password");
        }}
        className="flex flex-col gap-3"
      >
        <input
          type="email"
          placeholder="Nhập email của bạn"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          autoFocus
          required
        />
        <button className="btn btn-primary mt-1 py-3.5 text-base uppercase">Tiếp tục với email</button>
      </form>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="next" value={next} />
      {close && <input type="hidden" name="stay" value="1" />}
      <input type="hidden" name="email" value={email} />
      <p className="flex items-center justify-center gap-2 text-sm">
        <span className="truncate text-muted">{email}</span>
        <button type="button" className="shrink-0 font-bold text-link" onClick={() => setStep("email")}>
          Đổi
        </button>
      </p>
      <input name="password" type="password" placeholder="Mật khẩu" className="input" autoComplete="current-password" autoFocus required />
      <Link href="/forgot-password" onClick={close} className="-mt-1 self-end text-sm font-bold text-link">
        Quên mật khẩu?
      </Link>
      {state.error && <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-400">{state.error}</p>}
      <button className="btn btn-primary mt-1 py-3.5 text-base" disabled={pending}>
        {pending ? "Đang xử lý…" : "Đăng nhập"}
      </button>
    </form>
  );
}

/** Form đăng nhập / đăng ký dùng chung — hộp 2 nửa: form bên trái, hình minh hoạ bên phải */
export default function AuthForm({
  mode,
  next,
  social,
  onClose,
  onSwitch,
}: {
  mode: "login" | "register";
  next: string;
  social: { google: string | null; apple: string | null }; // client ID nút Google / Apple (null = ẩn)
  onClose?: () => void; // có = popup đè lên trang đang xem: đăng nhập xong ở lại trang đó (không chuyển tới `next`)
  onSwitch?: () => void; // popup: chuyển đăng nhập ↔ đăng ký ngay trong popup
}) {
  const isLogin = mode === "login";
  const query = next !== "/" ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <Frame onClose={onClose}>
      {/* Popup trên điện thoại: phủ kín màn hình (không viền / bo góc) thay cho hộp nhỏ giữa màn */}
      <div
        className={`relative grid w-full max-w-4xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl shadow-black/40 md:grid-cols-2 ${
          onClose ? "max-sm:min-h-dvh max-sm:rounded-none max-sm:border-0" : ""
        }`}
      >
        <CloseButton onClose={onClose} />

        <div className="flex flex-col gap-4 px-5 pt-[max(3.5rem,calc(env(safe-area-inset-top)+3rem))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:gap-5 sm:p-8 md:p-10">
          <div className="text-center">
            <h1 className="text-2xl font-extrabold sm:text-3xl">{isLogin ? "Chào mừng trở lại" : "Tạo tài khoản"}</h1>
            <p className="mt-2 text-link">
              {isLogin ? "Tiếp tục hành trình luyện nói tiếng Đức của bạn" : "Miễn phí — bắt đầu luyện shadowing ngay"}
            </p>
          </div>

          {/* Google / Apple: chưa có tài khoản thì tự tạo luôn, nên dùng chung cho cả đăng nhập lẫn đăng ký */}
          <SocialLogin google={social.google} apple={social.apple} next={next} onDone={onClose} />

          {isLogin ? <LoginForm next={next} close={onClose} /> : <RegisterForm next={next} close={onClose} />}

          <div className="flex items-center gap-3 text-xs font-bold text-link uppercase">
            <span className="h-px flex-1 bg-border" />
            {isLogin ? "Chưa có tài khoản?" : "Đã có tài khoản?"}
            <span className="h-px flex-1 bg-border" />
          </div>
          {onSwitch ? (
            <button type="button" onClick={onSwitch} className="btn py-3 uppercase">
              {isLogin ? "Tạo tài khoản mới" : "Đăng nhập"}
            </button>
          ) : (
            <Link href={`${isLogin ? "/register" : "/login"}${query}`} className="btn py-3 uppercase">
              {isLogin ? "Tạo tài khoản mới" : "Đăng nhập"}
            </Link>
          )}
          <p className="text-center text-xs text-muted">
            Khách vẫn học được bài miễn phí. Đăng nhập để tạo phụ đề bằng AI (Whisper).
          </p>
        </div>

        {/* Hình minh hoạ */}
        <div className="relative hidden items-center justify-center bg-card-2 md:flex">
          <div className="absolute size-72 rounded-full bg-accent/15" />
          <div className="relative text-[9rem] leading-none drop-shadow-xl">🎧</div>
          <div className="absolute top-[30%] right-[14%] rotate-6 rounded-3xl rounded-bl-md bg-amber px-5 py-3 text-2xl font-extrabold text-sidebar shadow-lg">
            Hallo!
          </div>
          <div className="absolute bottom-[24%] left-[14%] -rotate-6 rounded-3xl rounded-br-md bg-accent px-4 py-2 text-lg font-extrabold text-white shadow-lg">
            Wie geht&apos;s?
          </div>
        </div>
      </div>
    </Frame>
  );
}

/** Trang riêng: căn giữa trong vùng nội dung. Popup: nền mờ phủ cả màn hình, bấm ra ngoài / Esc để đóng */
function Frame({ onClose, children }: { onClose?: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // khoá cuộn trang phía sau
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (!onClose) return <main className="flex flex-1 items-center justify-center p-4 md:p-8">{children}</main>;
  return (
    <div
      role="dialog"
      aria-modal
      className="fixed inset-0 z-50 flex overflow-y-auto overscroll-contain bg-black/70 backdrop-blur-sm sm:p-4 md:p-8"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* m-auto thay cho căn giữa: hộp cao hơn màn hình vẫn cuộn được tới mép trên */}
      <div className="m-auto w-full max-w-4xl">{children}</div>
    </div>
  );
}

function CloseButton({ onClose }: { onClose?: () => void }) {
  const className = "btn-icon absolute top-[max(0.75rem,env(safe-area-inset-top))] right-3 z-10 text-link";
  if (onClose) {
    return (
      <button type="button" title="Đóng" className={className} onClick={onClose}>
        <X className="size-6" />
      </button>
    );
  }
  return (
    <Link href="/" title="Đóng" className={className}>
      <X className="size-6" />
    </Link>
  );
}
