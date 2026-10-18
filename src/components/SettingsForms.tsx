"use client";

import { useActionState } from "react";
import { KeyRound, UserRound } from "lucide-react";
import { updatePassword, updateProfile, type FormResult } from "@/app/account-actions";

function Status({ state }: { state: FormResult }) {
  if (state.error) return <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-400">{state.error}</p>;
  if (state.ok) return <p className="rounded-xl bg-accent/15 p-3 text-sm text-accent">{state.ok}</p>;
  return null;
}

/** Hai form: thông tin cá nhân + đổi mật khẩu */
export default function SettingsForms({
  name,
  email,
  fixedAdmin,
}: {
  name: string;
  email: string;
  fixedAdmin: boolean; // admin chính: email + mật khẩu lấy từ biến môi trường
}) {
  const [profile, profileAction, savingProfile] = useActionState(updateProfile, {});
  const [pw, pwAction, savingPw] = useActionState(updatePassword, {});

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <form action={profileAction} className="card flex flex-col gap-3 p-6">
        <h2 className="flex items-center gap-2 text-lg font-extrabold">
          <UserRound className="size-5 text-link" /> Thông tin cá nhân
        </h2>
        <label className="field text-sm">
          Tên hiển thị
          <input name="name" className="input text-foreground" defaultValue={name} maxLength={60} required />
        </label>
        <label className="field text-sm">
          Email
          <input
            name="email"
            type="email"
            className="input text-foreground disabled:opacity-60"
            defaultValue={email}
            disabled={fixedAdmin}
            required
          />
          {fixedAdmin && <span className="text-xs">Email admin chính cố định theo biến ADMIN_EMAIL.</span>}
        </label>
        <Status state={profile} />
        <button className="btn btn-primary mt-auto py-3" disabled={savingProfile}>
          {savingProfile ? "Đang lưu…" : "Lưu thông tin"}
        </button>
      </form>

      {/* key: form tự xoá trắng sau khi đổi thành công */}
      <form key={pw.ok} action={pwAction} className="card flex flex-col gap-3 p-6">
        <h2 className="flex items-center gap-2 text-lg font-extrabold">
          <KeyRound className="size-5 text-link" /> Đổi mật khẩu
        </h2>
        {fixedAdmin ? (
          <p className="text-sm text-muted">
            Mật khẩu admin chính lấy từ biến <kbd>ADMIN_PASSWORD</kbd> trên server. Muốn đổi: sửa biến đó trên Coolify
            rồi Redeploy.
          </p>
        ) : (
          <>
            <input name="current" type="password" placeholder="Mật khẩu hiện tại" className="input" autoComplete="current-password" required />
            <input name="next" type="password" placeholder="Mật khẩu mới (ít nhất 8 ký tự)" className="input" autoComplete="new-password" minLength={8} required />
            <input name="confirm" type="password" placeholder="Nhập lại mật khẩu mới" className="input" autoComplete="new-password" minLength={8} required />
            <Status state={pw} />
            <button className="btn btn-primary mt-auto py-3" disabled={savingPw}>
              {savingPw ? "Đang đổi…" : "Đổi mật khẩu"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
