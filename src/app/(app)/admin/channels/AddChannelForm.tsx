"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { addChannel } from "../actions";

/** Dán link / @handle kênh → lưu kênh rồi chuyển sang trang video của kênh */
export default function AddChannelForm() {
  const [state, action, pending] = useActionState(addChannel, {});
  return (
    <form action={action} className="card flex flex-col gap-2">
      <label className="field text-sm">
        Thêm kênh
        <div className="flex gap-2 max-sm:flex-col">
          <input
            name="channel"
            className="input min-w-0 flex-1 text-foreground"
            placeholder="https://www.youtube.com/@EasyGerman hoặc @EasyGerman"
            inputMode="url"
            required
          />
          <button className="btn btn-primary shrink-0" disabled={pending}>
            <Plus className="size-4" aria-hidden />
            {pending ? "Đang lấy kênh…" : "Thêm kênh"}
          </button>
        </div>
      </label>
      {state.error && (
        <p role="alert" className="alert alert-err">
          {state.error}
        </p>
      )}
    </form>
  );
}
