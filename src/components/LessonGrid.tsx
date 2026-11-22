"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock,
  ExternalLink,
  Keyboard,
  Search,
  X,
} from "lucide-react";
import {
  ChristmasChatIcon as MessageSquare,
  ChristmasCocoaIcon as Coffee,
  ChristmasGrammarIcon as GraduationCap,
  ChristmasLockIcon as Lock,
  ChristmasMicIcon as Mic,
  ChristmasNewsIcon as Newspaper,
  ChristmasOrnamentIcon as Film,
  ChristmasStarIcon as Sparkles,
  ChristmasWorkIcon as Briefcase,
} from "./FestiveIcons";
import type { ComponentType } from "react";
import { FREE_PICKS, type LessonAccess, type LockInfo } from "@/lib/lesson-lock";
import { channelPath, lessonPath } from "@/lib/slug";

const levelCatalogPath = (lv: string) => `/tieng-duc/trinh-do/${lv.toLowerCase()}`;
import LevelBadge from "./LevelBadge";
import Mascot from "./Mascot";
import { Gem } from "./PointsBadge";
import UnlockDialog from "./UnlockDialog";

type Item = {
  id: number;
  title: string;
  slug: string;
  videoId: string;
  level: string;
  description: string;
  sentences: number;
  duration: number;
  dictation: boolean;
  percent: number; // % đã học — 0: chưa học
  isNew: boolean;
  access: LessonAccess;
  channel: string | null; // tên kênh YouTube (null / rỗng = chưa biết)
  channelUrl: string | null;
  channelAvatar: string | null; // ảnh kênh — chỉ có với kênh admin đã lưu
};

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

const LEVEL_META: Record<(typeof LEVELS)[number], { name: string; desc: string; tone: string; bar: string }> = {
  A1: { name: "Nhập môn", desc: "Câu ngắn, chậm rõ", tone: "text-ok-text", bar: "bg-ok" },
  A2: { name: "Cơ bản", desc: "Sinh hoạt hằng ngày", tone: "text-ok-text", bar: "bg-ok" },
  B1: { name: "Trung cấp", desc: "Giao tiếp tự tin", tone: "text-link", bar: "bg-link" },
  B2: { name: "Thành thạo", desc: "Công việc & xã hội", tone: "text-link", bar: "bg-link" },
  C1: { name: "Nâng cao", desc: "Tốc độ bản xứ", tone: "text-grape-text", bar: "bg-grape" },
  C2: { name: "Tinh thông", desc: "Chuyên sâu & học thuật", tone: "text-grape-text", bar: "bg-grape" },
};

type TopicDef = {
  id: string;
  label: string;
  sub: string;
  icon: ComponentType<{ className?: string }>;
  tint: string;
  keywords: RegExp;
};

const TOPICS: TopicDef[] = [
  {
    id: "everyday",
    label: "Đời sống hằng ngày",
    sub: "Siêu thị, nhà ở, cuộc sống ở Đức",
    icon: Coffee,
    tint: "tint-ok",
    keywords: /alltag|supermarkt|kaffee|wohn|einkauf|leben|küche|essen|tofu|markt|morgen|tag|đời sống|hằng ngày|siêu thị|mua sắm/i,
  },
  {
    id: "conversation",
    label: "Hội thoại & Giao tiếp",
    sub: "Đối thoại tự nhiên, phản xạ nhanh",
    icon: MessageSquare,
    tint: "tint-link",
    keywords: /dialog|gespräch|sprechen|redemittel|smalltalk|hội thoại|giao tiếp|interview|phỏng vấn|nói chuyện|easy german/i,
  },
  {
    id: "work",
    label: "Công việc & Sự nghiệp",
    sub: "Bewerbung, văn phòng, nghề nghiệp",
    icon: Briefcase,
    tint: "tint-gold",
    keywords: /arbeit|beruf|job|büro|bewerbung|karriere|gehalt|chef|pflege|công việc|nghề|lương|sự nghiệp|wirtschaft/i,
  },
  {
    id: "news",
    label: "Tin tức Đức",
    sub: "Thời sự, xã hội, kinh tế Đức",
    icon: Newspaper,
    tint: "tint-coral",
    keywords: /nachrichten|tagesschau|ard|zdf|wdr|dw|politik|aktuell|marktcheck|tin tức|thời sự|đức|deutschland/i,
  },
  {
    id: "culture",
    label: "Văn hóa & Giải trí",
    sub: "Phim ảnh, du lịch, phong tục Đức",
    icon: Film,
    tint: "tint-grape",
    keywords: /kultur|film|musik|reise|tradition|fest|geschichte|story|văn hóa|phim|du lịch|giải trí|weihnacht/i,
  },
  {
    id: "education",
    label: "Giáo dục & Học tập",
    sub: "Ngữ pháp, đại học, mẹo học tiếng",
    icon: GraduationCap,
    tint: "tint-link",
    keywords: /lernen|schule|uni|studium|grammatik|wortschatz|prüfung|goethe|telc|kurs|học|kiến thức|khoa học|wissen/i,
  },
];

function matchesTopic(l: Item, topic: TopicDef) {
  const hay = `${l.title} ${l.description} ${l.channel ?? ""}`;
  return topic.keywords.test(hay);
}

/** Tiêu đề mục: chữ đậm, số lượng nhạt bên cạnh, nội dung phụ (vd. nút lọc) bên phải */
export function SectionHeader({
  id,
  title,
  count,
  sub,
  children,
}: {
  id?: string;
  title: string;
  count?: number;
  sub?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div className="flex flex-col gap-0.5">
        <h2 id={id} className="section-title flex items-center gap-2">
          {title}
          {count !== undefined && <span className="badge badge-muted font-mono tabular-nums">{count}</span>}
        </h2>
        {sub && <p className="text-sm text-muted">{sub}</p>}
      </div>
      {children && <div className="min-w-0 max-sm:w-full sm:ml-auto">{children}</div>}
    </div>
  );
}

/** Giây → "04:05" (video trên 1 giờ: "1:04:05") */
function formatDuration(total: number) {
  const s = Math.round(total);
  const mmss = `${String(Math.floor(s / 60) % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  return s >= 3600 ? `${Math.floor(s / 3600)}:${mmss}` : mmss;
}

/** onLocked: bấm thẻ bài đang khoá → mở popup mở khoá tại chỗ (mở tab mới / Ctrl+bấm → vẫn sang trang bài) */
function LessonCard({ l, onLocked, className = "" }: { l: Item; onLocked?: (l: Item) => void; className?: string }) {
  const locked = l.access === "locked";
  return (
    <Link
      href={lessonPath(l.slug)}
      onClick={(e) => {
        if (!locked || !onLocked || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        onLocked(l);
      }}
      className={`group card card-link flex flex-col overflow-hidden p-0 ${className}`}
    >
      <div className="relative aspect-video overflow-hidden bg-sidebar">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://i.ytimg.com/vi/${l.videoId}/hqdefault.jpg`}
          alt=""
          loading="lazy"
          className={`size-full object-cover transition duration-300 group-hover:scale-[1.03] motion-reduce:transition-none ${locked ? "opacity-75 saturate-75" : ""}`}
        />
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          {l.access === "free" && (
            <span className="badge border border-ok/30 bg-sidebar/92 px-2 py-0.5 text-[11px] font-semibold text-ok-text">
              Miễn phí
            </span>
          )}
          {locked && (
            <span className="badge border border-gold/30 bg-sidebar/92 px-2 py-0.5 text-[11px] font-semibold text-amber">
              <Lock className="size-2.5" aria-hidden /> Premium
            </span>
          )}
          {l.isNew && (
            <span className="badge bg-gold px-1.5 py-0.5 text-[11px] font-bold text-[#0b0f14]">
              Mới
            </span>
          )}
        </div>
        <LevelBadge level={l.level} className="absolute top-2 right-2 bg-sidebar/92" />
        {locked && (
          <span className="absolute inset-0 flex items-center justify-center bg-background/25">
            <span className="flex size-9 items-center justify-center rounded-full border border-line bg-sidebar/95 text-amber">
              <Lock className="size-4" />
              <span className="sr-only">Khoá</span>
            </span>
          </span>
        )}
        {l.duration > 0 && (
          <span className="pill absolute right-2 bottom-2 border border-white/10 bg-background/85 px-2 py-0.5 font-mono text-[11px] text-foreground tabular-nums">
            <Clock className="size-2.5 text-muted" aria-hidden /> {formatDuration(l.duration)}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <div className="flex flex-col gap-1">
          <h3 className="line-clamp-2 min-h-[2.6em] text-sm leading-snug font-semibold text-foreground transition-colors group-hover:text-accent-text">
            {l.title}
          </h3>
          {l.description && <p className="line-clamp-1 text-xs leading-relaxed text-muted">{l.description}</p>}
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-muted">
            <span className="inline-flex items-center gap-1 rounded-md border border-line bg-sidebar px-1.5 py-0.5 text-foreground/85">
              <Mic className="size-3 text-accent-text" aria-hidden /> Shadowing
            </span>
            {l.dictation && (
              <span className="inline-flex items-center gap-1 rounded-md border border-line bg-sidebar px-1.5 py-0.5 text-foreground/85">
                <Keyboard className="size-3 text-link" aria-hidden /> Chính tả
              </span>
            )}
            <span className="ml-auto font-mono text-[11px] text-muted tabular-nums">{l.sentences} câu</span>
          </div>

          {l.percent >= 100 ? (
            <p className="flex items-center gap-1 text-xs font-semibold text-ok-text">
              <CircleCheck className="size-3.5" aria-hidden /> Đã hoàn thành
            </p>
          ) : (
            l.percent > 0 && (
              <div className="flex items-center gap-2 text-xs font-semibold text-accent-text tabular-nums">
                <div className="progress h-1.5 flex-1">
                  <div className="progress-bar" style={{ width: `${l.percent}%` }} />
                </div>
                {l.percent}%
              </div>
            )
          )}
        </div>
      </div>
    </Link>
  );
}

/** Dòng giải thích khoá bài dưới tiêu đề mục (admin bật khoá bài học) */
function LockNote({ lock, admin }: { lock: LockInfo; admin?: boolean }) {
  const price = (
    <span className="inline-flex items-center gap-1 font-bold text-gem">
      <Gem className="size-4" /> {lock.price.toLocaleString("vi-VN")}
    </span>
  );
  return (
    <p className="alert alert-info flex-wrap items-center gap-x-1">
      <Lock className="size-4 shrink-0 text-gem" />
      {admin ? (
        <>Khoá bài đang bật — nhãn bên dưới là những gì khách thấy. Admin vẫn mở được mọi bài.</>
      ) : !lock.loggedIn ? (
        <>Khách học thử được các bài “Miễn phí” — đăng nhập để tự chọn thêm {FREE_PICKS} bài.</>
      ) : lock.picksLeft > 0 ? (
        <>
          Bạn còn <b className="text-foreground">{lock.picksLeft}</b> lượt chọn bài miễn phí — bấm vào bài có ổ khoá để mở. Sau đó mỗi bài <span className="whitespace-nowrap">{price}.</span>
        </>
      ) : (
        <>Mở thêm bài: mỗi bài {price} (bạn có {lock.points.toLocaleString("vi-VN")}).</>
      )}
    </p>
  );
}

type Group = { key: string; name: string; url: string | null; avatar: string | null; lessons: Item[] };
const OTHER = "Kênh khác";

/** Chia bài theo kênh YouTube: kênh nhiều bài trước (bằng nhau thì theo tên), bài chưa biết kênh gom vào "Kênh khác" ở cuối. Thứ tự bài trong kênh giữ nguyên */
function byChannel(lessons: Item[]): Group[] {
  const map = new Map<string, Group>();
  for (const l of lessons) {
    const name = l.channel?.trim() || OTHER;
    const g = map.get(name) ?? { key: name, name, url: name === OTHER ? null : l.channelUrl, avatar: name === OTHER ? null : l.channelAvatar, lessons: [] };
    g.lessons.push(l);
    map.set(name, g);
  }
  return [...map.values()].sort(
    (a, b) => +(a.name === OTHER) - +(b.name === OTHER) || b.lessons.length - a.lessons.length || a.name.localeCompare(b.name, "de"),
  );
}

const anchor = (name: string) => channelPath(name).replace("/tieng-duc/kenh/", "kenh-");

function ChannelAvatar({ g }: { g: Group }) {
  if (g.avatar)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={g.avatar} alt="" loading="lazy" className="size-7 shrink-0 rounded-full border border-line bg-card-2 object-cover" />;
  return (
    <span className="icon-bubble tint-muted size-7 shrink-0 rounded-full font-display text-xs font-extrabold" aria-hidden>
      {g.name === OTHER ? "?" : g.name.charAt(0).toUpperCase()}
    </span>
  );
}

/** Tiêu đề kênh: link tới trang kênh riêng; "Kênh khác" (chưa biết kênh) không có trang → chữ thường */
function ChannelTitle({ href, className, title, children }: { href: string | null; className: string; title: string; children: React.ReactNode }) {
  if (!href) return <div className={className}>{children}</div>;
  return (
    <Link href={href} className={className} title={title}>
      {children}
    </Link>
  );
}

/** 1 kênh: tiêu đề bấm được để mở toàn bộ danh sách bài + 1 hàng thẻ vuốt / cuộn ngang (có nút mũi tên ‹ › trên màn hình rộng) */
function ChannelSection({ g, onLocked, href }: { g: Group; onLocked?: (l: Item) => void; href: string | null }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [nav, setNav] = useState({ left: false, right: false });

  const syncNav = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    const left = el.scrollLeft > 4;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setNav((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
  }, []);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const ro = new ResizeObserver(syncNav);
    ro.observe(el);
    return () => ro.disconnect();
  }, [syncNav, g.lessons.length]);

  const scrollByDir = (dir: -1 | 1) => {
    const el = rowRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(280, Math.round(el.clientWidth * 0.82)), behavior: "smooth" });
  };

  const canScroll = nav.left || nav.right;

  return (
    <section id={anchor(g.key)} aria-labelledby={`${anchor(g.key)}-h`} className="flex scroll-mt-20 flex-col gap-3">
      <div className="flex items-center gap-2">
        <ChannelTitle
          href={href}
          className="group/ch flex min-w-0 items-center gap-2.5 rounded-lg py-0.5 pr-1 text-left transition-colors hover:text-accent-text"
          title={`Xem tất cả ${g.lessons.length} bài của ${g.name}`}
        >
          <ChannelAvatar g={g} />
          <h3 id={`${anchor(g.key)}-h`} className="min-w-0 truncate font-display text-base font-bold tracking-[-0.015em]">
            {g.name}
          </h3>
          <span className="badge badge-muted shrink-0 font-mono tabular-nums">{g.lessons.length} bài</span>
          {href && (
            <ChevronRight
              className="size-4 shrink-0 text-muted transition-transform duration-150 group-hover/ch:translate-x-0.5 group-hover/ch:text-accent-text motion-reduce:transition-none"
              aria-hidden
            />
          )}
        </ChannelTitle>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {g.url && (
            <a href={g.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-ghost text-muted max-sm:px-2" title={`Kênh ${g.name} trên YouTube`}>
              <ExternalLink className="size-3.5" /> <span className="max-sm:sr-only">YouTube</span>
            </a>
          )}
          {canScroll && (
            <div className="hidden items-center gap-1 sm:flex">
              <button
                type="button"
                onClick={() => scrollByDir(-1)}
                disabled={!nav.left}
                aria-label={`Cuộn trái ${g.name}`}
                className="btn-icon size-8 rounded-lg border border-line bg-card disabled:opacity-35"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollByDir(1)}
                disabled={!nav.right}
                aria-label={`Cuộn phải ${g.name}`}
                className="btn-icon size-8 rounded-lg border border-line bg-card disabled:opacity-35"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          )}
        </div>
      </div>
      {/* 1 hàng vuốt ngang trên cả điện thoại và máy tính, thẻ tiếp theo ló ra ở mép phải */}
      <div
        ref={rowRef}
        onScroll={syncNav}
        className="scroll-row flex snap-x snap-mandatory gap-3.5 pt-0.5 pb-1.5 max-sm:-mx-4 max-sm:scroll-px-4 max-sm:px-4"
      >
        {g.lessons.map((l) => (
          <LessonCard
            key={l.id}
            l={l}
            onLocked={onLocked}
            className={`snap-start ${g.lessons.length > 1 ? "w-[78vw] max-w-[272px] sm:w-[256px] lg:w-[268px]" : "w-full sm:w-[268px]"}`}
          />
        ))}
      </div>
    </section>
  );
}

type ExtraFilter = "all" | "free" | "dictation";

/**
 * Thư viện bài học chia theo kênh / chủ đề, lọc theo cấp độ CEFR (lưu trên URL: ?level=B1), chủ đề, miễn phí và chính tả.
 * `showExplore`: bật 2 khu vực Trình độ CEFR (A1–C2) và Khám phá theo chủ đề (6 chủ đề) ngay trên thư viện ở /tieng-duc.
 * `channel`: đang ở trang của 1 kênh → bỏ nav kênh, hiện lưới toàn bộ bài.
 */
export default function LessonGrid({
  lessons,
  lock,
  admin,
  channel,
  showExplore = false,
}: {
  lessons: Item[];
  lock?: LockInfo;
  admin?: boolean;
  channel?: string;
  showExplore?: boolean;
}) {
  const searchParams = useSearchParams();
  const [opening, setOpening] = useState<Item | null>(null);
  const [query, setQuery] = useState("");
  const [topicId, setTopicId] = useState<string | null>(null);
  const [extra, setExtra] = useState<ExtraFilter>("all");

  useLayoutEffect(() => () => setOpening(null), []);

  if (!lessons.length)
    return (
      <div className="card empty">
        <Mascot className="size-20 opacity-90" />
        <p className="text-base font-semibold text-foreground">Chưa có bài học nào.</p>
        <p className="text-sm text-muted">Bài mới sẽ hiện ở đây ngay khi được đăng.</p>
      </div>
    );

  const levelCounts = new Map<string, number>();
  for (const lv of LEVELS) levelCounts.set(lv, 0);
  for (const l of lessons) levelCounts.set(l.level, (levelCounts.get(l.level) ?? 0) + 1);

  const levels = LEVELS.map((lv) => ({ level: lv, count: levelCounts.get(lv) ?? 0 })).filter((g) => g.count);
  const param = searchParams.get("level");
  const level = levels.some((g) => g.level === param) ? param : null;
  const allGroups = byChannel(lessons);

  const setLevel = (lv: string | null) => {
    if (lv === level) return;
    const params = new URLSearchParams(searchParams.toString());
    if (lv) params.set("level", lv);
    else params.delete("level");
    const q = params.toString();
    window.history.pushState(null, "", q ? `?${q}` : window.location.pathname);
  };

  const activeTopic = TOPICS.find((t) => t.id === topicId) ?? null;

  /** Link trang kênh, giữ trình độ đang lọc */
  const channelHref = (g: Group) => (g.name === OTHER ? null : `${channelPath(g.key)}${level ? `?level=${level}` : ""}`);

  const qNorm = query.trim().toLowerCase();
  const byLevel = level ? lessons.filter((l) => l.level === level) : lessons;
  const byTopic = activeTopic ? byLevel.filter((l) => matchesTopic(l, activeTopic)) : byLevel;
  const byExtra =
    extra === "free"
      ? byTopic.filter((l) => l.access !== "locked")
      : extra === "dictation"
        ? byTopic.filter((l) => l.dictation)
        : byTopic;
  const shown = qNorm
    ? byExtra.filter(
      (l) =>
        l.title.toLowerCase().includes(qNorm) ||
        l.description.toLowerCase().includes(qNorm) ||
        (l.channel?.toLowerCase().includes(qNorm) ?? false),
    )
    : byExtra;
  const groups = byChannel(shown);
  const flat = !!channel || (allGroups.length === 1 && allGroups[0].name === OTHER) || !!activeTopic || !!qNorm;
  const onLocked = lock?.enabled && !admin ? setOpening : undefined;

  const hasFree = lessons.some((l) => l.access === "free" || l.access === "locked");
  const hasDictation = lessons.some((l) => l.dictation);
  const hasActiveFilters = !!level || !!activeTopic || extra !== "all" || !!qNorm;

  const toggleTopic = (id: string) => {
    setTopicId((prev) => (prev === id ? null : id));
    const el = document.getElementById("lessons");
    if (el && topicId !== id) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const chip = (lv: string | null, count: number) => (
    <button key={lv ?? "all"} type="button" onClick={() => setLevel(lv)} aria-pressed={level === lv} className="chip text-xs">
      {lv ?? "Tất cả"}
      <span className={`font-mono tabular-nums ${level === lv ? "opacity-80" : "text-muted"}`}>{count}</span>
    </button>
  );

  return (
    <div className="flex flex-col gap-9 md:gap-11">
      {/* ── Learning Levels (A1 – C2) ── */}
      {showExplore && (
        <section aria-labelledby="sec-levels" className="flex flex-col gap-4">
          <SectionHeader
            id="sec-levels"
            title="Trình độ học (CEFR)"
            sub="Chọn cấp độ phù hợp từ nhập môn A1 đến nâng cao C2"
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {LEVELS.map((lv) => {
              const meta = LEVEL_META[lv];
              const count = levelCounts.get(lv) ?? 0;
              const inner = (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <LevelBadge level={lv} />
                    <span className="font-mono text-xs font-semibold text-muted tabular-nums">
                      {count > 0 ? `${count} bài` : "Sắp có"}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-col gap-0.5">
                    <span className="text-sm font-bold text-foreground">{meta.name}</span>
                    <span className="text-xs leading-snug text-muted">{meta.desc}</span>
                  </div>
                  <span className={`mt-auto h-1 w-8 rounded-full ${count > 0 ? meta.bar : "bg-line"}`} aria-hidden />
                </>
              );
              if (count > 0) {
                return (
                  <Link
                    key={lv}
                    href={levelCatalogPath(lv)}
                    className="group card card-link flex flex-col gap-2 p-4"
                  >
                    {inner}
                  </Link>
                );
              }
              return (
                <div
                  key={lv}
                  className="card flex flex-col gap-2 p-4 opacity-60"
                  aria-disabled="true"
                >
                  {inner}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Explore by Topic (6 chủ đề) ── */}
      {showExplore && (
        <section aria-labelledby="sec-topics" className="flex flex-col gap-4">
          <SectionHeader
            id="sec-topics"
            title="Khám phá theo chủ đề"
            sub="Lọc nhanh video bản xứ theo tình huống bạn quan tâm"
          >
            {activeTopic && (
              <button
                type="button"
                onClick={() => setTopicId(null)}
                className="btn btn-sm btn-ghost text-link"
              >
                <X className="size-3.5" /> Bỏ lọc chủ đề
              </button>
            )}
          </SectionHeader>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TOPICS.map((t) => {
              const count = lessons.filter((l) => matchesTopic(l, t)).length;
              const active = topicId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTopic(t.id)}
                  aria-pressed={active}
                  className={`group card card-link flex cursor-pointer items-center gap-3.5 p-4 text-left ${active ? "border-accent bg-accent-soft/45" : ""
                    }`}
                >
                  <span className={`icon-bubble size-10 shrink-0 ${t.tint}`}>
                    <t.icon className="size-5" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-bold text-foreground">{t.label}</span>
                      {count > 0 && (
                        <span className="badge badge-muted shrink-0 font-mono tabular-nums">{count}</span>
                      )}
                    </span>
                    <span className="line-clamp-1 text-xs text-muted">{t.sub}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Video Library ── */}
      <section id="lessons" data-sec="de" className="flex scroll-mt-20 flex-col gap-4 sm:gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeader
            title={channel ? `Bài học từ ${channel}` : "Thư viện video bài học"}
            count={shown.length}
          />
          <label className="input-group w-full sm:w-72">
            <Search className="size-4 shrink-0 text-muted" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={channel ? "Tìm bài học…" : "Tìm bài học hoặc kênh…"}
              aria-label={channel ? "Tìm bài học" : "Tìm bài học hoặc kênh"}
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Xóa từ khóa" className="text-muted hover:text-foreground">
                <X className="size-3.5" />
              </button>
            )}
          </label>
        </div>

        {/* Bộ lọc trình độ + tính năng (Miễn phí / Chính tả / Chủ đề) */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          {levels.length > 1 && (
            <div className="scroll-row flex gap-2 max-sm:-mx-4 max-sm:px-4 sm:flex-wrap">
              {chip(null, lessons.length)}
              {levels.map((g) => chip(g.level, g.count))}
            </div>
          )}

          <div className="scroll-row flex items-center gap-2 max-sm:-mx-4 max-sm:px-4 sm:flex-wrap">
            {hasFree && (
              <button
                type="button"
                onClick={() => setExtra((e) => (e === "free" ? "all" : "free"))}
                aria-pressed={extra === "free"}
                className="chip text-xs"
              >
                <Sparkles className="size-3.5" aria-hidden /> Miễn phí
              </button>
            )}
            {hasDictation && (
              <button
                type="button"
                onClick={() => setExtra((e) => (e === "dictation" ? "all" : "dictation"))}
                aria-pressed={extra === "dictation"}
                className="chip text-xs"
              >
                <Keyboard className="size-3.5" aria-hidden /> Có chính tả
              </button>
            )}
            {activeTopic && (
              <button
                type="button"
                onClick={() => setTopicId(null)}
                className="chip chip-on text-xs"
              >
                {activeTopic.label} <X className="size-3" aria-hidden />
              </button>
            )}
          </div>
        </div>

        {lock?.enabled && <LockNote lock={lock} admin={admin} />}

        {!shown.length ? (
          <div className="card empty">
            <p className="font-semibold text-foreground">Không tìm thấy bài học phù hợp</p>
            <p className="text-sm text-muted">
              {activeTopic
                ? `Hiện chưa có bài học khớp chủ đề “${activeTopic.label}” với bộ lọc đang chọn.`
                : "Thử từ khóa khác hoặc bỏ bộ lọc đang chọn."}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => {
                  setQuery("");
                  setLevel(null);
                  setTopicId(null);
                  setExtra("all");
                }}
              >
                Xem tất cả bài học
              </button>
            )}
          </div>
        ) : flat ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {shown.map((l) => (
              <LessonCard key={l.id} l={l} onLocked={onLocked} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-7 sm:gap-8">
            {groups.map((g) => (
              <ChannelSection key={`${level}-${extra}-${g.key}`} g={g} onLocked={onLocked} href={channelHref(g)} />
            ))}
          </div>
        )}
        {opening && lock && <UnlockDialog lesson={opening} lock={lock} onClose={() => setOpening(null)} />}
      </section>
    </div>
  );
}
