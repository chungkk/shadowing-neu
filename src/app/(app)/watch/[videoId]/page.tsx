import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import ShadowPlayer from "@/components/ShadowPlayer";
import Mascot from "@/components/Mascot";
import { RememberVideo } from "@/components/RecentVideos";
import { extractVideoId, getYouTubeTranscript, WHISPER } from "@/lib/youtube";
import { getCurrentUser } from "@/lib/auth";
import { lockedLessonOfVideo } from "@/lib/access";
import { PlayerSkeleton } from "@/components/Skeleton";
import { clientIp } from "@/lib/rate-limit";
import { lessonPath } from "@/lib/slug";

// Video YouTube bất kỳ người dùng dán vào: không phải nội dung của site (và tạo phụ đề tốn API) → không cho index
export const metadata: Metadata = {
  title: "Luyện shadowing tiếng Đức với video YouTube",
  description: "Dán link YouTube có phụ đề tiếng Đức để luyện nghe nói từng câu: shadowing, ghi âm, chép chính tả và lưu từ vựng.",
  robots: { index: false, follow: true },
};

async function Watch({ params }: PageProps<"/watch/[videoId]">) {
  const { videoId: rawId } = await params;
  const user = await getCurrentUser();
  // chỉ người đã đăng nhập mới được chạy Whisper (tốn tiền API); hạn mức lấy phụ đề mới theo người / IP khách
  const opts = { whisper: !!user, quotaKey: user ? `u:${user.id}` : `ip:${await clientIp()}` };
  // Video của bài đang khoá → sang trang bài (màn mở khoá), không cho học lách qua link YouTube
  const locked = lockedLessonOfVideo(user, extractVideoId(rawId) ?? "");
  if (locked) redirect(lessonPath(locked.slug));

  let data: Awaited<ReturnType<typeof getYouTubeTranscript>>;
  try {
    const videoId = extractVideoId(rawId);
    if (!videoId) throw new Error("Link YouTube không hợp lệ");
    data = await getYouTubeTranscript(videoId, undefined, opts);
  } catch (e) {
    return (
      <main className="page page-narrow max-w-xl items-center pt-16 text-center">
        <div className="card empty w-full gap-4 py-10">
          <Mascot className="size-24" />
          <p role="alert" className="alert alert-err w-full justify-center">{(e as Error).message}</p>
          <Link href="/tieng-duc" className="btn btn-soft">
            ← Về trang học
          </Link>
        </div>
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
        <div className="flex flex-wrap items-end gap-2 text-xs">
          {data.track.auto && <span className="badge badge-gold">⚠ Phụ đề tự động — có thể sai chính tả / thiếu dấu câu.</span>}
          {data.track.languageCode === WHISPER && <span className="badge badge-gem">Phụ đề do Whisper (AI) tạo.</span>}
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
