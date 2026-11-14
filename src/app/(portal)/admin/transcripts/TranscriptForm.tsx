"use client";

import { useActionState, useState } from "react";
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
  // Giữ trong state: React 19 reset form sau khi gửi → lưu lỗi sẽ mất toàn bộ phần đã sửa
  const [titleValue, setTitle] = useState(title);
  const [srtValue, setSrt] = useState(srt);
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="field card text-sm">
        Tiêu đề
        <input name="title" className="input text-foreground" value={titleValue} onChange={(e) => setTitle(e.target.value)} required />
      </label>
      <label className="field card text-sm">
        Phụ đề (SRT) — sửa nội dung hoặc thời gian từng dòng
        <textarea name="srt" rows={20} className="input font-mono text-base text-foreground md:text-xs" value={srtValue} onChange={(e) => setSrt(e.target.value)} spellCheck={false} />
      </label>
      {state.error && <p className="rounded-md bg-red-500/10 p-3 text-sm text-red-400">{state.error}</p>}
      <div className="flex gap-2 max-sm:*:flex-1">
        <button className="btn btn-lg btn-primary" disabled={saving}>
          {saving ? "Đang lưu…" : "Lưu phụ đề"}
        </button>
        <Link href="/admin/transcripts" className="btn">
          Huỷ
        </Link>
      </div>
    </form>
  );
}
