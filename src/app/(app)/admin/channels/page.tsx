import { Suspense } from "react";
import Link from "next/link";
import { ExternalLink, Tv } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { listChannels, listLessons } from "@/lib/db";
import { removeChannel } from "../actions";
import DeleteButton from "../DeleteButton";
import AddChannelForm from "./AddChannelForm";
import AdminPageHeader from "../_components/AdminPageHeader";
import { ListSkeleton } from "@/components/Skeleton";

async function Channels() {
  await requireAdmin();
  const channels = listChannels();
  const lessons = listLessons({ includeDrafts: true });

  // Đếm số bài đã tạo theo @handle hoặc tên kênh
  const countByHandle = new Map<string, number>();
  const countByTitle = new Map<string, number>();
  for (const l of lessons) {
    const h = l.channelUrl?.match(/\/(@[^/?#]+)/)?.[1]?.toLowerCase();
    if (h) countByHandle.set(h, (countByHandle.get(h) ?? 0) + 1);
    const t = l.channel?.trim().toLowerCase();
    if (t) countByTitle.set(t, (countByTitle.get(t) ?? 0) + 1);
  }

  return (
    <>
      <AdminPageHeader
        crumbs={[{ label: "Nội dung học tập" }, { label: "Kênh YouTube" }]}
        title="Kênh YouTube"
        count={channels.length}
        description="Lưu sẵn các kênh tiếng Đức hay để duyệt video mới và tạo bài học Shadowing chỉ bằng 1 chạm."
      />
      <AddChannelForm />
      {channels.length ? (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {channels.map((c) => {
            const n =
              (c.handle ? countByHandle.get(c.handle.toLowerCase()) : undefined) ??
              countByTitle.get(c.title.trim().toLowerCase()) ??
              0;
            return (
              <li key={c.id} className="card flex flex-col gap-3 p-4 transition-colors hover:border-line-strong">
                <Link href={`/admin/channels/${c.id}`} className="flex min-w-0 items-center gap-3">
                  {c.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.avatar} alt="" className="size-12 shrink-0 rounded-full border border-line bg-card-2 object-cover" />
                  ) : (
                    <span className="icon-bubble tint-muted size-12 shrink-0">
                      <Tv className="size-5" aria-hidden />
                    </span>
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate font-bold text-foreground">{c.title}</span>
                    {c.handle && <span className="truncate text-xs text-muted">{c.handle}</span>}
                    <span className="font-mono text-xs text-sec-text tabular-nums">{n} bài học trên HalloVN</span>
                  </div>
                </Link>
                <div className="mt-auto flex items-center gap-1.5 border-t border-line pt-3">
                  <Link href={`/admin/channels/${c.id}`} className="btn btn-sm flex-1">
                    Duyệt video
                  </Link>
                  <a
                    href={`https://www.youtube.com/channel/${c.channelId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-icon size-8 rounded-lg border border-line text-muted hover:bg-card-2 hover:text-foreground"
                    title="Mở kênh trên YouTube"
                    aria-label={`${c.title} trên YouTube`}
                  >
                    <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                  <DeleteButton
                    action={removeChannel.bind(null, c.id)}
                    confirmText={`Xoá kênh “${c.title}” khỏi danh sách? Bài học đã tạo từ kênh vẫn giữ nguyên.`}
                  />
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
          <p>Chưa lưu kênh nào. Dán link kênh YouTube ở trên để thêm.</p>
        </div>
      )}
    </>
  );
}

export default function ChannelsPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <Channels />
    </Suspense>
  );
}
