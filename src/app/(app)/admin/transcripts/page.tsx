import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { lessonsByVideoIds, listSavedTranscripts } from "@/lib/db";
import TranscriptList, { type SavedVideo } from "./TranscriptList";
import { ListSkeleton } from "@/components/Skeleton";
import AdminPageHeader from "../_components/AdminPageHeader";
import KpiCard from "../_components/KpiCard";

async function Transcripts() {
  await requireAdmin();
  const rows = listSavedTranscripts();
  const videos = new Map<string, SavedVideo>();
  for (const r of rows) {
    if (!r.videoId) continue;
    const isWhisper = r.languageCode === "whisper" || r.languageCode === "whisper-v2";
    const v = videos.get(r.videoId) ?? {
      videoId: r.videoId,
      title: r.title,
      updatedAt: r.updatedAt,
      tracks: [],
      hasWhisper: false,
      hasYoutubeManual: false,
      hasYoutubeAuto: false,
      lessonId: null,
    };
    const label =
      r.languageCode === "whisper"
        ? "Whisper v1 (AI)"
        : r.languageCode === "whisper-v2"
          ? "Whisper v2 (AI)"
          : `${r.trackName}${r.auto ? " (tự động)" : ""}`;
    if (!v.tracks.some((t) => t.label === label)) v.tracks.push({ label, lines: r.lines, isWhisper, auto: r.auto });
    if (isWhisper) v.hasWhisper = true;
    else if (r.auto) v.hasYoutubeAuto = true;
    else v.hasYoutubeManual = true;
    v.updatedAt = Math.max(v.updatedAt ?? 0, r.updatedAt ?? 0) || null;
    videos.set(r.videoId, v);
  }

  const list = [...videos.values()];
  const linked = lessonsByVideoIds(list.map((v) => v.videoId));
  for (const v of list) v.lessonId = linked.get(v.videoId)?.id ?? null;

  const whisperCount = list.filter((v) => v.hasWhisper).length;
  const ytManualCount = list.filter((v) => v.hasYoutubeManual).length;
  const ytAutoCount = list.filter((v) => v.hasYoutubeAuto).length;
  const linkedCount = list.filter((v) => v.lessonId !== null).length;

  return (
    <>
      <AdminPageHeader
        crumbs={[{ label: "Nội dung học tập" }, { label: "Kho phụ đề" }]}
        title="Kho phụ đề đã lưu"
        count={list.length}
        description="Phụ đề của các video YouTube đã xử lý (YouTube & Whisper AI), lưu cache để người sau mở có ngay. Sửa nếu sai hoặc xoá để lấy lại."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard tone="ink" label="Tổng video" value={list.length} sub={`${linkedCount} video đã làm bài học`} />
        <KpiCard tone="gem" label="Whisper AI" value={whisperCount} sub="Phụ đề tạo từ âm thanh" />
        <KpiCard tone="de" label="YouTube thủ công" value={ytManualCount} sub="Độ chính xác cao" />
        <KpiCard tone="laixe" label="YouTube tự động" value={ytAutoCount} sub="Nên kiểm tra dấu câu" />
      </div>

      <TranscriptList videos={list} />
    </>
  );
}

export default function TranscriptsPage() {
  return (
    <Suspense fallback={<ListSkeleton thumb />}>
      <Transcripts />
    </Suspense>
  );
}
