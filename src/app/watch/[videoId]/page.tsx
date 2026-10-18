import { Suspense } from "react";
import Link from "next/link";
import ShadowPlayer from "@/components/ShadowPlayer";
import TrackSelect from "@/components/TrackSelect";
import { RememberVideo } from "@/components/RecentVideos";
import { getYouTubeTranscript, WHISPER } from "@/lib/youtube";

async function Watch({ params, searchParams }: PageProps<"/watch/[videoId]">) {
  const { videoId } = await params;
  const { lang } = await searchParams;

  let data: Awaited<ReturnType<typeof getYouTubeTranscript>>;
  let notice = "";
  try {
    try {
      data = await getYouTubeTranscript(videoId, typeof lang === "string" ? lang : undefined);
    } catch (e) {
      // Chọn Whisper nhưng thất bại → quay về phụ đề YouTube, kèm thông báo
      if (lang !== WHISPER) throw e;
      notice = (e as Error).message;
      data = await getYouTubeTranscript(videoId);
    }
  } catch (e) {
    return (
      <main className="mx-auto flex max-w-xl flex-col items-center gap-4 p-4 pt-20 text-center">
        <p className="rounded-md bg-red-500/10 p-4 text-sm text-red-600">{(e as Error).message}</p>
        <Link href="/" className="btn">
          ← Về trang chủ
        </Link>
      </main>
    );
  }

  return (
    <>
      <RememberVideo videoId={data.videoId} title={data.title} />
      <ShadowPlayer title={data.title} media={{ kind: "youtube", videoId: data.videoId }} segments={data.segments}>
        <div className="flex flex-wrap items-end gap-3 text-xs text-muted">
          <TrackSelect videoId={data.videoId} tracks={data.tracks} current={data.track.languageCode} />
          {data.track.auto && (
            <span>
              ⚠ Phụ đề tự động — có thể sai chính tả / thiếu dấu câu.
              {!notice &&
                data.tracks.some((t) => t.languageCode === WHISPER) &&
                " Thử chọn “Whisper (AI)” để có phụ đề tốt hơn (video ngắn)."}
            </span>
          )}
          {data.track.languageCode === WHISPER && <span>Phụ đề do Whisper (AI) tạo.</span>}
          {notice && <span className="basis-full text-red-600">⚠ Không tạo được bằng Whisper: {notice}</span>}
        </div>
      </ShadowPlayer>
    </>
  );
}

export default function Page(props: PageProps<"/watch/[videoId]">) {
  return (
    <Suspense
      fallback={
        <div className="p-10 text-center text-muted">
          <p>Đang lấy phụ đề…</p>
          <p className="mt-1 text-xs">Nếu video không có phụ đề, Whisper (AI) sẽ tạo — có thể mất tới 1 phút.</p>
        </div>
      }
    >
      <Watch {...props} />
    </Suspense>
  );
}
