import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { listNewsItems, listNewsPosts } from "@/lib/db";
import { lastNewsFetch, sourceOf } from "@/lib/news";
import { categoryLabel, guidePath, seedGuidesOnce } from "@/lib/guides";
import { translationEnabled } from "@/lib/translate";
import DeleteButton from "../DeleteButton";
import FetchNowButton from "./FetchNowButton";
import { removeNewsPost, toggleNewsItem } from "./actions";
import { ListSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = { title: "Quản lý hướng dẫn & tin", robots: { index: false } };

const when = (ms: number) => new Date(ms).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" });

async function Manage() {
  const admin = await requireAdmin();
  const seeded = seedGuidesOnce(admin.id); // lần đầu: nạp bài hướng dẫn mẫu thành bản nháp
  const posts = listNewsPosts({ includeDrafts: true, limit: 200 });
  const items = listNewsItems({ admin: true, limit: 150 });
  const last = lastNewsFetch();
  return (
    <>
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="flex-1 text-2xl font-extrabold">Bài hướng dẫn ({posts.length})</h1>
          <Link href="/admin/news/new" className="btn btn-primary">
            + Bài mới
          </Link>
        </div>
        {seeded > 0 && (
          <p className="rounded-2xl border-2 border-amber/50 bg-amber/10 p-3 text-sm">
            Đã thêm {seeded} bài hướng dẫn mẫu ở dạng <b>bản nháp</b>. Hãy đọc kỹ, sửa cho đúng với thực tế rồi tick “Đăng công khai”.
          </p>
        )}
        {posts.length === 0 && <p className="text-sm text-muted">Chưa có bài nào.</p>}
        <ul className="flex flex-col gap-2">
          {posts.map((p) => (
            <li key={p.id} className="card flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{p.title}</p>
                <p className="text-xs text-muted">
                  {p.published ? "Đã đăng" : "Bản nháp"} · {when(p.createdAt)}
                  {p.category ? ` · ${categoryLabel(p.category)}` : ""}
                </p>
              </div>
              <Link href={guidePath(p.slug)} className="btn">
                Xem
              </Link>
              <Link href={`/admin/news/${p.id}`} className="btn">
                Sửa
              </Link>
              <DeleteButton action={removeNewsPost.bind(null, p.id)} confirmText="Xoá bài viết này?" />
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-extrabold">Tin tự động ({items.length})</h2>
        <p className="text-sm text-muted">
          Lấy RSS mỗi 30 phút khi có người mở trang chủ, dịch tiêu đề + tóm tắt bằng AI.
          {last ? ` Lần lấy gần nhất: ${when(last)}.` : " Chưa lấy lần nào."}
          {!translationEnabled() && " ⚠ Server chưa cấu hình AI (TRANSCRIBE_API_KEY / OPENAI_API_KEY) nên tin chưa được dịch và chưa hiện."}
        </p>
        <FetchNowButton />
        <ul className="flex flex-col gap-2">
          {items.map((it) => (
            <li key={it.id} className={`card flex flex-wrap items-center gap-3 p-3 ${it.hidden ? "opacity-50" : ""}`}>
              <div className="min-w-0 flex-1">
                <p className="font-bold">{it.titleVi || <span className="text-muted">(chưa dịch) {it.title}</span>}</p>
                <p className="text-xs text-muted">
                  {sourceOf(it.source)?.name ?? it.source} · {when(it.publishedAt)} ·{" "}
                  <a href={it.url} target="_blank" rel="noopener noreferrer" className="underline">
                    bài gốc
                  </a>
                </p>
              </div>
              <form action={toggleNewsItem.bind(null, it.id, !it.hidden)}>
                <button className="btn">{it.hidden ? "Hiện lại" : "Ẩn"}</button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-6">
      <Suspense fallback={<ListSkeleton rows={8} />}>
        <Manage />
      </Suspense>
    </main>
  );
}
