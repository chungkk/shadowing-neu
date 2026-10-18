"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { removeTranscripts } from "../actions";
import DeleteButton from "../DeleteButton";

export type SavedVideo = {
  videoId: string;
  title: string;
  updatedAt: number | null;
  tracks: { label: string; lines: number }[];
};

export default function TranscriptList({ videos }: { videos: SavedVideo[] }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const shown = query
    ? videos.filter((v) => v.title.toLowerCase().includes(query) || v.videoId.toLowerCase().includes(query))
    : videos;

  return (
    <>
      <label className="input flex items-center gap-2 py-2.5">
        <Search className="size-4 text-muted" />
        <input
          className="flex-1 bg-transparent outline-none"
          placeholder="Tìm theo tiêu đề hoặc mã video…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </label>
      <div className="card divide-y divide-border p-0">
        {shown.map((v) => (
          <div key={v.videoId} className="flex flex-wrap items-center gap-3 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://i.ytimg.com/vi/${v.videoId}/default.jpg`} alt="" className="h-12 w-20 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{v.title}</div>
              <div className="flex flex-wrap gap-x-3 text-xs text-muted">
                {v.tracks.map((t) => (
                  <span key={t.label}>
                    {t.label} · {t.lines} dòng
                  </span>
                ))}
                {v.updatedAt && <span>lưu {new Date(v.updatedAt).toLocaleDateString("vi-VN")}</span>}
              </div>
            </div>
            <Link href={`/watch/${v.videoId}`} className="btn">
              Xem
            </Link>
            <Link href={`/admin/transcripts/${v.videoId}`} className="btn">
              Sửa
            </Link>
            <DeleteButton
              action={removeTranscripts.bind(null, v.videoId)}
              confirmText={`Xoá phụ đề đã lưu của “${v.title}”? Lần sau có người mở, app sẽ lấy lại từ YouTube / Whisper.`}
            />
          </div>
        ))}
        {!shown.length && (
          <p className="p-6 text-center text-sm text-muted">
            {videos.length ? `Không tìm thấy “${q}”.` : "Chưa có phụ đề nào được lưu."}
          </p>
        )}
      </div>
    </>
  );
}
