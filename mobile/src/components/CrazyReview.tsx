import { useAudioPlayer } from "expo-audio";
import { Stack } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Grade } from "@shared/srs";
import { CrazyPanel } from "./CrazyPanel";
import { Button, styles } from "./ui";
import { api, type CrazyRep, type VocabItem } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { FORM_MAX } from "@/lib/layout";
import { speakGerman, stopSpeaking } from "@/lib/speak";
import { C } from "@/lib/theme";

type Item = VocabItem & { stage: number };
/** 1 lượt trong hàng chờ; retry = ôn thêm có gợi ý cuối buổi (không chấm lại vào lịch ôn) */
type Entry = { item: Item; retry: boolean };
type Result = { item: Item; grade: Grade };

const REP_TARGET = 500; // mục tiêu cộng dồn mỗi mục (theo tinh thần lặp hàng trăm lần của Crazy English), rải qua nhiều buổi
const SILENT_STOP = 2; // vòng lặp rảnh tay: 2 lượt liền không nghe thấy tiếng → tự dừng
const GRADE_KEYS = { again: "crazyReview.again", hard: "crazyReview.hard", good: "crazyReview.good", easy: "crazyReview.easy" } as const;

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
/** Máy gợi ý kết quả từ lượt nhớ lại (không bao giờ tự gợi ý "Dễ" — để người học tự quyết) */
const suggest = (ok: boolean, clear?: number): Grade | null =>
  clear === undefined ? null : clear >= 0.8 ? (ok ? "good" : "hard") : clear >= 0.4 ? "hard" : "again";

/** 4 nút tự chấm ở đáy màn; nút máy gợi ý được tô sẵn */
function GradeBar({ suggested, onRate }: { suggested: Grade | null; onRate: (g: Grade) => void }) {
  const { t } = useI18n();
  return (["again", "hard", "good", "easy"] as const).map((g) => (
    <Button
      key={g}
      title={t(GRADE_KEYS[g])}
      variant={g === suggested ? "primary" : "plain"}
      onPress={() => onRate(g)}
      style={{ flex: 1, paddingHorizontal: 4 }}
    />
  ));
}

/** Đáy màn bước luyện nói: Bỏ qua + Lặp n lượt · Dừng · (đủ khối) Tiếp tục */
function DrillBar({ done, looping, left, onNext, onToggle }: { done: boolean; looping: boolean; left: number; onNext: () => void; onToggle: () => void }) {
  const { t } = useI18n();
  if (done) return <Button title={t("review.continue")} variant="primary" onPress={onNext} style={{ flex: 1 }} />;
  if (looping) return <Button title={t("crazyReview.stop")} onPress={onToggle} style={{ flex: 1 }} icon={<SymbolView name="pause.fill" size={16} tintColor={C.text} />} />;
  return (
    <>
      <Button title={t("crazyReview.skip")} onPress={onNext} style={{ flex: 1 }} />
      <Button
        title={t("crazyReview.loop", { n: left })}
        variant="primary"
        onPress={onToggle}
        style={{ flex: 2 }}
        icon={<SymbolView name="repeat" size={16} tintColor="#fff" />}
      />
    </>
  );
}

/**
 * Ôn tập kiểu Crazy Deutsch, giao diện tối giản. Mỗi mục:
 * 1. Nhớ lại: chỉ thấy nghĩa → tự nói tiếng Đức (hoặc "Không nhớ").
 * 2. Tự chấm Quên · Khó · Được · Dễ (máy tô sẵn gợi ý) → vào lịch ôn, ghi thành 1 sự kiện trên server.
 *    Quên / Khó → cuối buổi ôn thêm 1 lượt có gợi ý chữ cái đầu.
 * 3. Luyện nói: lặp rảnh tay `block` lượt — máy đọc mẫu 1 lần ở lượt đầu, sau đó chỉ ghi liên tục; chạm vào câu để
 *    nghe lại (đọc xong vòng lặp tự ghi tiếp). Cộng dồn tới REP_TARGET lượt / mục qua
 *    nhiều buổi. Chỉ lượt đầu và lượt cuối khối được Whisper chấm độ rõ; lượt giữa chỉ đếm (đỡ chờ, đỡ tốn API).
 * Mục chưa có nghĩa thì chỉ luyện nói. Số lượt luyện mỗi mục lưu vĩnh viễn (source "/vocab/<id>").
 * Số lượt không phải bằng chứng thành thạo — thành thạo suy từ kết quả nhớ lại qua các lần ôn cách quãng.
 */
export function CrazyReview({ items, block, onClose }: { items: Item[]; block: number; onClose: (changed: boolean) => void }) {
  const { t } = useI18n();
  const [queue, setQueue] = useState<Entry[]>(() => items.map((item) => ({ item, retry: false })));
  const [pos, setPos] = useState(0);
  const entry = queue[pos] as Entry | undefined;
  const v = entry?.item;
  const phaseFor = (e?: Entry) => (e?.item.meaning ? "recall" : "drill");
  const [phase, setPhase] = useState<"recall" | "rate" | "drill">(() => phaseFor(queue[0]));
  const [suggested, setSuggested] = useState<Grade | null>(null);
  const [autoClear, setAutoClear] = useState<number | null>(null); // tỉ lệ từ máy nghe ra ở bước nhớ lại
  const [done, setDone] = useState(0); // lượt đã nói của mục đang luyện trong khối này
  const [looping, setLooping] = useState(false); // đang lặp rảnh tay
  const silentRun = useRef(0); // số lượt liền không nghe thấy tiếng
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

  /** Chấm vào lịch ôn; Quên / Khó → thêm 1 lượt có gợi ý cuối buổi */
  const rate = (grade: Grade) => {
    if (!entry || !v) return;
    if (!entry.retry) {
      setResults((list) => [...list, { item: v, grade }]);
      setChanged(true);
      api(`/vocab/${v.id}/review`, { method: "POST", body: { grade, mode: "crazy", exercise: "recall", autoClear } }).catch(() => {});
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
      setAutoClear(clear ?? null);
      setSuggested(suggest(ok, clear));
      setPhase("rate");
    } else if (phase === "drill") {
      silentRun.current = 0;
      if (done + 1 >= block) setLooping(false); // đủ khối → dừng lặp
      setDone((d) => d + 1);
    }
  };
  const onSilent = () => {
    if (++silentRun.current >= SILENT_STOP) setLooping(false);
  };
  const toggleLoop = () => {
    silentRun.current = 0;
    setLooping((l) => !l);
  };

  const next = () => {
    silence();
    const n = pos + 1;
    setPos(n);
    setPhase(phaseFor(queue[n]));
    setSuggested(null);
    setAutoClear(null);
    setDone(0);
    setLooping(false);
    setRecording(null);
  };

  const playRecording = () => {
    if (!recording) return;
    silence();
    playback.replace({ uri: recording });
    playback.play();
  };

  const recalledOk = results.filter((r) => r.grade === "good" || r.grade === "easy").length;
  const weak = results.filter((r) => r.grade === "again" || r.grade === "hard");
  const big = (s: string) => (s.includes(" ") ? 22 : 30);
  const total = v ? (reps[v.id]?.reps ?? 0) : 0;

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, width: "100%", maxWidth: FORM_MAX, alignSelf: "center" }}>
        {/* Thanh trên: thoát · tiến độ */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 10 }}>
          <Pressable onPress={() => onClose(changed)} hitSlop={12}>
            <SymbolView name="xmark" size={22} weight="bold" tintColor={C.muted} />
          </Pressable>
          <View style={{ flex: 1, height: 12, borderRadius: 6, backgroundColor: C.card2, overflow: "hidden" }}>
            <View style={{ height: "100%", width: `${(Math.min(pos, queue.length) / Math.max(queue.length, 1)) * 100}%`, backgroundColor: C.accent }} />
          </View>
        </View>

        {!entry || !v ? (
          // Hết buổi ôn
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center", gap: 16, padding: 24 }}>
            <Text style={{ fontSize: 56 }}>📣</Text>
            <Text style={{ color: C.text, fontSize: 24, fontWeight: "800", textAlign: "center" }}>{t("crazyReview.finished")}</Text>
            <Text style={{ color: C.muted, fontSize: 15, textAlign: "center" }}>
              {t("crazyReview.summary", { ok: recalledOk, n: results.length, shouts })}
            </Text>
            {weak.length > 0 && (
              <View style={{ alignSelf: "stretch", gap: 6 }}>
                <Text style={{ color: C.amber, fontWeight: "800" }}>{t("crazyReview.forgotList")}</Text>
                {weak.map((r) => (
                  <Text key={r.item.id} style={{ color: C.text }}>
                    {r.item.word}
                    <Text style={{ color: C.muted }}> — {r.item.meaning}</Text>
                  </Text>
                ))}
              </View>
            )}
            <Button title={t("review.done")} variant="primary" onPress={() => onClose(changed)} style={{ alignSelf: "stretch" }} />
          </ScrollView>
        ) : (
          <>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 20, gap: 28 }}>
              <View style={{ alignItems: "center", gap: 10 }}>
                <Text style={{ color: C.muted, fontSize: 14 }}>
                  {phase === "recall" ? t("crazyReview.recall") : phase === "rate" ? t("crazyReview.rate") : t("crazyReview.drill")}
                </Text>
                {phase === "recall" ? (
                  <>
                    <Text style={{ color: C.text, fontSize: big(v.meaning), fontWeight: "800", textAlign: "center" }}>{v.meaning}</Text>
                    {/* Lượt ôn thêm: gợi ý chữ cái đầu mỗi từ */}
                    <Text style={{ color: C.muted, fontSize: 16, letterSpacing: 2, textAlign: "center" }}>{entry.retry ? hintOf(v.word) : mask(v.word)}</Text>
                  </>
                ) : (
                  <>
                    <Pressable onPress={listen} accessibilityLabel={t("vocab.listen")} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={{ flexShrink: 1, color: C.text, fontSize: big(v.word), fontWeight: "800", textAlign: "center" }}>{v.word}</Text>
                      <SymbolView name="speaker.wave.2.fill" size={18} tintColor={C.phrase} />
                    </Pressable>
                    {!!v.meaning && <Text style={{ color: C.muted, fontSize: 15, textAlign: "center" }}>{v.meaning}</Text>}
                    {/* Khối hôm nay (số to) · tổng cộng dồn tới 500 lượt (thanh mảnh) */}
                    {phase === "drill" && (
                      <View style={{ alignSelf: "stretch", alignItems: "center", gap: 8, marginTop: 6 }}>
                        <Text style={{ color: done >= block ? C.accent : C.text, fontSize: 34, fontWeight: "800" }}>
                          {Math.min(done, block)}/{block}
                        </Text>
                        <View style={{ alignSelf: "stretch", height: 4, borderRadius: 2, backgroundColor: C.card2, overflow: "hidden" }}>
                          <View style={{ height: "100%", width: `${Math.min(1, total / REP_TARGET) * 100}%`, backgroundColor: C.amber }} />
                        </View>
                        <Text style={{ color: C.muted, fontSize: 12 }}>{t("crazyReview.total", { n: total, target: REP_TARGET })}</Text>
                      </View>
                    )}
                  </>
                )}
              </View>

              {phase !== "rate" && (
                <CrazyPanel
                  key={`${pos}`}
                  text={v.word}
                  duration={ttsSec[v.id] ?? estimate(v.word)}
                  playing={talking}
                  onListen={listen}
                  onPause={silence}
                  onRecorded={setRecording}
                  onPlayback={playRecording}
                  hasRecording={!!recording}
                  onAttempt={onAttempt}
                  onSilent={onSilent}
                  canListen={phase === "drill"}
                  autoLoop={phase === "drill" && looping}
                  loopListen={done === 0} // chỉ đọc mẫu ở lượt đầu khối; cần nghe lại thì chạm vào câu
                  score={phase !== "drill" || done === 0 || done === block - 1} // chỉ chấm Whisper lượt đầu + lượt cuối khối
                />
              )}
            </ScrollView>

            <View style={{ borderTopWidth: 1, borderColor: C.border, padding: 16, flexDirection: "row", gap: 8 }}>
              {phase === "recall" ? (
                <Button title={t("crazyReview.forgot")} onPress={() => rate("again")} style={{ flex: 1 }} />
              ) : phase === "rate" ? (
                <GradeBar suggested={suggested} onRate={rate} />
              ) : (
                <DrillBar done={done >= block} looping={looping} left={block - done} onNext={next} onToggle={toggleLoop} />
              )}
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
