import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CircleCheck, ExternalLink, Plus, RefreshCw, Tv } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getChannel, lessonsByVideoIds, saveChannel } from "@/lib/db";
import { ytdlpChannel } from "@/lib/ytdlp";
import { removeChannel } from "../../actions";
import AdminNav from "../../AdminNav";
import DeleteButton from "../../DeleteButton";
import { LessonGridSkeleton } from "@/components/Skeleton";

const PAGE = 30;
const MAX = 300;

const fmtDuration = (s: number | null) => {
  if (s == null) return "";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
};

async function Videos({ params, searchParams }: PageProps<"/admin/channels/[id]">) {
  await requireAdmin();
  const channel = getChannel(Number((await params).id));
  if (!channel) notFound();
  const sp = await searchParams;
  const limit = Math.min(MAX, Math.max(PAGE, Number(sp.n) || PAGE));
  const fresh = sp.fresh === "1";

  let listing;
  try {
    listing = await ytdlpChannel(`https://www.youtube.com/channel/${channel.channelId}/videos`, limit, { fresh });
  } catch (e) {
    return (
      <p role="alert" className="alert alert-err">
        Không lấy được danh sách video: {(e as Error).message}
      </p>
    );
  }
  // Kênh đổi tên / ảnh → cập nhật bản đã lưu
  if (listing.title !== channel.title || listing.avatar !== channel.avatar || listing.handle !== channel.handle) saveChannel(listing);

  const lessons = lessonsByVideoIds(listing.videos.map((v) => v.id));
  const base = `/admin/channels/${channel.id}`;

  return (
    <>
      <p className="text-sm text-muted">
        {listing.videos.length} video mới nhất · <span className="text-ok-text">{lessons.size} đã có bài</span>
      </p>
      {listing.videos.length ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {listing.videos.map((v) => {
            const lesson = lessons.get(v.id);
            return (
              <li key={v.id} className="card flex flex-col gap-2 p-2.5">
                <a href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noreferrer" className="relative block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`}
                    alt=""
                    loading="lazy"
                    className={`aspect-video w-full rounded-lg bg-card-2 object-cover ${lesson ? "opacity-60" : ""}`}
                  />
                  {v.duration != null && (
                    <span className="absolute right-1.5 bottom-1.5 rounded bg-black/75 px-1.5 py-0.5 text-xs font-semibold text-white tabular-nums">
                      {fmtDuration(v.duration)}
                    </span>
                  )}
                </a>
                <p className="line-clamp-2 min-h-10 text-sm font-semibold" title={v.title}>
                  {v.title}
                </p>
                <div className="mt-auto flex items-center gap-1.5">
                  {lesson ? (
                    <>
                      <span className="badge badge-ok gap-1">
                        <CircleCheck className="size-3.5" aria-hidden />
                        {lesson.published ? "Đã có bài" : "Đã có bài (nháp)"}
                      </span>
                      <Link href={`/admin/${lesson.id}`} className="btn btn-sm ml-auto">
                        Sửa bài
                      </Link>
                    </>
                  ) : (
                    <Link href={`/admin/new?v=${v.id}`} className="btn btn-primary btn-sm ml-auto">
                      <Plus className="size-3.5" aria-hidden /> Thêm bài
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="card empty">
          <span className="icon-bubble tint-muted">
            <Tv className="size-5" aria-hidden />
          </span>
          <p>Kênh chưa có video nào.</p>
        </div>
      )}
      {listing.videos.length >= limit && limit < MAX && (
        <Link href={`${base}?n=${limit + PAGE}`} scroll={false} className="btn self-center">
          Xem thêm video
        </Link>
      )}
    </>
  );
}

async function Header({ params }: PageProps<"/admin/channels/[id]">) {
  await requireAdmin();
  const channel = getChannel(Number((await params).id));
  if (!channel) notFound();
  return (
    <div className="flex flex-wrap items-center gap-3">
      {channel.avatar && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={channel.avatar} alt="" className="size-12 shrink-0 rounded-full bg-card-2 object-cover" />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <h1 className="page-title truncate">{channel.title}</h1>
        {channel.handle && <span className="text-sm text-muted">{channel.handle}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-1.5 max-sm:basis-full">
        <a href={`https://www.youtube.com/channel/${channel.channelId}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
          <ExternalLink className="size-3.5" aria-hidden /> YouTube
        </a>
        <Link href={`/admin/channels/${channel.id}?fresh=1`} className="btn btn-sm" title="Lấy lại danh sách video mới nhất từ YouTube">
          <RefreshCw className="size-3.5" aria-hidden /> Làm mới
        </Link>
        <DeleteButton action={removeChannel.bind(null, channel.id, true)} confirmText={`Xoá kênh “${channel.title}” khỏi danh sách? Bài học đã tạo từ kênh vẫn giữ nguyên.`} />
      </div>
    </div>
  );
}

export default function ChannelPage(props: PageProps<"/admin/channels/[id]">) {
  return (
    <main className="page">
      <AdminNav />
      <Link href="/admin/channels" className="inline-flex items-center gap-1 self-start text-sm font-semibold text-muted hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Các kênh
      </Link>
      <Suspense fallback={null}>
        <Header {...props} />
      </Suspense>
      <Suspense fallback={<LessonGridSkeleton count={6} />}>
        <Videos {...props} />
      </Suspense>
    </main>
  );
}
