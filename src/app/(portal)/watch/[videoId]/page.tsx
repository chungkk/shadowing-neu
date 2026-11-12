import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import ShadowPlayer from "@/components/ShadowPlayer";
import { RememberVideo } from "@/components/RecentVideos";
import { extractVideoId, getYouTubeTranscript, WHISPER } from "@/lib/youtube";
import { getCurrentUser } from "@/lib/auth";
import { lockedLessonOfVideo } from "@/lib/access";
import { PlayerSkeleton } from "@/components/Skeleton";
import { clientIp } from "@/lib/rate-limit";

async function Watch({ params }: PageProps<"/watch/[videoId]">) {
  const { videoId: rawId } = await params;
  const user = await getCurrentUser();
  // chỉ người đã đăng nhập mới được chạy Whisper (tốn tiền API); hạn mức lấy phụ đề mới theo người / IP khách
  const opts = { whisper: !!user, quotaKey: user ? `u:${user.id}` : `ip:${await clientIp()}` };
  // Video của bài đang khoá → sang trang bài (màn mở khoá), không cho học lách qua link YouTube
  const locked = lockedLessonOfVideo(user, extractVideoId(rawId) ?? "");
  if (locked) redirect(`/${locked.slug}`);

  let data: Awaited<ReturnType<typeof getYouTubeTranscript>>;
  try {
    const videoId = extractVideoId(rawId);
    if (!videoId) throw new Error("Link YouTube không hợp lệ");
    data = await getYouTubeTranscript(videoId, undefined, opts);
  } catch (e) {
    return (
      <main className="mx-auto flex max-w-xl flex-col items-center gap-4 p-4 pt-20 text-center">
        <p className="rounded-md bg-red-500/10 p-4 text-sm text-red-400">{(e as Error).message}</p>
        <Link href="/" className="btn">
          ← Về trang chủ
        </Link>
      </main>
    );
  }

  return (
    <>
      <RememberVideo videoId={data.videoId} title={data.title} />
      <ShadowPlayer
        title={data.title}
        videoId={data.videoId}
        segments={data.segments}
        loggedIn={!!user}
        sourceUrl={`/watch/${data.videoId}`}
      >
        <div className="flex flex-wrap items-end gap-3 text-xs text-muted">
          {data.track.auto && <span>⚠ Phụ đề tự động — có thể sai chính tả / thiếu dấu câu.</span>}
          {data.track.languageCode === WHISPER && <span>Phụ đề do Whisper (AI) tạo.</span>}
        </div>
      </ShadowPlayer>
    </>
  );
}

export default function Page(props: PageProps<"/watch/[videoId]">) {
  return (
    <Suspense
      fallback={
        <PlayerSkeleton>
          <p className="text-xs text-muted">
            Đang lấy phụ đề… Nếu video không có phụ đề, Whisper (AI) sẽ tạo — có thể mất tới 1 phút.
          </p>
        </PlayerSkeleton>
      }
    >
      <Watch {...props} />
    </Suspense>
  );
}
