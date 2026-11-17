"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Lock, X } from "lucide-react";
import type { LockInfo } from "@/lib/lesson-lock";
import LevelBadge from "./LevelBadge";
import { UnlockBox } from "./LockedLesson";
import { lessonPath } from "@/lib/slug";

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
    <div className="dialog-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="unlock-title" data-sec="de" className="dialog outline-none">
        <div className="dialog-head">
          <h2 id="unlock-title" className="dialog-title line-clamp-2">
            {lesson.title}
          </h2>
          <div className="flex shrink-0 items-center gap-1">
            <LevelBadge level={lesson.level} />
            <button onClick={onClose} title="Đóng" aria-label="Đóng" className="btn-icon -mt-1 -mr-2">
              <X className="size-5" />
            </button>
          </div>
        </div>
        <div className="relative aspect-video shrink-0 overflow-hidden rounded-[var(--radius)] bg-card-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://i.ytimg.com/vi/${lesson.videoId}/hqdefault.jpg`} alt="" className="size-full object-cover opacity-55 saturate-50" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-14 items-center justify-center rounded-full border border-line bg-card text-foreground">
              <Lock className="size-7" />
            </span>
          </span>
        </div>
        <div className="dialog-body">
          <UnlockBox lesson={lesson} lock={lock} onLogin={onClose} onUnlocked={() => router.push(lessonPath(lesson.slug))} />
        </div>
      </div>
    </div>
  );
}
