"use client";

import { useActionState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { login, register, type AuthState } from "@/app/auth-actions";

/** Form đăng nhập / đăng ký dùng chung — hộp 2 nửa: form bên trái, hình minh hoạ bên phải */
export default function AuthForm({ mode, next }: { mode: "login" | "register"; next: string }) {
  const isLogin = mode === "login";
  const [state, action, pending] = useActionState<AuthState, FormData>(isLogin ? login : register, {});
  const query = next !== "/" ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <main className="flex flex-1 items-center justify-center p-4 md:p-8">
      <div className="relative grid w-full max-w-4xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl shadow-black/40 md:grid-cols-2">
        <Link href="/" title="Đóng" className="btn-icon absolute top-3 right-3 z-10 text-link">
          <X className="size-6" />
        </Link>

        <div className="flex flex-col gap-5 p-8 md:p-10">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold">{isLogin ? "Chào mừng trở lại" : "Tạo tài khoản"}</h1>
            <p className="mt-2 text-link">
              {isLogin ? "Tiếp tục hành trình luyện nói tiếng Đức của bạn" : "Miễn phí — bắt đầu luyện shadowing ngay"}
            </p>
          </div>

          {/* key: khi lỗi, React reset form → dựng lại với giá trị cũ để không mất chữ đã nhập */}
          <form key={JSON.stringify(state)} action={action} className="flex flex-col gap-3">
            <input type="hidden" name="next" value={next} />
            {!isLogin && (
              <input name="name" placeholder="Tên của bạn" className="input" defaultValue={state.name} required />
            )}
            <input
              name="email"
              type="email"
              placeholder="Email"
              className="input"
              defaultValue={state.email}
              autoComplete="email"
              autoFocus
              required
            />
            <input
              name="password"
              type="password"
              placeholder={isLogin ? "Mật khẩu" : "Mật khẩu (ít nhất 8 ký tự)"}
              className="input"
              autoComplete={isLogin ? "current-password" : "new-password"}
              minLength={isLogin ? undefined : 8}
              required
            />
            {state.error && <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-400">{state.error}</p>}
            <button className="btn btn-primary mt-1 py-3.5 text-base" disabled={pending}>
              {pending ? "Đang xử lý…" : isLogin ? "Đăng nhập" : "Đăng ký"}
            </button>
          </form>

          <div className="flex items-center gap-3 text-xs font-bold text-link uppercase">
            <span className="h-px flex-1 bg-border" />
            {isLogin ? "Chưa có tài khoản?" : "Đã có tài khoản?"}
            <span className="h-px flex-1 bg-border" />
          </div>
          <Link href={`${isLogin ? "/register" : "/login"}${query}`} className="btn py-3 uppercase">
            {isLogin ? "Tạo tài khoản mới" : "Đăng nhập"}
          </Link>
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
    </main>
  );
}
