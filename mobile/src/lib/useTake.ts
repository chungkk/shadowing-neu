import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { checkDictation, type CheckedWord } from "@shared/dictation";
import { api, fileForm } from "./api";
import { useAuth } from "./auth";
import { micDenied, notice } from "./dialogs";
import { useI18n } from "./i18n";

/** Ngưỡng. Âm lượng micro tính bằng dBFS: im lặng ≈ -160, nói thường ≈ -30, nói to ≈ -10 */
export const VOICE_DB = -45; // trên mức này coi là đang có tiếng nói
const FAST = 0.9; // nói không chậm hơn câu mẫu quá 10%
const CLEAR = 0.8; // máy nhận ra ≥ 80% số từ
const SILENCE_MS = 1300; // đã nói rồi im lặng chừng này → tự dừng thu (rảnh tay để vung tay theo ngữ điệu)
const AFTER_MODEL_MS = 350; // câu mẫu dứt → chờ đuôi tiếng loa tắt hẳn rồi mới mở micro (không thu lẫn giọng máy)

/** 1 lượt nói. status: done = Whisper đã nhận dạng; login / error / unscored = không nhận dạng (chỉ đo nhịp) */
export type Take = {
  speed: number; // thời lượng câu mẫu / thời lượng mình nói (1 = nhịp bằng câu mẫu)
  status: "checking" | "done" | "login" | "error" | "unscored" | "silent";
  words?: CheckedWord[]; // từng từ của câu gốc: máy có nhận ra trong bản thu không
};

export const heardCount = (a: Take) => a.words?.filter((w) => w.state === "correct" || w.state === "close").length ?? 0;
const clearRatio = (a: Take) => (a.words?.length ? heardCount(a) / a.words.length : 0);
export const paceOk = (a: Take) => a.speed >= FAST;
export const clearOk = (a: Take) => a.status === "done" && clearRatio(a) >= CLEAR;
/** Đạt: máy nhận ra đủ từ + nhịp không chậm hơn mẫu (không nhận dạng được → chỉ xét nhịp) */
export const takePassed = (a: Take) => paceOk(a) && (a.status === "done" ? clearOk(a) : a.status !== "checking" && a.status !== "silent");

/**
 * Thu âm + chấm 1 lượt nói (không có giao diện — màn luyện tự vẽ nút theo `state`).
 * - record(): thu ngay. listenThenRecord(): phát câu mẫu (onListen), mẫu dừng (`playing` về false) thì tự thu.
 * - Nói xong im ~1,3 giây thì tự dừng; Whisper nhận dạng bản thu → so với câu gốc (chỉ là nhận dạng giọng nói,
 *   không phải chấm phát âm). score = false: không gửi Whisper, chỉ đo nhịp (lượt giữa khối lặp).
 * - autoLoop: rảnh tay — xong lượt thì tự thu lượt tiếp (loopListen: phát mẫu trước); đang phát mẫu thì chờ.
 * - Đổi câu (`text`) / rời màn giữa lúc thu → dừng thu, bỏ kết quả.
 */
export function useTake({
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
  score = true,
}: {
  text: string;
  duration: number; // giây — thời lượng câu mẫu
  playing: boolean; // câu mẫu đang phát
  onListen: () => void;
  onBeforeRecord: () => unknown; // dừng phát mẫu trước khi thu (trả promise → chờ dừng xong)
  onAttempt: (passed: boolean, clear?: number) => void; // clear: tỉ lệ từ máy nhận ra 0–1 (undefined = không nhận dạng)
  onCaptured?: () => void; // vừa thu xong 1 lượt có tiếng nói (trước khi nhận dạng) — vd. phát tiếng "ting"
  onSilent?: () => void; // lượt không nghe thấy tiếng (không tính lượt)
  onFail?: () => void; // không thu được (quyền micro / lỗi thiết bị)
  autoLoop?: boolean;
  loopListen?: boolean;
  score?: boolean;
}) {
  const { user } = useAuth();
  const { t } = useI18n();
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true, directory: "document" });
  const rec = useAudioRecorderState(recorder, 100);
  const samples = useRef<{ t: number; db: number }[]>([]);
  const stopping = useRef(false);
  const attemptId = useRef(0); // đổi câu / lượt mới → bỏ kết quả về muộn của lượt cũ
  const busy = useRef(false); // 1 lượt đang chạy (mẫu → thu → chấm) — vòng lặp chờ xong mới sang lượt sau
  const wasPlaying = useRef(false);
  const settling = useRef<Promise<unknown>>(Promise.resolve()); // lệnh dừng thu của lượt bị huỷ — lượt mới chờ xong mới mở micro
  const [take, setTake] = useState<Take | null>(null);
  const [armed, setArmed] = useState(false); // chờ câu mẫu phát xong để thu
  const [starting, setStarting] = useState(false); // đã bấm thu, micro đang khởi động (chưa thu)
  const startingRef = useRef(false); // như `starting` nhưng đọc được ngay (2 lần bấm trong cùng 1 khung hình)
  const setStart = (on: boolean) => {
    startingRef.current = on;
    setStarting(on);
  };
  const [uri, setUri] = useState<string | null>(null); // bản thu gần nhất

  // Sang câu khác → xoá kết quả + bản thu của câu trước
  const [forText, setForText] = useState(text);
  if (forText !== text) {
    setForText(text);
    setTake(null);
    setArmed(false);
    setUri(null);
  }

  const fail = () => {
    busy.current = false;
    setArmed(false);
    onFail?.();
    notice(t("crazy.recordFailed"), t("crazy.recordFailedBody"));
  };

  const record = async () => {
    if (startingRef.current || recorder.isRecording) return; // bấm 2 lần / vòng lặp gọi chồng
    busy.current = true;
    setStart(true); // giữ tới khi bắt đầu dừng thu → nút không nháy về "Thu âm" trong lúc chờ trạng thái micro
    // Dừng phát mẫu ngay (không để giọng máy phát chồng lên lượt thu)
    const silenced = Promise.resolve(onBeforeRecord()).catch(() => {});
    const id = ++attemptId.current;
    setTake(null);
    samples.current = [];
    stopping.current = false;
    const { granted } = await requestRecordingPermissionsAsync().catch(() => ({ granted: false }));
    if (id !== attemptId.current) return; // bị huỷ trong lúc chờ (đổi bước / đổi câu / chạy nền)
    if (!granted) {
      busy.current = false;
      setStart(false);
      setArmed(false);
      onFail?.();
      return micDenied();
    }
    try {
      await silenced;
      await settling.current; // lượt trước còn đang dừng thu → chờ, kẻo nó tắt chế độ thu của lượt này
      if (id !== attemptId.current) return;
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      if (id !== attemptId.current) {
        setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
        return;
      }
      recorder.record();
    } catch {
      setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
      setStart(false);
      fail();
    }
  };

  const report = (id: number, a: Take) => {
    if (id !== attemptId.current) return;
    busy.current = false;
    setTake(a);
    onAttempt(takePassed(a), a.status === "done" ? clearRatio(a) : undefined);
  };

  const stop = async () => {
    if (stopping.current) return;
    stopping.current = true;
    setStart(false);
    try {
      await recorder.stop();
    } catch {}
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {}); // trả âm thanh về loa ngoài
    const id = attemptId.current;
    const file = recorder.uri;
    const voiced = samples.current.filter((s) => s.db > VOICE_DB);
    if (!file || voiced.length < 3) {
      busy.current = false;
      onSilent?.();
      return setTake({ speed: 0, status: "silent" });
    }
    setUri(file);
    onCaptured?.(); // âm thanh đã trả về loa ngoài ở trên
    const spoken = (voiced[voiced.length - 1].t - voiced[0].t) / 1000 + 0.1;
    const speed = duration / Math.max(spoken, 0.3);
    if (!user) return report(id, { speed, status: "login" });
    if (!score) return report(id, { speed, status: "unscored" });
    setTake({ speed, status: "checking" });
    try {
      const { text: heard } = await api<{ text: string }>("/speak", { method: "POST", body: fileForm(file) });
      report(id, { speed, status: "done", words: checkDictation(text, heard).words });
    } catch {
      report(id, { speed, status: "error" });
    }
  };

  /** Bỏ lượt đang chạy (không chấm, không tính): rời màn, app chạy nền */
  const cancel = () => {
    attemptId.current++;
    busy.current = false;
    setArmed(false);
    setStart(false);
    try {
      if (!recorder.isRecording) return;
      stopping.current = true;
      settling.current = recorder
        .stop()
        .then(() => setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }))
        .catch(() => {});
    } catch {}
  };

  /** Huỷ lượt dở + xoá kết quả / bản thu (sang bước khác của cùng câu) */
  const reset = () => {
    cancel();
    setTake(null);
    setUri(null);
  };

  // Ghi âm lượng từng nhịp; nói xong (im lặng một lúc) hoặc quá dài → tự dừng
  const onLevel = useEffectEvent((ms: number, db: number) => {
    const s = samples.current;
    s.push({ t: ms, db });
    const lastVoice = s.findLast((x) => x.db > VOICE_DB);
    const maxMs = Math.min(20000, Math.max(5000, duration * 3000));
    if ((lastVoice && ms - lastVoice.t > SILENCE_MS) || ms > maxMs) stop();
  });
  useEffect(() => {
    if (rec.isRecording && rec.metering !== undefined) onLevel(rec.durationMillis, rec.metering);
  }, [rec.isRecording, rec.durationMillis, rec.metering]);

  // Câu mẫu vừa phát xong → nghỉ một chút (loa tắt hẳn) rồi bắt đầu thu
  const startAfterModel = useEffectEvent((id: number) => {
    if (id !== attemptId.current) return; // đã huỷ trong lúc chờ
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
    const t = setTimeout(() => startAfterModel(id), AFTER_MODEL_MS);
    return () => clearTimeout(t);
  }, [playing, armed]);

  // Đổi câu / rời màn giữa lúc thu → dừng thu
  useEffect(() => () => cancel(), [text, recorder]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (!autoLoop || busy.current || rec.isRecording || playing) return;
    if (loopListen) listenThenRecord();
    else record();
  });
  useEffect(() => {
    if (!autoLoop || playing) return;
    const id = setTimeout(loopNext, 700);
    return () => clearTimeout(id);
  }, [autoLoop, take, playing]);

  const state: "idle" | "waiting" | "starting" | "recording" | "checking" = rec.isRecording
    ? "recording"
    : starting
      ? "starting"
      : armed
      ? "waiting"
      : take?.status === "checking"
        ? "checking"
        : "idle";

  return { state, take, uri, level: rec.metering ?? -160, elapsed: rec.durationMillis, record, stop, cancel, reset, listenThenRecord };
}
