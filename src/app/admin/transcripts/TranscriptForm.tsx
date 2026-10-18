"use client";

import { useActionState } from "react";
import Link from "next/link";
import { saveTranscript } from "../actions";

export default function TranscriptForm({
  videoId,
  storageKey,
  title,
  srt,
}: {
  videoId: string;
  storageKey: string;
  title: string;
  srt: string;
}) {
  const [state, action, saving] = useActionState(saveTranscript.bind(null, videoId, storageKey), {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="field card text-sm">
        Tiêu đề
        <input name="title" className="input text-foreground" defaultValue={title} required />
      </label>
      <label className="field card text-sm">
        Phụ đề (SRT) — sửa nội dung hoặc thời gian từng dòng
        <textarea name="srt" rows={20} className="input font-mono text-xs text-foreground" defaultValue={srt} spellCheck={false} />
      </label>
      {state.error && <p className="rounded-md bg-red-500/10 p-3 text-sm text-red-400">{state.error}</p>}
      <div className="flex gap-2">
        <button className="btn btn-primary" disabled={saving}>
          {saving ? "Đang lưu…" : "Lưu phụ đề"}
        </button>
        <Link href="/admin/transcripts" className="btn">
          Huỷ
        </Link>
      </div>
    </form>
  );
}
