import { Suspense } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { adminListUsers, type AdminUserRow } from "@/lib/db";
import { ListSkeleton } from "@/components/Skeleton";
import Avatar from "@/components/Avatar";
import { Gem } from "@/components/PointsBadge";
import { ChevronRight, Search, Users as UsersIcon, X } from "lucide-react";
import AdminPageHeader from "../_components/AdminPageHeader";
import KpiCard from "../_components/KpiCard";
import { ago, nowMs, PROVIDER_LABEL, sqlTime } from "./format";

const DAY = 86_400_000;

const FILTERS = {
  all: { label: "Tất cả", test: () => true },
  active7: { label: "Hoạt động 7 ngày", test: (u, now) => !!u.lastActive && now - u.lastActive < 7 * DAY },
  new7: { label: "Mới 7 ngày", test: (u, now) => now - sqlTime(u.createdAt) < 7 * DAY },
  idle: { label: "Chưa học gì", test: (u) => !u.lastActive },
  admin: { label: "Admin", test: (u) => u.role === "admin" },
  oauth: { label: "Google / Apple", test: (u) => u.providers.length > 0 },
  unverified: { label: "Chưa xác minh email", test: (u) => !u.emailVerified },
} satisfies Record<string, { label: string; test: (u: AdminUserRow, now: number) => boolean }>;
type FilterKey = keyof typeof FILTERS;

const SORTS = {
  new: { label: "Mới đăng ký", cmp: (a, b) => sqlTime(b.createdAt) - sqlTime(a.createdAt) },
  active: { label: "Hoạt động gần đây", cmp: (a, b) => (b.lastActive ?? 0) - (a.lastActive ?? 0) },
  points: { label: "Kim cương", cmp: (a, b) => b.points - a.points },
  vocab: { label: "Số từ", cmp: (a, b) => b.vocab - a.vocab },
  name: { label: "Tên A–Z", cmp: (a, b) => a.name.localeCompare(b.name, "vi") },
} satisfies Record<string, { label: string; cmp: (a: AdminUserRow, b: AdminUserRow) => number }>;
type SortKey = keyof typeof SORTS;

const pick = <K extends string>(v: string | string[] | undefined, keys: Record<K, unknown>, fallback: K): K =>
  typeof v === "string" && v in keys ? (v as K) : fallback;

async function Users({ searchParams }: PageProps<"/admin/users">) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const filter = pick<FilterKey>(sp.f, FILTERS, "all");
  const sort = pick<SortKey>(sp.sort, SORTS, "new");
  const now = nowMs();

  const all = adminListUsers();
  const count = (k: FilterKey) => all.filter((u) => FILTERS[k].test(u, now)).length;
  const active30 = all.filter((u) => u.lastActive && now - u.lastActive < 30 * DAY).length;
  const needle = q.toLowerCase();
  const users = all
    .filter((u) => FILTERS[filter].test(u, now))
    .filter((u) => !needle || u.name.toLowerCase().includes(needle) || u.email.includes(needle) || String(u.id) === needle)
    .sort(SORTS[sort].cmp);

  const href = (over: { f?: FilterKey; sort?: SortKey; q?: string }) => {
    const p = new URLSearchParams();
    const query = over.q ?? q;
    if (query) p.set("q", query);
    const f = over.f ?? filter;
    const s = over.sort ?? sort;
    if (f !== "all") p.set("f", f);
    if (s !== "new") p.set("sort", s);
    const str = p.toString();
    return `/admin/users${str ? `?${str}` : ""}`;
  };

  return (
    <>
      <AdminPageHeader
        crumbs={[{ label: "Người dùng & Cộng đồng" }, { label: "Người dùng" }]}
        title="Người dùng"
        count={all.length}
        description="Quản lý tài khoản học viên, theo dõi mức độ hoạt động, phân quyền và hỗ trợ xử lý sự cố."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard tone="ink" label="Tổng tài khoản" value={all.length} sub={`${count("admin")} quản trị viên`} />
        <KpiCard tone="de" label="Đăng ký 7 ngày" value={count("new7")} sub={`${count("oauth")} qua Google / Apple`} />
        <KpiCard tone="ok" label="Hoạt động 7 ngày" value={count("active7")} sub={`${active30} trong 30 ngày qua`} />
        <KpiCard tone="laixe" label="Chưa học gì" value={count("idle")} sub={`${count("unverified")} chưa xác minh email`} />
      </div>

      {/* Bộ lọc + tìm kiếm + sắp xếp */}
      <div className="card flex flex-col gap-3 p-3.5">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="scroll-row flex gap-1.5" role="group" aria-label="Lọc người dùng">
            {(Object.keys(FILTERS) as FilterKey[]).map((k) => (
              <Link key={k} href={href({ f: k })} className="chip text-xs" aria-current={k === filter ? "true" : undefined}>
                {FILTERS[k].label}
                <span className="font-mono tabular-nums opacity-70">{k === "all" ? all.length : count(k)}</span>
              </Link>
            ))}
          </div>
          <form action="/admin/users" className="flex items-center gap-1.5">
            <div className="input-group min-w-0 flex-1 sm:w-64">
              <Search className="size-4 shrink-0 text-muted" aria-hidden />
              <input name="q" defaultValue={q} placeholder="Tên, email hoặc ID…" aria-label="Tìm người dùng" />
            </div>
            {filter !== "all" && <input type="hidden" name="f" value={filter} />}
            {sort !== "new" && <input type="hidden" name="sort" value={sort} />}
            <button className="btn btn-sm">Tìm</button>
            {q && (
              <Link href={href({ q: "" })} className="btn btn-ghost btn-sm" aria-label="Xoá tìm kiếm">
                <X className="size-4" />
              </Link>
            )}
          </form>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-2.5 text-xs text-muted">
          <span>Sắp xếp:</span>
          {(Object.keys(SORTS) as SortKey[]).map((k) =>
            k === sort ? (
              <span key={k} className="font-bold text-foreground">
                {SORTS[k].label}
              </span>
            ) : (
              <Link key={k} href={href({ sort: k })} className="font-medium hover:text-foreground hover:underline">
                {SORTS[k].label}
              </Link>
            ),
          )}
          <span className="ml-auto font-mono tabular-nums">
            Hiển thị {users.length}/{all.length}
          </span>
        </div>
      </div>

      {/* Bảng rõ cột trên Desktop (md+) & Danh sách thẻ gọn trên Mobile */}
      <div className="card overflow-hidden p-0">
        {users.length ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-card-2/60 text-xs font-semibold text-muted">
                    <th className="px-4 py-2.5">Người dùng</th>
                    <th className="px-3 py-2.5">Trạng thái</th>
                    <th className="px-3 py-2.5">Hoạt động</th>
                    <th className="px-3 py-2.5 text-right">Kim cương</th>
                    <th className="px-3 py-2.5">Tiến độ học</th>
                    <th className="px-4 py-2.5 text-right">Đăng ký</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {users.map((u) => (
                    <tr key={u.id} className="transition-colors hover:bg-card-2/40">
                      <td className="px-4 py-3">
                        <Link href={`/admin/users/${u.id}`} className="group flex items-center gap-3">
                          <Avatar user={u} className="size-9 text-sm" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate font-semibold text-foreground group-hover:text-sec-text">{u.name}</span>
                              {u.id === me.id && <span className="text-xs text-muted">(bạn)</span>}
                              {u.role === "admin" && <span className="badge badge-gold">Admin</span>}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted">
                              <span className="truncate">{u.email}</span>
                              <span className="font-mono tabular-nums">#{u.id}</span>
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {u.emailVerified ? <span className="badge badge-ok">Đã xác minh</span> : <span className="badge badge-coral">Chưa xác minh</span>}
                          {u.providers.map((p) => (
                            <span key={p} className="badge badge-muted">
                              {PROVIDER_LABEL[p]}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs whitespace-nowrap">
                        <span className={u.lastActive ? "font-semibold text-foreground" : "text-muted"}>{ago(u.lastActive, now)}</span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs font-semibold text-gem whitespace-nowrap tabular-nums">
                        <span className="inline-flex items-center gap-1">
                          <Gem className="size-3.5" /> {u.points.toLocaleString("vi-VN")}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-muted whitespace-nowrap tabular-nums">
                        {u.vocab} từ · {u.lessons} bài{u.quiz > 0 ? ` · ${u.quiz} thi` : ""}
                        {u.feedback > 0 ? ` · ${u.feedback} góp ý` : ""}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <span className="font-mono text-xs text-muted tabular-nums">{u.createdAt.slice(0, 10)}</span>
                          <Link href={`/admin/users/${u.id}`} className="btn btn-ghost btn-sm px-2">
                            Chi tiết
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-line md:hidden">
              {users.map((u) => (
                <li key={u.id}>
                  <Link href={`/admin/users/${u.id}`} className="flex items-center gap-3 p-3.5 transition-colors hover:bg-card-2/50">
                    <Avatar user={u} className="size-10 text-base" />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <span className="truncate font-semibold">{u.name}</span>
                        {u.id === me.id && <span className="text-xs text-muted">(bạn)</span>}
                        {u.role === "admin" && <span className="badge badge-gold">Admin</span>}
                        {!u.emailVerified && <span className="badge badge-coral">Chưa xác minh</span>}
                      </div>
                      <div className="flex min-w-0 flex-wrap gap-x-2 text-xs text-muted">
                        <span className="min-w-0 truncate">{u.email}</span>
                        <span className="font-mono tabular-nums">#{u.id}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-xs tabular-nums">
                        <span className={u.lastActive ? "font-semibold" : "text-muted"}>{ago(u.lastActive, now)}</span>
                        <span className="inline-flex items-center gap-0.5 font-semibold text-gem">
                          <Gem className="size-3.5" /> {u.points}
                        </span>
                        <span className="text-muted">{u.vocab} từ</span>
                        <span className="text-muted">{u.lessons} bài</span>
                      </div>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="empty">
            <span className="icon-bubble tint-muted">
              <UsersIcon className="size-5" aria-hidden />
            </span>
            <p>{all.length ? "Không có người dùng nào khớp." : "Chưa có người dùng nào."}</p>
          </div>
        )}
      </div>
    </>
  );
}

export default function UsersPage(props: PageProps<"/admin/users">) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <Users {...props} />
    </Suspense>
  );
}
