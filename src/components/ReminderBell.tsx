"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, BookOpen, Car, Flame, Landmark, Layers, Play, RotateCcw, type LucideIcon } from "lucide-react";
import { clientApi } from "@/lib/client-api";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { Reminder, ReminderSection } from "@/lib/reminders";

const SEEN_KEY = "ckk-reminders-seen";
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

/** Ngày theo giờ máy người học — nhắc nhở "daily" mang khoá theo ngày nên hôm sau lại báo mới */
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};
const seenKey = (r: Reminder) => (r.daily ? `${r.id}@${today()}` : r.id);

/**
 * Chuông nhắc nhở ở thanh đầu trang: đang học gì, tới đâu, phần nào chưa xong (Tiếng Đức · Lái xe · LiD).
 * Số đỏ = nhắc nhở chưa xem; mở bảng là tính đã xem. Tải lại khi chuyển trang / quay lại tab để luôn đúng tiến độ mới.
 */
export default function ReminderBell() {
  const pathname = usePathname();
  const [items, setItems] = useState<Reminder[] | null>(null);
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useLocalStorage<string[]>(SEEN_KEY, []);
  const box = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    clientApi<{ reminders: Reminder[] }>(`/reminders?tz=${new Date().getTimezoneOffset()}`)
      .then((r) => setItems(r.reminders))
      .catch(() => {});
  }, []);

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

  const unseen = items?.filter((r) => !seen.includes(seenKey(r))).length ?? 0;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    // Mở bảng = đã xem hết. Chỉ giữ khoá của nhắc nhở hiện có → danh sách không phình mãi
    if (next && items?.length) setSeen(items.map(seenKey));
  };

  return (
    <div ref={box} className="relative">
      <button
        className={`btn-icon relative ${open ? "bg-foreground/5" : ""}`}
        aria-label={unseen ? `Nhắc nhở học — ${unseen} mới` : "Nhắc nhở học"}
        aria-haspopup="dialog"
        aria-expanded={open}
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
        // Điện thoại: bảng trải ngang màn hình dưới thanh đầu trang · máy tính: thả xuống ở góc phải
        <div className="fixed inset-x-2 top-16 z-50 md:absolute md:inset-x-auto md:top-full md:right-0 md:w-96 md:pt-2">
          <div role="dialog" aria-label="Nhắc nhở học" className="sheet-fade flex max-h-[min(70vh,34rem)] flex-col overflow-hidden rounded-2xl border-2 border-ink bg-card shadow-[0_4px_0_var(--ink)]">
            <div className="border-b border-border px-4 pt-3 pb-2">
              <p className="font-extrabold">Nhắc nhở học</p>
              <p className="text-xs text-muted">Bạn đang học gì và phần nào chưa xong</p>
            </div>
            <div className="flex flex-col gap-3 overflow-y-auto p-2">
              {items === null ? (
                <p className="p-3 text-sm text-muted">Đang tải…</p>
              ) : !items.length ? (
                <div className="flex flex-col gap-1 p-3 text-sm">
                  <p className="font-bold">Không có việc nào đang dở 🎉</p>
                  <p className="text-muted">
                    Bắt đầu một{" "}
                    <Link href="/tieng-duc" className="font-bold text-link hover:underline">
                      bài học tiếng Đức
                    </Link>
                    , ôn{" "}
                    <Link href="/lai-xe" className="font-bold text-link hover:underline">
                      lý thuyết lái xe
                    </Link>{" "}
                    hoặc{" "}
                    <Link href="/leben-in-deutschland" className="font-bold text-link hover:underline">
                      Leben in Deutschland
                    </Link>
                    .
                  </p>
                </div>
              ) : (
                SECTIONS.map((sec) => {
                  const list = items.filter((r) => r.section === sec.key);
                  if (!list.length) return null;
                  return (
                    <section key={sec.key} className="flex flex-col gap-1">
                      <p className="flex items-center gap-1.5 px-2 pt-1 text-[11px] font-extrabold tracking-wider text-muted uppercase">
                        <sec.icon className="size-3.5" /> {sec.label}
                      </p>
                      {list.map((r) => {
                        const Icon = KIND_ICON[r.kind];
                        return (
                          <Link key={r.id} href={r.href} className="flex items-start gap-3 rounded-xl px-2 py-2 transition hover:bg-foreground/5">
                            <Icon className={`mt-0.5 size-[18px] shrink-0 ${KIND_TONE[r.kind]}`} />
                            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                              <span className="line-clamp-2 text-sm leading-snug font-extrabold">{r.title}</span>
                              <span className="text-xs text-muted">{r.detail}</span>
                              {r.percent !== undefined && (
                                <span className="mt-1 flex items-center gap-2">
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
          </div>
        </div>
      )}
    </div>
  );
}
