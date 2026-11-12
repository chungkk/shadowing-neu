import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { listNewsItems, listNewsPosts } from "@/lib/db";
import { lastNewsFetch, newsSources } from "@/lib/news";
import { translationEnabled } from "@/lib/translate";
import DeleteButton from "../DeleteButton";
import FetchNowButton from "./FetchNowButton";
import SourceForm from "./SourceForm";
import { removeNewsPost, removeSource, toggleNewsItem, toggleSource } from "./actions";
import { ListSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = { title: "Quản lý tin tức", robots: { index: false } };

const when = (ms: number) => new Date(ms).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" });

async function Manage() {
  await requireAdmin();
  const sources = newsSources();
  const nameOf = (key: string) => sources.find((s) => s.key === key)?.name ?? key;
  const posts = listNewsPosts({ includeDrafts: true, limit: 200 });
  const items = listNewsItems({ admin: true, limit: 150 });
  const last = lastNewsFetch();
  return (
    <>
      <section className="flex flex-col gap-3">
        <h1 className="text-2xl font-extrabold">Nguồn tin ({sources.filter((s) => s.enabled).length} đang bật)</h1>
        <p className="text-sm text-muted">Tab Tin tức tự lấy tin từ các nguồn dưới đây. Tắt = ngừng lấy và ẩn tin của nguồn đó; xoá = bỏ nguồn và xoá tin đã lấy.</p>
        <ul className="flex flex-col gap-2">
          {sources.map((s) => (
            <li key={s.key} className={`card flex flex-wrap items-center gap-3 p-3 ${s.enabled ? "" : "opacity-60"}`}>
              <span className="size-3 shrink-0 rounded-full" style={{ background: s.color }} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-bold">
                  {s.name} {!s.enabled && <span className="text-xs font-bold text-muted">· đang tắt</span>}
                </p>
                <p className="truncate text-xs text-muted">{s.url}</p>
              </div>
              <form action={toggleSource.bind(null, s.key, !s.enabled)}>
                <button className="btn">{s.enabled ? "Tắt" : "Bật"}</button>
              </form>
              <DeleteButton action={removeSource.bind(null, s.key)} confirmText={`Bỏ nguồn “${s.name}” và xoá các tin đã lấy của nguồn này?`} />
            </li>
          ))}
        </ul>
        {sources.length === 0 && <p className="text-sm text-muted">Chưa có nguồn nào — thêm ít nhất một nguồn để tab Tin tức có tin.</p>}
        <SourceForm />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-extrabold">Tin tự động ({items.length})</h2>
        <p className="text-sm text-muted">
          Lấy tin từ các nguồn đang bật, tối đa 30 phút / lần khi có người mở tab Tin tức; AI dịch tiêu đề + tóm tắt sang tiếng Việt.
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
                  {nameOf(it.source)} · {when(it.publishedAt)} ·{" "}
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

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="flex-1 text-xl font-extrabold">Bài tự viết ({posts.length})</h2>
          <Link href="/admin/news/new" className="btn btn-primary">
            + Bài mới
          </Link>
        </div>
        {posts.length === 0 && <p className="text-sm text-muted">Chưa có bài nào. Bài tự viết hiện ở đầu tab Tin tức, phía trên tin tự động.</p>}
        <ul className="flex flex-col gap-2">
          {posts.map((p) => (
            <li key={p.id} className="card flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{p.title}</p>
                <p className="text-xs text-muted">
                  {p.published ? "Đã đăng" : "Bản nháp"} · {when(p.createdAt)}
                  {p.category ? ` · ${p.category}` : ""}
                </p>
              </div>
              <Link href={`/tin-tuc/${p.slug}`} className="btn">
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
