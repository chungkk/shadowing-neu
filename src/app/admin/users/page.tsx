import { Suspense } from "react";
import Link from "next/link";
import { envAdminEmail, requireAdmin } from "@/lib/auth";
import { listUsers } from "@/lib/db";
import { changeUserRole, removeUser } from "../actions";
import DeleteButton from "../DeleteButton";

async function Users() {
  const me = await requireAdmin();
  const users = listUsers();
  const fixedAdmin = envAdminEmail();

  return (
    <>
      <h1 className="text-2xl font-extrabold">Người dùng ({users.length})</h1>
      <div className="card divide-y divide-border p-0">
        {users.map((u) => {
          const locked = u.id === me.id || u.email === fixedAdmin;
          const nextRole = u.role === "admin" ? "user" : "admin";
          return (
            <div key={u.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">
                  {u.name} {u.id === me.id && <span className="text-xs text-muted">(bạn)</span>}
                </div>
                <div className="flex gap-2 text-xs text-muted">
                  <span className="truncate">{u.email}</span>
                  <span className={u.role === "admin" ? "font-semibold text-accent" : ""}>
                    {u.role === "admin" ? "Admin" : "Học viên"}
                  </span>
                  <span>{u.createdAt.slice(0, 10)}</span>
                </div>
              </div>
              {!locked && (
                <>
                  <form action={changeUserRole.bind(null, u.id, nextRole)}>
                    <button className="btn">{nextRole === "admin" ? "Cấp quyền admin" : "Bỏ quyền admin"}</button>
                  </form>
                  <DeleteButton action={removeUser.bind(null, u.id)} confirmText={`Xoá tài khoản ${u.email}?`} />
                </>
              )}
            </div>
          );
        })}
        {!users.length && <p className="p-6 text-center text-sm text-muted">Chưa có người dùng nào.</p>}
      </div>
    </>
  );
}

export default function UsersPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 md:p-6">
      <Link href="/admin" className="text-sm text-muted hover:underline">
        ← Quản trị
      </Link>
      <Suspense fallback={<p className="text-muted">Đang tải…</p>}>
        <Users />
      </Suspense>
    </main>
  );
}
