import { useAudioPlayer } from "expo-audio";
import { Stack } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, AppState, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Grade } from "@shared/srs";
import { Button, styles } from "./ui";
import { api, type CrazyRep, type VocabItem } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { FORM_MAX } from "@/lib/layout";
import { speakGerman, stopSpeaking } from "@/lib/speak";
import { C } from "@/lib/theme";
import { clearOk, heardCount, paceOk, useTake, VOICE_DB, type Take } from "@/lib/useTake";

type Item = VocabItem & { stage: number };
/** 1 lượt trong hàng chờ; retry = ôn thêm có gợi ý cuối buổi (không chấm lại vào lịch ôn) */
type Entry = { item: Item; retry: boolean };
type Result = { item: Item; grade: Grade };
type Phase = "recall" | "rate" | "drill";

const REP_TARGET = 500; // mục tiêu tích luỹ mỗi câu (rải qua nhiều buổi) — chỉ hiện ở màn tổng kết
const SILENT_STOP = 2; // vòng lặp rảnh tay: 2 lượt liền không nghe thấy tiếng → tự dừng
const SPEEDS = [0.75, 0.9, 1, 1.1]; // tốc độ giọng đọc mẫu
const SPEED_KEY = "crazy-speed";
const GRADE_KEYS = { again: "crazyReview.again", hard: "crazyReview.hard", good: "crazyReview.good", easy: "crazyReview.easy" } as const;
const STEP_KEYS = { recall: "crazyReview.stepRecall", rate: "crazyReview.stepRate", drill: "crazyReview.stepDrill" } as const;
const BTN_HEIGHT = 56;

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
/** Chưa nghe câu mẫu lần nào → ước lượng thời lượng để đo nhịp */
const estimate = (text: string) => 0.3 + text.split(/\s+/).length * 0.4;
/** Máy gợi ý kết quả từ lượt nhớ lại theo số từ nhận ra (không bao giờ tự gợi ý "Rất dễ" — để người học tự quyết) */
const suggest = (clear?: number): Grade | null => (clear === undefined ? null : clear >= 0.8 ? "good" : clear >= 0.4 ? "hard" : "again");
/** Cỡ chữ câu tiếng Đức theo độ dài: ngắn 32 · vừa 28 · dài 24 (không nhỏ hơn) */
const sentenceSize = (s: string) => (s.length <= 40 ? 32 : s.length <= 80 ? 28 : 24);

/** Câu tiếng Đức — sau lượt đã nhận dạng: xanh = máy nhận ra, đỏ = chưa nhận ra */
function Sentence({ text, take }: { text: string; take: Take | null }) {
  const size = sentenceSize(text);
  const style = { fontSize: size, lineHeight: Math.round(size * 1.3), fontWeight: "700" as const, color: C.text };
  if (take?.status !== "done" || !take.words) return <Text style={style} maxFontSizeMultiplier={1.3}>{text}</Text>;
  return (
    <Text style={style} maxFontSizeMultiplier={1.3}>
      {take.words.map((w, k) => (
        <Text key={k} style={{ color: w.state === "correct" || w.state === "close" ? C.text : C.redText }}>
          {w.text}{" "}
        </Text>
      ))}
    </Text>
  );
}

/** Câu chia theo cụm ngữ nghĩa: mỗi cụm 1 ô, chạm để nghe riêng cụm đó */
function Chunks({ chunks, size, onSay, disabled }: { chunks: string[]; size: number; onSay: (c: string) => void; disabled: boolean }) {
  const { t } = useI18n();
  const fontSize = Math.max(20, size - 4);
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {chunks.map((c, i) => (
        <Pressable
          key={i}
          onPress={() => onSay(c)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={t("crazyReview.sayChunk", { c })}
          style={({ pressed }) => ({
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: C.border,
            backgroundColor: pressed ? C.border : C.card2,
          })}
        >
          <Text style={{ color: C.text, fontSize, lineHeight: Math.round(fontSize * 1.3), fontWeight: "700" }} maxFontSizeMultiplier={1.3}>
            {c}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Nút phụ dạng viên thuốc (nền trung tính) */
function Pill({ icon, label, onPress, disabled, a11y }: { icon?: SFSymbol; label: string; onPress: () => void; disabled?: boolean; a11y?: string }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={a11y ?? label}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        minHeight: 40,
        paddingHorizontal: 14,
        borderRadius: 20,
        backgroundColor: C.card2,
        opacity: disabled ? 0.35 : pressed ? 0.6 : 1,
      })}
    >
      {icon && <SymbolView name={icon} size={15} tintColor={C.text} />}
      <Text style={{ color: C.text, fontSize: 15, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

/** Dòng trạng thái của lượt nói: đang phát mẫu · đang thu (thanh âm lượng) · đang nhận dạng · kết quả */
function TakeStatus({ state, take, talking, level, pace }: { state: string; take: Take | null; talking: boolean; level: number; pace: boolean }) {
  const { t } = useI18n();
  const line = (children: ReactNode, color: string = C.muted) => <Text style={{ color, fontSize: 15, lineHeight: 21 }}>{children}</Text>;
  if (state === "recording")
    return (
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.red }} />
          {line(t("take.recording"), C.text)}
        </View>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: C.background, overflow: "hidden" }}>
          <View style={{ height: "100%", width: `${Math.min(1, Math.max(0, (level + 60) / 60)) * 100}%`, backgroundColor: level > VOICE_DB ? C.accent : C.muted }} />
        </View>
      </View>
    );
  if (talking || state === "waiting") return line(t("take.playing"));
  if (state === "checking")
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <ActivityIndicator size="small" color={C.muted} />
        {line(t("take.checking"))}
      </View>
    );
  if (!take) return null;
  if (take.status === "silent") return line(t("take.silent"), C.amber);
  // Nhịp chỉ so được khi đã nghe câu mẫu (bước Nói theo)
  const slow = pace && !paceOk(take) ? ` · ${t("take.slow")}` : "";
  if (take.status === "done") {
    const n = take.words?.length ?? 0;
    const missed = n - heardCount(take);
    return (
      <View style={{ gap: 2 }}>
        {line(`${clearOk(take) ? "✓ " : ""}${t("take.heard", { c: heardCount(take), n })}${slow}`, clearOk(take) && !slow ? C.accent : C.text)}
        {missed > 0 && line(t("take.redNote"))}
      </View>
    );
  }
  if (take.status === "error") return line(t("take.noCheck") + slow);
  return line(`✓ ${t("take.saved")}${slow}`, slow ? C.text : C.accent);
}

/**
 * Luyện câu ⭐ kiểu Crazy Deutsch. Mỗi câu (có nghĩa) đi qua 3 bước:
 * 1. Nhớ lại: chỉ thấy nghĩa → thu âm câu mình nhớ (hoặc "Không nhớ — xem đáp án"). Đặt TRƯỚC khi nghe mẫu để
 *    kết quả nhớ lại là thật (nghe / nhại trước thì gần như luôn "nhớ được" → lịch ôn sai).
 * 2. Tự đánh giá: hiện câu chuẩn để đối chiếu → Chưa nhớ · Còn khó · Nhớ được · Rất dễ (máy tô sẵn gợi ý) → lịch ôn.
 *    Chưa nhớ / Còn khó → cuối buổi ôn thêm 1 lượt có gợi ý chữ cái đầu.
 * 3. Nói theo: lặp rảnh tay `block` lượt — phát mẫu 1 lần ở lượt đầu, sau đó chỉ thu; bấm "Nghe câu mẫu" để nghe lại.
 *    Chỉ lượt đầu + lượt cuối khối gửi Whisper nhận dạng; lượt giữa chỉ đếm + đo nhịp.
 * Câu chưa có nghĩa thì chỉ có bước 3. Số lượt tích luỹ mỗi câu lưu trên server (source "/vocab/<id>"), hiện ở màn tổng kết.
 */
export function CrazyReview({ items, block, onClose }: { items: Item[]; block: number; onClose: (changed: boolean) => void }) {
  const { t } = useI18n();
  const [queue, setQueue] = useState<Entry[]>(() => items.map((item) => ({ item, retry: false })));
  const [pos, setPos] = useState(0);
  const entry = queue[pos] as Entry | undefined;
  const v = entry?.item;
  const phaseFor = (e?: Entry): Phase => (e?.item.meaning ? "recall" : "drill");
  const [phase, setPhase] = useState<Phase>(() => phaseFor(queue[0]));
  const [suggested, setSuggested] = useState<Grade | null>(null);
  const [autoClear, setAutoClear] = useState<number | null>(null); // tỉ lệ từ máy nhận ra ở bước nhớ lại
  const [done, setDone] = useState(0); // lượt đã nói của câu đang luyện (bước 3)
  const [looping, setLooping] = useState(false); // đang lặp rảnh tay
  const silentRun = useRef(0); // số lượt liền không nghe thấy tiếng
  const [reps, setReps] = useState<Record<number, CrazyRep>>({}); // lượt tích luỹ từng câu (qua mọi buổi)
  const [results, setResults] = useState<Result[]>([]);
  const [shouts, setShouts] = useState(0); // lượt nói trong buổi này
  const [changed, setChanged] = useState(false); // đã chấm vào lịch ôn → quay lại thì tải lại sổ từ
  const [talking, setTalking] = useState(false); // đang phát câu mẫu
  const [ttsSec, setTtsSec] = useState<Record<number, number>>({}); // thời lượng câu mẫu từng câu (ở tốc độ đang chọn)
  const [speed, setSpeed] = useState(1);
  const [showTr, setShowTr] = useState(true);
  const [chunkOn, setChunkOn] = useState(false); // hiện câu theo cụm ngữ nghĩa
  const [chunks, setChunks] = useState<Record<string, string[] | "loading" | "error">>({}); // câu → cụm (AI chia, server lưu)
  const speakId = useRef(0); // bỏ onEnd của lần đọc cũ (bị dừng giữa chừng)
  const playback = useAudioPlayer(null);

  useEffect(() => {
    api<{ reps: Record<string, CrazyRep> }>("/crazy?source=/vocab")
      .then((r) => setReps(Object.fromEntries(Object.entries(r.reps).map(([k, x]) => [Number(k), x]))))
      .catch(() => {});
    SecureStore.getItemAsync(SPEED_KEY)
      .then((s) => s && SPEEDS.includes(Number(s)) && setSpeed(Number(s)))
      .catch(() => {});
    return () => void stopSpeaking();
  }, []);

  const listen = () => {
    if (!v) return;
    const id = ++speakId.current;
    const started = Date.now();
    setTalking(true);
    speakGerman(v.word, {
      speed,
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
  /** Phát riêng 1 cụm (không đo thời lượng — nhịp vẫn so với cả câu) */
  const sayChunk = (c: string) => {
    const id = ++speakId.current;
    setTalking(true);
    speakGerman(c, { speed, onEnd: () => id === speakId.current && setTalking(false) }).catch(() => setTalking(false));
  };
  const toggleChunks = () => {
    const on = !chunkOn;
    setChunkOn(on);
    const text = v?.word;
    if (!on || !text || (chunks[text] && chunks[text] !== "error")) return;
    setChunks((m) => ({ ...m, [text]: "loading" }));
    api<{ chunks: string[][] }>("/chunks", { method: "POST", body: { sentences: [text] } })
      .then((r) => setChunks((m) => ({ ...m, [text]: r.chunks[0] ?? [text] })))
      .catch(() => setChunks((m) => ({ ...m, [text]: "error" })));
  };
  const cycleSpeed = () => {
    const s = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    setSpeed(s);
    SecureStore.setItemAsync(SPEED_KEY, String(s)).catch(() => {});
  };

  /** Chấm vào lịch ôn; Chưa nhớ / Còn khó → thêm 1 lượt có gợi ý cuối buổi */
  const rate = (grade: Grade) => {
    if (!entry || !v) return;
    if (!entry.retry) {
      setResults((list) => [...list, { item: v, grade }]);
      setChanged(true);
      api(`/vocab/${v.id}/review`, { method: "POST", body: { grade, mode: "crazy", exercise: "recall", autoClear } }).catch(() => {});
      if (grade === "again" || grade === "hard") setQueue((q) => [...q, { item: v, retry: true }]);
    }
    take.reset(); // bước Nói theo bắt đầu sạch (không mang kết quả lượt nhớ lại)
    setPhase("drill");
    if (grade === "again") listen(); // chưa nhớ → nghe mẫu ngay
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
      setSuggested(suggest(clear));
      setPhase("rate");
    } else if (phase === "drill") {
      silentRun.current = 0;
      if (done + 1 >= block) setLooping(false); // đủ lượt → dừng lặp
      setDone((d) => d + 1);
    }
  };

  const take = useTake({
    text: v?.word ?? "",
    duration: v ? (ttsSec[v.id] ?? estimate(v.word)) : 1,
    playing: talking,
    onListen: listen,
    onBeforeRecord: silence,
    onAttempt,
    onSilent: () => {
      if (++silentRun.current >= SILENT_STOP) setLooping(false);
    },
    onFail: () => setLooping(false),
    autoLoop: phase === "drill" && looping,
    loopListen: done === 0, // chỉ phát mẫu ở lượt đầu; cần nghe lại thì bấm "Nghe câu mẫu"
    score: phase !== "drill" || done === 0 || done === block - 1, // chỉ nhận dạng lượt đầu + lượt cuối
  });
  const busy = take.state !== "idle";

  // App chạy nền → dừng lặp, bỏ lượt đang thu, dừng phát
  const onBackground = useEffectEvent(() => {
    setLooping(false);
    take.cancel();
    silence();
  });
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => s !== "active" && onBackground());
    return () => sub.remove();
  }, []);

  const next = () => {
    silence();
    take.cancel();
    const n = pos + 1;
    setPos(n);
    setPhase(phaseFor(queue[n]));
    setSuggested(null);
    setAutoClear(null);
    setDone(0);
    setLooping(false);
  };
  const toggleLoop = () => {
    silentRun.current = 0;
    if (looping) {
      take.cancel(); // tạm dừng: bỏ lượt đang dở (không tính)
      silence();
    }
    setLooping((l) => !l);
  };
  const playMine = () => {
    if (!take.uri) return;
    silence();
    playback.replace({ uri: take.uri });
    playback.play();
  };

  const recalledOk = results.filter((r) => r.grade === "good" || r.grade === "easy").length;
  const practiced = [...new Map(queue.slice(0, pos).map((e) => [e.item.id, e.item])).values()];
  const weakIds = new Set(results.filter((r) => r.grade === "again" || r.grade === "hard").map((r) => r.item.id));

  // ---- Màn tổng kết (lượt tích luỹ từng câu hiện ở đây, không ở màn luyện) ----
  if (!entry || !v)
    return (
      <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScrollView contentContainerStyle={{ flexGrow: 1, width: "100%", maxWidth: FORM_MAX, alignSelf: "center", padding: 24, gap: 16 }}>
          <Text style={{ color: C.text, fontSize: 26, fontWeight: "800", marginTop: 24 }}>{t("crazyReview.finished")}</Text>
          <Text style={{ color: C.muted, fontSize: 16 }}>{t("crazyReview.summary", { ok: recalledOk, n: results.length, shouts })}</Text>
          {practiced.length > 0 && (
            <View style={{ backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 16, gap: 12 }}>
              <Text style={{ color: C.muted, fontSize: 13, fontWeight: "700" }}>{t("crazyReview.totals", { target: REP_TARGET })}</Text>
              {practiced.map((it) => (
                <View key={it.id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  {weakIds.has(it.id) && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.amber }} />}
                  <Text style={{ flex: 1, color: C.text, fontSize: 15 }} numberOfLines={2}>
                    {it.word}
                  </Text>
                  <Text style={{ color: C.muted, fontSize: 13, fontVariant: ["tabular-nums"] }}>
                    {reps[it.id]?.reps ?? 0}/{REP_TARGET}
                  </Text>
                </View>
              ))}
              {weakIds.size > 0 && <Text style={{ color: C.muted, fontSize: 13 }}>{t("crazyReview.weakNote")}</Text>}
            </View>
          )}
        </ScrollView>
        <View style={{ width: "100%", maxWidth: FORM_MAX, alignSelf: "center", padding: 16 }}>
          <Button title={t("review.done")} variant="primary" onPress={() => onClose(changed)} style={{ minHeight: BTN_HEIGHT }} />
        </View>
      </SafeAreaView>
    );

  const steps: Phase[] = v.meaning ? ["recall", "rate", "drill"] : ["drill"];
  const stepName = entry.retry && phase === "recall" ? t("crazyReview.stepRetry") : t(STEP_KEYS[phase]);
  const blockDone = done >= block;
  const isLast = pos === queue.length - 1;

  // ---- Nút chính + phụ ở đáy (chỉ hiện hành động dùng được trong trạng thái hiện tại) ----
  const bottom = () => {
    if (phase === "rate")
      return (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {(["again", "hard", "good", "easy"] as const).map((g) => (
            <GradeButton key={g} grade={g} on={g === suggested} onRate={rate} />
          ))}
        </View>
      );
    if (phase === "recall")
      return (
        <>
          {take.state === "recording" ? (
            <Button title={t("crazyReview.stopRecord")} variant="red" onPress={take.stop} style={{ minHeight: BTN_HEIGHT }} icon={<SymbolView name="stop.fill" size={18} tintColor={C.redText} />} />
          ) : (
            <Button
              title={take.state === "checking" ? t("take.checking") : t("crazyReview.record")}
              variant="primary"
              loading={take.state === "checking"}
              onPress={take.record}
              style={{ minHeight: BTN_HEIGHT }}
              icon={<SymbolView name="mic.fill" size={18} tintColor="#fff" />}
            />
          )}
          {!busy && <Button title={t("crazyReview.showAnswer")} onPress={() => rate("again")} style={{ minHeight: 48 }} />}
        </>
      );
    return (
      <>
        {blockDone ? (
          <Button title={isLast ? t("crazyReview.finish") : t("crazyReview.nextSentence")} variant="primary" onPress={next} style={{ minHeight: BTN_HEIGHT }} />
        ) : looping ? (
          <Button title={t("crazyReview.pause")} onPress={toggleLoop} style={{ minHeight: BTN_HEIGHT }} icon={<SymbolView name="pause.fill" size={16} tintColor={C.text} />} />
        ) : (
          <Button
            title={done === 0 ? t("crazyReview.startDrill") : t("crazyReview.resumeDrill")}
            variant="primary"
            onPress={toggleLoop}
            style={{ minHeight: BTN_HEIGHT }}
            icon={<SymbolView name="repeat" size={16} tintColor="#fff" />}
          />
        )}
        {!looping && (
          <View style={{ flexDirection: "row", gap: 8 }}>
            {!blockDone && <Button title={t("crazyReview.skip")} onPress={next} style={{ flex: 1, minHeight: 48 }} />}
            {!!take.uri && (
              <Button title={t("crazyReview.myTake")} onPress={playMine} style={{ flex: 1, minHeight: 48 }} icon={<SymbolView name="play.fill" size={14} tintColor={C.text} />} />
            )}
          </View>
        )}
      </>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, width: "100%", maxWidth: FORM_MAX, alignSelf: "center" }}>
        {/* Header: thoát · tên chế độ · vị trí câu · 1 thanh tiến độ cả bài · bước hiện tại */}
        <View style={{ paddingHorizontal: 16, paddingTop: 8, gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Pressable onPress={() => onClose(changed)} hitSlop={12} accessibilityRole="button" accessibilityLabel={t("close")}>
              <SymbolView name="xmark" size={20} weight="bold" tintColor={C.muted} />
            </Pressable>
            <Text style={{ flex: 1, color: C.text, fontSize: 16, fontWeight: "700" }}>{t("crazyReview.title")}</Text>
            <Text style={{ color: C.muted, fontSize: 14, fontVariant: ["tabular-nums"] }}>{t("crazyReview.position", { i: pos + 1, n: queue.length })}</Text>
          </View>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: C.card2, overflow: "hidden" }}>
            <View style={{ height: "100%", width: `${(pos / Math.max(queue.length, 1)) * 100}%`, backgroundColor: C.accent }} />
          </View>
          <Text style={{ color: C.muted, fontSize: 13 }}>
            {steps.length > 1 ? t("crazyReview.step", { i: steps.indexOf(phase) + 1, n: steps.length, name: stepName }) : stepName}
          </Text>
        </View>

        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24, gap: 24 }}>
          {/* Nội dung chính: nhớ lại → chỉ nghĩa + câu che; các bước sau → câu tiếng Đức nổi bật nhất */}
          {phase === "recall" ? (
            <View style={{ gap: 12 }}>
              <Text style={{ color: C.muted, fontSize: 15 }}>{t("crazyReview.recallPrompt")}</Text>
              <Text style={{ color: C.text, fontSize: 24, lineHeight: 32, fontWeight: "700" }} maxFontSizeMultiplier={1.3}>
                {v.meaning}
              </Text>
              <Text style={{ color: C.muted, fontSize: 18, letterSpacing: 2 }}>{entry.retry ? hintOf(v.word) : mask(v.word)}</Text>
            </View>
          ) : (
            <View style={{ gap: 14 }}>
              {/* Chia cụm: chỉ khi AI đã chia được (> 1 cụm); đang tải / lỗi → vẫn hiện cả câu */}
              {chunkOn && Array.isArray(chunks[v.word]) && chunks[v.word].length > 1 ? (
                <Chunks chunks={chunks[v.word] as string[]} size={sentenceSize(v.word)} onSay={sayChunk} disabled={take.state === "recording"} />
              ) : (
                <Sentence text={v.word} take={take.take} />
              )}
              {chunkOn && (
                <Text style={{ color: C.muted, fontSize: 13 }}>
                  {chunks[v.word] === "loading"
                    ? t("crazyReview.chunking")
                    : chunks[v.word] === "error"
                      ? t("crazyReview.chunkFailed")
                      : Array.isArray(chunks[v.word]) && chunks[v.word].length > 1
                        ? t("crazyReview.chunkHint")
                        : t("crazyReview.chunkSingle")}
                </Text>
              )}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Pill
                  icon={talking ? "stop.fill" : "speaker.wave.2.fill"}
                  label={talking ? t("crazyReview.stopModel") : t("crazyReview.playModel")}
                  onPress={talking ? silence : listen}
                  disabled={take.state === "recording"}
                />
                <Pill label={`${String(speed).replace(".", ",")}×`} onPress={cycleSpeed} a11y={t("crazyReview.speed", { s: speed })} />
                {v.word.trim().split(/\s+/).length > 4 && (
                  <Pill icon="rectangle.split.3x1" label={chunkOn ? t("crazyReview.wholeSentence") : t("crazyReview.splitChunks")} onPress={toggleChunks} />
                )}
                {!!v.meaning && (
                  <Pill icon={showTr ? "eye.slash" : "eye"} label={showTr ? t("crazyReview.hideTr") : t("crazyReview.showTr")} onPress={() => setShowTr((s) => !s)} />
                )}
              </View>
              {!!v.meaning && showTr && <Text style={{ color: C.muted, fontSize: 17, lineHeight: 24 }}>{v.meaning}</Text>}
            </View>
          )}

          {/* Card luyện tập: hướng dẫn bước + lượt (bước 3) + trạng thái lượt nói */}
          <View style={{ backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 16, gap: 12 }}>
            {phase === "drill" && (
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: C.text, fontSize: 15, fontWeight: "700" }}>{t("crazyReview.stepDrill")}</Text>
                  <Text style={{ color: blockDone ? C.accent : C.muted, fontSize: 15, fontWeight: "700", fontVariant: ["tabular-nums"] }}>
                    {t("crazyReview.reps", { i: Math.min(done, block), n: block })}
                  </Text>
                </View>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: C.background, overflow: "hidden" }}>
                  <View style={{ height: "100%", width: `${(Math.min(done, block) / block) * 100}%`, backgroundColor: C.accent }} />
                </View>
              </View>
            )}
            {blockDone && phase === "drill" ? (
              <Text style={{ color: C.accent, fontSize: 15 }}>{t("crazyReview.blockDone", { n: block })}</Text>
            ) : busy || talking || take.take ? (
              <TakeStatus state={take.state} take={take.take} talking={talking} level={take.level} pace={phase === "drill"} />
            ) : (
              <Text style={{ color: C.muted, fontSize: 15, lineHeight: 21 }}>
                {phase === "recall" ? t("crazyReview.recallHelp") : phase === "drill" ? t("crazyReview.drillHelp") : null}
              </Text>
            )}
            {phase === "rate" && <Text style={{ color: C.muted, fontSize: 15, lineHeight: 21 }}>{t("crazyReview.rateHelp")}</Text>}
          </View>
        </ScrollView>

        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 8, borderTopWidth: 1, borderColor: C.border }}>{bottom()}</View>
      </View>
    </SafeAreaView>
  );
}

/** Nút tự đánh giá (lưới 2×2); nút máy gợi ý được tô sẵn */
function GradeButton({ grade, on, onRate }: { grade: Grade; on: boolean; onRate: (g: Grade) => void }) {
  const { t } = useI18n();
  return (
    <Button
      title={t(GRADE_KEYS[grade])}
      variant={on ? "primary" : "plain"}
      onPress={() => onRate(grade)}
      style={{ flexBasis: "48%", flexGrow: 1, minHeight: BTN_HEIGHT }}
    />
  );
}
