"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Download,
  FileText,
  Film,
  Loader2,
  Mic,
  Play,
  RefreshCw,
  Search,
  Trash2,
  TriangleAlert,
  Upload,
} from "lucide-react";
import SectionCard from "../_components/SectionCard";

type DubVoice = { id: string; label: string; cloned?: boolean };
type DubHealth = {
  ok: boolean;
  model_ready: boolean;
  model_error?: string | null;
  precision: string;
  voices_count: number;
  queue_size: number;
};
type DubJob = {
  id: string;
  url: string;
  title: string;
  voice: string;
  base_speed: number;
  orig_vol: number;
  dub_vol: number;
  max_height: number;
  status: "queued" | "downloading" | "synthesizing" | "mixing" | "done" | "error" | "cancelled";
  stage: string;
  done_cues: number;
  total_cues: number;
  cache_hits: number;
  eta_s: number | null;
  current_text: string;
  error: string | null;
  size_bytes: number;
  elapsed_s: number | null;
  created_at: number;
};

type ProbeInfo = {
  video_id: string;
  title: string;
  duration: number;
  channel: string;
  thumbnail: string;
  language: string;
  whisperAvailable: boolean;
  subtitles: { lang: string; name: string; auto: boolean }[];
};

type StatusPayload = {
  enabled: boolean;
  translationEnabled: boolean;
  whisperEnabled: boolean;
  health: DubHealth | null;
  voices: DubVoice[];
  jobs: DubJob[];
};

function fmtDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}` : `${m}:${String(r).padStart(2, "0")}`;
}

function fmtSize(bytes: number): string {
  if (!bytes) return "";
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const ACTIVE_STATUSES = new Set(["queued", "downloading", "synthesizing", "mixing"]);

export default function DubClient() {
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [url, setUrl] = useState("");
  const [probing, setProbing] = useState(false);
  const [probe, setProbe] = useState<ProbeInfo | null>(null);
  const [probeErr, setProbeErr] = useState("");

  // Subtitle source selection
  const [subSource, setSubSource] = useState<"youtube" | "whisper" | "custom">("youtube");
  const [subTrackKey, setSubTrackKey] = useState(""); // `${lang}|${auto ? 1 : 0}`
  const [customSub, setCustomSub] = useState("");
  const [translateCustom, setTranslateCustom] = useState(false);

  // Voice & mix settings
  const [voice, setVoice] = useState("Lạc Phi");
  const [baseSpeed, setBaseSpeed] = useState(1.15);
  const [origVol, setOrigVol] = useState(25);
  const [dubVol, setDubVol] = useState(140);
  const [maxHeight, setMaxHeight] = useState<720 | 1080>(720);

  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/admin/dub", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setStatus(data);
      setLoadErr("");
      if (data.voices?.length) {
        setVoice((cur) => {
          if (data.voices.some((v: DubVoice) => v.id === cur)) return cur;
          return data.voices[0].id;
        });
      }
    } catch (e) {
      setLoadErr((e as Error).message);
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(id);
  }, [refresh]);

  // Poll every 2.5s while any job is active or model is still booting
  useEffect(() => {
    const hasActive =
      status?.jobs.some((j) => ACTIVE_STATUSES.has(j.status)) ||
      (status?.enabled && status.health && !status.health.model_ready && !status.health.model_error);
    if (!hasActive) return;
    const t = setInterval(() => void refresh(), 2500);
    return () => clearInterval(t);
  }, [status, refresh]);

  const handleProbe = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!url.trim()) return;
    setProbing(true);
    setProbeErr("");
    setSubmitErr("");
    try {
      const res = await fetch("/api/v1/admin/dub/probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setProbe(data);
      if (data.subtitles?.length) {
        const first = data.subtitles[0];
        setSubSource("youtube");
        setSubTrackKey(`${first.lang}|${first.auto ? 1 : 0}`);
      } else if (data.whisperAvailable) {
        setSubSource("whisper");
      } else {
        setSubSource("custom");
      }
    } catch (err) {
      setProbe(null);
      setProbeErr((err as Error).message);
    } finally {
      setProbing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCustomSub(text);
    setSubSource("custom");
  };

  const handleStartDub = async () => {
    if (!url.trim()) return;
    setSubmitting(true);
    setSubmitErr("");
    try {
      const [subLang, subAutoFlag] = subTrackKey.split("|");
      const res = await fetch("/api/v1/admin/dub/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          title: probe?.title || "",
          subSource,
          subLang: subLang || "de",
          subAuto: subAutoFlag === "1",
          customSub,
          translateCustom,
          voice,
          baseSpeed,
          origVol: origVol / 100,
          dubVol: dubVol / 100,
          maxHeight,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      await refresh();
    } catch (err) {
      setSubmitErr((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (previewId === id) setPreviewId(null);
    await fetch(`/api/v1/admin/dub/jobs/${id}`, { method: "DELETE" });
    await refresh();
  };

  const health = status?.health;
  const voices = status?.voices ?? [];
  const jobs = status?.jobs ?? [];

  return (
    <div className="flex flex-col gap-5">
      {/* Service status banner */}
      {loadErr && (
        <div role="alert" className="alert alert-err flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <TriangleAlert className="size-4 shrink-0" />
            {loadErr}
          </span>
          <button type="button" className="btn btn-sm" onClick={() => void refresh()}>
            <RefreshCw className="size-3.5" /> Thử lại
          </button>
        </div>
      )}

      {status && !status.enabled && (
        <div className="alert alert-warn">
          <TriangleAlert className="size-4 shrink-0" />
          Chưa cấu hình biến môi trường <code>VIENEU_DUB_URL</code> trên server HalloVN.
        </div>
      )}

      {health && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className={`badge ${health.model_ready ? "badge-ok" : "badge-gold"}`}>
            {health.model_ready ? <CheckCircle2 className="size-3.5" /> : <Loader2 className="size-3.5 animate-spin" />}
            {health.model_ready
              ? `VieNeu-TTS sẵn sàng (${health.precision.toUpperCase()} · ${health.voices_count} giọng)`
              : health.model_error
                ? `Lỗi nạp model: ${health.model_error}`
                : "Đang nạp model VieNeu-TTS trên VPS…"}
          </span>
          {status?.translationEnabled && <span className="badge badge-gem">AI dịch phụ đề: Bật</span>}
          {status?.whisperEnabled && <span className="badge">Whisper AI: Bật</span>}
          <button type="button" className="btn btn-sm ml-auto" onClick={() => void refresh()}>
            <RefreshCw className="size-3.5" /> Làm mới
          </button>
        </div>
      )}

      {/* Step 1: YouTube URL + Probe */}
      <SectionCard
        title="1. Dán link YouTube"
        description="Hỗ trợ video YouTube mọi ngôn ngữ (Đức, Anh, Trung, Nhật, Việt…). Tự lấy phụ đề, dịch sang tiếng Việt rồi ghép giọng thuyết minh."
      >
        <form onSubmit={handleProbe} className="flex flex-col gap-3 sm:flex-row">
          <input
            type="url"
            className="input flex-1 text-foreground"
            placeholder="https://www.youtube.com/watch?v=..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-primary shrink-0" disabled={probing || !url.trim()}>
            {probing ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            {probing ? "Đang kiểm tra…" : "Kiểm tra video"}
          </button>
        </form>

        {probeErr && (
          <p role="alert" className="alert alert-err mt-3">
            <TriangleAlert className="size-4 shrink-0" /> {probeErr}
          </p>
        )}

        {probe && (
          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-line bg-card-2/60 p-3 sm:flex-row sm:items-center">
            {probe.thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={probe.thumbnail}
                alt={probe.title}
                className="aspect-video w-full rounded-lg object-cover sm:w-44"
              />
            )}
            <div className="min-w-0 flex-1 space-y-1">
              <p className="font-semibold text-foreground">{probe.title}</p>
              <p className="text-xs text-muted">
                {probe.channel ? `${probe.channel} · ` : ""}
                Thời lượng: <span className="font-mono font-semibold text-foreground">{fmtDuration(probe.duration)}</span>
                {" · "}
                {probe.subtitles.length} track phụ đề YouTube
              </p>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Step 2: Subtitle & Voice Settings */}
      <SectionCard
        title="2. Phụ đề & Giọng thuyết minh"
        description="Chọn nguồn phụ đề, giọng đọc (mặc định Lạc Phi), tốc độ đọc và tỷ lệ trộn âm."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {/* Subtitle source */}
          <div className="flex flex-col gap-3">
            <label className="field text-sm">
              Nguồn phụ đề
              <select
                className="input text-foreground"
                value={subSource}
                onChange={(e) => setSubSource(e.target.value as "youtube" | "whisper" | "custom")}
              >
                <option value="youtube">Phụ đề YouTube (tự dịch sang tiếng Việt nếu khác tiếng Việt)</option>
                <option value="whisper" disabled={!status?.whisperEnabled}>
                  Whisper AI (tự nghe & tách chữ khi video không có sub)
                </option>
                <option value="custom">Tự dán / tải lên file .SRT hoặc .ASS</option>
              </select>
            </label>

            {subSource === "youtube" && (
              <label className="field text-sm">
                Track phụ đề YouTube
                {probe?.subtitles.length ? (
                  <select
                    className="input text-foreground"
                    value={subTrackKey}
                    onChange={(e) => setSubTrackKey(e.target.value)}
                  >
                    {probe.subtitles.map((s) => {
                      const key = `${s.lang}|${s.auto ? 1 : 0}`;
                      return (
                        <option key={key} value={key}>
                          {s.lang} — {s.name} {s.auto ? "(tự động)" : "(thủ công ✓)"}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <input
                    className="input text-foreground"
                    placeholder="Mã ngôn ngữ (vd: de, en, vi) — bấm Kiểm tra video trước để hiện danh sách"
                    value={subTrackKey.split("|")[0] || "de"}
                    onChange={(e) => setSubTrackKey(`${e.target.value}|0`)}
                  />
                )}
              </label>
            )}

            {subSource === "custom" && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted">Dán nội dung .SRT / .ASS hoặc chọn file:</span>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="size-3.5" /> Chọn file .srt / .ass
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".srt,.ass,.vtt,.txt"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>
                <textarea
                  rows={6}
                  className="input font-mono text-xs text-foreground"
                  placeholder="1&#10;00:00:01,500 --> 00:00:04,200&#10;Xin chào mọi người..."
                  value={customSub}
                  onChange={(e) => setCustomSub(e.target.value)}
                />
                <label className="flex items-center gap-2 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={translateCustom}
                    onChange={(e) => setTranslateCustom(e.target.checked)}
                  />
                  Dịch phụ đề này sang tiếng Việt bằng AI trước khi đọc (bỏ chọn nếu đã là tiếng Việt)
                </label>
              </div>
            )}
          </div>

          {/* Voice & mixing controls */}
          <div className="flex flex-col gap-3">
            <label className="field text-sm">
              Giọng thuyết minh
              <select
                className="input text-foreground"
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
              >
                {voices.length ? (
                  voices.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.cloned ? "🎙 " : ""}
                      {v.label}
                    </option>
                  ))
                ) : (
                  <option value="Lạc Phi">🎙 Lạc Phi — Nam · Thuyết minh (clone)</option>
                )}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="field text-sm">
                Tốc độ đọc ({baseSpeed.toFixed(2)}×)
                <input
                  type="range"
                  min={0.9}
                  max={1.35}
                  step={0.05}
                  value={baseSpeed}
                  onChange={(e) => setBaseSpeed(Number(e.target.value))}
                />
              </label>

              <label className="field text-sm">
                Chất lượng video
                <select
                  className="input text-foreground"
                  value={maxHeight}
                  onChange={(e) => setMaxHeight(Number(e.target.value) === 1080 ? 1080 : 720)}
                >
                  <option value={720}>720p (nhanh, nhẹ)</option>
                  <option value={1080}>1080p Full HD</option>
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="field text-sm">
                Âm gốc ({origVol}%)
                <input
                  type="range"
                  min={0}
                  max={80}
                  step={5}
                  value={origVol}
                  onChange={(e) => setOrigVol(Number(e.target.value))}
                />
              </label>
              <label className="field text-sm">
                Giọng thuyết minh ({dubVol}%)
                <input
                  type="range"
                  min={60}
                  max={180}
                  step={10}
                  value={dubVol}
                  onChange={(e) => setDubVol(Number(e.target.value))}
                />
              </label>
            </div>
          </div>
        </div>

        {submitErr && (
          <p role="alert" className="alert alert-err mt-4">
            <TriangleAlert className="size-4 shrink-0" /> {submitErr}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn btn-lg btn-primary"
            disabled={submitting || !url.trim() || !status?.enabled || (subSource === "custom" && !customSub.trim())}
            onClick={() => void handleStartDub()}
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Mic className="size-4" />}
            {submitting ? "Đang lấy & dịch phụ đề…" : "Bắt đầu thuyết minh MP4"}
          </button>
          <span className="text-xs text-muted">
            Video sau khi ghép lưu 24 giờ trên VPS (còn giữ track âm gốc làm track phụ).
          </span>
        </div>
      </SectionCard>

      {/* Step 3: Jobs list */}
      <SectionCard
        title={`3. Video đã & đang xử lý (${jobs.length})`}
        description="Tiến độ tự cập nhật mỗi 2.5 giây. Khi xong có thể xem trực tiếp hoặc tải file MP4 / SRT."
        flush
      >
        {jobs.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted">Chưa có video thuyết minh nào.</div>
        ) : (
          <div className="divide-y divide-line">
            {jobs.map((j) => {
              const pct = j.total_cues > 0 ? Math.min(100, Math.round((j.done_cues / j.total_cues) * 100)) : 0;
              const isActive = ACTIVE_STATUSES.has(j.status);
              return (
                <div key={j.id} className="flex flex-col gap-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Film className="size-4 shrink-0 text-muted" />
                        <p className="truncate font-semibold text-foreground" title={j.title}>
                          {j.title}
                        </p>
                        <span
                          className={`badge ${
                            j.status === "done"
                              ? "badge-ok"
                              : j.status === "error" || j.status === "cancelled"
                                ? "badge-err"
                                : "badge-gold"
                          }`}
                        >
                          {isActive && <Loader2 className="size-3 animate-spin" />}
                          {j.stage}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        Giọng: <span className="font-medium text-foreground">{j.voice}</span> · {j.base_speed}× ·{" "}
                        {j.max_height}p · {j.done_cues}/{j.total_cues} câu
                        {j.size_bytes > 0 ? ` · ${fmtSize(j.size_bytes)}` : ""}
                        {j.elapsed_s ? ` · xong trong ${fmtDuration(j.elapsed_s)}` : ""}
                        {isActive && j.eta_s ? ` · còn ~${fmtDuration(j.eta_s)}` : ""}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {j.status === "done" && (
                        <>
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => setPreviewId(previewId === j.id ? null : j.id)}
                          >
                            <Play className="size-3.5" /> {previewId === j.id ? "Ẩn" : "Xem thử"}
                          </button>
                          <a
                            href={`/api/v1/admin/dub/jobs/${j.id}/download?dl=1`}
                            className="btn btn-sm btn-primary"
                          >
                            <Download className="size-3.5" /> Tải MP4
                          </a>
                          <a
                            href={`/api/v1/admin/dub/jobs/${j.id}/download?type=srt`}
                            className="btn btn-sm"
                          >
                            <FileText className="size-3.5" /> SRT
                          </a>
                        </>
                      )}
                      <button
                        type="button"
                        className="btn btn-sm text-red-400"
                        onClick={() => void handleDelete(j.id)}
                        title={isActive ? "Huỷ job" : "Xoá file"}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {isActive && (
                    <div className="space-y-1">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-card-2">
                        <div
                          className="h-full rounded-full bg-accent transition-all duration-300"
                          style={{ width: `${Math.max(4, pct)}%` }}
                        />
                      </div>
                      {j.current_text && <p className="truncate text-xs text-muted">“{j.current_text}”</p>}
                    </div>
                  )}

                  {j.error && (
                    <p role="alert" className="alert alert-err text-xs">
                      {j.error}
                    </p>
                  )}

                  {previewId === j.id && j.status === "done" && (
                    <video
                      key={j.id}
                      controls
                      preload="metadata"
                      className="mt-1 aspect-video w-full max-w-2xl rounded-xl border border-line bg-black"
                      src={`/api/v1/admin/dub/jobs/${j.id}/download`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
