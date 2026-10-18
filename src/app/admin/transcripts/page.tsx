import { Suspense } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listSavedTranscripts } from "@/lib/db";
import TranscriptList, { type SavedVideo } from "./TranscriptList";

async function Transcripts() {
  await requireAdmin();
  // Gom các bản lưu theo video; bản "mặc định" và bản theo mã track trùng nhau → chỉ hiện 1 lần
  const videos = new Map<string, SavedVideo>();
  for (const r of listSavedTranscripts()) {
    if (!r.videoId) continue;
    const v = videos.get(r.videoId) ?? { videoId: r.videoId, title: r.title, updatedAt: r.updatedAt, tracks: [] };
    const label = r.languageCode === "whisper" ? "Whisper (AI)" : `${r.trackName}${r.auto ? " (tự động)" : ""}`;
    if (!v.tracks.some((t) => t.label === label)) v.tracks.push({ label, lines: r.lines });
    v.updatedAt = Math.max(v.updatedAt ?? 0, r.updatedAt ?? 0) || null;
    videos.set(r.videoId, v);
  }
  const list = [...videos.values()];

  return (
    <>
      <div className="flex items-center gap-2">
        <h1 className="flex-1 text-2xl font-extrabold">Phụ đề đã lưu ({list.length} video)</h1>
        <Link href="/admin" className="btn">
          Bài học
        </Link>
      </div>
      <p className="text-sm text-muted">
        Phụ đề của các video YouTube người dùng đã mở, lưu lại để người sau mở cùng video có ngay. Sửa nếu phụ đề sai;
        xoá để lần sau lấy lại từ YouTube / Whisper.
      </p>
      <TranscriptList videos={list} />
    </>
  );
}

export default function TranscriptsPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 md:p-6">
      <Suspense fallback={<p className="text-muted">Đang tải…</p>}>
        <Transcripts />
      </Suspense>
    </main>
  );
}
