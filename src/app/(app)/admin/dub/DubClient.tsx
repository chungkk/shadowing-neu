"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Loader2,
  Play,
  Settings2,
  Trash2,
  TriangleAlert,
  Upload,
} from "lucide-react";
import SyncedPlayer from "./SyncedPlayer";
import KokoroLivePlayer, { type LiveCue, type LiveVoiceId } from "@/components/KokoroLivePlayer";

type DubVoice = { id: string; label: string; cloned?: boolean };
type DubHealth = {
  ok: boolean;
  model_ready: boolean;
  precision: string;
  edge_tts?: boolean;
  voices_count: number;
};
type DubJob = {
  id: string;
  url: string;
  video_id?: string;
  title: string;
  voice: string;
  output_mode?: "mp3" | "mp4";
  base_speed: number;
  orig_vol: number;
  status: "queued" | "downloading" | "synthesizing" | "mixing" | "done" | "error" | "cancelled";
  stage: string;
  done_cues: number;
  total_cues: number;
  eta_s: number | null;
  current_text: string;
  error: string | null;
  size_bytes: number;
  elapsed_s: number | null;
  created_at: number;
};

type LiveSession = {
  videoId: string;
  title: string;
  cues: LiveCue[];
  voiceId: LiveVoiceId;
};

type StatusPayload = {
  enabled: boolean;
  whisperEnabled: boolean;
  health: DubHealth | null;
  voices: DubVoice[];
  jobs: DubJob[];
};

const BROWSER_VOICES: DubVoice[] = [
  { id: "piper:adam_bua", label: "🚀 Trình duyệt · Adam bựa (Nam · Bắc · Nghe ngay · 0đ)" },
];

const ACTIVE_STATUSES = new Set(["queued", "downloading", "synthesizing", "mixing"]);

function fmtDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}p${String(r).padStart(2, "0")}s` : `${r}s`;
}

function fmtSize(bytes: number): string {
  if (!bytes) return "";
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function videoIdFromUrl(u: string): string {
  const m = u.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : "";
}

function shortVoiceName(voiceId: string, voices: DubVoice[]): string {
  const found = voices.find((v) => v.id === voiceId);
  if (found) return found.label.split("(")[0].trim();
  if (voiceId.startsWith("edge:")) return voiceId.includes("HoaiMy") ? "Edge · Hoài My" : "Edge · Nam Minh";
  return voiceId;
}

export default function DubClient() {
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [url, setUrl] = useState("");
  const [voice, setVoice] = useState("piper:adam_bua");
  const [showAdv, setShowAdv] = useState(false);

  // Advanced options (collapsed by default)
  const [outputMode, setOutputMode] = useState<"mp3" | "mp4">("mp3");
  const [baseSpeed, setBaseSpeed] = useState(1.15);
  const [origVol, setOrigVol] = useState(25);
  const [subSource, setSubSource] = useState<"auto" | "whisper" | "custom">("auto");
  const [customSub, setCustomSub] = useState("");
  const [translateCustom, setTranslateCustom] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [prep, setPrep] = useState<{ pct: number; stage: string } | null>(null);
  const [err, setErr] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [liveSession, setLiveSession] = useState<LiveSession | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/admin/dub", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setStatus(data);
    } catch (e) {
      setErr((e as Error).message);
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(id);
  }, [refresh]);

  useEffect(() => {
    const hasActive = status?.jobs.some((j) => ACTIVE_STATUSES.has(j.status));
    if (!hasActive) return;
    const t = setInterval(() => void refresh(), 2000);
    return () => clearInterval(t);
  }, [status, refresh]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setSubmitting(true);
    setErr("");
    try {
      if (voice.startsWith("piper:")) {
        // Browser-side WASM voice: server streams subtitle fetch & translation progress (0% -> 100%)
        setPrep({ pct: 3, stage: "Đang kết nối…" });
        const res = await fetch("/api/v1/admin/dub/prepare-live?stream=1", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" },
          body: JSON.stringify({
            url: url.trim(),
            subSource,
            customSub: subSource === "custom" ? customSub : "",
            translateCustom,
          }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error((errData as { error?: string }).error || `HTTP ${res.status}`);
        }
        let data: { videoId: string; title: string; cues: LiveCue[] } | null = null;
        if ((res.headers.get("content-type") ?? "").includes("ndjson") && res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buf = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            let nl = buf.indexOf("\n");
            while (nl !== -1) {
              const line = buf.slice(0, nl).trim();
              buf = buf.slice(nl + 1);
              if (line) {
                const msg = JSON.parse(line) as
                  | { type: "progress"; pct: number; stage: string }
                  | { type: "done"; data: { videoId: string; title: string; cues: LiveCue[] } }
                  | { type: "error"; error: string };
                if (msg.type === "progress") setPrep({ pct: msg.pct, stage: msg.stage });
                else if (msg.type === "error") throw new Error(msg.error);
                else if (msg.type === "done") data = msg.data;
              }
              nl = buf.indexOf("\n");
            }
          }
        } else {
          data = await res.json();
        }
        if (!data) throw new Error("Kết nối bị gián đoạn trước khi hoàn tất.");
        setActiveId(null);
        setLiveSession({
          videoId: data.videoId,
          title: data.title,
          cues: data.cues,
          voiceId: voice as LiveVoiceId,
        });
        setUrl("");
      } else {
        // Server-side MP3/MP4 job (Edge TTS / ElevenLabs / VieNeu Lạc Phi)
        const res = await fetch("/api/v1/admin/dub/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: url.trim(),
            outputMode,
            subSource,
            customSub: subSource === "custom" ? customSub : "",
            translateCustom,
            voice,
            baseSpeed,
            origVol: origVol / 100,
            dubVol: 1.4,
            maxHeight: 720,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        setLiveSession(null);
        if (data.job?.id) setActiveId(data.job.id);
        setUrl("");
        await refresh();
      }
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setSubmitting(false);
      setPrep(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCustomSub(await file.text());
    setSubSource("custom");
  };

  const handleDelete = async (id: string) => {
    if (activeId === id) setActiveId(null);
    await fetch(`/api/v1/admin/dub/jobs/${id}`, { method: "DELETE" });
    await refresh();
  };

  const allVoices = [...BROWSER_VOICES, ...(status?.voices ?? [])];
  const jobs = status?.jobs ?? [];
  const selectedJob = !liveSession
    ? (jobs.find((j) => j.id === activeId) ?? jobs.find((j) => ACTIVE_STATUSES.has(j.status)) ?? null)
    : null;
  const selectedVid = selectedJob ? selectedJob.video_id || videoIdFromUrl(selectedJob.url) : "";
  const selectedMode = selectedJob?.output_mode ?? "mp3";

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      {/* Main 1-step bar */}
      <form onSubmit={handleSubmit} className="card flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <input
            type="url"
            className="input flex-1 text-foreground"
            placeholder="Dán link YouTube vào đây…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
          <select
            className="input text-foreground sm:w-72"
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
            aria-label="Giọng đọc"
          >
            {allVoices.map((v) => (
              <option key={v.id} value={v.id}>
                {v.cloned ? "🎙 " : ""}
                {v.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="btn btn-primary relative shrink-0 overflow-hidden tabular-nums"
            disabled={submitting || !url.trim() || (!voice.startsWith("piper:") && status?.enabled === false)}
          >
            {submitting && prep && (
              <span
                className="pointer-events-none absolute inset-y-0 left-0 bg-white/15 transition-all duration-300"
                style={{ width: `${Math.max(4, prep.pct)}%` }}
              />
            )}
            {submitting ? <Loader2 className="relative size-4 animate-spin" /> : <Play className="size-4" />}
            <span className="relative">{submitting ? (prep ? `Đang dịch ${prep.pct}%` : "Đang dịch…") : "Thuyết minh"}</span>
          </button>
        </div>

        {submitting && prep && (
          <div className="space-y-1.5 rounded-lg border border-line bg-card-2/60 p-2.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="inline-flex min-w-0 items-center gap-1.5 text-foreground">
                <Loader2 className="size-3.5 shrink-0 animate-spin text-accent" />
                <span className="truncate">{prep.stage}</span>
              </span>
              <span className="shrink-0 font-mono font-semibold text-accent tabular-nums">{prep.pct}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-card">
              <div
                className="h-full rounded-full bg-accent transition-all duration-300"
                style={{ width: `${Math.max(4, prep.pct)}%` }}
              />
            </div>
          </div>
        )}

        {/* Minimal footer row */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
            onClick={() => setShowAdv((v) => !v)}
          >
            <Settings2 className="size-3.5" />
            Tuỳ chọn nâng cao
            {showAdv ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>

          <span className="text-[11px] text-muted">
            Adam bựa (trình duyệt) ✓
            {status?.health?.edge_tts ? " · Edge ✓" : ""}
            {status?.health?.model_ready ? " · Lạc Phi ✓" : ""}
          </span>
        </div>

        {/* Collapsible advanced options */}
        {showAdv && (
          <div className="mt-1 grid gap-3 border-t border-line pt-3 sm:grid-cols-3">
            <label className="field text-xs">
              Chế độ server (Edge / Lạc Phi)
              <select
                className="input text-foreground"
                value={outputMode}
                onChange={(e) => setOutputMode(e.target.value === "mp4" ? "mp4" : "mp3")}
                disabled={voice.startsWith("piper:")}
              >
                <option value="mp3">MP3 phát song song YouTube (nhanh)</option>
                <option value="mp4">Ghép sẵn file MP4 tải về</option>
              </select>
            </label>

            <label className="field text-xs">
              Nguồn phụ đề
              <select
                className="input text-foreground"
                value={subSource}
                onChange={(e) => setSubSource(e.target.value as "auto" | "whisper" | "custom")}
              >
                <option value="auto">Tự động (YouTube → dịch AI)</option>
                <option value="whisper" disabled={!status?.whisperEnabled}>
                  Whisper AI (video không có sub)
                </option>
                <option value="custom">Tự tải / dán file .SRT / .ASS</option>
              </select>
            </label>

            <label className="field text-xs">
              Tốc độ: {baseSpeed.toFixed(2)}× · Gốc: {origVol}%
              <div className="flex items-center gap-2 pt-1.5">
                <input
                  type="range"
                  min={0.95}
                  max={1.35}
                  step={0.05}
                  value={baseSpeed}
                  onChange={(e) => setBaseSpeed(Number(e.target.value))}
                  className="w-1/2"
                  title="Tốc độ đọc"
                />
                <input
                  type="range"
                  min={0}
                  max={60}
                  step={5}
                  value={origVol}
                  onChange={(e) => setOrigVol(Number(e.target.value))}
                  className="w-1/2"
                  title="Âm lượng gốc YouTube"
                />
              </div>
            </label>

            {subSource === "custom" && (
              <div className="flex flex-col gap-2 sm:col-span-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">Dán nội dung .SRT / .ASS:</span>
                  <button type="button" className="btn btn-sm" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="size-3.5" /> Chọn file
                  </button>
                  <input ref={fileInputRef} type="file" accept=".srt,.ass,.vtt,.txt" className="hidden" onChange={handleFileUpload} />
                </div>
                <textarea
                  rows={4}
                  className="input font-mono text-xs text-foreground"
                  value={customSub}
                  onChange={(e) => setCustomSub(e.target.value)}
                />
                <label className="flex items-center gap-2 text-xs text-muted">
                  <input type="checkbox" checked={translateCustom} onChange={(e) => setTranslateCustom(e.target.checked)} />
                  Dịch phụ đề này sang tiếng Việt bằng AI
                </label>
              </div>
            )}
          </div>
        )}

        {err && (
          <p role="alert" className="alert alert-err text-xs">
            <TriangleAlert className="size-4 shrink-0" /> {err}
          </p>
        )}
      </form>

      {/* Browser-side Live WASM Player */}
      {liveSession && (
        <div className="card p-4">
          <KokoroLivePlayer
            key={`${liveSession.videoId}:${liveSession.voiceId}`}
            videoId={liveSession.videoId}
            title={liveSession.title}
            cues={liveSession.cues}
            initialVoice={liveSession.voiceId}
            initialSpeed={baseSpeed}
            initialOrigVol={origVol}
            showDebugMeta
          />
        </div>
      )}

      {/* Server-side MP3/MP4 Active Player or Live Progress */}
      {selectedJob && (
        <div className="card flex flex-col gap-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-foreground">{selectedJob.title}</p>
              <p className="text-xs text-muted">
                {shortVoiceName(selectedJob.voice, allVoices)}
                {selectedJob.elapsed_s ? ` · xong trong ${fmtDuration(selectedJob.elapsed_s)}` : ""}
                {selectedJob.size_bytes > 0 ? ` · ${fmtSize(selectedJob.size_bytes)}` : ""}
              </p>
            </div>
            {selectedJob.status === "done" && (
              <div className="flex items-center gap-2">
                <a
                  href={`/api/v1/admin/dub/jobs/${selectedJob.id}/download?type=${selectedMode}&dl=1`}
                  className="btn btn-sm"
                >
                  <Download className="size-3.5" /> {selectedMode.toUpperCase()}
                </a>
                <a href={`/api/v1/admin/dub/jobs/${selectedJob.id}/download?type=srt`} className="btn btn-sm">
                  <FileText className="size-3.5" /> SRT
                </a>
              </div>
            )}
          </div>

          {ACTIVE_STATUSES.has(selectedJob.status) && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted">
                <span className="inline-flex items-center gap-1.5 text-foreground">
                  <Loader2 className="size-3.5 animate-spin text-accent" />
                  {selectedJob.stage}
                </span>
                <span>
                  {selectedJob.total_cues > 0 ? `${Math.round((selectedJob.done_cues / selectedJob.total_cues) * 100)}%` : ""}
                  {selectedJob.eta_s ? ` · còn ~${fmtDuration(selectedJob.eta_s)}` : ""}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-card-2">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-300"
                  style={{
                    width: `${Math.max(6, selectedJob.total_cues > 0 ? Math.round((selectedJob.done_cues / selectedJob.total_cues) * 100) : 6)}%`,
                  }}
                />
              </div>
            </div>
          )}

          {selectedJob.error && (
            <p role="alert" className="alert alert-err text-xs">
              {selectedJob.error}
            </p>
          )}

          {selectedJob.status === "done" &&
            (selectedMode === "mp3" && selectedVid ? (
              <SyncedPlayer
                key={selectedJob.id}
                jobId={selectedJob.id}
                videoId={selectedVid}
                initialOrigVol={Math.round((selectedJob.orig_vol ?? 0.25) * 100)}
              />
            ) : (
              <video
                key={selectedJob.id}
                controls
                preload="metadata"
                className="aspect-video w-full rounded-lg bg-black"
                src={`/api/v1/admin/dub/jobs/${selectedJob.id}/download`}
              />
            ))}
        </div>
      )}

      {/* Compact History List */}
      {jobs.length > 0 && (
        <div className="card overflow-hidden p-0">
          <div className="border-b border-line px-4 py-2.5 text-xs font-semibold text-muted uppercase">
            Lịch sử server ({jobs.length})
          </div>
          <div className="divide-y divide-line">
            {jobs.map((j) => {
              const mode = j.output_mode ?? "mp4";
              const isSelected = !liveSession && selectedJob?.id === j.id;
              return (
                <div
                  key={j.id}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isSelected ? "bg-sec-soft/50" : "hover:bg-card-2/50"}`}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => {
                      setLiveSession(null);
                      setActiveId(j.id);
                    }}
                  >
                    <p className="truncate font-medium text-foreground">{j.title}</p>
                    <p className="text-xs text-muted">
                      {shortVoiceName(j.voice, allVoices)} ·{" "}
                      {j.status === "done" ? `${fmtDuration(j.elapsed_s ?? 0)} · ${fmtSize(j.size_bytes)}` : j.stage}
                    </p>
                  </button>

                  {j.status === "done" && (
                    <a
                      href={`/api/v1/admin/dub/jobs/${j.id}/download?type=${mode}&dl=1`}
                      className="btn btn-sm shrink-0"
                      title={`Tải ${mode.toUpperCase()}`}
                    >
                      <Download className="size-3.5" />
                    </a>
                  )}
                  <button
                    type="button"
                    className="btn btn-sm shrink-0 text-muted hover:text-red-400"
                    onClick={() => void handleDelete(j.id)}
                    title="Xoá"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
