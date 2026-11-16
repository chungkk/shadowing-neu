"use client";

import { useState } from "react";
import Link from "next/link";
import { Captions, Search } from "lucide-react";
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
      <label className="input-group">
        <Search className="size-4 shrink-0 text-muted" aria-hidden />
        <input
          aria-label="Tìm theo tiêu đề hoặc mã video"
          placeholder="Tìm theo tiêu đề hoặc mã video…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </label>
      <div className="card overflow-hidden p-0">
        <ul className="divide-y divide-line">
        {shown.map((v) => (
          <li key={v.videoId} className="flex flex-wrap items-center gap-3 p-3 transition-colors hover:bg-card-2/50 sm:px-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://i.ytimg.com/vi/${v.videoId}/default.jpg`} alt="" className="h-12 w-20 shrink-0 rounded-xl bg-card-2 object-cover" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="truncate font-bold">{v.title}</div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                {v.tracks.map((t) => (
                  <span key={t.label} className="badge badge-muted">
                    {t.label} · {t.lines} dòng
                  </span>
                ))}
                {v.updatedAt && <span className="tabular-nums">lưu {new Date(v.updatedAt).toLocaleDateString("vi-VN")}</span>}
              </div>
            </div>
            <div className="flex items-center gap-1.5 max-sm:basis-full max-sm:justify-end">
              <Link href={`/watch/${v.videoId}`} className="btn btn-ghost btn-sm">
                Xem
              </Link>
              <Link href={`/admin/transcripts/${v.videoId}`} className="btn btn-sm">
                Sửa
              </Link>
              <DeleteButton
                action={removeTranscripts.bind(null, v.videoId)}
                confirmText={`Xoá phụ đề đã lưu của “${v.title}”? Lần sau có người mở, app sẽ lấy lại từ YouTube / Whisper.`}
              />
            </div>
          </li>
        ))}
        </ul>
        {!shown.length && (
          <div className="empty">
            <span className="icon-bubble tint-muted">
              {videos.length ? <Search className="size-5" aria-hidden /> : <Captions className="size-5" aria-hidden />}
            </span>
            <p>{videos.length ? `Không tìm thấy “${q}”.` : "Chưa có phụ đề nào được lưu."}</p>
          </div>
        )}
      </div>
    </>
  );
}
