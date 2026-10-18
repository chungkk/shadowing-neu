"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useLocalStorage } from "@/hooks/useLocalStorage";

type Recent = { videoId: string; title: string };
const KEY = "shadow-recent";
const EMPTY: Recent[] = [];

/** Danh sách video YouTube người dùng đã tự mở (lưu trong trình duyệt) */
export function RecentVideos() {
  const [recent] = useLocalStorage(KEY, EMPTY);
  if (!recent.length) return null;
  return (
    <section className="card">
      <h2 className="mb-2 text-sm font-semibold text-muted">Video bạn đã mở gần đây</h2>
      <ul className="flex flex-col">
        {recent.map((r) => (
          <li key={r.videoId}>
            <Link
              href={`/watch/${r.videoId}`}
              className="block truncate rounded px-2 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/5"
            >
              {r.title}
            </Link>
          </li>
        ))}
      </ul>
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
