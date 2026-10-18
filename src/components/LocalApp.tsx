"use client";

import { useState } from "react";
import Link from "next/link";
import ShadowPlayer, { type Media } from "./ShadowPlayer";
import { parseSubtitleFile, normalize, type Segment } from "@/lib/subtitles";
import { transcribeFile } from "@/lib/audio";

type Session = { title: string; media: Media & { kind: "local" }; segments: Segment[] };

export default function LocalApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [media, setMedia] = useState<File | null>(null);
  const [subs, setSubs] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  if (session) {
    return (
      <ShadowPlayer
        title={session.title}
        media={session.media}
        segments={session.segments}
        onBack={() => {
          URL.revokeObjectURL(session.media.src);
          setSession(null);
        }}
      />
    );
  }

  async function start() {
    if (!media) return;
    setError("");
    try {
      let segments: Segment[];
      if (subs) {
        segments = parseSubtitleFile(await subs.text());
        if (!segments.length) throw new Error("Không đọc được file phụ đề (.srt / .vtt).");
      } else {
        segments = normalize(await transcribeFile(media, setStatus));
        if (!segments.length) throw new Error("Không nhận dạng được câu nào.");
      }
      setSession({
        title: media.name,
        media: { kind: "local", src: URL.createObjectURL(media), isVideo: media.type.startsWith("video") },
        segments,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStatus("");
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 pt-12">
      <Link href="/" className="text-sm text-muted hover:underline">
        ← Trang chủ
      </Link>
      <h1 className="text-2xl font-bold">Luyện với file trên máy</h1>

      <label className="card flex cursor-pointer flex-col gap-1">
        <span className="text-sm font-semibold">1. File audio / video</span>
        <span className="text-xs text-muted">mp3, m4a, wav, mp4, webm…</span>
        <input type="file" accept="audio/*,video/*" onChange={(e) => setMedia(e.target.files?.[0] ?? null)} />
      </label>

      <label className="card flex cursor-pointer flex-col gap-1">
        <span className="text-sm font-semibold">2. File phụ đề (không bắt buộc)</span>
        <span className="text-xs text-muted">
          .srt hoặc .vtt. Nếu bỏ trống, app sẽ tự tạo phụ đề bằng AI nhận dạng giọng nói (Whisper).
        </span>
        <input type="file" accept=".srt,.vtt" onChange={(e) => setSubs(e.target.files?.[0] ?? null)} />
      </label>

      <button className="btn btn-primary" disabled={!media || !!status} onClick={start}>
        {status || (subs ? "Bắt đầu shadowing" : "Tạo phụ đề & bắt đầu")}
      </button>

      {error && <p className="rounded-md bg-red-500/10 p-3 text-sm text-red-600">{error}</p>}
    </main>
  );
}
