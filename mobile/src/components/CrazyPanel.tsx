import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { SymbolView } from "expo-symbols";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Alert, Text, View } from "react-native";
import { checkDictation, type CheckedWord } from "@shared/dictation";
import { Button } from "./ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useLayout } from "@/lib/layout";
import { C } from "@/lib/theme";

/** Ngưỡng chấm. Âm lượng micro tính bằng dBFS: im lặng ≈ -160, nói thường ≈ -30, hét ≈ -10 */
const VOICE_DB = -45; // trên mức này coi là đang có tiếng nói
const LOUD_DB = -20; // "To": chỉ là gợi ý (giọng to, tự tin), không bắt buộc để đạt
const FAST = 0.9; // "Nhanh": tốc độ ≥ 90% bản gốc
const CLEAR = 0.8; // "Rõ": máy nghe ra ≥ 80% số từ
const SILENCE_MS = 1300; // đã nói rồi im lặng chừng này → tự dừng ghi (rảnh tay để vung tay theo ngữ điệu)
const level = (db: number) => Math.min(1, Math.max(0, (db + 60) / 60)); // thanh âm lượng: -60…0 dB → 0…1
// Số lượt chỉ là số lần luyện, không phải bằng chứng thành thạo (thành thạo suy từ lịch sử ôn cách quãng)

type Attempt = {
  loud: number; // dB trung bình phần có tiếng
  speed: number; // thời lượng bản gốc / thời lượng mình nói (1 = nhanh bằng người bản xứ)
  status: "checking" | "done" | "login" | "error" | "silent"; // login / error: không chấm được độ rõ
  heard?: string; // Whisper nghe được
  words?: CheckedWord[];
};

const clearRatio = (a: Attempt) =>
  a.words?.length ? a.words.filter((w) => w.state === "correct" || w.state === "close").length / a.words.length : 0;
const loudOk = (a: Attempt) => a.loud >= LOUD_DB;
const fastOk = (a: Attempt) => a.speed >= FAST;
const clearOk = (a: Attempt) => a.status === "done" && clearRatio(a) >= CLEAR;
/** Đạt khi đủ Rõ + Nhanh (khách / lỗi mạng: không chấm được Rõ → chỉ xét Nhanh). To chỉ là gợi ý */
const passed = (a: Attempt) => fastOk(a) && (a.status === "done" ? clearOk(a) : a.status === "login" || a.status === "error");

function Badge({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  const color = ok === undefined ? C.muted : ok ? C.accent : C.redText;
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        gap: 2,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: ok === undefined ? C.border : color,
        backgroundColor: ok ? "rgba(22,163,74,0.12)" : ok === false ? "rgba(220,38,38,0.08)" : "transparent",
      }}
    >
      <Text style={{ color: C.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" }}>{label}</Text>
      <Text style={{ color, fontSize: 16, fontWeight: "800" }}>{value}</Text>
    </View>
  );
}

/**
 * Chế độ Crazy (theo Crazy English của Lý Dương): nghe câu gốc rồi nói lại ngay, chủ động và dứt khoát.
 * Mỗi lượt chấm Rõ (Whisper nghe ra bao nhiêu từ) + Nhanh (so thời lượng với bản gốc); To (âm lượng micro) chỉ là gợi ý —
 * nói to không tự nó giúp học giỏi, điều cần là luyện chủ động, cường độ cao và lặp có mục tiêu.
 * Lặp lại nhiều lượt mỗi câu để câu thành phản xạ.
 * Dùng cho câu trong video (Player) và ôn tập Crazy Deutsch (CrazyReview: "nghe" là giọng đọc của máy).
 */
export function CrazyPanel({
  text,
  duration,
  playing,
  reps,
  onListen,
  onPause,
  onRecorded,
  onPlayback,
  hasRecording,
  onAttempt,
  onNext,
  hasNext,
  canListen = true,
  showTip = true,
}: {
  text: string;
  duration: number; // giây — thời lượng câu gốc ở tốc độ 1×
  playing: boolean; // video đang phát
  reps: number; // số lượt đã hét câu này
  onListen: () => void; // phát câu gốc, dừng ở cuối câu
  onPause: () => void;
  onRecorded: (uri: string) => void;
  onPlayback: () => void;
  hasRecording: boolean;
  onAttempt: (passed: boolean, clear?: number) => void; // clear: tỉ lệ từ máy nghe ra 0–1 (undefined = không chấm được)
  onNext?: () => void;
  hasNext?: boolean;
  canListen?: boolean; // false → ẩn "Nghe rồi hét" (ôn tập: đang nhớ lại thì không cho nghe đáp án)
  showTip?: boolean;
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
  const [armed, setArmed] = useState(false); // "Nghe rồi hét": video phát xong câu thì tự ghi âm
  const wasPlaying = useRef(false);

  // Sang câu khác → xoá kết quả lượt trước
  const [forText, setForText] = useState(text);
  if (forText !== text) {
    setForText(text);
    setAttempt(null);
    setArmed(false);
  }

  const start = async () => {
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) return Alert.alert(t("player.micDenied"), t("player.micDeniedBody"));
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
    if (!uri || voiced.length < 3) return setAttempt({ loud: -160, speed: 0, status: "silent" });
    onRecorded(uri);
    const loud = voiced.reduce((sum, s) => sum + s.db, 0) / voiced.length;
    const spoken = (voiced[voiced.length - 1].t - voiced[0].t) / 1000 + 0.1;
    const base = { loud, speed: duration / Math.max(spoken, 0.3) };
    if (!user) return report(id, { ...base, status: "login" });
    setAttempt({ ...base, status: "checking" });
    try {
      const body = new FormData();
      // React Native: file gửi lên dạng { uri, name, type }
      body.append("file", { uri, name: uri.split("/").pop() || "speech.m4a", type: "audio/mp4" } as unknown as Blob);
      const { text: heard } = await api<{ text: string }>("/speak", { method: "POST", body });
      report(id, { ...base, status: "done", heard, words: checkDictation(text, heard).words });
    } catch {
      report(id, { ...base, status: "error" });
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

  // "Nghe rồi hét": video vừa dừng ở cuối câu → bắt đầu ghi
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
    wasPlaying.current = false;
    attemptId.current++;
    setAttempt(null);
    setArmed(true);
    onListen();
  };
  const cancelListen = () => {
    setArmed(false);
    onPause();
  };

  const meterDb = rec.isRecording ? (rec.metering ?? -160) : (attempt?.loud ?? -160);
  const meterOk = meterDb >= LOUD_DB;
  const a = attempt && attempt.status !== "silent" ? attempt : null;
  const firstMiss = a && (a.status === "done" && !clearOk(a) ? "clear" : !fastOk(a) ? "fast" : null);

  return (
    <View style={{ gap: 12 }}>
      {showTip && (
        <View style={{ gap: 4 }}>
          <Text style={{ color: C.amber, fontWeight: "800", fontSize: fs(15) }}>🔥 {t("crazy.motto")}</Text>
          <Text style={{ color: C.muted, fontSize: fs(13), lineHeight: fs(18) }}>{t("crazy.tip")}</Text>
        </View>
      )}

      {/* Thanh âm lượng: vượt vạch vàng = giọng to, tự tin (gợi ý, không bắt buộc) */}
      <View style={{ height: 12, borderRadius: 6, backgroundColor: C.card2, overflow: "hidden" }}>
        <View
          style={{
            width: `${level(meterDb) * 100}%`,
            height: "100%",
            borderRadius: 6,
            backgroundColor: meterOk ? C.accent : rec.isRecording ? C.amber : C.muted,
          }}
        />
        <View style={{ position: "absolute", left: `${level(LOUD_DB) * 100}%`, top: 0, bottom: 0, width: 2, backgroundColor: C.amber }} />
      </View>

      {rec.isRecording ? (
        <Button
          title={t("crazy.recording")}
          variant="red"
          onPress={finish}
          icon={<SymbolView name="stop.fill" size={18} tintColor={C.redText} />}
        />
      ) : armed ? (
        <Button
          title={t("crazy.listening")}
          variant="amber"
          onPress={cancelListen}
          icon={<SymbolView name="ear" size={18} tintColor={C.amber} />}
        />
      ) : (
        <View style={{ flexDirection: "row", gap: 10 }}>
          {canListen && (
            <Button
              title={t("crazy.listenShout")}
              variant="primary"
              onPress={listen}
              style={{ flex: 1 }}
              icon={<SymbolView name="ear" size={18} tintColor="#fff" />}
            />
          )}
          <Button
            title={t("crazy.shout")}
            variant="red"
            onPress={start}
            style={{ flex: 1 }}
            icon={<SymbolView name="mic.fill" size={18} tintColor={C.redText} />}
          />
        </View>
      )}

      {attempt?.status === "silent" && <Text style={{ color: C.redText, fontSize: fs(14) }}>{t("crazy.noVoice")}</Text>}

      {a && (
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Badge label={t("crazy.loud")} value={`${Math.round(level(a.loud) * 100)}%`} ok={loudOk(a) || undefined} />
            <Badge
              label={t("crazy.clear")}
              value={
                a.status === "done"
                  ? t("crazy.words", { c: Math.round(clearRatio(a) * (a.words?.length ?? 0)), n: a.words?.length ?? 0 })
                  : a.status === "checking"
                    ? t("crazy.checking")
                    : a.status === "login"
                      ? t("crazy.needLogin")
                      : t("crazy.checkFailed")
              }
              ok={a.status === "done" ? clearOk(a) : undefined}
            />
            <Badge label={t("crazy.fast")} value={`${Math.round(a.speed * 100)}%`} ok={fastOk(a)} />
          </View>

          {/* Từ máy nghe ra (xanh) / chưa nghe ra (đỏ) */}
          {a.status === "done" && a.words && (
            <>
              <Text style={{ fontSize: fs(16), lineHeight: fs(24), fontWeight: "600" }}>
                {a.words.map((w, k) => (
                  <Text key={k} style={{ color: w.state === "correct" || w.state === "close" ? C.accent : C.redText }}>
                    {w.text}{" "}
                  </Text>
                ))}
              </Text>
              <Text style={{ color: C.muted, fontSize: fs(13), lineHeight: fs(18) }}>
                {a.heard ? t("crazy.heard", { text: a.heard }) : t("crazy.heardNothing")}
              </Text>
            </>
          )}

          {a.status !== "checking" && (
            <Text style={{ color: passed(a) ? C.accent : C.amber, fontSize: fs(14), fontWeight: "700", lineHeight: fs(20) }}>
              {passed(a) ? t("crazy.passed") : firstMiss === "clear" ? t("crazy.hintClear") : t("crazy.hintFast", { s: duration.toFixed(1) })}
            </Text>
          )}
          {a.status !== "checking" && !loudOk(a) && <Text style={{ color: C.muted, fontSize: fs(13) }}>{t("crazy.hintLoud")}</Text>}
          {a.status === "login" && <Text style={{ color: C.muted, fontSize: fs(13) }}>{t("crazy.loginHint")}</Text>}
        </View>
      )}

      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Text style={{ flex: 1, color: reps ? C.amber : C.muted, fontWeight: "800", fontSize: 13, lineHeight: 18 }}>
          {t("crazy.reps", { n: reps })}
        </Text>
        <Button
          title={t("crazy.myVoice")}
          onPress={onPlayback}
          disabled={!hasRecording || rec.isRecording}
          icon={<SymbolView name="speaker.wave.2.fill" size={16} tintColor={C.text} />}
        />
        {onNext && hasNext && <Button title={t("crazy.next")} onPress={onNext} disabled={rec.isRecording} />}
      </View>
    </View>
  );
}
