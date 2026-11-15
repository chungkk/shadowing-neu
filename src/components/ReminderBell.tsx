"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, BellOff, BookOpen, Car, Flame, Landmark, Layers, Play, RotateCcw, type LucideIcon } from "lucide-react";
import { clientApi } from "@/lib/client-api";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { Reminder, RemindersResponse, ReminderSection } from "@/lib/reminders";

const SEEN_KEY = "ckk-reminders-seen";
const MUTED_KEY = "ckk-reminders-muted";
const REFRESH_MS = 60_000; // chuyển trang / quay lại tab: tải lại tối đa 1 lần mỗi phút (mở bảng thì luôn tải mới)
const SECTIONS: { key: ReminderSection; label: string; icon: LucideIcon }[] = [
  { key: "de", label: "Tiếng Đức", icon: BookOpen },
  { key: "laixe", label: "Lái xe", icon: Car },
  { key: "lid", label: "Leben in Deutschland", icon: Landmark },
];
const KIND_ICON: Record<Reminder["kind"], LucideIcon> = { streak: Flame, review: Layers, lesson: Play, deck: BookOpen, chapter: BookOpen, wrong: RotateCcw };
const KIND_TONE: Record<Reminder["kind"], string> = {
  streak: "text-amber",
  review: "text-red",
  lesson: "text-accent-text",
  deck: "text-accent-text",
  chapter: "text-accent-text",
  wrong: "text-red",
};

/** Ngày theo giờ máy người học (YYYY-MM-DD) — nhắc nhở "daily" đã xem hôm qua thì hôm nay lại báo mới */
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
/** Lần xem gần nhất của 1 nhắc nhở: ngày xem + mức lúc đó (số câu sai…) */
type Seen = Record<string, { day: string; level?: number }>;
const isNew = (r: Reminder, seen: Seen) => {
  if (r.quiet) return false;
  const s = seen[r.id];
  if (!s) return true;
  if (r.daily && s.day !== today()) return true;
  return r.level !== undefined && r.level > (s.level ?? 0); // chỉ báo lại khi TĂNG (sửa được câu sai thì không báo)
};

const link = "font-bold text-link hover:underline";

/**
 * Chuông nhắc nhở ở thanh đầu trang: đang học gì, tới đâu, phần nào chưa xong (Tiếng Đức · Lái xe · LiD).
 * Số đỏ = nhắc nhở mới chưa xem; mở bảng là tính đã xem. "Đã xem" và phần đã tắt lưu theo tài khoản trên máy này.
 * Bảng là dạng xổ xuống (disclosure): nút có aria-expanded/aria-controls, focus vẫn đi tuần tự từ nút vào các link.
 */
export default function ReminderBell({ userId }: { userId: number }) {
  const pathname = usePathname();
  const panelId = useId();
  const [data, setData] = useState<RemindersResponse | null>(null);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useLocalStorage<Seen>(`${SEEN_KEY}:${userId}`, {});
  const [muted, setMuted] = useLocalStorage<ReminderSection[]>(`${MUTED_KEY}:${userId}`, []);
  const box = useRef<HTMLDivElement>(null);
  const lastLoad = useRef(0);
  const seq = useRef(0); // chỉ nhận phản hồi của lần gọi mới nhất (phản hồi cũ về muộn không ghi đè)

  const load = useCallback((force = false) => {
    if (!force && Date.now() - lastLoad.current < REFRESH_MS) return;
    lastLoad.current = Date.now();
    const my = ++seq.current;
    clientApi<RemindersResponse>(`/reminders?tz=${new Date().getTimezoneOffset()}`)
      .then((r) => {
        if (my !== seq.current) return;
        setData(r);
        setError(false);
      })
      .catch(() => {
        if (my !== seq.current) return;
        lastLoad.current = 0; // lỗi → lần sau thử lại ngay
        setError(true);
      });
  }, []);

  // Tải lúc đầu, khi chuyển trang (vừa học xong 1 bài) và khi quay lại tab — có giới hạn tần suất
  useEffect(() => {
    load();
  }, [load, pathname]);

  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  // Chuyển trang thì đóng bảng
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const items = data?.reminders.filter((r) => !muted.includes(r.section)) ?? null;
  const unseen = items?.filter((r) => isNew(r, seen)).length ?? 0;

  // Bảng đang mở = đã xem hết — kể cả khi mở lúc chưa tải xong (dữ liệu về sau vẫn được đánh dấu).
  // Giữ lại mục cũ không còn trong danh sách (chương tạm rơi khỏi top rồi quay lại không bị báo mới), bỏ mục quá 60 ngày
  useEffect(() => {
    if (!open || !unseen || !items) return;
    const day = today();
    const cutoff = Date.now() - 60 * 86_400_000;
    const next: Seen = Object.fromEntries(Object.entries(seen).filter(([, v]) => Date.parse(v.day) > cutoff));
    for (const r of items) next[r.id] = { day, level: r.level };
    setSeen(next);
  }, [open, unseen, items, seen, setSeen]);

  // Sửa bớt câu sai (level giảm) → hạ mức đã lưu, để lần sau sai tăng lên lại vẫn được báo
  useEffect(() => {
    if (!items) return;
    const lower = items.filter((r) => r.level !== undefined && seen[r.id]?.level !== undefined && r.level < seen[r.id].level!);
    if (lower.length) setSeen({ ...seen, ...Object.fromEntries(lower.map((r) => [r.id, { ...seen[r.id], level: r.level }])) });
  }, [items, seen, setSeen]);

  const toggle = () => {
    if (!open) load(true);
    setOpen(!open);
  };
  const toggleMute = (s: ReminderSection) => setMuted(muted.includes(s) ? muted.filter((x) => x !== s) : [...muted, s]);

  return (
    // Điện thoại: không làm mốc định vị → bảng bám theo thanh đầu trang (header là relative), trải gần hết bề ngang
    <div ref={box} className="md:relative">
      <button
        className={`btn-icon relative ${open ? "bg-foreground/5" : ""}`}
        aria-label={unseen ? `Nhắc nhở học — ${unseen} mới` : "Nhắc nhở học"}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
      >
        <Bell className="size-5" />
        {!!unseen && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-ink bg-red px-1 text-[11px] leading-none font-extrabold text-white tabular-nums">
            {unseen > 9 ? "9+" : unseen}
          </span>
        )}
      </button>
      {open && (
        <div id={panelId} className="absolute inset-x-2 top-full z-50 pt-1 md:inset-x-auto md:right-0 md:w-96 md:pt-2">
          <div className="sheet-fade flex max-h-[min(70vh,34rem)] flex-col overflow-hidden rounded-2xl border-2 border-ink bg-card shadow-[0_4px_0_var(--ink)]">
            <div className="border-b border-border px-4 pt-3 pb-2">
              <h2 className="font-extrabold">Nhắc nhở học</h2>
              <p className="text-xs text-muted">Bạn đang học gì và phần nào chưa xong</p>
            </div>
            <div className="flex flex-col gap-3 overflow-y-auto p-2">
              {items === null && error ? (
                <div className="flex flex-col items-start gap-2 p-3 text-sm">
                  <p className="text-muted">Không tải được nhắc nhở — kiểm tra kết nối mạng.</p>
                  <button className="btn btn-sm" onClick={() => load(true)}>
                    Thử lại
                  </button>
                </div>
              ) : items === null ? (
                <p className="p-3 text-sm text-muted">Đang tải…</p>
              ) : !items.length ? (
                <div className="flex flex-col gap-1 p-3 text-sm">
                  {data?.started ? (
                    <>
                      <p className="font-bold">Không có việc nào đang dở 🎉</p>
                      <p className="text-muted">Bạn đã làm xong những gì đang học. Chọn thêm một bài mới khi sẵn sàng.</p>
                    </>
                  ) : (
                    <>
                      <p className="font-bold">Bạn chưa bắt đầu học</p>
                      <p className="text-muted">
                        Thử một{" "}
                        <Link href="/tieng-duc" className={link}>
                          bài học tiếng Đức
                        </Link>
                        , ôn{" "}
                        <Link href="/lai-xe" className={link}>
                          lý thuyết lái xe
                        </Link>{" "}
                        hoặc{" "}
                        <Link href="/leben-in-deutschland" className={link}>
                          Leben in Deutschland
                        </Link>
                        . Phần nào học dở sẽ được nhắc ở đây.
                      </p>
                    </>
                  )}
                </div>
              ) : (
                SECTIONS.map((sec) => {
                  const list = items.filter((r) => r.section === sec.key);
                  if (!list.length) return null;
                  const headId = `${panelId}-${sec.key}`;
                  return (
                    <section key={sec.key} aria-labelledby={headId} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-2 px-2 pt-1">
                        <h3 id={headId} className="flex items-center gap-1.5 text-[11px] font-extrabold tracking-wider text-muted uppercase">
                          <sec.icon className="size-3.5" /> {sec.label}
                        </h3>
                        <button
                          className="rounded-lg px-1.5 py-0.5 text-[11px] font-bold text-muted transition hover:bg-foreground/5 hover:text-foreground"
                          onClick={() => toggleMute(sec.key)}
                          aria-label={`Tắt nhắc phần ${sec.label}`}
                        >
                          Tắt nhắc
                        </button>
                      </div>
                      {list.map((r) => {
                        const Icon = KIND_ICON[r.kind];
                        return (
                          <Link key={r.id} href={r.href} className="flex items-start gap-3 rounded-xl px-2 py-2 transition hover:bg-foreground/5">
                            <Icon className={`mt-0.5 size-[18px] shrink-0 ${KIND_TONE[r.kind]}`} aria-hidden />
                            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                              <span className="line-clamp-2 text-sm leading-snug font-extrabold">{r.title}</span>
                              <span className="text-xs text-muted">{r.detail}</span>
                              {r.percent !== undefined && (
                                <span className="mt-1 flex items-center gap-2" aria-hidden>
                                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/10">
                                    <span className="block h-full rounded-full bg-accent" style={{ width: `${r.percent}%` }} />
                                  </span>
                                  <span className="text-[11px] font-bold text-accent-text tabular-nums">{r.percent}%</span>
                                </span>
                              )}
                            </span>
                          </Link>
                        );
                      })}
                    </section>
                  );
                })
              )}
            </div>
            {!!muted.length && (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border px-4 py-2 text-xs text-muted">
                <BellOff className="size-3.5" aria-hidden /> Đã tắt nhắc:
                {SECTIONS.filter((s) => muted.includes(s.key)).map((s) => (
                  <button key={s.key} className="font-bold text-link hover:underline" onClick={() => toggleMute(s.key)} aria-label={`Bật lại nhắc phần ${s.label}`}>
                    {s.label} · bật lại
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
