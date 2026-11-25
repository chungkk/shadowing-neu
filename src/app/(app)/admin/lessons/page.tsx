import { Suspense } from "react";
import Link from "next/link";
import {
  ChevronDown,
  Circle,
  CircleCheck,
  ExternalLink,
  FolderKanban,
  LayoutList,
  ListVideo,
  Plus,
  Search,
  Sparkles,
  UserRound,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { fillLessonChannels } from "@/lib/channels";
import {
  adminListOwnLessons,
  LEVELS,
  listChannels,
  listLessons,
  type AdminOwnLessonRow,
  type Level,
} from "@/lib/db";
import { channelPath, lessonPath } from "@/lib/slug";
import LevelBadge from "@/components/LevelBadge";
import { ListSkeleton } from "@/components/Skeleton";
import { removeLesson, toggleLessonPublished } from "../actions";
import DeleteButton from "../DeleteButton";
import AdminPageHeader from "../_components/AdminPageHeader";
import KpiCard from "../_components/KpiCard";

const fmt = (n: number) => n.toLocaleString("vi-VN");
const fmtDur = (sec?: number) => {
  if (!sec || sec <= 0) return "";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
};

type Summary = ReturnType<typeof listLessons>[number];
type Filter = "all" | "published" | "draft" | "no_dict";
type ViewMode = "channel" | "table";
type TabMode = "site" | "own";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "published", label: "Đã đăng" },
  { id: "draft", label: "Nháp" },
  { id: "no_dict", label: "Tắt Dictation" },
];
const NO_CHANNEL = "Chưa rõ kênh";

function LessonRow({ l, showChannel = false }: { l: Summary; showChannel?: boolean }) {
  const dur = fmtDur(l.duration);
  return (
    <li className="flex flex-wrap items-center gap-3 px-3.5 py-2.5 transition-colors hover:bg-card-2/50 sm:px-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://i.ytimg.com/vi/${l.videoId}/default.jpg`}
        alt=""
        loading="lazy"
        className="h-11 w-[4.5rem] shrink-0 rounded-md bg-card-2 object-cover"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link href={`/admin/${l.id}`} className="truncate text-sm font-semibold text-foreground hover:text-sec-text" title={l.title}>
          {l.title}
        </Link>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
          <LevelBadge level={l.level} className="text-xs" />
          {showChannel && l.channel && <span className="max-w-36 truncate font-medium text-foreground/80">{l.channel}</span>}
          <span className="font-mono tabular-nums">{l.sentenceCount} câu</span>
          {dur && <span className="font-mono tabular-nums">· {dur}</span>}
          {l.dictation && <span className="badge badge-gem">Dictation</span>}
          <span aria-hidden>·</span>
          <span className="font-mono tabular-nums">{l.createdAt.slice(0, 10).split("-").reverse().join(".")}</span>
        </div>
      </div>
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

function byChannel(lessons: Summary[]): Group[] {
  const avatars = new Map(listChannels().flatMap((c) => (c.handle && c.avatar ? [[c.handle.toLowerCase(), c.avatar] as const] : [])));
  const map = new Map<string, Group>();
  for (const l of lessons) {
    const name = l.channel?.trim() || NO_CHANNEL;
    const g =
      map.get(name) ?? {
        name,
        url: l.channelUrl || null,
        avatar: avatars.get(l.channelUrl?.match(/\/(@[^/?#]+)/)?.[1]?.toLowerCase() ?? "") ?? null,
        lessons: [],
      };
    g.lessons.push(l);
    map.set(name, g);
  }
  return [...map.values()].sort(
    (a, b) => +(a.name === NO_CHANNEL) - +(b.name === NO_CHANNEL) || b.lessons.length - a.lessons.length || a.name.localeCompare(b.name, "de"),
  );
}

function ChannelGroup({ g }: { g: Group }) {
  const published = g.lessons.filter((l) => l.published).length;
  const drafts = g.lessons.length - published;
  const known = g.name !== NO_CHANNEL;
  return (
    <details open className="card group/ch overflow-hidden p-0">
      <summary className="flex cursor-pointer list-none items-center gap-3 border-line bg-card-2/50 px-3.5 py-2.5 group-open/ch:border-b sm:px-4">
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
          <p className="font-mono text-xs text-muted tabular-nums">
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
              <a
                href={g.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-icon size-8 rounded-lg text-muted hover:text-foreground"
                title="Kênh trên YouTube"
                aria-label={`${g.name} trên YouTube`}
              >
                <ExternalLink className="size-4" />
              </a>
            )}
          </div>
        )}
        <ChevronDown className="size-4 shrink-0 text-muted transition-transform group-open/ch:rotate-180 motion-reduce:transition-none" aria-hidden />
      </summary>
      <ul className="divide-y divide-line">
        {g.lessons.map((l) => (
          <LessonRow key={l.id} l={l} />
        ))}
      </ul>
    </details>
  );
}

function OwnLessonsList({ items }: { items: AdminOwnLessonRow[] }) {
  if (!items.length) {
    return (
      <div className="card empty">
        <span className="icon-bubble tint-muted">
          <UserRound className="size-5" aria-hidden />
        </span>
        <p>Chưa có bài học riêng nào do học viên tự tạo.</p>
      </div>
    );
  }
  return (
    <div className="card overflow-hidden p-0">
      <ul className="divide-y divide-line">
        {items.map((l) => (
          <li key={l.id} className="flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-card-2/50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://i.ytimg.com/vi/${l.videoId}/default.jpg`} alt="" loading="lazy" className="h-11 w-[4.5rem] shrink-0 rounded-md bg-card-2 object-cover" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="truncate text-sm font-semibold text-foreground">{l.title}</span>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                {l.ownerId && (
                  <Link href={`/admin/users/${l.ownerId}`} className="font-semibold text-link hover:underline">
                    {l.ownerName}
                  </Link>
                )}
                {l.ownerEmail && <span>({l.ownerEmail})</span>}
                <span aria-hidden>·</span>
                <span className="font-mono tabular-nums">{l.sentenceCount} câu</span>
                <span aria-hidden>·</span>
                <span className="font-mono tabular-nums">{l.createdAt.slice(0, 10).split("-").reverse().join(".")}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 max-sm:basis-full max-sm:justify-end">
              <Link href={lessonPath(l.slug)} className="btn btn-ghost btn-sm">
                Xem
              </Link>
              <DeleteButton
                action={removeLesson.bind(null, l.id)}
                confirmText={`Xoá bài riêng “${l.title}” của ${l.ownerName}?`}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

async function LessonsContent({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  fillLessonChannels();
  const sp = await searchParams;
  const tab: TabMode = sp.tab === "own" ? "own" : "site";
  const q = (typeof sp.q === "string" ? sp.q : "").trim();
  const filter = (FILTERS.some((f) => f.id === sp.f) ? sp.f : "all") as Filter;
  const lv = typeof sp.lv === "string" && (LEVELS as readonly string[]).includes(sp.lv) ? (sp.lv as Level) : null;
  const view: ViewMode = sp.view === "table" ? "table" : "channel";

  const lessons = listLessons({ includeDrafts: true });
  const ownLessons = adminListOwnLessons();

  const counts: Record<Filter, number> = {
    all: lessons.length,
    published: lessons.filter((l) => l.published).length,
    draft: lessons.filter((l) => !l.published).length,
    no_dict: lessons.filter((l) => !l.dictation).length,
  };
  const channelCount = byChannel(lessons).filter((g) => g.name !== NO_CHANNEL).length;

  const qNorm = q.toLowerCase();
  const shown = lessons.filter(
    (l) =>
      (filter === "all" || (filter === "published" ? l.published : filter === "draft" ? !l.published : !l.dictation)) &&
      (!lv || l.level === lv) &&
      (!qNorm || l.title.toLowerCase().includes(qNorm) || (l.channel?.toLowerCase().includes(qNorm) ?? false) || l.slug.includes(qNorm)),
  );
  const groups = byChannel(shown);

  const href = (over: { tab?: TabMode; f?: Filter; lv?: Level | null; view?: ViewMode; q?: string }) => {
    const p = new URLSearchParams();
    const t = over.tab ?? tab;
    if (t === "own") {
      p.set("tab", "own");
      return `/admin/lessons?${p.toString()}`;
    }
    const query = over.q !== undefined ? over.q : q;
    const f = over.f ?? filter;
    const level = over.lv !== undefined ? over.lv : lv;
    const v = over.view ?? view;
    if (query) p.set("q", query);
    if (f !== "all") p.set("f", f);
    if (level) p.set("lv", level);
    if (v !== "channel") p.set("view", v);
    const s = p.toString();
    return s ? `/admin/lessons?${s}` : "/admin/lessons";
  };

  return (
    <>
      <AdminPageHeader
        crumbs={[{ label: "Nội dung học tập" }, { label: "Bài học Tiếng Đức" }]}
        title="Bài học Tiếng Đức"
        count={lessons.length}
        description="Quản lý thư viện video Shadowing & Dictation của HalloVN theo kênh YouTube và trình độ A1–C2."
        actions={
          <Link href="/admin/new" className="btn btn-primary max-sm:w-full">
            <Plus className="size-4" aria-hidden /> Bài học mới
          </Link>
        }
      />

      {/* 4 KPI chuẩn hoá */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard tone="de" label="Đã đăng" value={counts.published} sub={`${fmt(channelCount)} kênh YouTube`} />
        <KpiCard tone="laixe" label="Bản nháp" value={counts.draft} sub="Ẩn với người học" />
        <KpiCard tone="gem" label="Bật Dictation" value={lessons.length - counts.no_dict} sub="Mọi bài đã đăng đều mở" />
        <KpiCard
          tone="ink"
          label="Bài riêng học viên"
          value={ownLessons.length}
          sub="Tự tạo từ video YouTube"
          icon={<Sparkles className="size-4" aria-hidden />}
          href={href({ tab: "own" })}
        />
      </div>

      {/* Chuyển tab: Bài của HalloVN vs Bài riêng học viên */}
      <div className="tabs-line">
        <Link href={href({ tab: "site" })} className="tab" aria-current={tab === "site" ? "page" : undefined}>
          <ListVideo className="size-4" aria-hidden />
          Bài của HalloVN
          <span className="font-mono text-xs opacity-70 tabular-nums">{lessons.length}</span>
        </Link>
        <Link href={href({ tab: "own" })} className="tab" aria-current={tab === "own" ? "page" : undefined}>
          <UserRound className="size-4" aria-hidden />
          Bài riêng học viên
          <span className="font-mono text-xs opacity-70 tabular-nums">{ownLessons.length}</span>
        </Link>
      </div>

      {tab === "own" ? (
        <OwnLessonsList items={ownLessons} />
      ) : (
        <>
          {/* Thanh lọc + tìm kiếm + đổi chế độ xem */}
          <div className="card flex flex-col gap-3 p-3.5">
            <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
              <nav aria-label="Lọc trạng thái" className="scroll-row flex gap-1.5">
                {FILTERS.map((f) => (
                  <Link key={f.id} href={href({ f: f.id })} aria-current={filter === f.id ? "page" : undefined} className="chip text-xs">
                    {f.label}
                    <span className="font-mono tabular-nums opacity-70">{counts[f.id]}</span>
                  </Link>
                ))}
              </nav>
              <div className="flex flex-wrap items-center gap-2">
                <form action="/admin/lessons" className="input-group min-w-0 flex-1 sm:w-64">
                  <Search className="size-4 shrink-0 text-muted" aria-hidden />
                  {filter !== "all" && <input type="hidden" name="f" value={filter} />}
                  {lv && <input type="hidden" name="lv" value={lv} />}
                  {view !== "channel" && <input type="hidden" name="view" value={view} />}
                  <input type="search" name="q" defaultValue={q} placeholder="Tìm tên bài, kênh, slug…" aria-label="Tìm bài học" />
                </form>
                <div className="inline-flex rounded-lg border border-line bg-sidebar p-0.5" role="group" aria-label="Chế độ hiển thị">
                  <Link
                    href={href({ view: "channel" })}
                    aria-current={view === "channel" ? "true" : undefined}
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                      view === "channel" ? "bg-card-2 text-foreground" : "text-muted hover:text-foreground"
                    }`}
                    title="Nhóm theo kênh YouTube"
                  >
                    <FolderKanban className="size-3.5" aria-hidden /> Theo kênh
                  </Link>
                  <Link
                    href={href({ view: "table" })}
                    aria-current={view === "table" ? "true" : undefined}
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                      view === "table" ? "bg-card-2 text-foreground" : "text-muted hover:text-foreground"
                    }`}
                    title="Danh sách phẳng"
                  >
                    <LayoutList className="size-3.5" aria-hidden /> Danh sách
                  </Link>
                </div>
              </div>
            </div>
            {/* Hàng lọc theo trình độ A1-C2 */}
            <div className="flex flex-wrap items-center gap-1.5 border-t border-line pt-2.5 text-xs">
              <span className="mr-1 font-medium text-muted">Trình độ:</span>
              <Link href={href({ lv: null })} aria-current={!lv ? "true" : undefined} className="chip px-2.5 py-1 text-xs">
                Tất cả
              </Link>
              {LEVELS.map((level) => (
                <Link key={level} href={href({ lv: level })} aria-current={lv === level ? "true" : undefined} className="chip px-2.5 py-1 text-xs">
                  {level}
                </Link>
              ))}
              {(q || filter !== "all" || lv) && (
                <Link href="/admin/lessons" className="ml-auto text-xs font-semibold text-link hover:underline">
                  Xoá bộ lọc ({shown.length}/{lessons.length})
                </Link>
              )}
            </div>
          </div>

          {shown.length ? (
            view === "channel" ? (
              <div className="flex flex-col gap-3">
                {groups.map((g) => (
                  <ChannelGroup key={g.name} g={g} />
                ))}
              </div>
            ) : (
              <div className="card overflow-hidden p-0">
                <ul className="divide-y divide-line">
                  {shown.map((l) => (
                    <LessonRow key={l.id} l={l} showChannel />
                  ))}
                </ul>
              </div>
            )
          ) : (
            <div className="card empty">
              <span className="icon-bubble tint-muted">
                <ListVideo className="size-5" aria-hidden />
              </span>
              {lessons.length ? (
                <>
                  <p>Không có bài nào khớp bộ lọc.</p>
                  <Link href="/admin/lessons" className="btn btn-sm">
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
      )}
    </>
  );
}

export default function AdminLessonsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={<ListSkeleton thumb />}>
      <LessonsContent searchParams={searchParams} />
    </Suspense>
  );
}
