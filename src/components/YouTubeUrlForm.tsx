"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { extractVideoId } from "@/lib/youtube-id";

/** Người dùng dán link YouTube → chuyển sang /watch/[videoId], phụ đề được lấy tự động. */
export default function YouTubeUrlForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition(); // tự hết khi điều hướng xong — state của trang được giữ lại khi bấm Back

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const id = extractVideoId(url);
        if (!id) return setError("Link YouTube không hợp lệ");
        setError("");
        startTransition(() => router.push(`/watch/${id}`));
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          className="input min-w-0 flex-1 border-ink"
          placeholder="Dán link video YouTube…"
          aria-label="Link video YouTube"
          inputMode="url"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button className="btn btn-primary px-6 py-3" disabled={pending}>
          {pending ? "Đang lấy phụ đề…" : "Bắt đầu"}
        </button>
      </div>
      {error && <p className="w-fit rounded-xl bg-card px-3 py-1 text-sm font-bold text-red-400">{error}</p>}
    </form>
  );
}
