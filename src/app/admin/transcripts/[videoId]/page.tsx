import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getCached, savedTranscriptKeys } from "@/lib/db";
import { toSrt } from "@/lib/subtitles";
import type { Transcript } from "@/lib/youtube";
import TranscriptForm from "../TranscriptForm";

async function Edit({ params, searchParams }: PageProps<"/admin/transcripts/[videoId]">) {
  await requireAdmin();
  const { videoId } = await params;
  const { key: wanted } = await searchParams;

  // Mỗi track chỉ hiện 1 lựa chọn (bản "mặc định" và bản theo mã track là một)
  const entries: { key: string; t: Transcript }[] = [];
  for (const key of savedTranscriptKeys(videoId).sort((a) => (a.endsWith(":default") ? -1 : 1))) {
    const t = getCached<Transcript>(key);
    if (t && !entries.some((e) => e.t.track.languageCode === t.track.languageCode)) entries.push({ key, t });
  }
  if (!entries.length) notFound();
  const current = entries.find((e) => e.key === wanted) ?? entries[0];
  const label = (t: Transcript) =>
    t.track.languageCode === "whisper" ? "Whisper (AI)" : `${t.track.name}${t.track.auto ? " (tự động)" : ""}`;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link href={`/watch/${videoId}`} className="btn">
          Xem video
        </Link>
        {entries.length > 1 &&
          entries.map((e) => (
            <Link
              key={e.key}
              href={`?key=${encodeURIComponent(e.key)}`}
              className={`btn ${e.key === current.key ? "border-accent text-accent" : ""}`}
            >
              {label(e.t)}
            </Link>
          ))}
        <span className="text-muted">
          {label(current.t)} · {current.t.segments.length} dòng
        </span>
      </div>
      <TranscriptForm
        key={current.key}
        videoId={videoId}
        storageKey={current.key}
        title={current.t.title}
        srt={toSrt(current.t.segments)}
      />
    </>
  );
}

export default function EditTranscriptPage(props: PageProps<"/admin/transcripts/[videoId]">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 md:p-6">
      <h1 className="text-2xl font-extrabold">Sửa phụ đề đã lưu</h1>
      <Suspense fallback={<p className="text-muted">Đang tải…</p>}>
        <Edit {...props} />
      </Suspense>
    </main>
  );
}
