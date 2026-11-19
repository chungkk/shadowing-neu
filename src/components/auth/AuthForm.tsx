"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, X } from "lucide-react";
import {
  checkEmail,
  login,
  register,
  requestSignupCode,
  type AuthState,
} from "@/app/(app)/auth-actions";
import SocialLogin from "./SocialLogin";
import Mascot from "../Mascot";

const ErrorBox = ({ children }: { children?: string }) =>
  children ? (
    <p role="alert" className="alert alert-err">
      {children}
    </p>
  ) : null;

/** Email đã nhập ở bước đầu + nút "Đổi" để quay lại sửa */
function EmailRow({
  email,
  onChange,
}: {
  email: string;
  onChange: () => void;
}) {
  return (
    <p className="auth-email">
      <Mail className="size-4 shrink-0 text-muted" aria-hidden />
      <span className="min-w-0 flex-1 truncate font-semibold">{email}</span>
      <button
        type="button"
        className="btn btn-ghost btn-sm shrink-0 text-link"
        onClick={onChange}
      >
        Đổi
      </button>
    </p>
  );
}

/** Bước đầu: nhập email → server cho biết đã có tài khoản chưa */
function EmailStep({
  email,
  setEmail,
  onFound,
}: {
  email: string;
  setEmail: (v: string) => void;
  onFound: (exists: boolean) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError("");
        const res = await checkEmail(email).catch(() => ({
          error: "Không kết nối được, thử lại.",
        }));
        setPending(false);
        if ("error" in res) return setError(res.error);
        onFound(res.exists);
      }}
      className="flex flex-col gap-3"
    >
      <input
        type="email"
        placeholder="Nhập email của bạn"
        aria-label="Nhập email của bạn"
        className="input"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="username"
        autoFocus
        required
      />
      <ErrorBox>{error}</ErrorBox>
      <button
        className="btn btn-primary btn-lg btn-block mt-1"
        disabled={pending}
      >
        {pending ? "Đang kiểm tra…" : "Tiếp tục với email"}
      </button>
    </form>
  );
}

/** Email đã có tài khoản → nhập mật khẩu */
function LoginForm({
  email,
  next,
  close,
  back,
}: {
  email: string;
  next: string;
  close?: () => void;
  back: () => void;
}) {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    login,
    {},
  );
  useEffect(() => {
    if (state.ok) close?.();
  }, [state.ok, close]);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="next" value={next} />
      {close && <input type="hidden" name="stay" value="1" />}
      {/* Ô email ẩn (không phải type=hidden) để trình quản lý mật khẩu biết lưu cho tài khoản nào */}
      <input
        name="email"
        value={email}
        readOnly
        autoComplete="username"
        className="hidden"
      />
      <EmailRow email={email} onChange={back} />
      <input
        name="password"
        type="password"
        placeholder="Mật khẩu"
        aria-label="Mật khẩu"
        className="input"
        autoComplete="current-password"
        autoFocus
        required
      />
      <Link
        href="/forgot-password"
        onClick={close}
        className="-my-1.5 inline-flex min-h-11 items-center self-end rounded-lg px-1 text-sm font-semibold text-link hover:underline"
      >
        Quên mật khẩu?
      </Link>
      <ErrorBox>{state.error}</ErrorBox>
      <button
        className="btn btn-primary btn-lg btn-block mt-1"
        disabled={pending}
      >
        {pending ? "Đang xử lý…" : "Đăng nhập"}
      </button>
    </form>
  );
}

/** Email chưa có tài khoản → điền tên + mật khẩu → nhận mã 6 số qua email → nhập mã để tạo tài khoản */
function RegisterForm({
  email,
  next,
  close,
  back,
}: {
  email: string;
  next: string;
  close?: () => void;
  back: () => void;
}) {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    register,
    {},
  );
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
        <input
          name="email"
          value={email}
          readOnly
          autoComplete="username"
          className="hidden"
        />
        <EmailRow email={email} onChange={back} />
        <input
          placeholder="Tên của bạn"
          aria-label="Tên của bạn"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          autoFocus
          required
        />
        <input
          type="password"
          placeholder="Tạo mật khẩu (ít nhất 8 ký tự)"
          aria-label="Tạo mật khẩu (ít nhất 8 ký tự)"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
        <ErrorBox>{err}</ErrorBox>
        <button
          className="btn btn-primary btn-lg btn-block mt-1"
          disabled={sending}
        >
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
      <p className="alert alert-info">
        <Mail className="mt-px size-4 shrink-0" aria-hidden />
        <span>
          Đã gửi mã 6 số tới <b>{email}</b>. Không thấy thì xem cả thư mục Spam.
        </span>
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
      <button
        className="btn btn-primary btn-lg btn-block mt-1"
        disabled={pending || code.length !== 6}
      >
        {pending ? "Đang xử lý…" : "Xác nhận & đăng ký"}
      </button>
      <div className="auth-links">
        <button type="button" onClick={() => setStep("info")}>
          <ArrowLeft className="size-4" /> Sửa thông tin
        </button>
        <button type="button" disabled={cooldown > 0 || sending} onClick={send}>
          {cooldown > 0
            ? `Gửi lại mã (${cooldown}s)`
            : sending
              ? "Đang gửi…"
              : "Gửi lại mã"}
        </button>
      </div>
    </form>
  );
}

const HEADINGS = {
  email: [
    "Chào bạn!",
    "Nhập email để đăng nhập — chưa có tài khoản thì tạo luôn, miễn phí.",
  ],
  login: ["Chào mừng trở lại", "Nhập mật khẩu để học tiếp từ chỗ bạn đã dừng."],
  register: [
    "Tạo tài khoản mới",
    "Email này chưa có tài khoản. Điền tên và mật khẩu, chúng tôi gửi mã xác nhận qua email.",
  ],
} as const;

/**
 * Đăng nhập / đăng ký chung 1 form — hộp 2 nửa: form bên trái, bìa vở có nhãn + linh vật bên phải
 * (điện thoại: dải bìa ở trên, form bên dưới).
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
        className={`auth-card max-w-4xl md:min-h-[34rem] md:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)] ${
          onClose
            ? "max-sm:min-h-dvh max-sm:content-start max-sm:rounded-none max-sm:border-0"
            : ""
        }`}
      >
        <CloseButton onClose={onClose} />

        <div className="flex flex-col gap-5 px-5 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-8 md:p-10 md:pt-12">
          <div>
            <h1 id="auth-title" className="page-title">
              {title}
            </h1>
            <p className="auth-subtitle">{subtitle}</p>
          </div>

          {step === "email" ? (
            <>
              {/* Google / Apple: chưa có tài khoản thì tự tạo luôn, nên dùng chung cho cả đăng nhập lẫn đăng ký */}
              <SocialLogin
                google={social.google}
                apple={social.apple}
                next={next}
                onDone={onClose}
              />
              <EmailStep
                email={email}
                setEmail={setEmail}
                onFound={(exists) => setStep(exists ? "login" : "register")}
              />
            </>
          ) : step === "login" ? (
            <LoginForm
              email={email.trim().toLowerCase()}
              next={next}
              close={onClose}
              back={back}
            />
          ) : (
            <RegisterForm
              email={email.trim().toLowerCase()}
              next={next}
              close={onClose}
              back={back}
            />
          )}

          <p className="mt-auto text-xs leading-relaxed text-muted">
            Khi tiếp tục (kể cả bằng Google / Apple), bạn đồng ý với{" "}
            <Link
              href="/deutsch-shadowing/terms"
              target="_blank"
              className="font-semibold text-link underline underline-offset-2"
            >
              Điều khoản sử dụng
            </Link>{" "}
            và{" "}
            <Link
              href="/deutsch-shadowing/privacy"
              target="_blank"
              className="font-semibold text-link underline underline-offset-2"
            >
              Chính sách quyền riêng tư
            </Link>
            . Chưa có tài khoản vẫn học thử được.
          </p>
        </div>

        {/* Bìa vở: điện thoại là dải màu ở trên (linh vật ngồi góc), máy tính là nửa bên phải có nhãn vở */}
        <div
          data-sec="de"
          className="cover auth-art order-first rounded-none md:order-last"
          aria-hidden
        >
          <span className="auth-bubble auth-bubble-hallo top-[max(1rem,calc(env(safe-area-inset-top)+0.5rem))] left-8 md:top-[16%] md:left-[18%]">
            Hallo!
          </span>
          <span className="auth-bubble auth-bubble-wie bottom-[14%] left-[16%] hidden md:block">
            Wie geht&apos;s?
          </span>
          <Mascot className="auth-mascot md:hidden" />
          <div className="nhan auth-art-label">
            <Mascot animated className="auth-mascot max-md:hidden" />
            <span className="font-display text-2xl leading-tight font-extrabold tracking-[-0.025em]">
              HalloVN
            </span>
            <span className="nhan-line">
              Môn: <b>Tiếng Đức · Lái xe · LiD</b>
            </span>
            <span className="nhan-line">
              Họ và tên: <b className="flex-1" />
            </span>
            <span className="nhan-line">
              Lớp: <b>A1 → B1</b>
            </span>
          </div>
        </div>
      </div>
    </Frame>
  );
}

/** Trang riêng: căn giữa trong vùng nội dung. Popup: nền mờ phủ cả màn hình, bấm ra ngoài / Esc để đóng */
function Frame({
  onClose,
  children,
}: {
  onClose?: () => void;
  children: ReactNode;
}) {
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

  if (!onClose)
    return (
      <main className="flex flex-1 items-center justify-center p-4 md:p-8">
        {children}
      </main>
    );
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
  // Nằm trên nền bìa vở (dải trên điện thoại / nửa phải máy tính) → chữ trắng
  if (onClose) {
    return (
      <button
        type="button"
        data-sec="de"
        title="Đóng"
        aria-label="Đóng"
        className="auth-close"
        onClick={onClose}
      >
        <X className="size-6" />
      </button>
    );
  }
  // Trang /login riêng (thường do bị chuyển từ trang cần đăng nhập, ?next=…): đóng = về trang vừa xem trong web.
  // Mở thẳng từ ngoài vào (không có trang trước cùng web) → về trang chủ
  return (
    <Link
      href="/"
      data-sec="de"
      title="Đóng"
      aria-label="Đóng"
      className="auth-close"
      onClick={(e) => {
        const nav = (window as { navigation?: { canGoBack?: boolean } }).navigation;
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || !nav?.canGoBack) return;
        e.preventDefault();
        history.back();
      }}
    >
      <X className="size-6" />
    </Link>
  );
}
