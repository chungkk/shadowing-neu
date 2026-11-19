"use client";

import { useActionState } from "react";
import { editUser } from "../actions";

/** Sửa tên / email của người dùng (đổi email không cần mã xác nhận) */
export default function EditUserForm({ userId, name, email }: { userId: number; name: string; email: string }) {
  const [state, action, pending] = useActionState(editUser.bind(null, userId), {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="field">
          Tên
          <input name="name" defaultValue={name} className="input" maxLength={60} required />
        </label>
        <label className="field">
          Email
          <input name="email" type="email" defaultValue={email} className="input" required spellCheck={false} />
        </label>
      </div>
      <p className="text-xs text-muted">Đổi email ở đây không gửi mã xác nhận — email mới được coi là đã xác minh.</p>
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn btn-primary btn-sm" disabled={pending}>
          {pending ? "Đang lưu…" : "Lưu thông tin"}
        </button>
        {state.error && (
          <p role="alert" className="alert alert-err py-1.5 text-sm">
            {state.error}
          </p>
        )}
        {state.ok && !pending && (
          <p role="status" className="alert alert-ok py-1.5 text-sm">
            {state.ok}
          </p>
        )}
      </div>
    </form>
  );
}
