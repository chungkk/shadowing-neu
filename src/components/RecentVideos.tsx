"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { SectionHeader } from "./LessonGrid";

type Recent = { videoId: string; title: string };
const KEY = "shadow-recent";
const EMPTY: Recent[] = [];

/** Danh sách video YouTube người dùng đã tự mở (lưu trong trình duyệt) */
export function RecentVideos() {
  const [recent] = useLocalStorage(KEY, EMPTY);
  if (!recent.length) return null;
  return (
    <section className="flex flex-col gap-4">
      <SectionHeader title="Video bạn đã mở gần đây" count={recent.length} />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {recent.map((r) => (
          <Link
            key={r.videoId}
            href={`/watch/${r.videoId}`}
            className="group sticker sticker-link flex flex-col overflow-hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://i.ytimg.com/vi/${r.videoId}/mqdefault.jpg`} alt="" className="m-1.5 mb-0 aspect-video w-[calc(100%-0.75rem)] rounded-[calc(var(--radius-lg)-6px)] bg-card-2 object-cover" />
            <div className="line-clamp-2 p-3 text-sm leading-snug font-bold group-hover:text-accent-text">{r.title}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/** Đặt trong trang /watch để ghi nhớ video vừa mở */
export function RememberVideo({ videoId, title }: Recent) {
  const [recent, setRecent] = useLocalStorage(KEY, EMPTY);
  useEffect(() => {
    if (recent[0]?.videoId === videoId) return;
    setRecent([{ videoId, title }, ...recent.filter((r) => r.videoId !== videoId)].slice(0, 8));
  }, [videoId, title, recent, setRecent]);
  return null;
}
