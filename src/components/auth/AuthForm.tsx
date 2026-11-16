"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Mail, Sparkles, X } from "lucide-react";
import { checkEmail, login, register, requestSignupCode, type AuthState } from "@/app/(app)/auth-actions";
import SocialLogin from "./SocialLogin";
import Mascot from "../Mascot";

const ErrorBox = ({ children }: { children?: string }) =>
  children ? (
    <p role="alert" className="alert alert-err">
      {children}
    </p>
  ) : null;

/** Email đã nhập ở bước đầu + nút "Đổi" để quay lại sửa */
function EmailRow({ email, onChange }: { email: string; onChange: () => void }) {
  return (
    <p className="auth-email">
      <Mail className="size-4 shrink-0 text-muted" aria-hidden />
      <span className="min-w-0 flex-1 truncate font-bold">{email}</span>
      <button type="button" className="btn btn-ghost btn-sm shrink-0 text-link" onClick={onChange}>
        Đổi
      </button>
    </p>
  );
}

/** Bước đầu: nhập email → server cho biết đã có tài khoản chưa */
function EmailStep({ email, setEmail, onFound }: { email: string; setEmail: (v: string) => void; onFound: (exists: boolean) => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError("");
        const res = await checkEmail(email).catch(() => ({ error: "Không kết nối được, thử lại." }));
        setPending(false);
        if ("error" in res) return setError(res.error);
        onFound(res.exists);
      }}
      className="flex flex-col gap-3"
    >
      <input
        type="email"
        placeholder="Nhập email của bạn" aria-label="Nhập email của bạn"
        className="input"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="username"
        autoFocus
        required
      />
      <ErrorBox>{error}</ErrorBox>
      <button className="btn btn-primary btn-lg btn-block mt-1" disabled={pending}>
        {pending ? "Đang kiểm tra…" : "Tiếp tục với email"}
      </button>
    </form>
  );
}

/** Email đã có tài khoản → nhập mật khẩu */
function LoginForm({ email, next, close, back }: { email: string; next: string; close?: () => void; back: () => void }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(login, {});
  useEffect(() => {
    if (state.ok) close?.();
  }, [state.ok, close]);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="next" value={next} />
      {close && <input type="hidden" name="stay" value="1" />}
      {/* Ô email ẩn (không phải type=hidden) để trình quản lý mật khẩu biết lưu cho tài khoản nào */}
      <input name="email" value={email} readOnly autoComplete="username" className="hidden" />
      <EmailRow email={email} onChange={back} />
      <input name="password" type="password" placeholder="Mật khẩu" aria-label="Mật khẩu" className="input" autoComplete="current-password" autoFocus required />
      <Link href="/forgot-password" onClick={close} className="-mt-1 self-end rounded-lg px-1 text-sm font-bold text-link hover:underline">
        Quên mật khẩu?
      </Link>
      <ErrorBox>{state.error}</ErrorBox>
      <button className="btn btn-primary btn-lg btn-block mt-1" disabled={pending}>
        {pending ? "Đang xử lý…" : "Đăng nhập"}
      </button>
    </form>
  );
}

/** Email chưa có tài khoản → điền tên + mật khẩu → nhận mã 6 số qua email → nhập mã để tạo tài khoản */
function RegisterForm({ email, next, close, back }: { email: string; next: string; close?: () => void; back: () => void }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(register, {});
  useEffect(() => {
    if (state.ok) close?.();
  }, [state.ok, close]);
  const [step, setStep] = useState<"info" | "code">("info");
  const [name, setName] = useState("");
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
        <input name="email" value={email} readOnly autoComplete="username" className="hidden" />
        <EmailRow email={email} onChange={back} />
        <input placeholder="Tên của bạn" aria-label="Tên của bạn" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" autoFocus required />
        <input
          type="password"
          placeholder="Tạo mật khẩu (ít nhất 8 ký tự)" aria-label="Tạo mật khẩu (ít nhất 8 ký tự)"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
        <ErrorBox>{err}</ErrorBox>
        <button className="btn btn-primary btn-lg btn-block mt-1" disabled={sending}>
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
              aria-label="Mã xác nhận 6 số"
        className="input auth-code"
        autoFocus
        required
      />
      <ErrorBox>{err}</ErrorBox>
      <button className="btn btn-primary btn-lg btn-block mt-1" disabled={pending || code.length !== 6}>
        {pending ? "Đang xử lý…" : "Xác nhận & đăng ký"}
      </button>
      <div className="auth-links">
        <button type="button" onClick={() => setStep("info")}>
          ← Sửa thông tin
        </button>
        <button type="button" disabled={cooldown > 0 || sending} onClick={send}>
          {cooldown > 0 ? `Gửi lại mã (${cooldown}s)` : sending ? "Đang gửi…" : "Gửi lại mã"}
        </button>
      </div>
    </form>
  );
}

const HEADINGS = {
  email: ["Chào mừng bạn", "Nhập email để đăng nhập — chưa có tài khoản thì tạo mới luôn"],
  login: ["Chào mừng trở lại", "Nhập mật khẩu để tiếp tục luyện nói tiếng Đức"],
  register: ["Tạo tài khoản", "Email này chưa có tài khoản — điền tên và mật khẩu để đăng ký miễn phí"],
} as const;

/**
 * Đăng nhập / đăng ký chung 1 form — hộp 2 nửa: form bên trái, hình minh hoạ bên phải.
 * Nhập email trước: đã có tài khoản → hỏi mật khẩu; chưa có → chuyển sang đăng ký.
 */
export default function AuthForm({
  next,
  social,
  onClose,
}: {
  next: string;
  social: { google: string | null; apple: string | null }; // client ID nút Google / Apple (null = ẩn)
  onClose?: () => void; // có = popup đè lên trang đang xem: đăng nhập xong ở lại trang đó (không chuyển tới `next`)
}) {
  const [step, setStep] = useState<"email" | "login" | "register">("email");
  const [email, setEmail] = useState("");
  const [title, subtitle] = HEADINGS[step];
  const back = () => setStep("email");

  return (
    <Frame onClose={onClose}>
      {/* Popup trên điện thoại: phủ kín màn hình (không viền / bo góc) thay cho hộp nhỏ giữa màn */}
      <div
        className={`auth-card max-w-4xl md:grid-cols-2 ${
          onClose ? "max-sm:min-h-dvh max-sm:rounded-none max-sm:border-0" : ""
        }`}
      >
        <CloseButton onClose={onClose} />

        <div className="flex flex-col gap-4 px-5 pt-[max(3.5rem,calc(env(safe-area-inset-top)+3rem))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:gap-5 sm:p-8 md:p-10">
          <div className="text-center">
            <span className="auth-badge" aria-hidden>
              <Sparkles className="size-7" />
            </span>
            <h1 id="auth-title" className="page-title">
              {title}
            </h1>
            <p className="auth-subtitle">{subtitle}</p>
          </div>

          {step === "email" ? (
            <>
              {/* Google / Apple: chưa có tài khoản thì tự tạo luôn, nên dùng chung cho cả đăng nhập lẫn đăng ký */}
              <SocialLogin google={social.google} apple={social.apple} next={next} onDone={onClose} />
              <EmailStep email={email} setEmail={setEmail} onFound={(exists) => setStep(exists ? "login" : "register")} />
            </>
          ) : step === "login" ? (
            <LoginForm email={email.trim().toLowerCase()} next={next} close={onClose} back={back} />
          ) : (
            <RegisterForm email={email.trim().toLowerCase()} next={next} close={onClose} back={back} />
          )}

          <p className="text-center text-xs leading-relaxed text-muted">
            Khi tiếp tục (kể cả đăng nhập bằng Google / Apple), bạn đồng ý với{" "}
            <Link href="/deutsch-shadowing/terms" target="_blank" className="font-bold text-link underline underline-offset-2">
              Điều khoản sử dụng
            </Link>{" "}
            và{" "}
            <Link href="/deutsch-shadowing/privacy" target="_blank" className="font-bold text-link underline underline-offset-2">
              Chính sách quyền riêng tư
            </Link>{" "}
            của chúng tôi. Khách vẫn học được bài miễn phí.
          </p>
        </div>

        {/* Hình minh hoạ */}
        <div className="auth-art" aria-hidden>
          <div className="auth-art-ring" />
          <Mascot className="bob relative size-64" />
          <div className="auth-bubble auth-bubble-gold top-[24%] right-[12%]">Hallo!</div>
          <div className="auth-bubble auth-bubble-green bottom-[30%] left-[12%]">Wie geht&apos;s?</div>
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
      aria-labelledby="auth-title"
      className="auth-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* m-auto thay cho căn giữa: hộp cao hơn màn hình vẫn cuộn được tới mép trên */}
      <div className="m-auto w-full max-w-4xl">{children}</div>
    </div>
  );
}

function CloseButton({ onClose }: { onClose?: () => void }) {
  const className = "btn-icon absolute top-[max(0.875rem,env(safe-area-inset-top))] right-3 z-10 text-muted hover:text-foreground";
  if (onClose) {
    return (
      <button type="button" title="Đóng" aria-label="Đóng" className={className} onClick={onClose}>
        <X className="size-6" />
      </button>
    );
  }
  return (
    <Link href="/" title="Đóng" aria-label="Đóng" className={className}>
      <X className="size-6" />
    </Link>
  );
}
