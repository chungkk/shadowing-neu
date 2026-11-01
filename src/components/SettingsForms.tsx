"use client";

import { useActionState, useRef, useState, useTransition, type ReactNode } from "react";
import { Camera, KeyRound, LogOut, ShieldAlert, Trash2, UserRound } from "lucide-react";
import { deleteAccount, deleteAvatar, updatePassword, updateProfile, uploadAvatar, type FormResult } from "@/app/account-actions";
import { logout } from "@/app/auth-actions";
import Avatar from "./Avatar";

function Status({ state }: { state: FormResult }) {
  if (state.error) return <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-400">{state.error}</p>;
  if (state.ok) return <p className="rounded-xl bg-accent/15 p-3 text-sm text-accent">{state.ok}</p>;
  return null;
}

/** Khung 1 mục cài đặt: tiêu đề + mô tả, nội dung, chân có nút (tuỳ chọn) */
function Section({
  icon: Icon,
  title,
  desc,
  children,
  footer,
  danger,
}: {
  icon: typeof UserRound;
  title: string;
  desc: string;
  children: ReactNode;
  footer?: ReactNode;
  danger?: boolean;
}) {
  return (
    <section className={`overflow-hidden rounded-2xl border bg-card ${danger ? "border-red/40" : "border-border"}`}>
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        <div>
          <h2 className={`flex items-center gap-2 text-lg font-extrabold ${danger ? "text-red-400" : ""}`}>
            <Icon className={`size-5 ${danger ? "" : "text-link"}`} /> {title}
          </h2>
          <p className="mt-0.5 text-sm text-muted">{desc}</p>
        </div>
        {children}
      </div>
      {footer && (
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border bg-card-2/40 px-4 py-3 sm:px-6">{footer}</div>
      )}
    </section>
  );
}

/** Cắt giữa ảnh thành hình vuông 400×400 JPEG (~50 KB) trước khi gửi */
async function squareJpeg(file: File): Promise<Blob> {
  const img = await createImageBitmap(file);
  const side = Math.min(img.width, img.height);
  const canvas = Object.assign(document.createElement("canvas"), { width: 400, height: 400 });
  canvas.getContext("2d")!.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, 400, 400);
  img.close();
  return new Promise((ok, fail) => canvas.toBlob((b) => (b ? ok(b) : fail(new Error())), "image/jpeg", 0.88));
}

const joined = (createdAt: string) => createdAt.slice(0, 10).split("-").reverse().join("/");

/** Trang cài đặt: hồ sơ + ảnh đại diện · thành tích (`stats`) · thông tin · mật khẩu · đăng xuất / xoá tài khoản */
export default function SettingsForms({
  user,
  fixedAdmin,
  stats,
}: {
  user: { id: number; name: string; email: string; admin: boolean; createdAt: string; avatarAt: number | null; hasPassword: boolean };
  fixedAdmin: boolean; // admin chính: email + mật khẩu lấy từ biến môi trường
  stats?: ReactNode; // khung thành tích học tập (kim cương, sổ từ…)
}) {
  const { hasPassword } = user;
  const [profile, profileAction, savingProfile] = useActionState(updateProfile, {});
  const [pw, pwAction, savingPw] = useActionState(updatePassword, {});
  const [del, delAction, deleting] = useActionState(deleteAccount, {});
  const [avatarPending, startAvatar] = useTransition();
  const [avatarError, setAvatarError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const pickAvatar = (file: File | undefined) => {
    if (!file) return;
    startAvatar(async () => {
      setAvatarError("");
      try {
        const fd = new FormData();
        fd.append("file", await squareJpeg(file), "avatar.jpg");
        const res = await uploadAvatar(fd);
        if (res.error) setAvatarError(res.error);
      } catch {
        setAvatarError("Không đọc được ảnh này — thử ảnh JPEG hoặc PNG khác");
      }
    });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Hồ sơ */}
      <section className="card flex flex-col items-center gap-5 p-5 text-center sm:flex-row sm:p-6 sm:text-left">
        <div className="relative">
          <Avatar user={user} className={`size-24 text-4xl ring-4 ring-card-2 ${avatarPending ? "animate-pulse opacity-60" : ""}`} />
          <button
            title="Đổi ảnh đại diện"
            className="absolute right-0 bottom-0 flex size-9 cursor-pointer items-center justify-center rounded-full border-2 border-card bg-accent text-white transition hover:brightness-110"
            onClick={() => fileRef.current?.click()}
            disabled={avatarPending}
          >
            <Camera className="size-4" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              pickAvatar(e.target.files?.[0]);
              e.target.value = ""; // chọn lại cùng 1 ảnh vẫn chạy
            }}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2 max-sm:items-center">
          <div className="min-w-0">
            <p className="truncate text-2xl font-extrabold">{user.name}</p>
            <p className="truncate text-sm text-muted">{user.email}</p>
          </div>
          <div className="flex flex-wrap gap-2 max-sm:justify-center">
            <span className={`pill ${user.admin ? "bg-amber/15 text-amber" : "bg-accent/15 text-accent"}`}>{user.admin ? "Quản trị viên" : "Học viên"}</span>
            <span className="pill bg-card-2 text-muted">Tham gia {joined(user.createdAt)}</span>
            {!hasPassword && <span className="pill bg-card-2 text-muted">Đăng nhập bằng Google / Apple</span>}
          </div>
          <div className="mt-1 flex flex-wrap gap-2 max-sm:justify-center">
            <button className="btn" onClick={() => fileRef.current?.click()} disabled={avatarPending}>
              <Camera className="size-4" /> {avatarPending ? "Đang tải ảnh…" : user.avatarAt ? "Đổi ảnh" : "Tải ảnh lên"}
            </button>
            {user.avatarAt && (
              <button className="btn text-muted hover:border-red hover:text-red-400" onClick={() => startAvatar(() => deleteAvatar())} disabled={avatarPending}>
                <Trash2 className="size-4" /> Xoá ảnh
              </button>
            )}
          </div>
          {avatarError && <p className="text-sm text-red-400">{avatarError}</p>}
        </div>
      </section>

      {stats}

      {/* Thông tin cá nhân */}
      <form action={profileAction}>
        <Section
          icon={UserRound}
          title="Thông tin cá nhân"
          desc="Tên hiển thị và email dùng để đăng nhập."
          footer={
            <button className="btn btn-primary" disabled={savingProfile}>
              {savingProfile ? "Đang lưu…" : "Lưu thay đổi"}
            </button>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="field text-sm">
              Tên hiển thị
              <input name="name" className="input text-foreground" defaultValue={user.name} maxLength={60} required />
            </label>
            <label className="field text-sm">
              Email
              <input
                name="email"
                type="email"
                className="input text-foreground disabled:opacity-60"
                defaultValue={user.email}
                disabled={fixedAdmin}
                required
              />
              {fixedAdmin && <span className="text-xs">Email admin chính cố định theo biến ADMIN_EMAIL.</span>}
            </label>
          </div>
          <Status state={profile} />
        </Section>
      </form>

      {/* Mật khẩu — key: form tự xoá trắng sau khi đổi thành công */}
      <form key={pw.ok} action={pwAction}>
        <Section
          icon={KeyRound}
          title={hasPassword ? "Đổi mật khẩu" : "Đặt mật khẩu"}
          desc={
            hasPassword
              ? "Đổi xong, các thiết bị khác sẽ bị đăng xuất."
              : "Bạn đang đăng nhập bằng Google / Apple. Đặt mật khẩu để đăng nhập được cả bằng email."
          }
          footer={
            !fixedAdmin && (
              <button className="btn btn-primary" disabled={savingPw}>
                {savingPw ? "Đang lưu…" : hasPassword ? "Đổi mật khẩu" : "Đặt mật khẩu"}
              </button>
            )
          }
        >
          {fixedAdmin ? (
            <p className="text-sm text-muted">
              Mật khẩu admin chính lấy từ biến <kbd>ADMIN_PASSWORD</kbd> trên server. Muốn đổi: sửa biến đó trên Coolify rồi Redeploy.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {hasPassword && (
                <label className="field text-sm sm:col-span-2">
                  Mật khẩu hiện tại
                  <input name="current" type="password" className="input text-foreground" autoComplete="current-password" required />
                </label>
              )}
              <label className="field text-sm">
                Mật khẩu mới
                <input name="next" type="password" placeholder="Ít nhất 8 ký tự" className="input text-foreground" autoComplete="new-password" minLength={8} required />
              </label>
              <label className="field text-sm">
                Nhập lại mật khẩu mới
                <input name="confirm" type="password" className="input text-foreground" autoComplete="new-password" minLength={8} required />
              </label>
            </div>
          )}
          <Status state={pw} />
        </Section>
      </form>

      {/* Đăng xuất / xoá tài khoản */}
      <Section icon={ShieldAlert} title="Phiên đăng nhập & tài khoản" desc="Đăng xuất khỏi máy này, hoặc xoá vĩnh viễn tài khoản." danger>
        <div className="flex flex-wrap items-center gap-3">
          <p className="min-w-0 flex-1 text-sm">
            <b>Đăng xuất</b>
            <span className="block text-muted">Sổ từ vựng và tiến độ vẫn được giữ trong tài khoản.</span>
          </p>
          <form action={logout}>
            <button className="btn">
              <LogOut className="size-4" /> Đăng xuất
            </button>
          </form>
        </div>
        {!fixedAdmin && (
          <div className="flex flex-col gap-3 border-t border-border pt-4">
            <div className="flex flex-wrap items-center gap-3">
              <p className="min-w-0 flex-1 text-sm">
                <b className="text-red-400">Xoá tài khoản</b>
                <span className="block text-muted">Xoá vĩnh viễn tài khoản, sổ từ vựng và tiến độ học. Không thể hoàn tác.</span>
              </p>
              {!confirmDelete && (
                <button className="btn border-red/50 text-red-400 hover:border-red" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="size-4" /> Xoá tài khoản
                </button>
              )}
            </div>
            {confirmDelete && (
              <form action={delAction} className="flex flex-col gap-3 rounded-xl border border-red/40 bg-red/10 p-4">
                {hasPassword ? (
                  <input name="password" type="password" placeholder="Nhập mật khẩu để xác nhận" className="input" autoComplete="current-password" required autoFocus />
                ) : (
                  <p className="text-sm">Bạn chắc chắn muốn xoá? Mọi dữ liệu sẽ mất vĩnh viễn.</p>
                )}
                <Status state={del} />
                <div className="flex justify-end gap-2">
                  <button type="button" className="btn" onClick={() => setConfirmDelete(false)}>
                    Huỷ
                  </button>
                  <button className="btn btn-red" disabled={deleting}>
                    {deleting ? "Đang xoá…" : "Xoá vĩnh viễn"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </Section>
    </div>
  );
}
