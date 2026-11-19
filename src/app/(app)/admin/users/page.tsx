import { Suspense } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { adminListUsers, type AdminUserRow } from "@/lib/db";
import { ListSkeleton } from "@/components/Skeleton";
import Avatar from "@/components/Avatar";
import { Gem } from "@/components/PointsBadge";
import { ChevronRight, Search, Users as UsersIcon, X } from "lucide-react";
import AdminNav from "../AdminNav";
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

/** Thẻ số liệu tổng quan */
function Stat({ value, label, sub }: { value: number; label: string; sub?: string }) {
  return (
    <div className="tile stat">
      <span className="stat-value">{value}</span>
      <span className="stat-label">
        {label}
        {sub && <span className="block text-[0.7rem] opacity-80">{sub}</span>}
      </span>
    </div>
  );
}

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
      <h1 className="page-title">
        Người dùng <span className="text-muted tabular-nums">{all.length}</span>
      </h1>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat value={all.length} label="Tài khoản" sub={`${count("admin")} admin`} />
        <Stat value={count("new7")} label="Đăng ký 7 ngày qua" />
        <Stat value={count("active7")} label="Hoạt động 7 ngày qua" sub={`${active30} trong 30 ngày`} />
        <Stat value={count("idle")} label="Chưa học gì" sub={`${count("unverified")} chưa xác minh email`} />
      </div>

      {/* Tìm kiếm: form GET thường — giữ bộ lọc / sắp xếp đang chọn */}
      <form action="/admin/users" className="flex flex-wrap gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input name="q" defaultValue={q} placeholder="Tìm theo tên, email hoặc ID" className="input w-full py-2 pl-9" aria-label="Tìm người dùng" />
        </div>
        {filter !== "all" && <input type="hidden" name="f" value={filter} />}
        {sort !== "new" && <input type="hidden" name="sort" value={sort} />}
        <button className="btn">Tìm</button>
        {q && (
          <Link href={href({ q: "" })} className="btn btn-ghost" aria-label="Xoá tìm kiếm">
            <X className="size-4" />
          </Link>
        )}
      </form>

      <div className="flex flex-col gap-2">
        <div className="scroll-row flex gap-1.5" role="group" aria-label="Lọc">
          {(Object.keys(FILTERS) as FilterKey[]).map((k) => (
            <Link key={k} href={href({ f: k })} className="chip" aria-current={k === filter ? "true" : undefined}>
              {FILTERS[k].label}
              <span className="tabular-nums opacity-70">{k === "all" ? all.length : count(k)}</span>
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <span>Sắp xếp:</span>
          {(Object.keys(SORTS) as SortKey[]).map((k) =>
            k === sort ? (
              <span key={k} className="font-bold text-foreground">
                {SORTS[k].label}
              </span>
            ) : (
              <Link key={k} href={href({ sort: k })} className="font-semibold hover:text-foreground hover:underline">
                {SORTS[k].label}
              </Link>
            ),
          )}
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <ul className="divide-y divide-line">
          {users.map((u) => (
            <li key={u.id}>
              <Link href={`/admin/users/${u.id}`} className="flex items-center gap-3 p-3 transition-colors hover:bg-card-2/50 sm:px-4">
                <Avatar user={u} className="size-10 text-base" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <span className="truncate font-semibold">{u.name}</span>
                    {u.id === me.id && <span className="text-xs text-muted">(bạn)</span>}
                    {u.role === "admin" && <span className="badge badge-gold">Admin</span>}
                    {u.providers.map((p) => (
                      <span key={p} className="badge badge-muted">
                        {PROVIDER_LABEL[p]}
                      </span>
                    ))}
                    {!u.emailVerified && <span className="badge badge-coral">Chưa xác minh</span>}
                  </div>
                  <div className="flex min-w-0 flex-wrap gap-x-2 text-xs text-muted">
                    <span className="min-w-0 truncate">{u.email}</span>
                    <span aria-hidden>·</span>
                    <span className="tabular-nums">#{u.id}</span>
                    <span aria-hidden>·</span>
                    <span className="tabular-nums">ĐK {u.createdAt.slice(0, 10)}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs tabular-nums">
                    <span className={u.lastActive ? "font-semibold" : "text-muted"}>{ago(u.lastActive, now)}</span>
                    <span className="inline-flex items-center gap-0.5 font-semibold text-gem"><Gem className="size-3.5" /> {u.points}</span>
                    <span className="text-muted">{u.vocab} từ</span>
                    <span className="text-muted">{u.lessons} bài</span>
                    {u.quiz > 0 && <span className="text-muted">{u.quiz} câu thi</span>}
                    {u.feedback > 0 && <span className="text-muted">{u.feedback} góp ý</span>}
                  </div>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
        {!users.length && (
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
    <main className="page page-narrow">
      <AdminNav />
      <Suspense fallback={<ListSkeleton />}>
        <Users {...props} />
      </Suspense>
    </main>
  );
}
