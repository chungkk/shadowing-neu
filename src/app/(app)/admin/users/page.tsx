import { Suspense } from "react";
import { envAdminEmail, requireAdmin } from "@/lib/auth";
import { listUsers } from "@/lib/db";
import { changeUserRole, removeUser } from "../actions";
import DeleteButton from "../DeleteButton";
import PasswordButton from "./PasswordButton";
import { ListSkeleton } from "@/components/Skeleton";
import { Users as UsersIcon } from "lucide-react";
import AdminNav from "../AdminNav";

async function Users() {
  const me = await requireAdmin();
  const users = listUsers();
  const fixedAdmin = envAdminEmail();

  return (
    <>
      <h1 className="page-title">
        Người dùng <span className="text-muted tabular-nums">{users.length}</span>
      </h1>
      <div className="card overflow-hidden p-0">
        <ul className="divide-y divide-line">
        {users.map((u) => {
          const locked = u.id === me.id || u.email === fixedAdmin;
          const nextRole = u.role === "admin" ? "user" : "admin";
          return (
            <li key={u.id} className="flex flex-wrap items-center gap-2 p-3 transition-colors hover:bg-card-2/50 sm:px-4">
              <div className="min-w-0 flex-1 max-sm:basis-full">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-semibold">{u.name}</span>
                  {u.id === me.id && <span className="text-xs text-muted">(bạn)</span>}
                  <span className={`badge ${u.role === "admin" ? "badge-gold" : "badge-muted"}`}>
                    {u.role === "admin" ? "Admin" : "Học viên"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-2 text-xs text-muted">
                  <span className="min-w-0 truncate">{u.email}</span>
                  <span aria-hidden>·</span>
                  <span className="tabular-nums">{u.createdAt.slice(0, 10)}</span>
                </div>
              </div>
              {!locked && (
                <>
                  <PasswordButton userId={u.id} email={u.email} />
                  <form action={changeUserRole.bind(null, u.id, nextRole)}>
                    <button className="btn btn-sm">{nextRole === "admin" ? "Cấp quyền admin" : "Bỏ quyền admin"}</button>
                  </form>
                  <DeleteButton action={removeUser.bind(null, u.id)} confirmText={`Xoá tài khoản ${u.email}?`} />
                </>
              )}
            </li>
          );
        })}
        </ul>
        {!users.length && (
          <div className="empty">
            <span className="icon-bubble tint-muted">
              <UsersIcon className="size-5" aria-hidden />
            </span>
            <p>Chưa có người dùng nào.</p>
          </div>
        )}
      </div>
    </>
  );
}

export default function UsersPage() {
  return (
    <main className="page page-narrow">
      <AdminNav />
      <Suspense fallback={<ListSkeleton />}>
        <Users />
      </Suspense>
    </main>
  );
}
