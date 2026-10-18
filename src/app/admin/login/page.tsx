"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login } from "../actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, {});
  return (
    <main className="mx-auto flex w-full max-w-sm flex-col gap-4 p-4 pt-24">
      <h1 className="text-2xl font-bold">Đăng nhập quản trị</h1>
      <form action={action} className="card flex flex-col gap-3">
        <input name="password" type="password" placeholder="Mật khẩu admin" className="input" autoFocus required />
        <button className="btn btn-primary" disabled={pending}>
          {pending ? "Đang đăng nhập…" : "Đăng nhập"}
        </button>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      </form>
      <Link href="/" className="text-sm text-muted hover:underline">
        ← Trang chủ
      </Link>
    </main>
  );
}
