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
  tracks: { label: string; lines: number; isWhisper: boolean; auto: boolean }[];
  hasWhisper: boolean;
  hasYoutubeManual: boolean;
  hasYoutubeAuto: boolean;
  lessonId: number | null;
};

type SourceFilter = "all" | "whisper" | "yt" | "linked";

export default function TranscriptList({ videos }: { videos: SavedVideo[] }) {
  const [q, setQ] = useState("");
  const [source, setSource] = useState<SourceFilter>("all");
  const query = q.trim().toLowerCase();

  const shown = videos.filter((v) => {
    if (source === "whisper" && !v.hasWhisper) return false;
    if (source === "yt" && !v.hasYoutubeManual && !v.hasYoutubeAuto) return false;
    if (source === "linked" && v.lessonId === null) return false;
    if (!query) return true;
    return v.title.toLowerCase().includes(query) || v.videoId.toLowerCase().includes(query);
  });

  const filters: { id: SourceFilter; label: string; count: number }[] = [
    { id: "all", label: "Tất cả", count: videos.length },
    { id: "whisper", label: "Whisper AI", count: videos.filter((v) => v.hasWhisper).length },
    { id: "yt", label: "YouTube", count: videos.filter((v) => v.hasYoutubeManual || v.hasYoutubeAuto).length },
    { id: "linked", label: "Đã có bài học", count: videos.filter((v) => v.lessonId !== null).length },
  ];

  return (
    <>
      <div className="card flex flex-col gap-2.5 p-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="scroll-row flex gap-1.5" role="group" aria-label="Lọc nguồn phụ đề">
          {filters.map((f) => (
            <button key={f.id} type="button" onClick={() => setSource(f.id)} aria-pressed={source === f.id} className="chip text-xs">
              {f.label}
              <span className="font-mono tabular-nums opacity-70">{f.count}</span>
            </button>
          ))}
        </div>
        <label className="input-group w-full sm:w-72">
          <Search className="size-4 shrink-0 text-muted" aria-hidden />
          <input
            aria-label="Tìm theo tiêu đề hoặc mã video"
            placeholder="Tìm theo tiêu đề hoặc mã video…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
      </div>

      <div className="card overflow-hidden p-0">
        <ul className="divide-y divide-line">
          {shown.map((v) => (
            <li key={v.videoId} className="flex flex-wrap items-center gap-3 p-3.5 transition-colors hover:bg-card-2/50 sm:px-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`https://i.ytimg.com/vi/${v.videoId}/default.jpg`} alt="" className="h-12 w-20 shrink-0 rounded-lg bg-card-2 object-cover" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 truncate text-sm font-semibold text-foreground">{v.title}</span>
                  {v.lessonId !== null && (
                    <Link href={`/admin/${v.lessonId}`} className="badge badge-ok hover:underline">
                      Bài #{v.lessonId}
                    </Link>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                  <span className="font-mono text-[11px]">{v.videoId}</span>
                  {v.tracks.map((t) => (
                    <span key={t.label} className={`badge ${t.isWhisper ? "badge-gem" : t.auto ? "badge-gold" : "badge-muted"}`}>
                      {t.label} · {t.lines} dòng
                    </span>
                  ))}
                  {v.updatedAt && <span className="font-mono tabular-nums">lưu {new Date(v.updatedAt).toLocaleDateString("vi-VN")}</span>}
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
            <p>{videos.length ? "Không có phụ đề nào khớp bộ lọc." : "Chưa có phụ đề nào được lưu."}</p>
          </div>
        )}
      </div>
    </>
  );
}
