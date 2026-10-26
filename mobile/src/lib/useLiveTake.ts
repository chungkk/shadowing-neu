import { setAudioModeAsync } from "expo-audio";
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from "expo-speech-recognition";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Platform } from "react-native";
import { speechCheck, type CheckedWord } from "@shared/dictation";
import { micDenied, notice } from "./dialogs";
import { useI18n } from "./i18n";
import { takePassed, voiceThreshold, type Take } from "./useTake";

const LANG = "de-DE";
const VOICE_LEVEL = 1; // volumechange: -2…10, dưới 0 là không nghe thấy; phòng yên tĩnh: trên mức này coi là đang có tiếng nói
const NOISE_MARGIN = 3; // phòng ồn: tiếng nói phải cao hơn nền ồn chừng này
const VOICE_LEVEL_MAX = 6;
const END_GRACE_MS = 250; // máy đã nghe tới từ cuối câu → chờ chút cho hết đuôi tiếng rồi dừng
const SILENCE_MS = 1300; // dự phòng (máy không nghe ra từ cuối): đã nói rồi im lặng chừng này → tự dừng
const AFTER_MODEL_MS = 350; // câu mẫu dứt → chờ đuôi tiếng loa tắt hẳn rồi mới mở micro (không thu lẫn giọng máy)
const SILENT_ERRORS = new Set(["no-speech", "speech-timeout", "nomatch"]);

const isHeard = (w: CheckedWord) => w.state === "correct" || w.state === "close";
/** volumechange (-2…10) → dBFS gần đúng, để dùng chung sóng âm với lượt thu thường */
const toDb = (v: number) => (v <= 0 ? -160 : -50 + v * 5);

/**
 * Trả âm thanh về loa ngoài sau lượt nhận dạng. iOS: module nhận dạng để phiên âm thanh ở mode "measurement" (loa phát
 * rất nhỏ), còn setAudioModeAsync của expo-audio chỉ đổi category, giữ nguyên mode → phải tự đặt mode về "default" trước.
 */
const speakerOut = () => {
  if (Platform.OS === "ios") {
    try {
      ExpoSpeechRecognitionModule.setCategoryIOS({ category: "playback", categoryOptions: ["mixWithOthers"], mode: "default" });
    } catch {}
  }
  return setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
};

/** Nhận dạng trên máy (không gửi âm thanh lên mạng) nếu máy đã có gói tiếng Đức — nhanh hơn, không bị giới hạn lượt */
let onDevice: Promise<boolean> | null = null;
const canOnDevice = () =>
  (onDevice ??= ExpoSpeechRecognitionModule.getSupportedLocales({})
    .then((r) => r.installedLocales.some((l) => l.replace("_", "-").toLowerCase() === LANG.toLowerCase()))
    .catch(() => false));

/**
 * Như useTake nhưng nhận dạng giọng nói trực tiếp trong lúc nói (iOS Speech / Android SpeechRecognizer):
 * - `live`: từng từ của câu gốc, máy đã nghe ra chưa → tô sáng kiểu karaoke khi đang nói.
 * - Máy nghe tới từ cuối câu → dừng ngay (không phải chờ im lặng); không nghe ra thì dự phòng im ~1,3 giây.
 * - Kết quả nhận dạng có sẵn khi dừng → không cần gửi Whisper; bản thu vẫn lưu để nghe lại.
 * Cùng giao diện trả về với useTake để màn luyện dùng thay được cho nhau.
 */
export function useLiveTake({
  text,
  duration,
  playing,
  onListen,
  onBeforeRecord,
  onAttempt,
  onCaptured,
  onSilent,
  onFail,
  autoLoop = false,
  loopListen = true,
}: {
  text: string;
  duration: number; // giây — thời lượng câu mẫu
  playing: boolean; // câu mẫu đang phát
  onListen: () => void;
  onBeforeRecord: () => unknown; // dừng phát mẫu trước khi thu (trả promise → chờ dừng xong)
  onAttempt: (passed: boolean, clear?: number, take?: Take) => void;
  onCaptured?: () => void;
  onSilent?: () => void;
  onFail?: () => void;
  autoLoop?: boolean;
  loopListen?: boolean;
}) {
  const { t } = useI18n();
  const attemptId = useRef(0); // đổi câu / lượt mới → bỏ sự kiện về muộn của lượt cũ
  const active = useRef(0); // lượt đang nhận dạng (0 = không có) — sự kiện của module chỉ tính cho lượt này
  const busy = useRef(false); // 1 lượt đang chạy (mẫu → thu → chấm) — vòng lặp chờ xong mới sang lượt sau
  const wasPlaying = useRef(false);
  const stopping = useRef(false);
  const transcript = useRef("");
  const levels = useRef<{ ms: number; v: number }[]>([]); // âm lượng từng nhịp (ms từ lúc bắt đầu)
  const startedAt = useRef(0);
  const lastHeard = useRef(0); // lần cuối máy nghe thêm được chữ (ms từ lúc bắt đầu)
  const recUri = useRef<string | null>(null);
  const failed = useRef(false); // lượt kết thúc vì lỗi (đã báo) → "end" không chấm nữa
  const endTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [take, setTake] = useState<Take | null>(null);
  const [live, setLive] = useState<CheckedWord[] | null>(null);
  const [armed, setArmed] = useState(false);
  const [starting, setStarting] = useState(false);
  const startingRef = useRef(false);
  const setStart = (on: boolean) => {
    startingRef.current = on;
    setStarting(on);
  };
  const [recording, setRecording] = useState(false);
  const [level, setLevel] = useState(-160);
  const [elapsed, setElapsed] = useState(0);
  const [uri, setUri] = useState<string | null>(null);

  // Sang câu khác → xoá kết quả + bản thu của câu trước
  const [forText, setForText] = useState(text);
  if (forText !== text) {
    setForText(text);
    setTake(null);
    setLive(null);
    setArmed(false);
    setUri(null);
  }

  /** Các nhịp có tiếng nói — ngưỡng theo nền ồn của lượt này */
  const voicedAt = () => {
    const voice = voiceThreshold(levels.current.map((x) => x.v), VOICE_LEVEL, NOISE_MARGIN, VOICE_LEVEL_MAX);
    return levels.current.filter((x) => x.v > voice).map((x) => x.ms);
  };

  const clearEndTimer = () => {
    if (endTimer.current) clearTimeout(endTimer.current);
    endTimer.current = null;
  };

  const record = async () => {
    if (startingRef.current || active.current) return; // bấm 2 lần / vòng lặp gọi chồng
    busy.current = true;
    setStart(true);
    const silenced = Promise.resolve(onBeforeRecord()).catch(() => {});
    const id = ++attemptId.current;
    setTake(null);
    setLive(null);
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync().catch(() => ({ granted: false }));
    if (id !== attemptId.current) return;
    if (!perm.granted) {
      busy.current = false;
      setStart(false);
      setArmed(false);
      onFail?.();
      return micDenied();
    }
    await silenced;
    const local = await canOnDevice();
    if (id !== attemptId.current) return;
    transcript.current = "";
    levels.current = [];
    lastHeard.current = 0;
    recUri.current = null;
    failed.current = false;
    stopping.current = false;
    startedAt.current = 0; // đặt lại khi micro thật sự bắt đầu ("start")
    active.current = id;
    try {
      ExpoSpeechRecognitionModule.start({
        lang: LANG,
        interimResults: true,
        continuous: true, // tự dừng theo luật của mình (hết câu / im lặng), không theo máy
        requiresOnDeviceRecognition: local,
        addsPunctuation: false,
        iosTaskHint: "dictation",
        recordingOptions: { persist: true },
        volumeChangeEventOptions: { enabled: true, intervalMillis: 100 },
      });
    } catch {
      active.current = 0;
      setStart(false);
      fail();
    }
  };

  const fail = () => {
    busy.current = false;
    setArmed(false);
    onFail?.();
    notice(t("crazy.recordFailed"), t("crazy.recordFailedBody"));
  };

  /** Dừng nghe — máy trả kết quả cuối rồi phát "end" (chấm ở đó) */
  const stop = () => {
    if (!active.current || stopping.current) return;
    stopping.current = true;
    clearEndTimer();
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      ExpoSpeechRecognitionModule.abort();
    }
  };

  /** Bỏ lượt đang chạy (không chấm, không tính): rời màn, app chạy nền, tạm dừng */
  const cancel = () => {
    attemptId.current++;
    busy.current = false;
    clearEndTimer();
    setArmed(false);
    setStart(false);
    setLive(null);
    if (!active.current) return;
    active.current = 0;
    setRecording(false);
    try {
      ExpoSpeechRecognitionModule.abort();
    } catch {}
    speakerOut();
  };

  const reset = () => {
    cancel();
    setTake(null);
    setUri(null);
  };

  useSpeechRecognitionEvent("start", () => {
    if (!active.current) return;
    startedAt.current = Date.now();
    setStart(false);
    setRecording(true);
    setElapsed(0);
  });

  useSpeechRecognitionEvent("volumechange", ({ value }) => {
    if (!active.current || !startedAt.current) return;
    const ms = Date.now() - startedAt.current;
    setLevel(toDb(value));
    setElapsed(ms);
    levels.current.push({ ms, v: value });
    // Dự phòng: đã nói (có tiếng hoặc đã nghe ra chữ) rồi im lặng một lúc, hoặc nói quá dài → dừng
    const lastVoice = Math.max(voicedAt().at(-1) ?? 0, lastHeard.current);
    const maxMs = Math.min(20000, Math.max(5000, duration * 3000));
    if ((lastVoice && ms - lastVoice > SILENCE_MS) || ms > maxMs) stop();
  });

  useSpeechRecognitionEvent("result", (e) => {
    if (!active.current || !startedAt.current) return;
    const heard = e.results[0]?.transcript ?? "";
    if (heard === transcript.current) return;
    transcript.current = heard;
    lastHeard.current = Date.now() - startedAt.current;
    const words = speechCheck(text, heard).words;
    setLive(words);
    // Đã nghe tới từ cuối câu (ghép theo thứ tự → người học đã nói hết câu) → dừng ngay, khỏi chờ im lặng
    if (words.length && isHeard(words[words.length - 1]) && !endTimer.current) {
      endTimer.current = setTimeout(stop, END_GRACE_MS);
    }
  });

  useSpeechRecognitionEvent("audioend", ({ uri: file }) => {
    if (active.current) recUri.current = file;
  });

  useSpeechRecognitionEvent("error", (e) => {
    if (!active.current || e.error === "aborted") return;
    if (SILENT_ERRORS.has(e.error)) return; // "end" sẽ tính là lượt im lặng
    failed.current = true;
    if (e.error === "not-allowed") {
      busy.current = false;
      setArmed(false);
      onFail?.();
      micDenied();
    } else fail();
  });

  useSpeechRecognitionEvent("end", () => {
    const id = active.current;
    if (!id) return;
    active.current = 0;
    clearEndTimer();
    setStart(false);
    setRecording(false);
    setLive(null);
    // Trả âm thanh về loa ngoài (nhận dạng để phiên âm thanh ở chế độ thu) trước khi phát "ting" / câu mẫu
    speakerOut().then(() => {
      if (id !== attemptId.current || failed.current) return;
      const heard = transcript.current;
      const v = voicedAt();
      if (!heard.trim() && v.length < 3) {
        busy.current = false;
        onSilent?.();
        return setTake({ speed: 0, status: "silent" });
      }
      if (recUri.current) setUri(recUri.current);
      onCaptured?.();
      // Thời lượng nói: từ nhịp có tiếng đầu tiên tới lúc máy nghe ra chữ cuối / nhịp có tiếng cuối
      const from = v[0] ?? 0;
      const to = Math.max(v.at(-1) ?? 0, lastHeard.current);
      const speed = duration / Math.max((to - from) / 1000 + 0.1, 0.3);
      const r = speechCheck(text, heard);
      const a: Take = { speed, status: "done", words: r.words, extra: r.extra.length };
      busy.current = false;
      setTake(a);
      onAttempt(takePassed(a), r.words.length ? r.words.filter(isHeard).length / r.words.length : undefined, a);
    });
  });

  // Câu mẫu vừa phát xong → nghỉ một chút (loa tắt hẳn) rồi bắt đầu thu
  const startAfterModel = useEffectEvent((id: number) => {
    if (id !== attemptId.current) return;
    setArmed(false);
    record();
  });
  useEffect(() => {
    if (!armed) return;
    if (playing) {
      wasPlaying.current = true;
      return;
    }
    if (!wasPlaying.current) return;
    wasPlaying.current = false;
    const id = attemptId.current;
    const timer = setTimeout(() => startAfterModel(id), AFTER_MODEL_MS);
    return () => clearTimeout(timer);
  }, [playing, armed]);

  // Đổi câu / rời màn giữa lúc thu → dừng thu
  useEffect(() => () => cancel(), [text]); // eslint-disable-line react-hooks/exhaustive-deps

  const listenThenRecord = () => {
    busy.current = true;
    wasPlaying.current = false;
    attemptId.current++;
    setTake(null);
    setArmed(true);
    onListen();
  };

  // Rảnh tay: xong lượt → nghỉ một nhịp rồi thu lượt tiếp (có / không phát mẫu trước)
  const loopNext = useEffectEvent(() => {
    if (!autoLoop || busy.current || active.current || playing) return;
    if (loopListen) listenThenRecord();
    else record();
  });
  useEffect(() => {
    if (!autoLoop || playing) return;
    const id = setTimeout(loopNext, 700);
    return () => clearTimeout(id);
  }, [autoLoop, take, playing]);

  const state: "idle" | "waiting" | "starting" | "recording" | "checking" = recording
    ? "recording"
    : starting
      ? "starting"
      : armed
        ? "waiting"
        : "idle";

  return { state, take, live, uri, level, elapsed, record, stop, cancel, reset, listenThenRecord };
}
