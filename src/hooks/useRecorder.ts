"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Ghi âm giọng người học, lưu theo chỉ số câu. */
export function useRecorder() {
  const [recordingKey, setRecordingKey] = useState<number | null>(null);
  const [recordings, setRecordings] = useState<Record<number, string>>({});
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);

  const start = useCallback(
    async (key: number) => {
      stop();
      try {
        streamRef.current ??= await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        alert("Không truy cập được micro. Hãy cho phép quyền micro trong trình duyệt.");
        return;
      }
      const rec = new MediaRecorder(streamRef.current);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = () => {
        const url = URL.createObjectURL(new Blob(chunks, { type: rec.mimeType }));
        setRecordings((r) => {
          if (r[key]) URL.revokeObjectURL(r[key]);
          return { ...r, [key]: url };
        });
        setRecordingKey(null);
      };
      recorderRef.current = rec;
      rec.start();
      setRecordingKey(key);
    },
    [stop],
  );

  const play = useCallback(
    (key: number) => {
      const url = recordings[key];
      if (url) void new Audio(url).play();
    },
    [recordings],
  );

  useEffect(
    () => () => {
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  return { recordingKey, recordings, start, stop, play };
}
