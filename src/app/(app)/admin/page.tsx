import { Suspense } from "react";
import Link from "next/link";
import { ChevronDown, Circle, CircleCheck, ExternalLink, ListVideo, Lock, Plus, Search } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { lessonUnlockStats, listChannels, listLessons } from "@/lib/db";
import { fillLessonChannels } from "@/lib/channels";
import { earnableFreePoints, lockSettings } from "@/lib/access";
import { FREE_PICKS, LESSON_PRICE } from "@/lib/lesson-lock";
import { removeLesson, setLessonLock, toggleFreeLesson, toggleLessonPublished } from "./actions";
import DeleteButton from "./DeleteButton";
import AdminNav from "./AdminNav";
import LevelBadge from "@/components/LevelBadge";
import { ListSkeleton } from "@/components/Skeleton";
import { channelPath, lessonPath } from "@/lib/slug";

const fmt = (n: number) => n.toLocaleString("vi-VN");

/** Khoá bài học: bật / tắt + tình trạng. Bài miễn phí chọn bằng nút "Miễn phí" ở từng bài bên dưới */
function LockPanel({ enabled, freeCount }: { enabled: boolean; freeCount: number }) {
  const s = lessonUnlockStats();
  const earnable = earnableFreePoints();
  const short = earnable < LESSON_PRICE; // bài miễn phí không kiếm đủ kim cương để mở 1 bài
  return (
    <div className="surface flex flex-wrap items-start gap-3 p-4">
      <Lock className={`mt-0.5 size-5 shrink-0 ${enabled ? "text-ok-text" : "text-muted"}`} aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
        <p className="flex flex-wrap items-center gap-2 font-semibold">
          Khoá bài học:{" "}
          {enabled ? <span className="badge badge-ok">đang bật</span> : <span className="badge badge-muted">đang tắt — mọi bài đều mở</span>}
        </p>
        <p className="text-xs leading-relaxed text-muted">
          Khách chỉ học {freeCount} bài “Miễn phí” (chọn ở từng bài bên dưới). Người đã đăng nhập chọn thêm {FREE_PICKS} bài, sau đó{" "}
          {fmt(LESSON_PRICE)} kim cương / bài. Bài ai đang học dở lúc bật vẫn học tiếp được.
        </p>
        {short && (
          <p className="alert alert-warn mt-1 text-xs">
            Các bài “Miễn phí” có bật Dictation chỉ kiếm được tối đa {fmt(earnable)} kim cương, chưa đủ {fmt(LESSON_PRICE)} để mở 1 bài. Hãy bật Dictation hoặc thêm bài miễn phí.
          </p>
        )}
        {s.users > 0 && (
          <p className="text-xs text-muted">
            Đã mở khoá: {fmt(s.pick)} lượt miễn phí · {fmt(s.buy)} lượt mua ({fmt(s.spent)} kim cương) · {fmt(s.legacy)} bài học dở · {fmt(s.own)} bài riêng tự tạo · {fmt(s.users)} người
          </p>
        )}
      </div>
      <form action={setLessonLock.bind(null, !enabled)} className="self-center max-sm:basis-full max-sm:*:w-full">
        <button
          className={`btn ${enabled ? "" : "btn-soft"}`}
          disabled={!enabled && short}
          title={!enabled && short ? "Các bài “Miễn phí” chưa kiếm đủ kim cương để mở 1 bài" : undefined}
        >
          {enabled ? "Tắt khoá" : "Bật khoá"}
        </button>
      </form>
    </div>
  );
}

type Summary = ReturnType<typeof listLessons>[number];
type Filter = "all" | "published" | "draft" | "free";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "published", label: "Đã đăng" },
  { id: "draft", label: "Nháp" },
  { id: "free", label: "Miễn phí" },
];
const NO_CHANNEL = "Chưa rõ kênh";

/** 1 dòng bài học: ảnh · tên + nhãn · trạng thái / miễn phí / xem / sửa / xoá */
function LessonRow({ l, free }: { l: Summary; free: boolean }) {
  return (
    <li className="flex flex-wrap items-center gap-3 px-3 py-2.5 transition-colors hover:bg-card-2/60 sm:px-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`https://i.ytimg.com/vi/${l.videoId}/default.jpg`} alt="" loading="lazy" className="h-11 w-[4.5rem] shrink-0 rounded-md bg-card-2 object-cover" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link href={`/admin/${l.id}`} className="truncate text-sm font-semibold hover:text-accent-text" title={l.title}>
          {l.title}
        </Link>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
          <LevelBadge level={l.level} className="text-xs" />
          <span className="tabular-nums">{l.sentenceCount} câu</span>
          {l.dictation && <span className="badge badge-gem">Dictation</span>}
          <span aria-hidden>·</span>
          <span className="tabular-nums">{l.createdAt.slice(0, 10).split("-").reverse().join(".")}</span>
        </div>
      </div>
      {/* Điện thoại: các nút xuống hàng riêng dưới tiêu đề */}
      <div className="flex flex-wrap items-center gap-1.5 max-sm:basis-full max-sm:justify-end">
        <form action={toggleLessonPublished.bind(null, l.id, !l.published)}>
          <button
            title={l.published ? "Bấm để chuyển về bản nháp" : "Bấm để đăng công khai"}
            aria-pressed={l.published}
            className={`badge hit-44 min-h-7 cursor-pointer gap-1 px-2.5 transition-shadow hover:ring-1 hover:ring-current/40 ${l.published ? "badge-ok" : "badge-muted"}`}
          >
            {l.published ? <CircleCheck className="size-3.5" aria-hidden /> : <Circle className="size-3.5" aria-hidden />}
            {l.published ? "Đã đăng" : "Nháp"}
          </button>
        </form>
        {/* Bài miễn phí (khoá bài học): khách cũng học được */}
        <form action={toggleFreeLesson.bind(null, l.id, !free)}>
          <button
            title={free ? "Bấm để bỏ miễn phí" : "Bấm để cho khách học miễn phí bài này"}
            aria-pressed={free}
            className={`badge hit-44 min-h-7 cursor-pointer gap-1 px-2.5 transition-shadow hover:ring-1 hover:ring-current/40 ${free ? "badge-gold" : "badge-muted"}`}
          >
            {free ? <CircleCheck className="size-3.5" aria-hidden /> : <Circle className="size-3.5" aria-hidden />}
            Miễn phí
          </button>
        </form>
        <Link href={lessonPath(l.slug)} className="btn btn-ghost btn-sm">
          Xem
        </Link>
        <Link href={`/admin/${l.id}`} className="btn btn-sm">
          Sửa
        </Link>
        <DeleteButton action={removeLesson.bind(null, l.id)} />
      </div>
    </li>
  );
}

type Group = { name: string; url: string | null; avatar: string | null; lessons: Summary[] };

/** Gom bài theo kênh YouTube: kênh nhiều bài trước, "Chưa rõ kênh" cuối cùng */
function byChannel(lessons: Summary[]): Group[] {
  const avatars = new Map(listChannels().flatMap((c) => (c.handle && c.avatar ? [[c.handle.toLowerCase(), c.avatar] as const] : [])));
  const map = new Map<string, Group>();
  for (const l of lessons) {
    const name = l.channel?.trim() || NO_CHANNEL;
    const g = map.get(name) ?? { name, url: l.channelUrl || null, avatar: avatars.get(l.channelUrl?.match(/\/(@[^/?#]+)/)?.[1]?.toLowerCase() ?? "") ?? null, lessons: [] };
    g.lessons.push(l);
    map.set(name, g);
  }
  return [...map.values()].sort(
    (a, b) => +(a.name === NO_CHANNEL) - +(b.name === NO_CHANNEL) || b.lessons.length - a.lessons.length || a.name.localeCompare(b.name, "de"),
  );
}

function ChannelGroup({ g, free }: { g: Group; free: Set<number> }) {
  const published = g.lessons.filter((l) => l.published).length;
  const drafts = g.lessons.length - published;
  const known = g.name !== NO_CHANNEL;
  return (
    <details open className="card group/ch overflow-hidden p-0">
      <summary className="flex cursor-pointer list-none items-center gap-3 border-line bg-card-2/50 px-3 py-2.5 group-open/ch:border-b sm:px-4">
        {g.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={g.avatar} alt="" loading="lazy" className="size-8 shrink-0 rounded-full border border-line bg-card object-cover" />
        ) : (
          <span className="icon-bubble tint-muted size-8 shrink-0 rounded-full text-xs font-bold" aria-hidden>
            {known ? g.name.charAt(0).toUpperCase() : "?"}
          </span>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 className="truncate text-sm font-bold text-foreground">{g.name}</h2>
          <p className="text-xs text-muted tabular-nums">
            {g.lessons.length} bài · {published} đã đăng{drafts ? ` · ${drafts} nháp` : ""}
          </p>
        </div>
        {known && (
          <div className="flex shrink-0 items-center gap-1">
            {published > 0 && (
              <Link href={channelPath(g.name)} className="btn btn-ghost btn-sm text-muted max-sm:hidden" title="Trang kênh trên hallovn.de">
                Trang kênh
              </Link>
            )}
            {g.url && (
              <a href={g.url} target="_blank" rel="noopener noreferrer" className="btn-icon size-8 rounded-lg text-muted hover:text-foreground" title="Kênh trên YouTube" aria-label={`${g.name} trên YouTube`}>
                <ExternalLink className="size-4" />
              </a>
            )}
          </div>
        )}
        <ChevronDown className="size-4 shrink-0 text-muted transition-transform group-open/ch:rotate-180 motion-reduce:transition-none" aria-hidden />
      </summary>
      <ul className="divide-y divide-line">
        {g.lessons.map((l) => (
          <LessonRow key={l.id} l={l} free={free.has(l.id)} />
        ))}
      </ul>
    </details>
  );
}

async function Dashboard({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  await requireAdmin();
  fillLessonChannels();
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim();
  const filter = (FILTERS.some((f) => f.id === sp.f) ? sp.f : "all") as Filter;
  const lessons = listLessons({ includeDrafts: true });
  const lock = lockSettings();
  const free = new Set(lock.free.filter((id) => lessons.some((l) => l.id === id))); // bỏ id bài đã xoá

  const counts: Record<Filter, number> = {
    all: lessons.length,
    published: lessons.filter((l) => l.published).length,
    draft: lessons.filter((l) => !l.published).length,
    free: free.size,
  };
  const qNorm = q.toLowerCase();
  const shown = lessons.filter(
    (l) =>
      (filter === "all" || (filter === "published" ? l.published : filter === "draft" ? !l.published : free.has(l.id))) &&
      (!qNorm || l.title.toLowerCase().includes(qNorm) || (l.channel?.toLowerCase().includes(qNorm) ?? false) || l.slug.includes(qNorm)),
  );
  const groups = byChannel(shown);
  const href = (f: Filter) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (f !== "all") p.set("f", f);
    const s = p.toString();
    return s ? `/admin?${s}` : "/admin";
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="page-title flex-1">
          Bài học <span className="text-muted tabular-nums">{lessons.length}</span>
        </h1>
        <Link href="/admin/new" className="btn btn-primary max-sm:w-full">
          <Plus className="size-4" /> Bài mới
        </Link>
      </div>

      {/* Số liệu nhanh */}
      <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
        {[
          { label: "Kênh", value: byChannel(lessons).filter((g) => g.name !== NO_CHANNEL).length },
          { label: "Đã đăng", value: counts.published },
          { label: "Nháp", value: counts.draft },
          { label: "Miễn phí", value: counts.free },
          { label: "Có Dictation", value: lessons.filter((l) => l.dictation).length },
        ].map((s) => (
          <div key={s.label} className="surface flex flex-col gap-0.5 px-3.5 py-2.5">
            <dt className="text-xs text-muted">{s.label}</dt>
            <dd className="font-display text-xl font-bold tabular-nums">{fmt(s.value)}</dd>
          </div>
        ))}
      </dl>

      <LockPanel enabled={lock.enabled} freeCount={free.size} />

      {/* Tìm + lọc (qua URL, không cần JS) */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="Lọc trạng thái" className="scroll-row flex gap-2">
          {FILTERS.map((f) => (
            <Link key={f.id} href={href(f.id)} aria-current={filter === f.id ? "page" : undefined} className="chip text-xs">
              {f.label}
              <span className="tabular-nums opacity-70">{counts[f.id]}</span>
            </Link>
          ))}
        </nav>
        <form action="/admin" className="input-group w-full sm:w-72">
          <Search className="size-4 shrink-0 text-muted" aria-hidden />
          {filter !== "all" && <input type="hidden" name="f" value={filter} />}
          <input type="search" name="q" defaultValue={q} placeholder="Tìm tên bài, kênh, slug…" aria-label="Tìm bài học" />
        </form>
      </div>

      {groups.length ? (
        <div className="flex flex-col gap-3">
          {groups.map((g) => (
            <ChannelGroup key={g.name} g={g} free={free} />
          ))}
        </div>
      ) : (
        <div className="card empty">
          <span className="icon-bubble tint-muted">
            <ListVideo className="size-5" aria-hidden />
          </span>
          {lessons.length ? (
            <>
              <p>Không có bài nào khớp bộ lọc.</p>
              <Link href="/admin" className="btn btn-sm">
                Xoá bộ lọc
              </Link>
            </>
          ) : (
            <>
              <p>Chưa có bài học nào.</p>
              <Link href="/admin/new" className="btn btn-sm">
                <Plus className="size-4" /> Bài mới
              </Link>
            </>
          )}
        </div>
      )}
    </>
  );
}

export default function AdminPage(props: PageProps<"/admin">) {
  return (
    <main className="page page-narrow">
      <AdminNav />
      <Suspense fallback={<ListSkeleton thumb />}>
        <Dashboard searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
