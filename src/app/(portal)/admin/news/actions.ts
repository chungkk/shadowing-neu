"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createNewsPost, deleteNewsPost, getNewsPost, setNewsHidden, setNewsPostCover, updateNewsPost, type NewsPostInput } from "@/lib/db";
import { COVER_MAX_BYTES, refreshNews, removeCover, saveCover } from "@/lib/news";
import { guidePath } from "@/lib/guides";

export type NewsFormState = { error?: string };

const text = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").trim().slice(0, max);

/** Lưu bài (thêm mới khi không có id). Ảnh bìa: chọn file mới thì thay, tick "Xoá ảnh" thì bỏ */
export async function saveNewsPost(_prev: NewsFormState, f: FormData): Promise<NewsFormState> {
  const admin = await requireAdmin();
  const input: NewsPostInput = {
    title: text(f, "title", 200),
    summary: text(f, "summary", 500),
    body: text(f, "body", 50_000),
    category: text(f, "category", 40),
    sourceName: text(f, "sourceName", 100),
    sourceUrl: text(f, "sourceUrl", 500),
    published: f.get("published") === "on",
  };
  if (!input.title) return { error: "Cần có tiêu đề" };
  if (input.sourceUrl && !/^https?:\/\//.test(input.sourceUrl)) return { error: "Link nguồn phải bắt đầu bằng https://" };

  const file = f.get("cover");
  let bytes: Uint8Array | null = null;
  if (file instanceof File && file.size > 0) {
    if (file.size > COVER_MAX_BYTES) return { error: "Ảnh bìa tối đa 4,5 MB" };
    bytes = new Uint8Array(await file.arrayBuffer());
  }

  const idRaw = Number(f.get("id"));
  const existing = Number.isInteger(idRaw) && idRaw > 0 ? getNewsPost({ id: idRaw }) : null;
  const id = existing ? existing.id : createNewsPost(input, admin.id);
  if (existing) updateNewsPost(id, input);

  if (bytes) {
    const name = saveCover(bytes);
    if (!name) return { error: "Ảnh bìa phải là JPG, PNG hoặc WebP" };
    removeCover(existing?.cover ?? null);
    setNewsPostCover(id, name);
  } else if (existing?.cover && f.get("removeCover") === "on") {
    removeCover(existing.cover);
    setNewsPostCover(id, null);
  }
  redirect(guidePath(getNewsPost({ id })!.slug));
}

export async function removeNewsPost(id: number) {
  await requireAdmin();
  const post = getNewsPost({ id });
  if (!post) return;
  removeCover(post.cover);
  deleteNewsPost(id);
  redirect("/admin/news");
}

export async function toggleNewsItem(id: number, hidden: boolean) {
  await requireAdmin();
  setNewsHidden(id, hidden);
  refresh();
}

/** Lấy tin + dịch ngay (không chờ 30 phút) */
export async function fetchNewsNow(): Promise<{ message: string }> {
  await requireAdmin();
  const r = await refreshNews({ force: true });
  if (!r) return { message: "Đang lấy tin, thử lại sau ít giây." };
  refresh();
  return {
    message: `Thêm ${r.added} tin, dịch ${r.translated} tin.${r.errors.length ? ` Lỗi: ${r.errors.join("; ")}` : ""}`,
  };
}
