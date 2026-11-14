"use client";

import { startTransition, useActionState, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { Camera, Download, KeyRound, LogOut, Mail, ShieldAlert, Trash2, UserRound } from "lucide-react";
import { deleteAccount, deleteAvatar, logoutOtherDevices, requestEmailChange, submitEmailChange, updatePassword, updateProfile, uploadAvatar, type FormResult } from "@/app/(portal)/account-actions";
import { logout } from "@/app/(portal)/auth-actions";
import { clientApi } from "@/lib/client-api";
import Avatar from "./Avatar";

function Status({ state }: { state: FormResult }) {
  if (state.error) return <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-400">{state.error}</p>;
  if (state.ok) return <p className="rounded-xl bg-accent/15 p-3 text-sm text-accent-text">{state.ok}</p>;
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
  children?: ReactNode;
  footer?: ReactNode;
  danger?: boolean;
}) {
  return (
    <section className={`sticker overflow-hidden ${danger ? "border-red" : ""}`}>
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        <div>
          <h2 className={`section-title flex items-center gap-2 ${danger ? "text-red-400" : ""}`}>
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

/** Đổi email bước 2: nhập mã. Đổi xong trang tải lại → `current` là email mới → EmailChangeForm về bước 1 */
function EmailCodeForm({ sentTo, onBack }: { sentTo: string; onBack: () => void }) {
  const [state, action, confirming] = useActionState(submitEmailChange, {});
  return (
    <form action={action}>
      <Section
        icon={Mail}
        title="Đổi email"
        desc={`Đã gửi mã 6 số tới ${sentTo}. Kiểm tra cả thư mục Spam.`}
        footer={
          <>
            <button type="button" className="btn" onClick={onBack}>
              Quay lại
            </button>
            <button className="btn btn-primary" disabled={confirming}>
              {confirming ? "Đang lưu…" : "Xác nhận"}
            </button>
          </>
        }
      >
        <input type="hidden" name="email" value={sentTo} />
        <label className="field text-sm">
          Mã xác nhận
          <input name="code" className="input text-foreground" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required autoFocus />
        </label>
        <Status state={state} />
      </Section>
    </form>
  );
}

/** Đổi email: bước 1 nhập email mới (+ mật khẩu) → gửi mã, bước 2 nhập mã */
function EmailChangeForm({ email: current, hasPassword }: { email: string; hasPassword: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sentTo, setSentTo] = useState(""); // khác rỗng = đã gửi mã, đang chờ nhập
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    setSending(true);
    setError("");
    const err = await requestEmailChange({ email, password });
    setSending(false);
    if (err) return setError(err);
    setSentTo(email.trim().toLowerCase());
    setPassword("");
  };

  // Đổi xong: `current` đã là email mới → quay lại bước 1
  if (sentTo && sentTo !== current) return <EmailCodeForm sentTo={sentTo} onBack={() => setSentTo("")} />;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <Section
        icon={Mail}
        title="Đổi email"
        desc={`Email hiện tại: ${current}. Mã xác nhận sẽ được gửi tới email mới.`}
        footer={
          <button className="btn btn-primary" disabled={sending}>
            {sending ? "Đang gửi mã…" : "Gửi mã xác nhận"}
          </button>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field text-sm">
            Email mới
            <input
              type="email"
              className="input text-foreground"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setSentTo(""); // bắt đầu lần đổi mới: ẩn thông báo "Đã đổi email"
              }}
              autoComplete="email"
              required
            />
          </label>
          {hasPassword && (
            <label className="field text-sm">
              Mật khẩu hiện tại
              <input type="password" className="input text-foreground" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
            </label>
          )}
        </div>
        <Status state={{ error, ok: sentTo === current ? "Đã đổi email" : undefined }} />
      </Section>
    </form>
  );
}

/** Gửi bản sao toàn bộ dữ liệu tài khoản (JSON) về email — tối đa 3 lần / ngày */
function DataExport() {
  const [state, setState] = useState<FormResult>({});
  const [sending, setSending] = useState(false);

  const send = async () => {
    setSending(true);
    setState({});
    try {
      const r = await clientApi<{ email: string }>("/me/export", { method: "POST" });
      setState({ ok: `Đã gửi bản sao tới ${r.email}. Kiểm tra cả thư mục Spam.` });
    } catch (e) {
      setState({ error: (e as Error).message });
    }
    setSending(false);
  };

  return (
    <Section
      icon={Download}
      title="Dữ liệu của bạn"
      desc="Nhận bản sao thông tin tài khoản, sổ từ vựng, tiến độ học và điểm (định dạng JSON) qua email."
      footer={
        <button className="btn" onClick={send} disabled={sending}>
          <Download className="size-4" /> {sending ? "Đang gửi…" : "Gửi bản sao qua email"}
        </button>
      }
    >
      <Status state={state} />
    </Section>
  );
}

/** Trang cài đặt: hồ sơ + ảnh đại diện · thành tích (`stats`) · luyện thi (`learning`) · thông tin · mật khẩu · xuất dữ liệu · đăng xuất · xoá tài khoản */
export default function SettingsForms({
  user,
  fixedAdmin,
  stats,
  learning,
}: {
  user: { id: number; name: string; email: string; admin: boolean; createdAt: string; avatarAt: number | null; hasPassword: boolean };
  fixedAdmin: boolean; // admin chính: email + mật khẩu lấy từ biến môi trường
  stats?: ReactNode; // khung thành tích học tập (kim cương, sổ từ…)
  learning?: ReactNode; // cài đặt luyện thi (hạng bằng lái, bản dịch)
}) {
  const { hasPassword } = user;
  const [profile, profileAction, savingProfile] = useActionState(updateProfile, {});
  const [pw, pwAction, savingPw] = useActionState(updatePassword, {});
  const [del, delAction, deleting] = useActionState(deleteAccount, {});
  const [others, othersAction, loggingOut] = useActionState(logoutOtherDevices, {});
  const [avatarPending, startAvatar] = useTransition();
  const [avatarError, setAvatarError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const pwForm = useRef<HTMLFormElement>(null);

  // Chỉ xoá trắng form mật khẩu khi đổi thành công (nhập sai thì giữ để sửa)
  useEffect(() => {
    if (pw.ok) pwForm.current?.reset();
  }, [pw]);

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

  const removeAvatar = () => {
    if (!confirm("Xoá ảnh đại diện?")) return;
    startAvatar(async () => {
      setAvatarError("");
      try {
        await deleteAvatar();
      } catch {
        setAvatarError("Không xoá được ảnh — thử lại sau");
      }
    });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Hồ sơ */}
      <section className="card flex flex-col items-center gap-5 p-5 text-center sm:flex-row sm:p-6 sm:text-left">
        <div>
          <Avatar user={user} className={`size-24 text-4xl ring-4 ring-card-2 ${avatarPending ? "animate-pulse opacity-60" : ""}`} />
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
            <span className={`pill ${user.admin ? "bg-amber/15 text-amber" : "bg-accent/15 text-accent-text"}`}>{user.admin ? "Quản trị viên" : "Học viên"}</span>
            <span className="pill bg-card-2 text-muted">Tham gia {joined(user.createdAt)}</span>
            {!hasPassword && <span className="pill bg-card-2 text-muted">Đăng nhập bằng Google / Apple</span>}
          </div>
          <div className="mt-1 flex flex-wrap gap-2 max-sm:justify-center">
            <button className="btn" onClick={() => fileRef.current?.click()} disabled={avatarPending}>
              <Camera className="size-4" /> {avatarPending ? "Đang tải ảnh…" : user.avatarAt ? "Đổi ảnh" : "Tải ảnh lên"}
            </button>
            {user.avatarAt && (
              <button className="btn text-muted hover:border-red hover:text-red-400" onClick={removeAvatar} disabled={avatarPending}>
                <Trash2 className="size-4" /> Xoá ảnh
              </button>
            )}
          </div>
          {avatarError && <p className="text-sm text-red-400">{avatarError}</p>}
        </div>
      </section>

      {stats}

      {learning}

      {/* Thông tin cá nhân */}
      <form action={profileAction}>
        <Section
          icon={UserRound}
          title="Thông tin cá nhân"
          desc="Tên hiển thị của bạn."
          footer={
            <button className="btn btn-primary" disabled={savingProfile}>
              {savingProfile ? "Đang lưu…" : "Lưu thay đổi"}
            </button>
          }
        >
          <label className="field text-sm">
            Tên hiển thị
            <input name="name" className="input text-foreground" defaultValue={user.name} maxLength={60} required />
          </label>
          <Status state={profile} />
        </Section>
      </form>

      {/* Email admin chính cố định theo biến ADMIN_EMAIL */}
      {!fixedAdmin && <EmailChangeForm email={user.email} hasPassword={hasPassword} />}

      {/* Mật khẩu — tự gọi action trong onSubmit: React không reset form, nhập sai không mất chữ */}
      <form
        ref={pwForm}
        action={pwAction}
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          startTransition(() => pwAction(data));
        }}
      >
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

      <DataExport />

      <Section
        icon={LogOut}
        title="Đăng xuất"
        desc="Đăng xuất khỏi máy này. Sổ từ vựng và tiến độ vẫn được giữ trong tài khoản."
        footer={
          <div className="flex flex-wrap gap-2">
            <form action={logout}>
              <button className="btn">
                <LogOut className="size-4" /> Đăng xuất
              </button>
            </form>
            <form action={othersAction}>
              <button className="btn" disabled={loggingOut}>
                {loggingOut ? "Đang xử lý…" : "Đăng xuất các thiết bị khác"}
              </button>
            </form>
          </div>
        }
      >
        <Status state={others} />
      </Section>

      {!fixedAdmin && (
        <Section
          icon={ShieldAlert}
          title="Xoá tài khoản"
          desc="Xoá vĩnh viễn tài khoản, sổ từ vựng và tiến độ học. Không thể hoàn tác."
          danger
          footer={
            !confirmDelete && (
              <button className="btn border-red/50 text-red-400 hover:border-red" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="size-4" /> Xoá tài khoản
              </button>
            )
          }
        >
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
        </Section>
      )}
    </div>
  );
}
