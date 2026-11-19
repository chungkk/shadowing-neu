import { Suspense } from "react";
import Link from "next/link";
import { Tv } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { listChannels } from "@/lib/db";
import { removeChannel } from "../actions";
import AdminNav from "../AdminNav";
import DeleteButton from "../DeleteButton";
import AddChannelForm from "./AddChannelForm";
import { ListSkeleton } from "@/components/Skeleton";

async function Channels() {
  await requireAdmin();
  const channels = listChannels();
  return (
    <>
      <AddChannelForm />
      <div className="card overflow-hidden p-0">
        {channels.length ? (
          <ul className="divide-y divide-line">
            {channels.map((c) => (
              <li key={c.id} className="flex items-center gap-3 p-3 transition-colors hover:bg-card-2/60 sm:px-4">
                <Link href={`/admin/channels/${c.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  {c.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.avatar} alt="" className="size-11 shrink-0 rounded-full bg-card-2 object-cover" />
                  ) : (
                    <span className="icon-bubble tint-muted size-11 shrink-0">
                      <Tv className="size-5" aria-hidden />
                    </span>
                  )}
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-semibold">{c.title}</span>
                    {c.handle && <span className="truncate text-xs text-muted">{c.handle}</span>}
                  </span>
                </Link>
                <Link href={`/admin/channels/${c.id}`} className="btn btn-sm max-sm:hidden">
                  Xem video
                </Link>
                <DeleteButton action={removeChannel.bind(null, c.id)} confirmText={`Xoá kênh “${c.title}” khỏi danh sách? Bài học đã tạo từ kênh vẫn giữ nguyên.`} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty">
            <span className="icon-bubble tint-muted">
              <Tv className="size-5" aria-hidden />
            </span>
            <p>Chưa lưu kênh nào. Dán link kênh YouTube ở trên để thêm.</p>
          </div>
        )}
      </div>
    </>
  );
}

export default function ChannelsPage() {
  return (
    <main className="page">
      <AdminNav />
      <h1 className="page-title">Kênh YouTube</h1>
      <Suspense fallback={<ListSkeleton />}>
        <Channels />
      </Suspense>
    </main>
  );
}
