"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  BellOff,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Play,
  SlidersHorizontal,
} from "lucide-react";
import type { ComponentType } from "react";
import {
  ChristmasBellIcon as Bell,
  ChristmasBookIcon as BookOpen,
  ChristmasCarIcon as Car,
  ChristmasFlameIcon as Flame,
  ChristmasLidIcon as Landmark,
  ChristmasReviewIcon as Layers,
  ChristmasWrongIcon as RotateCcw,
} from "./FestiveIcons";
import { clientApi } from "@/lib/client-api";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { Reminder, RemindersResponse, ReminderSection } from "@/lib/reminders";

type IconComp = ComponentType<{ className?: string }>;

const SEEN_KEY = "ckk-reminders-seen";
const MUTED_KEY = "ckk-reminders-muted";
const REFRESH_MS = 60_000;

const SECTIONS: { key: ReminderSection; label: string; short: string; icon: IconComp; badge: string }[] = [
  { key: "de", label: "Tiếng Đức", short: "Tiếng Đức", icon: BookOpen, badge: "badge-ok" },
  { key: "laixe", label: "Lái xe", short: "Lái xe", icon: Car, badge: "badge-gold" },
  { key: "lid", label: "Leben in Deutschland", short: "LiD", icon: Landmark, badge: "badge-coral" },
];
const SECTION_BY_KEY = Object.fromEntries(SECTIONS.map((s) => [s.key, s])) as Record<ReminderSection, (typeof SECTIONS)[number]>;

const KIND_ICON: Record<Reminder["kind"], IconComp> = {
  streak: Flame,
  review: Layers,
  lesson: Play,
  deck: BookOpen,
  chapter: BookOpen,
  wrong: RotateCcw,
};

const TODAY_ICON_STYLE: Record<"streak" | "review" | "wrong", string> = {
  streak: "bg-gold-soft text-amber",
  review: "bg-accent-soft text-accent-text",
  wrong: "bg-red-soft text-red-400",
};

const isTodayKind = (k: Reminder["kind"]): k is "streak" | "review" | "wrong" =>
  k === "streak" || k === "review" || k === "wrong";

/** Ngày theo giờ máy người học (YYYY-MM-DD) — nhắc nhở "daily" đã xem hôm qua thì hôm nay lại báo mới */
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

type Seen = Record<string, { day: string; level?: number }>;

const isNew = (r: Reminder, seen: Seen, day: string) => {
  if (r.quiet) return false;
  const s = seen[r.id];
  if (!s) return true;
  if (r.daily && s.day !== day) return true;
  return r.level !== undefined && r.level > (s.level ?? 0);
};

function relativeTime(at: number, now: number): string | null {
  if (!at || now <= 0) return null;
  const diff = Math.max(0, now - at);
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "hôm qua";
  return `${days} ngày trước`;
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-3" aria-label="Đang tải thông báo">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex animate-pulse items-center gap-3 rounded-lg p-2">
          <div className="size-8 shrink-0 rounded-lg bg-card-2" />
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="h-3.5 w-3/4 rounded bg-card-2" />
            <div className="h-3 w-1/2 rounded bg-card-2/70" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Chuông thông báo tối giản ở thanh đầu trang:
 * - Phân 2 tầng rõ ràng: "Cần làm hôm nay" (chuỗi ngày · ôn từ · câu sai) và "Tiếp tục học" (1 mục gần nhất / khu vực).
 * - Giữ dấu chấm mới suốt phiên đang mở để người học nhận ra mục vừa xuất hiện; phần tắt/bật khu vực gom gọn trong nút Tuỳ chỉnh.
 */
export default function ReminderBell({ userId }: { userId: number }) {
  const pathname = usePathname();
  const panelId = useId();
  const [data, setData] = useState<RemindersResponse | null>(null);
  const [loadedAt, setLoadedAt] = useState(0);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMore, setShowMore] = useState(false);
  // Chụp tập ID thông báo mới của phiên mở hiện tại để vẫn hiển thị chấm xanh sau khi badge đỏ tắt
  const [freshIds, setFreshIds] = useState<string[]>([]);
  const [seen, setSeen] = useLocalStorage<Seen>(`${SEEN_KEY}:${userId}`, {});
  const [muted, setMuted] = useLocalStorage<ReminderSection[]>(`${MUTED_KEY}:${userId}`, []);

  const box = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef(false);
  const seenRef = useRef(seen);
  const mutedRef = useRef(muted);
  const lastLoad = useRef(0);
  const seq = useRef(0);

  useEffect(() => {
    openRef.current = open;
    seenRef.current = seen;
    mutedRef.current = muted;
  }, [open, seen, muted]);

  const load = useCallback((force = false) => {
    const now = Date.now();
    if (!force && now - lastLoad.current < REFRESH_MS) return;
    lastLoad.current = now;
    const my = ++seq.current;
    clientApi<RemindersResponse>(`/reminders?tz=${new Date().getTimezoneOffset()}`)
      .then((r) => {
        if (my !== seq.current) return;
        setData(r);
        setLoadedAt(Date.now());
        setError(false);
        if (openRef.current) {
          const d = todayStr();
          const arrived = r.reminders.filter((it) => !mutedRef.current.includes(it.section) && isNew(it, seenRef.current, d));
          if (arrived.length) {
            setFreshIds((prev) => [...new Set([...prev, ...arrived.map((it) => it.id)])]);
          }
        }
      })
      .catch(() => {
        if (my !== seq.current) return;
        lastLoad.current = 0;
        setError(true);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load, pathname]);

  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  const closePanel = useCallback((restoreFocus = false) => {
    setOpen(false);
    setShowSettings(false);
    setShowMore(false);
    setFreshIds([]);
    if (restoreFocus) btnRef.current?.focus();
  }, []);

  // Chuyển trang thì đóng dropdown
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    if (open) {
      setOpen(false);
      setShowSettings(false);
      setShowMore(false);
      setFreshIds([]);
    }
  }

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) closePanel(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePanel(true);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, closePanel]);

  const visibleItems = useMemo(
    () => (data ? data.reminders.filter((r) => !muted.includes(r.section)) : null),
    [data, muted],
  );

  // Phân tầng tối giản:
  // 1) "Cần làm hôm nay": chuỗi ngày · từ đến hạn ôn · câu đang sai
  // 2) "Tiếp tục học": mặc định chỉ giữ 1 mục gần nhất cho mỗi khu vực; mục dư gom sau nút "Xem thêm"
  const { todayItems, primaryContinue, extraContinue } = useMemo(() => {
    if (!visibleItems) return { todayItems: [] as Reminder[], primaryContinue: [] as Reminder[], extraContinue: [] as Reminder[] };
    const todayRank = (k: Reminder["kind"]) => (k === "streak" ? 0 : k === "review" ? 1 : 2);
    const todayList = visibleItems.filter((r) => isTodayKind(r.kind)).sort((a, b) => todayRank(a.kind) - todayRank(b.kind));

    const contAll = visibleItems.filter((r) => !isTodayKind(r.kind)).sort((a, b) => b.at - a.at);
    const pickedSections = new Set<ReminderSection>();
    const primary: Reminder[] = [];
    const extra: Reminder[] = [];
    for (const r of contAll) {
      if (!pickedSections.has(r.section)) {
        pickedSections.add(r.section);
        primary.push(r);
      } else {
        extra.push(r);
      }
    }
    return { todayItems: todayList, primaryContinue: primary, extraContinue: extra };
  }, [visibleItems]);

  const day = todayStr();
  const unseenItems = useMemo(
    () => (visibleItems ? visibleItems.filter((r) => isNew(r, seen, day)) : []),
    [visibleItems, seen, day],
  );
  const unseen = unseenItems.length;

  // Khi mở bảng: đánh dấu đã xem để tắt số đỏ trên chuông (chấm xanh của phiên mở giữ nguyên trong freshIds)
  useEffect(() => {
    if (!open || !unseenItems.length || !visibleItems) return;
    const cutoff = Date.now() - 60 * 86_400_000;
    const next: Seen = Object.fromEntries(Object.entries(seen).filter(([, v]) => Date.parse(v.day) > cutoff));
    for (const r of visibleItems) next[r.id] = { day, level: r.level };
    setSeen(next);
  }, [open, unseenItems, visibleItems, seen, setSeen, day]);

  // Sửa bớt câu sai (level giảm) → hạ mức đã lưu để lần sau sai tăng lại vẫn báo
  useEffect(() => {
    if (!visibleItems) return;
    const lower = visibleItems.filter((r) => r.level !== undefined && seen[r.id]?.level !== undefined && r.level < seen[r.id].level!);
    if (lower.length) setSeen({ ...seen, ...Object.fromEntries(lower.map((r) => [r.id, { ...seen[r.id], level: r.level }])) });
  }, [visibleItems, seen, setSeen]);

  const toggle = () => {
    if (open) {
      closePanel(false);
    } else {
      openRef.current = true;
      setFreshIds(unseenItems.map((r) => r.id));
      load(true);
      setOpen(true);
    }
  };

  const toggleMute = (s: ReminderSection) =>
    setMuted(muted.includes(s) ? muted.filter((x) => x !== s) : [...muted, s]);

  const allMuted = muted.length === SECTIONS.length;
  const freshSet = useMemo(() => new Set(freshIds), [freshIds]);
  const hasAnyItem = todayItems.length > 0 || primaryContinue.length > 0;
  const shownContinue = showMore ? [...primaryContinue, ...extraContinue] : primaryContinue;

  return (
    <div ref={box} className="md:relative">
      <button
        ref={btnRef}
        type="button"
        className={`btn-icon relative size-9 rounded-lg transition-colors hover:bg-card-2 ${open ? "bg-card-2 text-foreground" : "text-muted hover:text-foreground"}`}
        aria-label={unseen ? `Thông báo — ${unseen} mới` : "Thông báo"}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
      >
        <Bell className="size-[19px]" />
        {!!unseen && (
          <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red px-1 font-mono text-[10px] leading-none font-bold text-white tabular-nums ring-2 ring-sidebar">
            {unseen > 9 ? "9+" : unseen}
          </span>
        )}
      </button>

      {open && (
        <div id={panelId} className="absolute inset-x-3 top-full z-50 pt-1.5 md:inset-x-auto md:right-0 md:w-[376px] md:pt-2">
          <div className="popover flex max-h-[min(76vh,34rem)] flex-col overflow-hidden p-0">
            {/* Header gọn 1 dòng */}
            <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <h2 className="text-sm font-bold text-foreground">Thông báo</h2>
                {freshIds.length > 0 && (
                  <span className="rounded-md bg-link-soft px-1.5 py-0.5 font-mono text-[11px] leading-none font-semibold text-link tabular-nums">
                    {freshIds.length} mới
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowSettings((v) => !v)}
                aria-pressed={showSettings}
                aria-label="Tuỳ chỉnh khu vực thông báo"
                title="Bật / tắt nhắc theo khu vực"
                className={`inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
                  showSettings
                    ? "bg-card-2 text-foreground"
                    : "text-muted hover:bg-card-2 hover:text-foreground"
                }`}
              >
                <SlidersHorizontal className="size-3.5" aria-hidden />
                <span>Tuỳ chỉnh</span>
              </button>
            </div>

            {/* Ngăn tuỳ chỉnh bật/tắt 3 khu vực (ẩn mặc định) */}
            {showSettings && (
              <div className="border-b border-line bg-sidebar/70 px-4 py-3">
                <p className="mb-2 text-[11px] font-semibold tracking-[0.06em] text-muted uppercase">Hiển thị nhắc nhở</p>
                <div className="flex flex-wrap gap-1.5">
                  {SECTIONS.map((s) => {
                    const enabled = !muted.includes(s.key);
                    return (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => toggleMute(s.key)}
                        aria-pressed={enabled}
                        className={`inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                          enabled
                            ? "border-line-strong bg-card text-foreground"
                            : "border-line bg-transparent text-muted line-through opacity-75 hover:opacity-100"
                        }`}
                      >
                        {enabled ? <Check className="size-3.5 text-ok-text" aria-hidden /> : <BellOff className="size-3" aria-hidden />}
                        {s.short}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Thân thông báo */}
            <div className="flex flex-col overflow-y-auto">
              {visibleItems === null && error ? (
                <div className="flex flex-col items-start gap-2.5 p-4 text-sm">
                  <p className="text-muted">Không tải được thông báo — kiểm tra kết nối mạng.</p>
                  <button type="button" className="btn btn-sm" onClick={() => load(true)}>
                    Thử lại
                  </button>
                </div>
              ) : visibleItems === null ? (
                <LoadingSkeleton />
              ) : allMuted ? (
                <div className="flex flex-col items-center gap-2.5 px-5 py-7 text-center">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-card-2 text-muted">
                    <BellOff className="size-5" aria-hidden />
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-semibold text-foreground">Đang tắt toàn bộ thông báo</p>
                    <p className="text-xs text-muted">Bật lại các phần bạn đang học để nhận nhắc nhở cơ bản.</p>
                  </div>
                  <button type="button" onClick={() => setMuted([])} className="btn btn-sm mt-1">
                    Bật lại tất cả
                  </button>
                </div>
              ) : !hasAnyItem ? (
                data?.started ? (
                  <div className="flex flex-col items-center gap-2 px-5 py-7 text-center">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-ok-soft text-ok-text">
                      <CheckCircle2 className="size-5" aria-hidden />
                    </span>
                    <div className="flex flex-col gap-0.5">
                      <p className="text-sm font-semibold text-foreground">Hôm nay đã gọn gàng</p>
                      <p className="text-xs text-muted">Không có chuỗi sắp đứt, từ đến hạn hay bài đang dở.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 p-4">
                    <div className="flex flex-col gap-0.5">
                      <p className="text-sm font-semibold text-foreground">Chưa có thông báo học tập</p>
                      <p className="text-xs leading-relaxed text-muted">
                        Chọn một phần để bắt đầu — từ đến hạn, chuỗi ngày và bài học dở sẽ tự hiện gọn tại đây.
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <Link
                        href="/tieng-duc"
                        onClick={() => closePanel(false)}
                        data-sec="de"
                        className="flex flex-col items-center gap-1 rounded-lg border border-line bg-card px-2 py-2.5 text-center text-xs font-semibold text-foreground transition-colors hover:border-line-strong hover:bg-card-2"
                      >
                        <BookOpen className="size-4 text-sec-text" aria-hidden />
                        Tiếng Đức
                      </Link>
                      <Link
                        href="/lai-xe"
                        onClick={() => closePanel(false)}
                        data-sec="laixe"
                        className="flex flex-col items-center gap-1 rounded-lg border border-line bg-card px-2 py-2.5 text-center text-xs font-semibold text-foreground transition-colors hover:border-line-strong hover:bg-card-2"
                      >
                        <Car className="size-4 text-sec-text" aria-hidden />
                        Lái xe
                      </Link>
                      <Link
                        href="/leben-in-deutschland"
                        onClick={() => closePanel(false)}
                        data-sec="lid"
                        className="flex flex-col items-center gap-1 rounded-lg border border-line bg-card px-2 py-2.5 text-center text-xs font-semibold text-foreground transition-colors hover:border-line-strong hover:bg-card-2"
                      >
                        <Landmark className="size-4 text-sec-text" aria-hidden />
                        LiD
                      </Link>
                    </div>
                  </div>
                )
              ) : (
                <>
                  {/* TẦNG 1: CẦN LÀM HÔM NAY */}
                  {todayItems.length > 0 && (
                    <section aria-labelledby={`${panelId}-today`} className="flex flex-col gap-0.5 p-2">
                      <h3 id={`${panelId}-today`} className="px-2 pt-1 pb-1.5 text-[11px] font-semibold tracking-[0.06em] text-muted uppercase">
                        Cần làm hôm nay
                      </h3>
                      {todayItems.map((r) => {
                        const Icon = KIND_ICON[r.kind];
                        const tone = isTodayKind(r.kind) ? TODAY_ICON_STYLE[r.kind] : "bg-card-2 text-muted";
                        const sec = SECTION_BY_KEY[r.section];
                        const fresh = freshSet.has(r.id);
                        return (
                          <Link
                            key={r.id}
                            href={r.href}
                            onClick={() => closePanel(false)}
                            className="group flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-card-2 focus-visible:bg-card-2"
                          >
                            <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${tone}`} aria-hidden>
                              <Icon className="size-4" />
                            </span>
                            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                              <span className="flex items-center gap-1.5">
                                <span className="truncate text-sm leading-snug font-semibold text-foreground">{r.title}</span>
                                {r.kind === "wrong" && (
                                  <span className={`badge shrink-0 px-1.5 py-0 text-[10px] ${sec.badge}`}>{sec.short}</span>
                                )}
                              </span>
                              <span className="line-clamp-1 text-xs text-muted">{r.detail}</span>
                            </span>
                            <span className="mt-1.5 flex shrink-0 items-center gap-1.5">
                              {fresh && <span className="size-2 rounded-full bg-link" aria-label="Mới" />}
                              <ChevronRight className="size-3.5 text-muted opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                            </span>
                          </Link>
                        );
                      })}
                    </section>
                  )}

                  {/* Đường kẻ phân tách 2 tầng */}
                  {todayItems.length > 0 && primaryContinue.length > 0 && <div className="border-t border-line" />}

                  {/* TẦNG 2: TIẾP TỤC HỌC (Tối giản 1 mục gần nhất / khu vực) */}
                  {primaryContinue.length > 0 && (
                    <section aria-labelledby={`${panelId}-continue`} className="flex flex-col gap-0.5 p-2">
                      <h3 id={`${panelId}-continue`} className="px-2 pt-1 pb-1.5 text-[11px] font-semibold tracking-[0.06em] text-muted uppercase">
                        Tiếp tục học
                      </h3>
                      {shownContinue.map((r) => {
                        const sec = SECTION_BY_KEY[r.section];
                        const Icon = r.kind === "lesson" ? Play : sec.icon;
                        const fresh = freshSet.has(r.id);
                        const agoText = relativeTime(r.at, loadedAt);
                        return (
                          <Link
                            key={r.id}
                            href={r.href}
                            data-sec={r.section}
                            onClick={() => closePanel(false)}
                            className="group flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-card-2 focus-visible:bg-card-2"
                          >
                            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-sec-soft text-sec-text" aria-hidden>
                              <Icon className="size-4" />
                            </span>
                            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                              <span className="flex items-center gap-1.5">
                                <span className="truncate text-sm leading-snug font-semibold text-foreground">{r.title}</span>
                              </span>
                              <span className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted">
                                <span className="font-medium text-sec-text">{sec.short}</span>
                                <span aria-hidden>·</span>
                                <span className="truncate">{r.detail}</span>
                                {agoText && (
                                  <>
                                    <span aria-hidden>·</span>
                                    <span className="shrink-0">{agoText}</span>
                                  </>
                                )}
                              </span>
                              {r.percent !== undefined && (
                                <span className="mt-1 flex items-center gap-2" aria-hidden>
                                  <span className="progress h-1 flex-1">
                                    <span className="progress-bar block" style={{ width: `${r.percent}%` }} />
                                  </span>
                                  <span className="font-mono text-[11px] font-semibold text-sec-text tabular-nums">{r.percent}%</span>
                                </span>
                              )}
                            </span>
                            <span className="mt-1.5 flex shrink-0 items-center gap-1.5">
                              {fresh && <span className="size-2 rounded-full bg-link" aria-label="Mới" />}
                              <ChevronRight className="size-3.5 text-muted opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                            </span>
                          </Link>
                        );
                      })}
                      {extraContinue.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowMore((v) => !v)}
                          className="mt-0.5 flex min-h-8 w-full cursor-pointer items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-muted transition-colors hover:bg-card-2 hover:text-foreground"
                        >
                          <ChevronDown className={`size-3.5 transition-transform ${showMore ? "rotate-180" : ""}`} aria-hidden />
                          {showMore ? "Thu gọn" : `Xem thêm ${extraContinue.length} mục đang dở`}
                        </button>
                      )}
                    </section>
                  )}
                </>
              )}
            </div>

            {/* Footer mảnh */}
            <div className="flex items-center justify-between gap-2 border-t border-line bg-sidebar/70 px-4 py-2.5 text-xs">
              {muted.length > 0 && !allMuted ? (
                <button
                  type="button"
                  onClick={() => setShowSettings(true)}
                  className="inline-flex cursor-pointer items-center gap-1 truncate text-muted transition-colors hover:text-foreground"
                >
                  <BellOff className="size-3 shrink-0" aria-hidden />
                  <span className="truncate">Đang tắt: {SECTIONS.filter((s) => muted.includes(s.key)).map((s) => s.short).join(", ")}</span>
                </button>
              ) : (
                <span className="text-muted">Chỉ hiện mục cơ bản</span>
              )}
              <Link
                href="/stats"
                onClick={() => closePanel(false)}
                className="inline-flex shrink-0 items-center gap-1 font-semibold text-link hover:underline"
              >
                Xem tiến độ <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
