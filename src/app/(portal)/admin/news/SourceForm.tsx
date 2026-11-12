"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { addSource } from "./actions";

/** Thêm nguồn tin: tên + địa chỉ feed RSS / Atom (server đọc thử feed rồi mới lưu) */
export default function SourceForm() {
  const [state, action, saving] = useActionState(addSource, {});
  return (
    <form action={action} className="card flex flex-col gap-3">
      <p className="font-extrabold">Thêm nguồn</p>
      <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
        <label className="field text-sm">
          Tên hiện trên trang
          <input name="name" required maxLength={40} placeholder="vd. Spiegel" className="input text-foreground" />
        </label>
        <label className="field text-sm">
          Địa chỉ feed RSS / Atom
          <input name="url" type="url" required maxLength={500} placeholder="https://www.spiegel.de/schlagzeilen/index.rss" className="input text-foreground" />
        </label>
      </div>
      {state.error && <p className="text-sm font-bold text-red-400">{state.error}</p>}
      {state.ok && <p className="text-sm font-bold text-accent-text">{state.ok}</p>}
      <button className="btn btn-primary self-start" disabled={saving}>
        <Plus className="size-4" /> {saving ? "Đang đọc thử feed…" : "Thêm nguồn"}
      </button>
    </form>
  );
}
