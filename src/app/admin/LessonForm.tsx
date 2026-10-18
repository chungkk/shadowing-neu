"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { fetchSubtitles, saveLesson, type FetchResult } from "./actions";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

export type LessonFormValues = {
  id?: number;
  url: string;
  title: string;
  description: string;
  level: string;
  published: boolean;
  srt: string;
};

export default function LessonForm({ initial }: { initial?: LessonFormValues }) {
  const [state, formAction, saving] = useActionState(saveLesson, {});
  const [fetching, startFetch] = useTransition();
  const [url, setUrl] = useState(initial?.url ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [srt, setSrt] = useState(initial?.srt ?? "");
  const [info, setInfo] = useState<Extract<FetchResult, { srt: string }> | null>(null);
  const [fetchError, setFetchError] = useState("");

  const load = (lang?: string) =>
    startFetch(async () => {
      setFetchError("");
      const res = await fetchSubtitles(url, lang);
      if ("error" in res) return setFetchError(res.error);
      setInfo(res);
      setSrt(res.srt);
      if (!title || title === info?.title) setTitle(res.title);
    });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}

      <div className="card flex flex-col gap-2">
        <label className="field text-sm">
          Link YouTube
          <div className="flex gap-2">
            <input
              name="url"
              className="input flex-1 text-foreground"
              placeholder="https://www.youtube.com/watch?v=…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
            <button type="button" className="btn" disabled={!url || fetching} onClick={() => load()}>
              {fetching ? "Đang lấy…" : "Lấy phụ đề"}
            </button>
          </div>
        </label>
        {fetchError && <p className="text-sm text-red-600">{fetchError}</p>}
        {info && (
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
            {info.tracks.length > 1 && (
              <select className="input py-1" value={info.lang} onChange={(e) => load(e.target.value)}>
                {info.tracks.map((t) => (
                  <option key={t.languageCode + t.auto} value={t.languageCode}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
            <span>
              {srt.split("-->").length - 1} dòng phụ đề
              {info.auto && " · ⚠ sub tự động, nên kiểm tra lại chính tả và dấu câu"}
            </span>
          </div>
        )}
      </div>

      <div className="card grid gap-3 sm:grid-cols-[1fr_120px]">
        <label className="field text-sm">
          Tiêu đề
          <input
            name="title"
            className="input text-foreground"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Để trống sẽ lấy tiêu đề video"
          />
        </label>
        <label className="field text-sm">
          Cấp độ
          <select name="level" defaultValue={initial?.level ?? "A1"}>
            {LEVELS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
        <label className="field text-sm sm:col-span-2">
          Mô tả / ghi chú cho người học
          <textarea
            name="description"
            rows={3}
            className="input text-foreground"
            defaultValue={initial?.description}
            placeholder="Từ vựng chính, ngữ pháp, mẹo luyện…"
          />
        </label>
        <label className="check text-sm">
          <input type="checkbox" name="published" defaultChecked={initial?.published ?? true} />
          Đăng công khai (bỏ chọn = bản nháp)
        </label>
      </div>

      <label className="field card text-sm">
        Phụ đề (SRT) — sửa trực tiếp nội dung hoặc thời gian nếu cần. Để trống sẽ tự lấy khi lưu.
        <textarea
          name="srt"
          rows={16}
          className="input font-mono text-xs text-foreground"
          value={srt}
          onChange={(e) => setSrt(e.target.value)}
          spellCheck={false}
        />
      </label>

      {state.error && <p className="rounded-md bg-red-500/10 p-3 text-sm text-red-600">{state.error}</p>}

      <div className="flex gap-2">
        <button className="btn btn-primary" disabled={saving || fetching}>
          {saving ? "Đang lưu…" : "Lưu bài học"}
        </button>
        <Link href="/admin" className="btn">
          Huỷ
        </Link>
      </div>
    </form>
  );
}
