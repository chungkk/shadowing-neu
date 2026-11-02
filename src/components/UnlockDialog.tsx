"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Lock, X } from "lucide-react";
import type { LockInfo } from "@/lib/lesson-lock";
import LevelBadge from "./LevelBadge";
import { UnlockBox } from "./LockedLesson";

/**
 * Popup khi bấm thẻ bài đang khoá (trang chủ): khách → đăng nhập · người dùng → mở bằng lượt miễn phí / đổi kim cương.
 * Mở xong vào thẳng bài. Điện thoại: tấm trượt từ dưới lên; máy tính: hộp giữa màn hình. Bấm nền / Esc để đóng.
 */
export default function UnlockDialog({
  lesson,
  lock,
  onClose,
}: {
  lesson: { id: number; title: string; slug: string; videoId: string; level: string };
  lock: LockInfo;
  onClose: () => void;
}) {
  const router = useRouter();
  const panel = useRef<HTMLDivElement>(null);

  // Mở: focus vào popup · đóng: trả focus về thẻ vừa bấm. useLayoutEffect: trả xong trước khi popup đăng nhập (mở ngay sau đó) tự focus ô nhập
  useLayoutEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    panel.current?.focus({ preventScroll: true });
    return () => before?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onClose();
      if (e.key !== "Tab" || !panel.current) return;
      // Tab chỉ đi vòng trong popup
      const items = panel.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const inside = active !== panel.current && panel.current.contains(active);
      if (!inside || active === (e.shiftKey ? first : last)) {
        e.preventDefault();
        (e.shiftKey ? last : first)?.focus();
      }
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // khoá cuộn trang phía sau
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6" role="dialog" aria-modal="true" aria-label={lesson.title}>
      <button className="sheet-fade absolute inset-0 cursor-default bg-black/55" onClick={onClose} aria-label="Đóng" />
      <div ref={panel} tabIndex={-1} className="sheet-up relative flex w-full max-w-md flex-col overflow-hidden rounded-t-[28px] border-t border-border bg-card outline-none md:rounded-[28px] md:border">
        <div className="relative aspect-video bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://i.ytimg.com/vi/${lesson.videoId}/hqdefault.jpg`} alt="" className="size-full object-cover opacity-45" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-black/65 text-white">
              <Lock className="size-7" />
            </span>
          </span>
          <button onClick={onClose} title="Đóng" className="btn-icon absolute top-2 right-2 bg-black/50 text-white hover:bg-black/70">
            <X className="size-5" />
          </button>
        </div>
        <div className="flex flex-col gap-4 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <div className="flex items-start gap-2">
            <h2 className="line-clamp-2 flex-1 text-lg font-extrabold leading-snug">{lesson.title}</h2>
            <LevelBadge level={lesson.level} className="shrink-0" />
          </div>
          <UnlockBox lesson={lesson} lock={lock} onLogin={onClose} onUnlocked={() => router.push(`/${lesson.slug}`)} />
        </div>
      </div>
    </div>
  );
}
