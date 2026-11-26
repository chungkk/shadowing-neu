"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { extractVideoId } from "@/lib/youtube-id";

/** Người dùng dán link YouTube → chuyển sang /watch/[videoId], phụ đề được lấy tự động. */
export default function YouTubeUrlForm({ secondary = false }: { secondary?: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
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
        <div className="input-group min-w-0 flex-1 pr-2">
          <input
            ref={inputRef}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "yt-url-error" : undefined}
            placeholder="Dán link video YouTube (ví dụ: https://youtu.be/…)"
            aria-label="Link video YouTube"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (error) setError("");
            }}
          />
          {url && (
            <button
              type="button"
              onClick={() => {
                setUrl("");
                setError("");
                inputRef.current?.focus();
              }}
              aria-label="Xoá link"
              title="Xoá link"
              className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-card-2 hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <button className={`btn ${secondary ? "btn-soft" : "btn-primary"}`} disabled={pending || !url.trim()}>
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
