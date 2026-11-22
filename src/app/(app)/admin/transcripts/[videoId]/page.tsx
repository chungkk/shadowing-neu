import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, Play } from "lucide-react";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getCached, savedTranscriptKeys } from "@/lib/db";
import { toSrt } from "@/lib/subtitles";
import type { Transcript } from "@/lib/youtube";
import TranscriptForm from "../TranscriptForm";
import AdminPageHeader from "../../_components/AdminPageHeader";
import { FormSkeleton } from "@/components/Skeleton";

async function Edit({ params, searchParams }: PageProps<"/admin/transcripts/[videoId]">) {
  await requireAdmin();
  const { videoId } = await params;
  const { key: wanted } = await searchParams;

  const entries: { key: string; t: Transcript }[] = [];
  for (const key of savedTranscriptKeys(videoId).sort((a, b) => Number(b.endsWith(":default")) - Number(a.endsWith(":default")))) {
    const t = getCached<Transcript>(key);
    if (t && !entries.some((e) => e.t.track.languageCode === t.track.languageCode)) entries.push({ key, t });
  }
  if (!entries.length) notFound();
  const current = entries.find((e) => e.key === wanted) ?? entries[0];
  const label = (t: Transcript) =>
    t.track.languageCode === "whisper" ? "Whisper v1 (AI)" : t.track.languageCode === "whisper-v2" ? "Whisper v2 (AI)" : `${t.track.name}${t.track.auto ? " (tự động)" : ""}`;

  return (
    <>
      <AdminPageHeader
        crumbs={[
          { label: "Nội dung học tập" },
          { label: "Kho phụ đề", href: "/admin/transcripts" },
          { label: videoId },
        ]}
        title="Sửa phụ đề đã lưu"
        description={current.t.title}
        actions={
          <>
            <Link href={`/watch/${videoId}`} className="btn btn-ghost btn-sm">
              <Play className="size-4" aria-hidden /> Xem video
            </Link>
            <Link href="/admin/transcripts" className="btn btn-sm">
              <ArrowLeft className="size-4" aria-hidden /> Kho phụ đề
            </Link>
          </>
        }
      />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {entries.length > 1 &&
          entries.map((e) => (
            <Link
              key={e.key}
              href={`?key=${encodeURIComponent(e.key)}`}
              className="chip hit-44 min-h-8 px-3 py-1 text-xs"
              aria-current={e.key === current.key ? "true" : undefined}
            >
              {label(e.t)}
            </Link>
          ))}
        <span className="badge badge-muted font-mono tabular-nums">
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
    <Suspense fallback={<FormSkeleton fields={1} />}>
      <Edit {...props} />
    </Suspense>
  );
}
