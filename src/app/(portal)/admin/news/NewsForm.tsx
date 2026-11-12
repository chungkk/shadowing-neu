"use client";

import { useActionState } from "react";
import type { NewsPost } from "@/lib/db";
import { saveNewsPost } from "./actions";

export default function NewsForm({ post, cover }: { post?: NewsPost; cover?: string | null }) {
  const [state, action, saving] = useActionState(saveNewsPost, {});
  return (
    <form action={action} className="card flex flex-col gap-4">
      {post && <input type="hidden" name="id" value={post.id} />}
      <label className="field text-sm">
        Tiêu đề *
        <input name="title" required maxLength={200} defaultValue={post?.title} className="input text-foreground" />
      </label>
      <label className="field text-sm">
        Tóm tắt (hiện ở trang tin và khi chia sẻ)
        <textarea name="summary" rows={2} maxLength={500} defaultValue={post?.summary} className="input text-foreground" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field text-sm">
          Chuyên mục
          <input name="category" maxLength={40} defaultValue={post?.category} placeholder="Đời sống, Thủ tục, Lái xe…" className="input text-foreground" />
        </label>
        <label className="field text-sm">
          Ảnh bìa (JPG / PNG / WebP, tối đa 4,5 MB)
          <input name="cover" type="file" accept="image/jpeg,image/png,image/webp" className="input text-foreground" />
        </label>
      </div>
      {cover && (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} alt="Ảnh bìa hiện tại" className="h-20 rounded-xl border-2 border-ink object-cover" />
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" name="removeCover" /> Xoá ảnh bìa
          </label>
        </div>
      )}
      <label className="field text-sm">
        Nội dung
        <textarea name="body" rows={16} defaultValue={post?.body} className="input font-mono text-foreground" />
        <span className="text-xs">
          Các đoạn cách nhau 1 dòng trống · <code>## </code> tiêu đề nhỏ · dòng bắt đầu <code>- </code> là danh sách · <code>**đậm**</code> ·{" "}
          <code>[chữ](https://link)</code>
        </span>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field text-sm">
          Nguồn tham khảo (nếu có)
          <input name="sourceName" maxLength={100} defaultValue={post?.sourceName} placeholder="vd. tagesschau.de" className="input text-foreground" />
        </label>
        <label className="field text-sm">
          Link nguồn
          <input name="sourceUrl" type="url" maxLength={500} defaultValue={post?.sourceUrl} placeholder="https://…" className="input text-foreground" />
        </label>
      </div>
      <label className="flex items-center gap-2 font-bold">
        <input type="checkbox" name="published" defaultChecked={post?.published ?? true} /> Đăng công khai (bỏ chọn = bản nháp)
      </label>
      {state.error && <p className="text-sm font-bold text-red-400">{state.error}</p>}
      <button className="btn btn-primary self-start" disabled={saving}>
        {saving ? "Đang lưu…" : "Lưu bài"}
      </button>
    </form>
  );
}
