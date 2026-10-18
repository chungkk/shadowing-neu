"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

type Track = { languageCode: string; name: string; auto: boolean };

/** Đổi nguồn phụ đề trên trang /watch: track YouTube khác, hoặc "whisper" để tạo bằng AI */
export default function TrackSelect({ videoId, tracks, current }: { videoId: string; tracks: Track[]; current: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  if (tracks.length < 2) return null;
  return (
    <label className="field w-fit text-xs">
      Phụ đề
      <span className="flex items-center gap-2">
        <select
          value={current}
          disabled={pending}
          onChange={(e) => {
            const lang = e.target.value;
            startTransition(() => router.push(`/watch/${videoId}?lang=${encodeURIComponent(lang)}`));
          }}
        >
          {tracks.map((t) => (
            <option key={t.languageCode + t.auto} value={t.languageCode}>
              {t.name}
            </option>
          ))}
        </select>
        {pending && <span className="text-accent">Đang tạo phụ đề… (Whisper có thể mất tới 1 phút)</span>}
      </span>
    </label>
  );
}
