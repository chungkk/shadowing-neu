"use client";

import { startTransition, useActionState, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import {
  BarChart3,
  Camera,
  Car,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Download,
  KeyRound,
  LogOut,
  Mail,
  MonitorSmartphone,
  ShieldAlert,
  Trash2,
  UserRound,
} from "lucide-react";
import { deleteAccount, deleteAvatar, logoutOtherDevices, requestEmailChange, submitEmailChange, updatePassword, updateProfile, uploadAvatar, type FormResult } from "@/app/(app)/account-actions";
import { logout } from "@/app/(app)/auth-actions";
import { clientApi } from "@/lib/client-api";
import Avatar from "./Avatar";
import { Gem } from "./PointsBadge";

function Status({ state }: { state: FormResult }) {
  if (state.error)
    return (
      <p role="alert" className="alert alert-err">
        <CircleAlert className="mt-px size-4 shrink-0" aria-hidden /> {state.error}
      </p>
    );
  if (state.ok)
    return (
      <p role="status" className="alert alert-ok">
        <CircleCheck className="mt-px size-4 shrink-0" aria-hidden /> {state.ok}
      </p>
    );
  return null;
}

/** 1 nhóm cài đặt: tiêu đề nhóm (ngoài khung, là đích của menu mục) + khung chứa các hàng */
function Group({ id, title, desc, danger, children }: { id: string; title: string; desc?: string; danger?: boolean; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="flex scroll-mt-24 flex-col gap-3">
      <div>
        <h2 id={`${id}-h`} className={`section-title ${danger ? "text-red-400" : ""}`}>
          {title}
        </h2>
        {desc && <p className="mt-0.5 text-sm text-muted">{desc}</p>}
      </div>
      <div className={`settings-card ${danger ? "settings-danger" : ""}`}>{children}</div>
    </section>
  );
}

/**
 * 1 hàng cài đặt: bên trái tên + mô tả, giữa giá trị hiện tại, phải nút. `children` (form sửa) mở ra bên dưới hàng.
 * Điện thoại: xếp dọc, nút xuống dưới.
 */
export function Row({
  icon: Icon,
  title,
  desc,
  value,
  action,
  wide,
  children,
}: {
  icon: typeof UserRound;
  title: string;
  desc?: ReactNode;
  value?: ReactNode;
  action?: ReactNode;
  wide?: boolean; // nút chữ dài → điện thoại: xuống dòng dưới mô tả
  children?: ReactNode;
}) {
  return (
    <div className="settings-row">
      <div className="settings-row-head">
        <span className="settings-row-icon" aria-hidden>
          <Icon className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold">{title}</p>
          {desc && <p className="text-sm text-muted">{desc}</p>}
        </div>
        {value !== undefined && <div className="settings-row-value">{value}</div>}
        {action && <div className={`settings-row-action ${wide ? "settings-row-action-wide" : ""}`}>{action}</div>}
      </div>
      {children && <div className="settings-row-body">{children}</div>}
    </div>
  );
}

/** Nút "Đổi" / "Huỷ" của hàng có form mở ra */
function EditToggle({ open, onToggle, label = "Đổi" }: { open: boolean; onToggle: () => void; label?: string }) {
  return (
    <button type="button" className="btn btn-sm" aria-expanded={open} onClick={onToggle}>
      {open ? "Huỷ" : label}
    </button>
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
const fmt = (n: number) => n.toLocaleString("vi-VN");

/** Tên hiển thị: sửa ngay trong hàng */
function NameRow({ name }: { name: string }) {
  const [state, action, saving] = useActionState(updateProfile, {});
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (state.ok) setOpen(false); // eslint-disable-line react-hooks/set-state-in-effect -- lưu xong thì đóng form
  }, [state]);
  return (
    <Row
      icon={UserRound}
      title="Tên hiển thị"
      desc="Hiện trên bảng xếp hạng học viên."
      value={!open && <span className="truncate">{name}</span>}
      action={<EditToggle open={open} onToggle={() => setOpen(!open)} />}
    >
      {open && (
        <form action={action} className="settings-inline">
          <label className="field min-w-0 flex-1 text-sm">
            <span className="sr-only">Tên hiển thị</span>
            <input name="name" className="input text-foreground" defaultValue={name} maxLength={60} required autoFocus />
          </label>
          <button className="btn btn-primary" disabled={saving}>
            {saving ? "Đang lưu…" : "Lưu"}
          </button>
        </form>
      )}
      {!open && state.ok && <Status state={state} />}
      {open && <Status state={state} />}
    </Row>
  );
}

/** Đổi email bước 2: nhập mã. Đổi xong trang tải lại → `current` là email mới → về bước 1 */
function EmailCodeForm({ sentTo, onBack }: { sentTo: string; onBack: () => void }) {
  const [state, action, confirming] = useActionState(submitEmailChange, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <p className="text-sm text-muted">Đã gửi mã 6 số tới <b className="text-foreground">{sentTo}</b>. Kiểm tra cả thư mục Spam.</p>
      <input type="hidden" name="email" value={sentTo} />
      <div className="settings-inline">
        <label className="field min-w-0 flex-1 text-sm sm:max-w-56">
          Mã xác nhận
          <input name="code" className="input text-foreground tracking-[0.3em] tabular-nums" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required autoFocus />
        </label>
        <button type="button" className="btn" onClick={onBack}>
          Quay lại
        </button>
        <button className="btn btn-primary" disabled={confirming}>
          {confirming ? "Đang lưu…" : "Xác nhận"}
        </button>
      </div>
      <Status state={state} />
    </form>
  );
}

/** Email: hiện email hiện tại, bấm Đổi → nhập email mới (+ mật khẩu) → gửi mã → nhập mã */
function EmailRow({ email: current, hasPassword, fixed }: { email: string; hasPassword: boolean; fixed: boolean }) {
  const [open, setOpen] = useState(false);
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

  const changed = !!sentTo && sentTo === current; // đổi xong: `current` đã là email mới
  const waiting = !!sentTo && !changed;
  const close = () => {
    setOpen(false);
    setSentTo("");
    setError("");
  };

  return (
    <Row
      icon={Mail}
      title="Email"
      desc={fixed ? "Email admin chính lấy từ biến ADMIN_EMAIL trên server." : "Dùng để đăng nhập và nhận mã xác nhận."}
      value={<span className="truncate">{current}</span>}
      action={!fixed && <EditToggle open={open && !changed} onToggle={() => (open && !changed ? close() : (setOpen(true), setSentTo("")))} />}
    >
      {open && waiting && <EmailCodeForm sentTo={sentTo} onBack={() => setSentTo("")} />}
      {open && !sentTo && (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="field text-sm">
              Email mới
              <input type="email" className="input text-foreground" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required autoFocus />
            </label>
            {hasPassword && (
              <label className="field text-sm">
                Mật khẩu hiện tại
                <input type="password" className="input text-foreground" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
              </label>
            )}
          </div>
          <Status state={{ error }} />
          <button className="btn btn-primary self-end max-sm:w-full" disabled={sending}>
            {sending ? "Đang gửi mã…" : "Gửi mã xác nhận"}
          </button>
        </form>
      )}
      {changed && <Status state={{ ok: "Đã đổi email" }} />}
    </Row>
  );
}

/** Mật khẩu — tự gọi action trong onSubmit: React không reset form, nhập sai không mất chữ */
function PasswordRow({ hasPassword, fixed }: { hasPassword: boolean; fixed: boolean }) {
  const [state, action, saving] = useActionState(updatePassword, {});
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (state.ok) setOpen(false); // eslint-disable-line react-hooks/set-state-in-effect -- đổi xong thì đóng form
  }, [state]);
  return (
    <Row
      icon={KeyRound}
      title="Mật khẩu"
      desc={
        fixed ? (
          <>
            Lấy từ biến <kbd>ADMIN_PASSWORD</kbd> trên server — sửa trên Coolify rồi Redeploy.
          </>
        ) : hasPassword ? (
          "Đổi xong, các thiết bị khác sẽ bị đăng xuất."
        ) : (
          "Bạn đang đăng nhập bằng Google / Apple. Đặt mật khẩu để đăng nhập được cả bằng email."
        )
      }
      value={!fixed && <span className={hasPassword ? "tracking-[0.2em]" : "text-muted"}>{hasPassword ? "••••••••" : "Chưa đặt"}</span>}
      action={!fixed && <EditToggle open={open} onToggle={() => setOpen(!open)} label={hasPassword ? "Đổi" : "Đặt"} />}
    >
      {open && (
        <form
          action={action}
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            startTransition(() => action(data));
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {hasPassword && (
              <label className="field text-sm sm:col-span-2">
                Mật khẩu hiện tại
                <input name="current" type="password" className="input text-foreground" autoComplete="current-password" required autoFocus />
              </label>
            )}
            <label className="field text-sm">
              Mật khẩu mới
              <input name="next" type="password" placeholder="Ít nhất 8 ký tự" className="input text-foreground" autoComplete="new-password" minLength={8} required autoFocus={!hasPassword} />
            </label>
            <label className="field text-sm">
              Nhập lại mật khẩu mới
              <input name="confirm" type="password" className="input text-foreground" autoComplete="new-password" minLength={8} required />
            </label>
          </div>
          <Status state={state} />
          <button className="btn btn-primary self-end max-sm:w-full" disabled={saving}>
            {saving ? "Đang lưu…" : hasPassword ? "Đổi mật khẩu" : "Đặt mật khẩu"}
          </button>
        </form>
      )}
      {!open && <Status state={state} />}
    </Row>
  );
}

/** Gửi bản sao toàn bộ dữ liệu tài khoản (JSON) về email — tối đa 3 lần / ngày */
function ExportRow() {
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
    <Row
      icon={Download}
      title="Bản sao dữ liệu"
      desc="Tài khoản, sổ từ vựng, tiến độ và điểm (JSON) gửi qua email."
      wide
      action={
        <button className="btn btn-sm" onClick={send} disabled={sending}>
          {sending ? "Đang gửi…" : "Gửi qua email"}
        </button>
      }
    >
      {(state.ok || state.error) && <Status state={state} />}
    </Row>
  );
}

const SECTIONS = [
  { id: "ho-so", label: "Hồ sơ", icon: UserRound },
  { id: "hoc-tap", label: "Học tập", icon: Car },
  { id: "tai-khoan", label: "Tài khoản & bảo mật", icon: KeyRound },
  { id: "thiet-bi", label: "Thiết bị & dữ liệu", icon: MonitorSmartphone },
  { id: "xoa", label: "Xoá tài khoản", icon: ShieldAlert },
] as const;

/** Menu mục: máy tính — cột trái dính khi cuộn; điện thoại — hàng chip cuộn ngang. Mục đang xem được tô (theo vị trí cuộn) */
function SectionNav({ ids }: { ids: string[] }) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const els = ids.map((id) => document.getElementById(id)).filter((e): e is HTMLElement => !!e);
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: "-20% 0px -65% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [ids]);
  const items = SECTIONS.filter((s) => ids.includes(s.id));
  return (
    <nav aria-label="Các mục cài đặt" className="settings-nav">
      <ul className="scroll-row flex gap-2 max-lg:-mx-4 max-lg:px-4 lg:flex-col lg:gap-0.5">
        {items.map(({ id, label, icon: Icon }) => (
          <li key={id}>
            <a
              href={`#${id}`}
              aria-current={active === id ? "true" : undefined}
              className={`settings-nav-link ${id === "xoa" ? "settings-nav-danger" : ""}`}
              onClick={() => setActive(id)}
            >
              <Icon className="size-4 shrink-0" aria-hidden /> {label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Trang cài đặt: menu mục (trái) + các nhóm: Hồ sơ (ảnh, tên, kim cương) · Học tập (`learning`) · Tài khoản & bảo mật (tên, email, mật khẩu)
 * · Thiết bị & dữ liệu (đăng xuất, xuất dữ liệu) · Xoá tài khoản
 */
export default function SettingsForms({
  user,
  fixedAdmin,
  points,
  learning,
}: {
  user: { id: number; name: string; email: string; admin: boolean; createdAt: string; avatarAt: number | null; hasPassword: boolean };
  fixedAdmin: boolean; // admin chính: email + mật khẩu lấy từ biến môi trường
  points: number; // kim cương hiện có
  learning?: ReactNode; // cài đặt luyện thi (hạng bằng lái) — các hàng trong nhóm Học tập
}) {
  const { hasPassword } = user;
  const [del, delAction, deleting] = useActionState(deleteAccount, {});
  const [others, othersAction, loggingOut] = useActionState(logoutOtherDevices, {});
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

  const ids = SECTIONS.map((s) => s.id).filter((id) => (id === "hoc-tap" ? !!learning : id === "xoa" ? !fixedAdmin : true));

  return (
    <div className="settings-layout">
      <SectionNav ids={ids} />

      <div className="flex min-w-0 flex-col gap-8">
        {/* Hồ sơ: ảnh đại diện (bấm để đổi) + tên, email, vai trò + kim cương */}
        <section id="ho-so" aria-label="Hồ sơ" className="card scroll-mt-24 flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
          <div className="flex flex-col items-center gap-2 max-sm:self-center">
            <button
              type="button"
              className="settings-avatar group"
              onClick={() => fileRef.current?.click()}
              disabled={avatarPending}
              aria-label={user.avatarAt ? "Đổi ảnh đại diện" : "Tải ảnh đại diện lên"}
            >
              <Avatar user={user} className={`size-24 text-4xl transition-opacity ${avatarPending ? "animate-pulse opacity-60" : "group-hover:opacity-90"}`} />
              <span className="settings-avatar-cam" aria-hidden>
                <Camera className="size-4" />
              </span>
            </button>
            {user.avatarAt && (
              <button className="btn btn-sm btn-ghost text-xs text-red-400" onClick={removeAvatar} disabled={avatarPending}>
                <Trash2 className="size-3.5" /> Xoá ảnh
              </button>
            )}
          </div>
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
          <div className="flex min-w-0 flex-1 flex-col gap-2.5 max-sm:items-center max-sm:text-center">
            <div className="min-w-0 max-w-full">
              <p className="truncate font-display text-2xl leading-tight font-extrabold tracking-[-0.02em] sm:text-[1.75rem]">{user.name}</p>
              <p className="truncate text-sm text-muted">{user.email}</p>
            </div>
            <div className="flex flex-wrap gap-2 max-sm:justify-center">
              <span className={`badge ${user.admin ? "badge-gold" : "badge-link"}`}>{user.admin ? "Quản trị viên" : "Học viên"}</span>
              <span className="badge badge-muted">Tham gia {joined(user.createdAt)}</span>
              {!hasPassword && <span className="badge badge-muted">Google / Apple</span>}
            </div>
            {avatarPending && <p className="text-xs text-muted">Đang tải ảnh…</p>}
            {avatarError && (
              <p role="alert" className="alert alert-err">
                {avatarError}
              </p>
            )}
          </div>
          <Link href="/stats" className="settings-gem card-link" title="Xem thống kê học tập">
            <Gem className="size-7" />
            <span className="flex flex-col leading-tight">
              <span className="font-display text-2xl font-extrabold tabular-nums">{fmt(points)}</span>
              <span className="text-xs font-semibold">kim cương</span>
            </span>
            <span className="ml-auto flex items-center gap-0.5 pl-1.5 text-xs font-bold">
              <BarChart3 className="size-3.5 sm:hidden" /> Thống kê <ChevronRight className="size-3.5" />
            </span>
          </Link>
        </section>

        {learning && (
          <Group id="hoc-tap" title="Học tập" desc="Áp dụng cho web và app.">
            {learning}
          </Group>
        )}

        <Group id="tai-khoan" title="Tài khoản & bảo mật">
          <NameRow name={user.name} />
          <EmailRow email={user.email} hasPassword={hasPassword} fixed={fixedAdmin} />
          <PasswordRow hasPassword={hasPassword} fixed={fixedAdmin} />
        </Group>

        <Group id="thiet-bi" title="Thiết bị & dữ liệu" desc="Sổ từ vựng và tiến độ luôn được giữ trong tài khoản, kể cả khi đăng xuất.">
          <Row
            icon={LogOut}
            title="Máy này"
            desc="Đăng xuất khỏi trình duyệt đang dùng."
            wide
            action={
              <form action={logout}>
                <button className="btn btn-sm">Đăng xuất</button>
              </form>
            }
          />
          <Row
            icon={MonitorSmartphone}
            title="Thiết bị khác"
            desc="Đăng xuất mọi điện thoại, máy tính khác đang đăng nhập."
            wide
            action={
              <form action={othersAction}>
                <button className="btn btn-sm" disabled={loggingOut}>
                  {loggingOut ? "Đang xử lý…" : "Đăng xuất tất cả"}
                </button>
              </form>
            }
          >
            {(others.ok || others.error) && <Status state={others} />}
          </Row>
          <ExportRow />
        </Group>

        {!fixedAdmin && (
          <Group id="xoa" title="Vùng nguy hiểm" danger>
            <Row
              icon={ShieldAlert}
              title="Xoá tài khoản"
              desc="Xoá vĩnh viễn tài khoản, sổ từ vựng, tiến độ và kim cương. Không thể hoàn tác."
              wide
              action={
                !confirmDelete && (
                  <button className="btn btn-sm settings-danger-btn" onClick={() => setConfirmDelete(true)}>
                    <Trash2 className="size-4" /> Xoá tài khoản
                  </button>
                )
              }
            >
              {confirmDelete && (
                <form action={delAction} className="settings-confirm">
                  {hasPassword ? (
                    <input name="password" type="password" placeholder="Nhập mật khẩu để xác nhận" className="input" autoComplete="current-password" required autoFocus />
                  ) : (
                    <p className="text-sm">Bạn chắc chắn muốn xoá? Mọi dữ liệu sẽ mất vĩnh viễn.</p>
                  )}
                  <Status state={del} />
                  <div className="dialog-actions mt-0">
                    <button type="button" className="btn" onClick={() => setConfirmDelete(false)}>
                      Huỷ
                    </button>
                    <button className="btn btn-red" disabled={deleting}>
                      {deleting ? "Đang xoá…" : "Xoá vĩnh viễn"}
                    </button>
                  </div>
                </form>
              )}
            </Row>
          </Group>
        )}
      </div>
    </div>
  );
}
