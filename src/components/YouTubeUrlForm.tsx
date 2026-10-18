"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { extractVideoId } from "@/lib/youtube-id";

/** Người dùng dán link YouTube → chuyển sang /watch/[videoId], phụ đề được lấy tự động. */
export default function YouTubeUrlForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const id = extractVideoId(url);
        if (!id) return setError("Link YouTube không hợp lệ");
        setError("");
        setPending(true);
        router.push(`/watch/${id}`);
      }}
    >
      <div className="flex gap-2">
        <input
          className="input flex-1"
          placeholder="Dán link YouTube… (https://www.youtube.com/watch?v=…)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button className="btn btn-primary" disabled={pending}>
          {pending ? "Đang lấy phụ đề…" : "Bắt đầu"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
