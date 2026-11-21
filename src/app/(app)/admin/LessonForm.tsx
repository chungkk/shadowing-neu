"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { slugify } from "@/lib/slug";
import { formatTime, mergeIntoSentences, parseSubtitleFile } from "@/lib/subtitles";
import { fetchSubtitles, saveLesson, type FetchResult } from "./actions";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

export type LessonFormValues = {
  id?: number;
  url: string;
  title: string;
  slug?: string;
  description: string;
  level: string;
  published: boolean;
  dictation: boolean;
  srt: string;
};

type Props = { initial?: LessonFormValues; presetUrl?: string };

/**
 * presetUrl: bài mới từ trang kênh YouTube — điền sẵn link và tự lấy phụ đề khi mở.
 * cacheComponents bật → Next giữ state trang cũ (React Activity): mở lại /admin/new?v=… sẽ còn dữ liệu bài trước
 * và không tự lấy phụ đề. Key theo video + bfcacheId → mỗi lần bấm link là form mới; Back/Forward vẫn giữ bản đang soạn.
 */
export default function LessonForm(props: Props) {
  const { bfcacheId } = useRouter();
  return <LessonFormInner key={`${bfcacheId}:${props.initial?.id ?? ""}:${props.presetUrl ?? ""}`} {...props} />;
}

function LessonFormInner({ initial, presetUrl }: Props) {
  const [state, formAction, saving] = useActionState(saveLesson, {});
  const [fetching, startFetch] = useTransition();
  const [url, setUrl] = useState(initial?.url ?? presetUrl ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [srt, setSrt] = useState(initial?.srt ?? "");
  // Giữ trong state (không dùng defaultValue): React 19 reset form sau khi gửi → lưu lỗi sẽ mất các ô này
  const [level, setLevel] = useState(initial?.level ?? "A1");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [published, setPublished] = useState(initial?.published ?? true);
  const [dictation, setDictation] = useState(initial?.dictation ?? true);
  // Các câu người học sẽ thấy (người học xem bản đã gộp câu của các dòng này)
  const counts = useMemo(() => {
    const lines = parseSubtitleFile(srt);
    return lines.length ? { lines: lines.length, sentences: mergeIntoSentences(lines) } : null;
  }, [srt]);
  // Chỉ đổi cách XEM: dữ liệu lưu vẫn là các dòng SRT gốc (người học tự gộp thành câu lúc phát)
  const [bySentence, setBySentence] = useState(false);
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

  const autoLoaded = useRef(false);
  useEffect(() => {
    if (!presetUrl || autoLoaded.current) return;
    autoLoaded.current = true;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy 1 lần khi mở form
  }, [presetUrl]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}

      <div className="card flex flex-col gap-3">
        <label className="field text-sm">
          Link YouTube
          <div className="flex gap-2 max-sm:flex-col">
            <input
              name="url"
              className="input min-w-0 flex-1 text-foreground"
              placeholder="https://www.youtube.com/watch?v=…"
              inputMode="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
            <button type="button" className="btn shrink-0" disabled={!url || fetching} onClick={() => load()}>
              {fetching ? "Đang lấy…" : "Lấy phụ đề"}
            </button>
          </div>
        </label>
        {fetchError && (
          <p role="alert" className="alert alert-err">
            {fetchError}
          </p>
        )}
        {info && (
          <div className="field-hint flex flex-wrap items-center gap-3">
            {info.tracks.length > 1 && (
              <select className="input py-1.5 text-foreground" value={info.lang} onChange={(e) => load(e.target.value)}>
                {info.tracks.map((t) => (
                  <option key={t.languageCode + t.auto} value={t.languageCode}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
            <span className="inline-flex flex-wrap items-center gap-x-1.5">
              {srt.split("-->").length - 1} dòng phụ đề
              {info.auto && (
                <span className="inline-flex items-center gap-1 font-semibold text-amber">
                  · <TriangleAlert className="size-3.5" aria-hidden /> sub tự động, nên kiểm tra lại chính tả và dấu câu
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      <div className="card grid gap-4 sm:grid-cols-[1fr_120px]">
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
          <select name="level" value={level} onChange={(e) => setLevel(e.target.value)}>
            {LEVELS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
        <label className="field text-sm sm:col-span-2">
          Đường dẫn (SEO)
          <div className="input-group gap-0">
            <span className="shrink-0 font-semibold text-muted">hallovn.de/tieng-duc/</span>
            <input
              name="slug"
              className="placeholder:text-muted/60"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              onBlur={() => setSlug(slugify(slug))}
              placeholder={slugify(title) || "tu-tao-tu-tieu-de"}
            />
          </div>
          <span className="field-hint">
            {initial?.id
              ? "Đổi đường dẫn thì link cũ (đã chia sẻ / Google đã lưu) sẽ không mở được — chỉ đổi khi thật cần."
              : "Để trống sẽ tự tạo từ tiêu đề (bỏ dấu, nối bằng dấu gạch)."}
          </span>
        </label>
        <label className="field text-sm sm:col-span-2">
          Mô tả / ghi chú cho người học
          <textarea
            name="description"
            rows={3}
            className="input text-foreground"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Từ vựng chính, ngữ pháp, mẹo luyện…"
          />
        </label>
        <label className="check text-sm font-semibold text-foreground">
          <input type="checkbox" name="published" checked={published} onChange={(e) => setPublished(e.target.checked)} />
          Đăng công khai (bỏ chọn = bản nháp)
        </label>
        <label className="check text-sm font-semibold text-foreground">
          <input type="checkbox" name="dictation" checked={dictation} onChange={(e) => setDictation(e.target.checked)} />
          Cho luyện Dictation (bỏ chọn = chỉ Shadowing)
        </label>
      </div>

      <div className="field card text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor="lesson-srt">
            {bySentence
              ? "Phụ đề theo câu — đúng như người học thấy (chỉ xem; muốn sửa thì quay lại SRT)."
              : "Phụ đề (SRT) — sửa trực tiếp nội dung hoặc thời gian nếu cần. Để trống sẽ tự lấy khi lưu."}
          </label>
          {counts && (
            <div className="flex gap-1.5" role="group" aria-label="Cách xem phụ đề">
              <button type="button" className="chip text-xs" aria-pressed={!bySentence} onClick={() => setBySentence(false)}>
                SRT
              </button>
              <button type="button" className="chip text-xs" aria-pressed={bySentence} onClick={() => setBySentence(true)}>
                Xem theo câu
              </button>
            </div>
          )}
        </div>
        {bySentence && counts ? (
          <>
            {/* Vẫn gửi SRT gốc khi lưu */}
            <input type="hidden" name="srt" value={srt} />
            <ol className="input max-h-96 overflow-y-auto text-foreground">
              {counts.sentences.map((s, i) => (
                <li key={i} className="flex gap-3 border-b border-line py-1.5 last:border-0">
                  <span className="w-10 shrink-0 text-right font-mono text-xs text-muted tabular-nums">{i + 1}</span>
                  <span className="w-12 shrink-0 font-mono text-xs text-muted tabular-nums">{formatTime(s.start)}</span>
                  <span className="min-w-0">{s.text}</span>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <textarea
            id="lesson-srt"
            name="srt"
            rows={16}
            className="input font-mono text-base text-foreground md:text-xs"
            value={srt}
            onChange={(e) => setSrt(e.target.value)}
            spellCheck={false}
          />
        )}
        {counts && (
          <span className="field-hint">
            {counts.lines} dòng → người học thấy {counts.sentences.length} câu (tự gộp theo dấu câu và chỗ ngừng)
          </span>
        )}
      </div>

      {state.error && (
        <p role="alert" className="alert alert-err">
          {state.error}
        </p>
      )}

      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 -mx-4 flex gap-2 border-t border-line bg-background/95 px-4 py-3 max-sm:*:flex-1 md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
        <button className="btn btn-lg btn-primary" disabled={saving || fetching}>
          {saving ? "Đang lưu…" : "Lưu bài học"}
        </button>
        <Link href="/admin" className="btn btn-lg">
          Huỷ
        </Link>
      </div>
    </form>
  );
}
