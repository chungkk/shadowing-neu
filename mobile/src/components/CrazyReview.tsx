import { useAudioPlayer } from "expo-audio";
import { Stack } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { gradeOf, type Grade, type Mastery, type RecallLevel, type SpeakLevel } from "@shared/srs";
import { CrazyPanel } from "./CrazyPanel";
import { Button, Label, styles } from "./ui";
import { api, type CrazyRep, type VocabItem } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { FORM_MAX } from "@/lib/layout";
import { masteryMeta, masteryOfItem } from "@/lib/mastery";
import { speakGerman, stopSpeaking } from "@/lib/speak";
import { C } from "@/lib/theme";

type Item = VocabItem & { stage: number };
/** 1 lượt trong hàng chờ; retry = ôn thêm có gợi ý cuối buổi (không chấm lại vào lịch ôn) */
type Entry = { item: Item; retry: boolean };
type Result = { item: Item; grade: Grade; recall: RecallLevel; speaking: SpeakLevel; mastery?: Mastery };

const DRILL_TARGET = 3; // mỗi mục: nói đạt 3 lượt rồi sang mục tiếp
const RECALL_KEYS = ["crazyReview.r0", "crazyReview.r1", "crazyReview.r2", "crazyReview.r3"] as const;
const SPEAK_KEYS = ["crazyReview.s0", "crazyReview.s1", "crazyReview.s2"] as const;

const mask = (s: string) => s.replace(/[\p{L}\p{N}]/gu, "•");
/** Gợi ý: giữ chữ cái đầu mỗi từ — "Das soll andere" → "D__ s___ a_____" */
function hintOf(s: string) {
  let first = true; // chữ cái đầu của từ đang duyệt
  return [...s]
    .map((c) => {
      if (/\s/.test(c)) {
        first = true;
        return c;
      }
      if (!/[\p{L}\p{N}]/u.test(c)) return c;
      if (!first) return "_";
      first = false;
      return c;
    })
    .join("");
}
/** Chưa nghe giọng máy đọc lần nào → ước lượng thời lượng để chấm "Nhanh" */
const estimate = (text: string) => 0.3 + text.split(/\s+/).length * 0.4;

/** Ô chọn mức tự đánh giá */
function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexGrow: 1,
        flexBasis: "45%",
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: on ? C.phrase : C.border,
        backgroundColor: on ? "rgba(56,189,248,0.15)" : C.card2,
        alignItems: "center",
      }}
    >
      <Text style={{ color: on ? C.phrase : C.text, fontWeight: "700", textAlign: "center" }}>{label}</Text>
    </Pressable>
  );
}

/**
 * Ôn tập kiểu Crazy Deutsch: mỗi mục đi qua
 * 1. Nhớ lại: chỉ thấy nghĩa → tự nói tiếng Đức (Whisper chấm để gợi ý), hoặc "Không nhớ".
 * 2. Tự đánh giá 2 chiều — nhớ (4 mức) và nói (3 mức) — rồi chấm vào lịch ôn (ghi thành 1 sự kiện trên server).
 *    Quên / nhớ một phần / nói ngập ngừng → cuối buổi ôn thêm 1 lượt có gợi ý chữ cái đầu.
 * 3. Luyện nói: nghe giọng máy đọc rồi nói theo — Rõ · Nhanh (To là gợi ý) — đạt 3 lượt thì sang mục tiếp.
 * Mục chưa có nghĩa thì chỉ luyện nói. Số lượt luyện mỗi mục lưu vĩnh viễn (source "/vocab/<id>").
 */
export function CrazyReview({ items, onClose }: { items: Item[]; onClose: (changed: boolean) => void }) {
  const { t } = useI18n();
  const [queue, setQueue] = useState<Entry[]>(() => items.map((item) => ({ item, retry: false })));
  const [pos, setPos] = useState(0);
  const entry = queue[pos] as Entry | undefined;
  const v = entry?.item;
  const phaseFor = (e?: Entry) => (e?.item.meaning ? "recall" : "drill");
  const [phase, setPhase] = useState<"recall" | "rate" | "drill">(() => phaseFor(queue[0]));
  const [recall, setRecall] = useState<RecallLevel | null>(null);
  const [speaking, setSpeaking] = useState<SpeakLevel | null>(null);
  const [autoClear, setAutoClear] = useState<number | null>(null); // tỉ lệ từ máy nghe ra ở bước nhớ lại
  const [passes, setPasses] = useState(0); // lượt đạt của mục đang luyện
  const [reps, setReps] = useState<Record<number, CrazyRep>>({}); // tổng lượt luyện từng mục (qua mọi buổi)
  const [results, setResults] = useState<Result[]>([]);
  const [shouts, setShouts] = useState(0); // lượt nói trong buổi này
  const [changed, setChanged] = useState(false); // đã chấm vào lịch ôn → quay lại thì tải lại sổ từ
  const [talking, setTalking] = useState(false); // máy đang đọc mẫu
  const [ttsSec, setTtsSec] = useState<Record<number, number>>({}); // thời lượng giọng máy đọc từng mục
  const [recording, setRecording] = useState<string | null>(null);
  const speakId = useRef(0); // bỏ onEnd của lần đọc cũ (bị dừng giữa chừng)
  const playback = useAudioPlayer(null);

  useEffect(() => {
    api<{ reps: Record<string, CrazyRep> }>("/crazy?source=/vocab")
      .then((r) => setReps(Object.fromEntries(Object.entries(r.reps).map(([k, x]) => [Number(k), x]))))
      .catch(() => {});
    return () => void stopSpeaking();
  }, []);

  const listen = () => {
    if (!v) return;
    const id = ++speakId.current;
    const started = Date.now();
    setTalking(true);
    speakGerman(v.word, {
      onEnd: () => {
        if (id !== speakId.current) return;
        setTalking(false);
        setTtsSec((s) => ({ ...s, [v.id]: (Date.now() - started) / 1000 }));
      },
    }).catch(() => setTalking(false));
  };
  const silence = () => {
    speakId.current++;
    stopSpeaking();
    setTalking(false);
  };

  /** Chấm vào lịch ôn theo 2 chiều tự đánh giá; quên / còn ngập ngừng → thêm 1 lượt có gợi ý cuối buổi */
  const submitRating = (r: RecallLevel, s: SpeakLevel) => {
    if (!entry || !v) return;
    const grade = gradeOf(r, s);
    if (!entry.retry) {
      const res: Result = { item: v, grade, recall: r, speaking: s };
      setResults((list) => [...list, res]);
      setChanged(true);
      api<{ mastery?: Mastery }>(`/vocab/${v.id}/review`, {
        method: "POST",
        body: { grade, mode: "crazy", exercise: "recall", recall: r, speaking: s, autoClear },
      })
        .then((x) => setResults((list) => list.map((y) => (y === res ? { ...y, mastery: x.mastery } : y))))
        .catch(() => {});
      if (grade === "again" || grade === "hard") setQueue((q) => [...q, { item: v, retry: true }]);
    }
    setPhase("drill");
    if (grade === "again") listen(); // quên → nghe mẫu ngay
  };

  const onAttempt = (ok: boolean, clear?: number) => {
    if (!v) return;
    setShouts((n) => n + 1);
    setReps((s) => ({ ...s, [v.id]: { reps: (s[v.id]?.reps ?? 0) + 1, passed: ok || !!s[v.id]?.passed } }));
    api<{ rep: CrazyRep }>("/crazy", { method: "POST", body: { source: `/vocab/${v.id}`, idx: 0, passed: ok } })
      .then(({ rep }) => setReps((s) => ({ ...s, [v.id]: rep })))
      .catch(() => {});
    if (phase === "recall") {
      // Gợi ý sẵn mức tự đánh giá từ kết quả máy chấm; người học sửa lại nếu thấy chưa đúng
      setAutoClear(clear ?? null);
      if (clear !== undefined) {
        setRecall(clear >= 0.8 ? 2 : clear >= 0.4 ? 1 : 0);
        setSpeaking(ok ? 2 : clear >= 0.8 ? 1 : 0);
      }
      setPhase("rate");
    } else if (phase === "drill" && ok) setPasses((p) => p + 1);
  };

  const next = () => {
    silence();
    const n = pos + 1;
    setPos(n);
    setPhase(phaseFor(queue[n]));
    setRecall(null);
    setSpeaking(null);
    setAutoClear(null);
    setPasses(0);
    setRecording(null);
  };

  const playRecording = () => {
    if (!recording) return;
    silence();
    playback.replace({ uri: recording });
    playback.play();
  };

  const result = v && results.findLast((r) => r.item.id === v.id);
  const recalledOk = results.filter((r) => r.grade === "good" || r.grade === "easy").length;
  const weak = results.filter((r) => r.grade === "again" || r.grade === "hard");
  const big = (s: string) => (s.includes(" ") ? 22 : 30);

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, width: "100%", maxWidth: FORM_MAX, alignSelf: "center" }}>
        {/* Thanh trên: thoát · tiến độ · lượt nói */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 10 }}>
          <Pressable onPress={() => onClose(changed)} hitSlop={12}>
            <SymbolView name="xmark" size={22} weight="bold" tintColor={C.muted} />
          </Pressable>
          <View style={{ flex: 1, height: 16, borderRadius: 8, backgroundColor: C.card2, overflow: "hidden" }}>
            <View style={{ height: "100%", width: `${(Math.min(pos, queue.length) / Math.max(queue.length, 1)) * 100}%`, borderRadius: 8, backgroundColor: C.red }} />
          </View>
          <Text style={{ color: C.amber, fontWeight: "800", fontSize: 16 }}>🔥 {shouts}</Text>
        </View>

        {!entry || !v ? (
          // Hết buổi ôn
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center", gap: 18, padding: 24 }}>
            <Text style={{ fontSize: 64 }}>📣</Text>
            <Text style={{ color: C.amber, fontSize: 28, fontWeight: "800", textAlign: "center" }}>{t("crazyReview.finished")}</Text>
            <View style={{ flexDirection: "row", gap: 10, alignSelf: "stretch" }}>
              {[
                { label: t("crazyReview.recallStat"), value: results.length ? `${recalledOk}/${results.length}` : "—", color: C.accent },
                { label: t("crazyReview.shoutStat"), value: `🔥 ${shouts}`, color: C.amber },
              ].map((s) => (
                <View key={s.label} style={{ flex: 1, borderWidth: 2, borderColor: s.color, borderRadius: 16, overflow: "hidden" }}>
                  <Text style={{ backgroundColor: s.color, color: C.background, textAlign: "center", fontSize: 11, fontWeight: "800", paddingVertical: 4, textTransform: "uppercase" }}>
                    {s.label}
                  </Text>
                  <Text style={{ color: s.color, textAlign: "center", fontSize: 20, fontWeight: "800", paddingVertical: 12 }}>{s.value}</Text>
                </View>
              ))}
            </View>
            {weak.length > 0 && (
              <View style={{ alignSelf: "stretch", borderWidth: 2, borderColor: C.border, borderRadius: 16, padding: 14, gap: 10 }}>
                <Text style={{ color: C.redText, fontWeight: "800" }}>{t("crazyReview.forgotList")}</Text>
                {weak.map((r) => (
                  <View key={r.item.id} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ flex: 1, color: C.text }}>
                      <Text style={{ fontWeight: "800" }}>{r.item.word}</Text>
                      <Text style={{ color: C.muted }}> — {r.item.meaning}</Text>
                    </Text>
                    {r.mastery && (
                      <Text style={{ color: masteryMeta(r.mastery, t).color, fontSize: 12, fontWeight: "700" }}>{masteryMeta(r.mastery, t).label}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
            <Button title={t("review.done")} variant="primary" onPress={() => onClose(changed)} style={{ alignSelf: "stretch" }} />
          </ScrollView>
        ) : (
          <>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, padding: 16, gap: 18 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ flex: 1, color: C.text, fontSize: 22, fontWeight: "800" }}>
                  {phase === "recall" ? t("crazyReview.recall") : phase === "rate" ? t("crazyReview.rate") : t("crazyReview.drill", { n: DRILL_TARGET })}
                </Text>
                {entry.retry ? (
                  <Text style={{ color: C.redText, fontSize: 12, fontWeight: "800" }}>{t("review.retry")}</Text>
                ) : (
                  <Text style={{ color: masteryMeta(masteryOfItem(v), t).color, fontSize: 12, fontWeight: "700" }}>{masteryMeta(masteryOfItem(v), t).label}</Text>
                )}
              </View>

              {phase === "recall" ? (
                <View style={{ alignItems: "center", gap: 12 }}>
                  <Text style={{ color: C.amber, fontSize: big(v.meaning), fontWeight: "800", textAlign: "center" }}>{v.meaning}</Text>
                  {/* Lượt ôn thêm: gợi ý chữ cái đầu mỗi từ */}
                  <Text style={{ color: C.muted, fontSize: 18, letterSpacing: 2, textAlign: "center" }}>{entry.retry ? hintOf(v.word) : mask(v.word)}</Text>
                </View>
              ) : (
                <View style={{ alignItems: "center", gap: 10 }}>
                  {phase === "drill" && result && !entry.retry && (
                    <Text style={{ color: result.grade === "again" ? C.redText : result.grade === "hard" ? C.amber : C.accent, fontWeight: "800" }}>
                      {t(`crazyReview.g.${result.grade}`)}
                    </Text>
                  )}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Pressable onPress={listen} hitSlop={10} accessibilityLabel={t("vocab.listen")}>
                      <SymbolView name="speaker.wave.2.fill" size={24} tintColor={C.phrase} />
                    </Pressable>
                    <Text style={{ flexShrink: 1, color: C.text, fontSize: big(v.word), fontWeight: "800", textAlign: "center" }}>{v.word}</Text>
                  </View>
                  {!!v.meaning && <Text style={{ color: C.amber, fontSize: 16, textAlign: "center" }}>{v.meaning}</Text>}
                  {phase === "drill" && !!v.context && v.context !== v.word && (
                    <Text style={{ color: C.muted, fontSize: 14, lineHeight: 21, textAlign: "center" }}>{v.context}</Text>
                  )}
                  {phase === "drill" && (
                    <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
                      {Array.from({ length: DRILL_TARGET }, (_, i) => (
                        <SymbolView key={i} name="flame.fill" size={22} tintColor={i < passes ? C.amber : C.card2} />
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Tự đánh giá 2 chiều: nhớ · nói (máy gợi ý sẵn, người học sửa nếu chưa đúng) */}
              {phase === "rate" && (
                <View style={{ gap: 14 }}>
                  <View style={{ gap: 8 }}>
                    <Label>{t("crazyReview.recallQ")}</Label>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {RECALL_KEYS.map((k, i) => (
                        <Chip key={k} label={t(k)} on={recall === i} onPress={() => setRecall(i as RecallLevel)} />
                      ))}
                    </View>
                  </View>
                  <View style={{ gap: 8 }}>
                    <Label>{t("crazyReview.speakQ")}</Label>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {SPEAK_KEYS.map((k, i) => (
                        <Chip key={k} label={t(k)} on={speaking === i} onPress={() => setSpeaking(i as SpeakLevel)} />
                      ))}
                    </View>
                  </View>
                  {autoClear !== null && <Text style={{ color: C.muted, fontSize: 13 }}>{t("crazyReview.suggested")}</Text>}
                </View>
              )}

              <CrazyPanel
                key={`${pos}`}
                text={v.word}
                duration={ttsSec[v.id] ?? estimate(v.word)}
                playing={talking}
                reps={reps[v.id]?.reps ?? 0}
                onListen={listen}
                onPause={silence}
                onRecorded={setRecording}
                onPlayback={playRecording}
                hasRecording={!!recording}
                onAttempt={onAttempt}
                canListen={phase === "drill"}
                showTip={pos === 0 && phase === "drill"}
              />
            </ScrollView>

            <View style={{ borderTopWidth: 2, borderColor: C.border, padding: 16, flexDirection: "row", gap: 12 }}>
              {phase === "recall" ? (
                <Button title={t("crazyReview.forgot")} onPress={() => submitRating(0, 0)} style={{ flex: 1 }} />
              ) : phase === "rate" ? (
                <Button
                  title={t("crazyReview.saveRating")}
                  variant="primary"
                  disabled={recall === null || speaking === null}
                  onPress={() => recall !== null && speaking !== null && submitRating(recall, speaking)}
                  style={{ flex: 1 }}
                />
              ) : (
                <Button
                  title={passes >= DRILL_TARGET ? t("review.continue") : t("crazyReview.skip")}
                  variant={passes >= DRILL_TARGET ? "primary" : "plain"}
                  onPress={next}
                  style={{ flex: 1 }}
                />
              )}
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
