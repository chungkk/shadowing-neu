import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { checkDictation, type CheckedWord } from "@shared/dictation";
import { Button } from "./ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useLayout } from "@/lib/layout";
import { C } from "@/lib/theme";

/** Ngưỡng chấm. Âm lượng micro tính bằng dBFS: im lặng ≈ -160, nói thường ≈ -30, nói to ≈ -10 */
const VOICE_DB = -45; // trên mức này coi là đang có tiếng nói
const LOUD_DB = -20; // vạch trên thanh âm lượng: giọng to, tự tin (gợi ý, không bắt buộc)
const FAST = 0.9; // "Nhanh": tốc độ ≥ 90% bản gốc
const CLEAR = 0.8; // "Rõ": máy nghe ra ≥ 80% số từ
const SILENCE_MS = 1300; // đã nói rồi im lặng chừng này → tự dừng ghi (rảnh tay để vung tay theo ngữ điệu)
const level = (db: number) => Math.min(1, Math.max(0, (db + 60) / 60)); // thanh âm lượng: -60…0 dB → 0…1
// Số lượt chỉ là số lần luyện, không phải bằng chứng thành thạo (thành thạo suy từ lịch sử ôn cách quãng)

type Attempt = {
  speed: number; // thời lượng bản gốc / thời lượng mình nói (1 = nhanh bằng người bản xứ)
  status: "checking" | "done" | "login" | "error" | "unscored" | "silent"; // login / error / unscored: không chấm độ rõ
  words?: CheckedWord[];
};

const clearRatio = (a: Attempt) =>
  a.words?.length ? a.words.filter((w) => w.state === "correct" || w.state === "close").length / a.words.length : 0;
const fastOk = (a: Attempt) => a.speed >= FAST;
const clearOk = (a: Attempt) => a.status === "done" && clearRatio(a) >= CLEAR;
/** Đạt khi đủ Rõ + Nhanh (không chấm Rõ — khách / lỗi mạng / lượt không gửi Whisper → chỉ xét Nhanh) */
const passed = (a: Attempt) => fastOk(a) && (a.status === "done" ? clearOk(a) : a.status !== "checking" && a.status !== "silent");

function RoundIcon({ icon, onPress, label }: { icon: SFSymbol; onPress: () => void; label: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: C.card2,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <SymbolView name={icon} size={20} tintColor={C.text} />
    </Pressable>
  );
}

/**
 * Chế độ Crazy (theo Crazy English của Lý Dương): nghe câu gốc rồi nói lại ngay, chủ động và dứt khoát.
 * Mỗi lượt chấm Rõ (Whisper nghe ra bao nhiêu từ) + Nhanh (so thời lượng với bản gốc). Giao diện tối giản:
 * câu tô màu theo từ máy nghe ra · 1 dòng kết quả · 1 nút chính (+ ghi âm luôn, nghe lại giọng mình).
 * Dùng cho ôn tập Crazy Deutsch (CrazyReview: "nghe" là giọng đọc của máy).
 * autoLoop: rảnh tay — xong 1 lượt thì tự ghi lượt tiếp (loopListen: nghe mẫu trước khi ghi), tới khi tắt.
 *   Đang phát mẫu (người học bấm nghe lại) thì chờ phát xong rồi mới ghi.
 * score = false: không gửi Whisper (lượt giữa khối lặp — chỉ đếm + chấm Nhanh, đỡ chờ và đỡ tốn API).
 */
export function CrazyPanel({
  text,
  duration,
  playing,
  reps = 0,
  onListen,
  onPause,
  onRecorded,
  onPlayback,
  hasRecording,
  onAttempt,
  onSilent,
  canListen = true,
  autoLoop = false,
  loopListen = true,
  score = true,
}: {
  text: string;
  duration: number; // giây — thời lượng câu gốc ở tốc độ 1×
  playing: boolean; // video / giọng máy đang phát
  reps?: number; // số lượt đã luyện câu này (0 → không hiện)
  onListen: () => void; // phát câu gốc, dừng ở cuối câu
  onPause: () => void;
  onRecorded: (uri: string) => void;
  onPlayback: () => void;
  hasRecording: boolean;
  onAttempt: (passed: boolean, clear?: number) => void; // clear: tỉ lệ từ máy nghe ra 0–1 (undefined = không chấm được)
  onSilent?: () => void; // lượt không nghe thấy tiếng (không tính lượt)
  canListen?: boolean; // false → chỉ nút "Nói" (ôn tập: đang nhớ lại thì không cho nghe đáp án)
  autoLoop?: boolean;
  loopListen?: boolean;
  score?: boolean;
}) {
  const { user } = useAuth();
  const { t } = useI18n();
  const { fs } = useLayout();
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true, directory: "document" });
  const rec = useAudioRecorderState(recorder, 100);
  const samples = useRef<{ t: number; db: number }[]>([]);
  const stopping = useRef(false);
  const attemptId = useRef(0); // đổi câu / lượt mới → bỏ kết quả chấm về muộn của lượt cũ
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [armed, setArmed] = useState(false); // "Nghe & nói": phát xong câu mẫu thì tự ghi âm
  const wasPlaying = useRef(false);
  const busy = useRef(false); // 1 lượt đang chạy (nghe mẫu → ghi → chấm) — vòng lặp chờ xong mới sang lượt sau

  // Sang câu khác → xoá kết quả lượt trước
  const [forText, setForText] = useState(text);
  if (forText !== text) {
    setForText(text);
    setAttempt(null);
    setArmed(false);
  }

  const start = async () => {
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) {
      busy.current = false;
      return Alert.alert(t("player.micDenied"), t("player.micDeniedBody"));
    }
    busy.current = true;
    onPause();
    attemptId.current++;
    setAttempt(null);
    samples.current = [];
    stopping.current = false;
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
  };

  const report = (id: number, a: Attempt) => {
    if (id !== attemptId.current) return;
    busy.current = false;
    setAttempt(a);
    onAttempt(passed(a), a.status === "done" ? clearRatio(a) : undefined);
  };

  const finish = async () => {
    if (stopping.current) return;
    stopping.current = true;
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }); // trả âm thanh về loa ngoài
    const id = attemptId.current;
    const uri = recorder.uri;
    const voiced = samples.current.filter((s) => s.db > VOICE_DB);
    if (!uri || voiced.length < 3) {
      busy.current = false;
      onSilent?.();
      return setAttempt({ speed: 0, status: "silent" });
    }
    onRecorded(uri);
    const spoken = (voiced[voiced.length - 1].t - voiced[0].t) / 1000 + 0.1;
    const speed = duration / Math.max(spoken, 0.3);
    if (!user) return report(id, { speed, status: "login" });
    if (!score) return report(id, { speed, status: "unscored" });
    setAttempt({ speed, status: "checking" });
    try {
      const body = new FormData();
      // React Native: file gửi lên dạng { uri, name, type }
      body.append("file", { uri, name: uri.split("/").pop() || "speech.m4a", type: "audio/mp4" } as unknown as Blob);
      const { text: heard } = await api<{ text: string }>("/speak", { method: "POST", body });
      report(id, { speed, status: "done", words: checkDictation(text, heard).words });
    } catch {
      report(id, { speed, status: "error" });
    }
  };

  // Ghi lại âm lượng từng nhịp; đã nói xong (im lặng một lúc) hoặc quá dài → tự dừng
  const onLevel = useEffectEvent((ms: number, db: number) => {
    const s = samples.current;
    s.push({ t: ms, db });
    const lastVoice = s.findLast((x) => x.db > VOICE_DB);
    const maxMs = Math.min(20000, Math.max(5000, duration * 3000));
    if ((lastVoice && ms - lastVoice.t > SILENCE_MS) || ms > maxMs) finish();
  });
  useEffect(() => {
    if (rec.isRecording && rec.metering !== undefined) onLevel(rec.durationMillis, rec.metering);
  }, [rec.isRecording, rec.durationMillis, rec.metering]);

  // "Nghe & nói": câu mẫu vừa phát xong → bắt đầu ghi
  const onPlayingChange = useEffectEvent((now: boolean) => {
    if (!armed) return;
    if (now) wasPlaying.current = true;
    else if (wasPlaying.current) {
      wasPlaying.current = false;
      setArmed(false);
      start();
    }
  });
  useEffect(() => onPlayingChange(playing), [playing, armed]);

  // Đổi câu / rời chế độ Crazy giữa lúc đang ghi → dừng ghi, trả âm thanh về loa
  useEffect(
    () => () => {
      attemptId.current++;
      try {
        if (!recorder.isRecording) return;
        stopping.current = true;
        recorder
          .stop()
          .then(() => setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }))
          .catch(() => {});
      } catch {}
    },
    [text, recorder],
  );

  const listen = () => {
    busy.current = true;
    wasPlaying.current = false;
    attemptId.current++;
    setAttempt(null);
    setArmed(true);
    onListen();
  };

  // Rảnh tay: xong lượt (đã chấm) → nghỉ một nhịp rồi ghi lượt tiếp (có / không nghe mẫu trước)
  const loopNext = useEffectEvent(() => {
    if (!autoLoop || busy.current || rec.isRecording || playing) return;
    if (loopListen) listen();
    else start();
  });
  useEffect(() => {
    if (!autoLoop || playing) return;
    const id = setTimeout(loopNext, 700);
    return () => clearTimeout(id);
  }, [autoLoop, attempt, playing]);

  const a = attempt;
  // 1 dòng kết quả: đang chấm · không nghe thấy · đạt · chưa rõ · chậm
  const verdict = !a
    ? null
    : a.status === "checking"
      ? { text: t("crazy.checking"), color: C.muted }
      : a.status === "silent"
        ? { text: t("crazy.noVoice"), color: C.redText }
        : passed(a)
          ? { text: t("crazy.passed"), color: C.accent }
          : a.status === "done" && !clearOk(a)
            ? { text: t("crazy.hintClear"), color: C.amber }
            : { text: t("crazy.hintFast", { s: duration.toFixed(1) }), color: C.amber };

  return (
    <View style={{ gap: 12 }}>
      {/* Câu vừa nói: xanh = máy nghe rõ, đỏ = chưa rõ */}
      {a?.status === "done" && a.words && (
        <Text style={{ fontSize: fs(18), lineHeight: fs(26), fontWeight: "700", textAlign: "center" }}>
          {a.words.map((w, k) => (
            <Text key={k} style={{ color: w.state === "correct" || w.state === "close" ? C.accent : C.redText }}>
              {w.text}{" "}
            </Text>
          ))}
        </Text>
      )}
      {verdict && <Text style={{ color: verdict.color, fontSize: fs(14), fontWeight: "700", textAlign: "center" }}>{verdict.text}</Text>}

      {/* Thanh âm lượng — chỉ hiện khi đang ghi; vạch vàng = giọng to, tự tin */}
      {rec.isRecording && (
        <View style={{ height: 6, borderRadius: 3, backgroundColor: C.card2, overflow: "hidden" }}>
          <View
            style={{
              width: `${level(rec.metering ?? -160) * 100}%`,
              height: "100%",
              backgroundColor: (rec.metering ?? -160) >= LOUD_DB ? C.accent : C.amber,
            }}
          />
          <View style={{ position: "absolute", left: `${level(LOUD_DB) * 100}%`, top: 0, bottom: 0, width: 2, backgroundColor: C.amber }} />
        </View>
      )}

      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {rec.isRecording ? (
          <Button
            title={t("crazy.recording")}
            variant="red"
            onPress={finish}
            style={{ flex: 1 }}
            icon={<SymbolView name="stop.fill" size={18} tintColor={C.redText} />}
          />
        ) : armed ? (
          <Button
            title={t("crazy.listening")}
            variant="amber"
            onPress={() => {
              busy.current = false;
              setArmed(false);
              onPause();
            }}
            style={{ flex: 1 }}
            icon={<SymbolView name="ear" size={18} tintColor={C.amber} />}
          />
        ) : canListen ? (
          <Button
            title={t("crazy.listenShout")}
            variant="primary"
            onPress={listen}
            style={{ flex: 1 }}
            icon={<SymbolView name="ear" size={18} tintColor="#fff" />}
          />
        ) : (
          <Button
            title={t("crazy.shout")}
            variant="primary"
            onPress={start}
            style={{ flex: 1 }}
            icon={<SymbolView name="mic.fill" size={18} tintColor="#fff" />}
          />
        )}
        {/* Ghi âm luôn (không nghe mẫu) · nghe lại giọng mình */}
        {canListen && !rec.isRecording && !armed && <RoundIcon icon="mic.fill" onPress={start} label={t("crazy.shout")} />}
        {hasRecording && !rec.isRecording && <RoundIcon icon="speaker.wave.2.fill" onPress={onPlayback} label={t("crazy.myVoice")} />}
      </View>
      {reps > 0 && <Text style={{ color: C.muted, fontSize: 12, textAlign: "center" }}>{t("crazy.reps", { n: reps })}</Text>}
    </View>
  );
}
