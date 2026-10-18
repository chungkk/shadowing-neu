"use client";

import { useState } from "react";
import Link from "next/link";
import ShadowPlayer, { type Media } from "./ShadowPlayer";
import { parseSubtitleFile, normalize, type Segment } from "@/lib/subtitles";
import { transcribeFile } from "@/lib/audio";

type Session = { title: string; media: Media & { kind: "local" }; segments: Segment[] };

export default function LocalApp({ canTranscribe }: { canTranscribe: boolean }) {
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
        loggedIn={canTranscribe}
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
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 md:p-6">
      <h1 className="text-2xl font-extrabold">Luyện với file trên máy</h1>

      <label className="card flex cursor-pointer flex-col gap-2 transition hover:border-accent">
        <span className="label text-link">1. File audio / video</span>
        <span className="text-xs text-muted">mp3, m4a, wav, mp4, webm…</span>
        <input className="text-sm file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-card-2 file:px-3 file:py-2 file:font-bold file:text-foreground" type="file" accept="audio/*,video/*" onChange={(e) => setMedia(e.target.files?.[0] ?? null)} />
      </label>

      <label className="card flex cursor-pointer flex-col gap-2 transition hover:border-accent">
        <span className="label text-link">2. File phụ đề (không bắt buộc)</span>
        <span className="text-xs text-muted">
          .srt hoặc .vtt.{" "}
          {canTranscribe ? (
            "Nếu bỏ trống, app sẽ tự tạo phụ đề bằng AI nhận dạng giọng nói (Whisper)."
          ) : (
            <>
              <Link href="/login?next=/local" className="text-accent underline">
                Đăng nhập
              </Link>{" "}
              để tự tạo phụ đề bằng AI (Whisper) khi không có file phụ đề.
            </>
          )}
        </span>
        <input className="text-sm file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-card-2 file:px-3 file:py-2 file:font-bold file:text-foreground" type="file" accept=".srt,.vtt" onChange={(e) => setSubs(e.target.files?.[0] ?? null)} />
      </label>

      <button className="btn btn-primary py-3.5 text-base" disabled={!media || !!status || (!subs && !canTranscribe)} onClick={start}>
        {status || (subs ? "Bắt đầu shadowing" : "Tạo phụ đề & bắt đầu")}
      </button>

      {error && <p className="rounded-md bg-red-500/10 p-3 text-sm text-red-400">{error}</p>}
    </main>
  );
}
