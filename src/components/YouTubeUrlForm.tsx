"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { extractVideoId } from "@/lib/youtube-id";

/** Người dùng dán link YouTube → chuyển sang /watch/[videoId], phụ đề được lấy tự động. */
export default function YouTubeUrlForm({ secondary = false }: { secondary?: boolean }) {
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
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <input
          className="input min-w-0 flex-1"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "yt-url-error" : undefined}
          placeholder="Dán link video YouTube (ví dụ: https://youtu.be/…)"
          aria-label="Link video YouTube"
          inputMode="url"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button className={`btn ${secondary ? "btn-soft" : "btn-primary"}`} disabled={pending}>
          {pending ? "Đang lấy phụ đề…" : secondary ? "Mở video" : "Bắt đầu"}
        </button>
      </div>
      {error && (
        <p id="yt-url-error" role="alert" className="field-error text-sm">
          {error}
        </p>
      )}
    </form>
  );
}
