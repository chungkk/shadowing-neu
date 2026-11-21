"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, CircleCheck, Clock, ExternalLink, Lock, Search, X } from "lucide-react";
import { FREE_PICKS, type LessonAccess, type LockInfo } from "@/lib/lesson-lock";
import LevelBadge from "./LevelBadge";
import Mascot from "./Mascot";
import { Gem } from "./PointsBadge";
import UnlockDialog from "./UnlockDialog";
import { channelPath, lessonPath } from "@/lib/slug";

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

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

/** Tiêu đề mục: chữ đậm, số lượng nhạt bên cạnh, nội dung phụ (vd. nút lọc) bên phải */
export function SectionHeader({ title, count, children }: { title: string; count?: number; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <h2 className="section-title flex items-center gap-2">
        {title}
        {count !== undefined && <span className="badge badge-muted tabular-nums">{count}</span>}
      </h2>
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
  return (
    <Link
      href={lessonPath(l.slug)}
      onClick={(e) => {
        if (l.access !== "locked" || !onLocked || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        onLocked(l);
      }}
      className={`group card card-link flex flex-col overflow-hidden p-0 ${className}`}
    >
      <div className="relative aspect-video overflow-hidden bg-card-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://i.ytimg.com/vi/${l.videoId}/hqdefault.jpg`}
          alt=""
          loading="lazy"
          className={`size-full object-cover transition duration-300 group-hover:scale-[1.03] motion-reduce:transition-none ${l.access === "locked" ? "opacity-75 saturate-50" : ""}`}
        />
        {l.access === "free" && <span className="badge absolute top-1.5 left-1.5 border border-line bg-card/95 px-1.5 py-0.5 text-[11px] text-ok-text">Miễn phí</span>}
        <LevelBadge level={l.level} className="absolute top-1.5 right-1.5" />
        {l.access === "locked" && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/15">
            <span className="flex size-8 items-center justify-center rounded-full border border-line bg-card/95 text-foreground shadow-sm">
              <Lock className="size-3.5" />
              <span className="sr-only">Khoá</span>
            </span>
          </span>
        )}
        {l.isNew && <span className="badge absolute bottom-1.5 left-1.5 bg-gold px-1.5 py-0.5 text-[11px] text-[#0f172a]">Mới</span>}
        {l.duration > 0 && (
          <span className="pill absolute right-1.5 bottom-1.5 bg-black/75 px-1.5 py-0.5 text-[11px] text-white tabular-nums">
            <Clock className="size-2.5" /> {formatDuration(l.duration)}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <h3 className="line-clamp-2 min-h-[2.45em] text-[13px] leading-snug font-semibold text-foreground transition-colors group-hover:text-accent-text">{l.title}</h3>
        {l.description && <p className="line-clamp-1 text-[11px] leading-relaxed text-muted">{l.description}</p>}
        <div className="mt-auto flex flex-col gap-1.5 pt-1">
          <p className="truncate text-[11px] text-muted">
            Shadowing{l.dictation && " · Chính tả"} · {l.sentences} câu
          </p>
          {l.percent >= 100 ? (
            <p className="flex items-center gap-1 text-[11px] font-semibold text-ok-text">
              <CircleCheck className="size-3" /> Đã hoàn thành
            </p>
          ) : (
            l.percent > 0 && (
              <div className="flex items-center gap-2 text-[11px] font-semibold text-sec-text tabular-nums">
                <div className="progress h-1 flex-1">
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
    el.scrollBy({ left: dir * Math.max(260, Math.round(el.clientWidth * 0.82)), behavior: "smooth" });
  };

  const canScroll = nav.left || nav.right;

  return (
    <section id={anchor(g.key)} aria-labelledby={`${anchor(g.key)}-h`} className="flex scroll-mt-20 flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <ChannelTitle
          href={href}
          className="group/ch flex min-w-0 items-center gap-2 rounded-lg py-0.5 pr-1 text-left transition-colors hover:text-accent-text"
          title={`Xem tất cả ${g.lessons.length} bài của ${g.name}`}
        >
          <ChannelAvatar g={g} />
          <h3 id={`${anchor(g.key)}-h`} className="min-w-0 truncate font-display text-base font-bold tracking-[-0.015em]">
            {g.name}
          </h3>
          <span className="badge badge-muted shrink-0 tabular-nums">{g.lessons.length} bài</span>
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
        className="scroll-row flex snap-x snap-mandatory gap-3 pt-0.5 pb-1.5 max-sm:-mx-4 max-sm:scroll-px-4 max-sm:px-4"
      >
        {g.lessons.map((l) => (
          <LessonCard
            key={l.id}
            l={l}
            onLocked={onLocked}
            className={`snap-start ${g.lessons.length > 1 ? "w-[72vw] max-w-[248px] sm:w-[232px] lg:w-[244px]" : "w-full sm:w-[244px]"}`}
          />
        ))}
      </div>
    </section>
  );
}

/**
 * Thư viện bài học chia theo kênh / chủ đề, lọc theo cấp độ (lưu trên URL: ?level=B1).
 * Mỗi kênh hiển thị gọn 1 hàng lướt ngang; tên kênh / chip kênh dẫn tới trang riêng /tieng-duc/kenh/<kênh> (tốt cho SEO).
 * `channel`: đang ở trang của 1 kênh → bỏ nav kênh, hiện lưới toàn bộ bài.
 */
export default function LessonGrid({ lessons, lock, admin, channel }: { lessons: Item[]; lock?: LockInfo; admin?: boolean; channel?: string }) {
  const searchParams = useSearchParams();
  const [opening, setOpening] = useState<Item | null>(null);
  const [query, setQuery] = useState("");

  useLayoutEffect(() => () => setOpening(null), []);

  if (!lessons.length)
    return (
      <div className="card empty">
        <Mascot className="size-20 opacity-90" />
        <p className="text-base font-semibold text-foreground">Chưa có bài học nào.</p>
        <p className="text-sm text-muted">Bài mới sẽ hiện ở đây ngay khi được đăng.</p>
      </div>
    );

  const levels = LEVELS.map((lv) => ({ level: lv, count: lessons.filter((l) => l.level === lv).length })).filter((g) => g.count);
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

  /** Link trang kênh, giữ trình độ đang lọc */
  const channelHref = (g: Group) => (g.name === OTHER ? null : `${channelPath(g.key)}${level ? `?level=${level}` : ""}`);

  const qNorm = query.trim().toLowerCase();
  const byLevel = level ? lessons.filter((l) => l.level === level) : lessons;
  const shown = qNorm
    ? byLevel.filter(
        (l) =>
          l.title.toLowerCase().includes(qNorm) ||
          l.description.toLowerCase().includes(qNorm) ||
          (l.channel?.toLowerCase().includes(qNorm) ?? false),
      )
    : byLevel;
  const navGroups = byChannel(byLevel);
  const groups = byChannel(shown);
  const flat = !!channel || (allGroups.length === 1 && allGroups[0].name === OTHER);
  const onLocked = lock?.enabled && !admin ? setOpening : undefined;

  const chip = (lv: string | null, count: number) => (
    <button key={lv ?? "all"} onClick={() => setLevel(lv)} aria-pressed={level === lv} className="chip text-xs">
      {lv ?? "Tất cả"}
      <span className={`tabular-nums ${level === lv ? "opacity-80" : "text-muted"}`}>{count}</span>
    </button>
  );

  return (
    <section id="lessons" data-sec="de" className="flex scroll-mt-20 flex-col gap-4 sm:gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SectionHeader title={channel ? `Bài học từ ${channel}` : "Thư viện bài học"} count={shown.length} />
        <label className="input-group w-full sm:w-64">
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
      {levels.length > 1 && (
        <div className="scroll-row flex gap-2 max-sm:-mx-4 max-sm:px-4 sm:flex-wrap">
          {chip(null, lessons.length)}
          {levels.map((g) => chip(g.level, g.count))}
        </div>
      )}
      {lock?.enabled && <LockNote lock={lock} admin={admin} />}
      {!flat && navGroups.length > 1 && (
        <nav aria-label="Kênh YouTube" className="scroll-row flex items-center gap-2 max-sm:-mx-4 max-sm:px-4 sm:flex-wrap">
          <span className="label shrink-0">Kênh</span>
          {navGroups.flatMap((g) => {
            const href = channelHref(g);
            return href
              ? [
                  <Link key={g.key} href={href} className="chip text-xs">
                    {g.name}
                    <span className="tabular-nums text-muted">{g.lessons.length}</span>
                  </Link>,
                ]
              : [];
          })}
        </nav>
      )}
      {!shown.length ? (
        <div className="card empty">
          <p className="font-semibold text-foreground">Không tìm thấy bài học phù hợp</p>
          <p className="text-sm text-muted">Thử từ khóa khác hoặc bỏ bộ lọc trình độ.</p>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => {
              setQuery("");
              setLevel(null);
            }}
          >
            Xóa bộ lọc
          </button>
        </div>
      ) : flat ? (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map((l) => (
            <LessonCard key={l.id} l={l} onLocked={onLocked} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-6 sm:gap-7">
          {groups.map((g) => (
            <ChannelSection key={`${level}-${g.key}`} g={g} onLocked={onLocked} href={channelHref(g)} />
          ))}
        </div>
      )}
      {opening && lock && <UnlockDialog lesson={opening} lock={lock} onClose={() => setOpening(null)} />}
    </section>
  );
}
