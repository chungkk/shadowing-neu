"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Ghi âm giọng người học, lưu theo chỉ số câu. */
export function useRecorder() {
  const [recordingKey, setRecordingKey] = useState<number | null>(null);
  const [recordings, setRecordings] = useState<Record<number, string>>({});
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const urlsRef = useRef<Record<number, string>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mountedRef = useRef(true);

  const stopPlay = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current = null;
  }, []);

  const stop = useCallback(() => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);

  const start = useCallback(
    async (key: number) => {
      stop();
      stopPlay();
      try {
        streamRef.current ??= await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        alert("Không truy cập được micro. Hãy cho phép quyền micro trong trình duyệt.");
        return;
      }
      if (!mountedRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        return;
      }
      const rec = new MediaRecorder(streamRef.current);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = () => {
        if (recorderRef.current === rec) recorderRef.current = null;
        if (!mountedRef.current) return;
        const url = URL.createObjectURL(new Blob(chunks, { type: rec.mimeType }));
        if (urlsRef.current[key]) URL.revokeObjectURL(urlsRef.current[key]);
        urlsRef.current[key] = url;
        setRecordings((r) => ({ ...r, [key]: url }));
        setRecordingKey(null);
      };
      recorderRef.current = rec;
      rec.start();
      setRecordingKey(key);
    },
    [stop, stopPlay],
  );

  const play = useCallback(
    (key: number) => {
      const url = recordings[key];
      if (!url) return;
      stopPlay();
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        if (audioRef.current === audio) audioRef.current = null;
      };
      void audio.play();
    },
    [recordings, stopPlay],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopPlay();
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      recorderRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      Object.values(urlsRef.current).forEach((u) => URL.revokeObjectURL(u));
      urlsRef.current = {};
    };
  }, [stopPlay]);

  return { recordingKey, recordings, start, stop, play, stopPlay };
}
