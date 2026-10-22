import { useAudioPlayer } from "expo-audio";
import { Stack } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { ActivityIndicator, AppState, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Grade } from "@shared/srs";
import { Elapsed, LiveWave, PlayingBars, PulseDot } from "./RecordingViz";
import { Cta, styles } from "./ui";
import { api, type CrazyRep, type VocabItem } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { FORM_MAX } from "@/lib/layout";
import { speakGerman, stopSpeaking } from "@/lib/speak";
import { C } from "@/lib/theme";
import { clearOk, heardCount, paceOk, useTake, type Take } from "@/lib/useTake";

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

/** Nút chỉ có icon (hành động phụ, nền trung tính); `on` = đang bật */
function IconBtn({ icon, label, onPress, on, disabled }: { icon: SFSymbol; label: string; onPress: () => void; on?: boolean; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!on, disabled: !!disabled }}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: on ? "rgba(22,163,74,0.18)" : C.card2,
        opacity: disabled ? 0.35 : pressed ? 0.6 : 1,
      })}
    >
      <SymbolView name={icon} size={18} tintColor={on ? C.accent : C.text} />
    </Pressable>
  );
}

/** Nút phát câu mẫu (tròn, nổi hơn nút phụ khác); đang phát → thanh nhấp nhô, chạm để dừng */
function PlayBtn({ talking, onPress, disabled, label }: { talking: boolean; onPress: () => void; disabled?: boolean; label: string }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(22,163,74,0.18)",
        opacity: disabled ? 0.35 : pressed ? 0.7 : 1,
      })}
    >
      {talking ? <PlayingBars /> : <SymbolView name="speaker.wave.2.fill" size={20} tintColor={C.accent} />}
    </Pressable>
  );
}

/** Nhãn kết quả nhỏ: tốt (xanh) · cần chú ý (vàng) · trung tính */
function Chip({ text, tone }: { text: string; tone: "good" | "warn" | "neutral" }) {
  const c = tone === "good" ? C.accent : tone === "warn" ? C.amber : C.muted;
  const bg = tone === "good" ? "rgba(22,163,74,0.14)" : tone === "warn" ? "rgba(250,204,21,0.12)" : C.card2;
  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: bg }}>
      <Text style={{ color: c, fontSize: 14, fontWeight: "600" }}>{text}</Text>
    </View>
  );
}

/** Hành động phụ dạng chữ (không nền) */
function TextBtn({ title, icon, onPress }: { title: string; icon?: SFSymbol; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      hitSlop={6}
      style={({ pressed }) => ({ minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 12, opacity: pressed ? 0.5 : 1 })}
    >
      {icon && <SymbolView name={icon} size={14} tintColor={C.muted} />}
      <Text style={{ color: C.muted, fontSize: 15, fontWeight: "600" }}>{title}</Text>
    </Pressable>
  );
}

/** Lượt đã nói của câu: 1 thanh mảnh */
function RepProgress({ done, block }: { done: number; block: number }) {
  return (
    <View style={{ height: 4, borderRadius: 2, backgroundColor: C.card2, overflow: "hidden" }}>
      <View style={{ height: "100%", width: `${(Math.min(done, block) / block) * 100}%`, backgroundColor: C.accent }} />
    </View>
  );
}

/** Vùng trạng thái lượt nói (chiều cao cố định → bố cục không nhảy): đang thu (sóng âm) · phát mẫu · nhận dạng · kết quả */
function TakeStatus({
  state,
  take,
  talking,
  level,
  elapsed,
  pace,
  idle,
}: {
  state: string;
  take: Take | null;
  talking: boolean;
  level: number;
  elapsed: number;
  pace: boolean;
  idle: string; // hướng dẫn khi chưa có gì
}) {
  const { t } = useI18n();
  const muted = (text: string) => <Text style={{ color: C.muted, fontSize: 15, lineHeight: 21 }}>{text}</Text>;
  const body = () => {
    if (state === "recording")
      return (
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <PulseDot />
            <Text style={{ flex: 1, color: C.text, fontSize: 15, fontWeight: "600" }}>{t("take.recordingShort")}</Text>
            <Elapsed ms={elapsed} />
          </View>
          <LiveWave level={level} tick={elapsed} />
          {muted(t("take.autoStop"))}
        </View>
      );
    if (talking || state === "waiting")
      return (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <PlayingBars />
          {muted(t("take.playing"))}
        </View>
      );
    if (state === "checking")
      return (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <ActivityIndicator size="small" color={C.muted} />
          {muted(t("take.checking"))}
        </View>
      );
    if (!take) return muted(idle);
    if (take.status === "silent") return <Chip text={t("take.silent")} tone="warn" />;
    // Nhịp chỉ so được khi đã nghe câu mẫu (bước Nói theo)
    const chips: { text: string; tone: "good" | "warn" | "neutral" }[] = [];
    if (take.status === "done") {
      const n = take.words?.length ?? 0;
      chips.push({ text: t("take.heard", { c: heardCount(take), n }), tone: clearOk(take) ? "good" : "warn" });
    } else if (take.status === "error") chips.push({ text: t("take.noCheck"), tone: "neutral" });
    else chips.push({ text: t("take.saved"), tone: "good" });
    if (pace) chips.push(paceOk(take) ? { text: t("take.paceOk"), tone: "good" } : { text: t("take.slow"), tone: "warn" });
    const missed = take.status === "done" ? (take.words?.length ?? 0) - heardCount(take) : 0;
    return (
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {chips.map((c) => (
            <Chip key={c.text} text={c.text} tone={c.tone} />
          ))}
        </View>
        {missed > 0 && muted(t("take.redNote"))}
      </View>
    );
  };
  return <View style={{ minHeight: 72, justifyContent: "center" }}>{body()}</View>;
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
  const [chunkNote, setChunkNote] = useState(""); // báo ngắn khi không chia được
  const speakId = useRef(0); // bỏ onEnd của lần đọc cũ (bị dừng giữa chừng)
  const playback = useAudioPlayer(null);
  const ting = useAudioPlayer(require("@/assets/sounds/correct.wav")); // báo đã thu xong 1 lượt

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
  /** Bật / tắt chia cụm. Server trả 1 cụm (AI không chia được) hoặc lỗi → tắt lại và báo, không giả vờ đã chia */
  const toggleChunks = () => {
    const text = v?.word;
    setChunkNote("");
    if (chunkOn || !text) return setChunkOn(false);
    const known = chunks[text];
    if (Array.isArray(known)) {
      if (known.length > 1) setChunkOn(true);
      else setChunkNote(t("crazyReview.chunkNone"));
      return;
    }
    if (known === "loading") return;
    setChunkOn(true);
    setChunks((m) => ({ ...m, [text]: "loading" }));
    api<{ chunks: string[][] }>("/chunks", { method: "POST", body: { sentences: [text] } })
      .then((r) => {
        const c = r.chunks[0] ?? [text];
        setChunks((m) => ({ ...m, [text]: c }));
        if (c.length < 2) {
          setChunkOn(false);
          setChunkNote(t("crazyReview.chunkNone"));
        }
      })
      .catch(() => {
        setChunks((m) => ({ ...m, [text]: "error" }));
        setChunkOn(false);
        setChunkNote(t("crazyReview.chunkFailed"));
      });
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
    onCaptured: () => {
      ting.seekTo(0).catch(() => {});
      ting.play();
    },
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
    setChunkOn(false);
    setChunkNote("");
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
          <Cta title={t("review.done")} onPress={() => onClose(changed)} />
        </View>
      </SafeAreaView>
    );

  const steps: Phase[] = v.meaning ? ["recall", "rate", "drill"] : ["drill"];
  const stepName = entry.retry && phase === "recall" ? t("crazyReview.stepRetry") : t(STEP_KEYS[phase]);
  const blockDone = done >= block;
  const isLast = pos === queue.length - 1;

  const drill = phase === "drill";
  const words = v.word.trim().split(/\s+/).length;

  // ---- Đáy màn: 1 nút chính + hành động phụ dạng chữ (chỉ hiện thứ dùng được trong trạng thái hiện tại) ----
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
            <Cta title={t("crazyReview.stopRecord")} tone="danger" icon="stop.fill" onPress={take.stop} />
          ) : (
            <Cta
              title={take.state === "checking" ? t("take.checking") : t("crazyReview.record")}
              icon="mic.fill"
              loading={take.state === "checking"}
              onPress={take.record}
            />
          )}
          {!busy && <TextBtn title={t("crazyReview.showAnswer")} onPress={() => rate("again")} />}
        </>
      );
    return (
      <>
        {blockDone ? (
          <Cta title={isLast ? t("crazyReview.finish") : t("crazyReview.nextSentence")} icon={isLast ? "checkmark" : "arrow.right"} onPress={next} />
        ) : looping ? (
          <Cta title={t("crazyReview.pause")} tone="neutral" icon="pause.fill" onPress={toggleLoop} />
        ) : (
          <Cta title={done === 0 ? t("crazyReview.startDrill") : t("crazyReview.resumeDrill")} icon="mic.fill" onPress={toggleLoop} />
        )}
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, minHeight: 44 }}>
          {!blockDone && !looping && <TextBtn title={t("crazyReview.skip")} onPress={next} />}
          {!!take.uri && !looping && <TextBtn title={t("crazyReview.myTake")} icon="play.fill" onPress={playMine} />}
        </View>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, width: "100%", maxWidth: FORM_MAX, alignSelf: "center" }}>
        {/* Header 1 dòng: thoát · tiến độ cả buổi · vị trí câu */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 48, paddingHorizontal: 20 }}>
          <Pressable onPress={() => onClose(changed)} hitSlop={12} accessibilityRole="button" accessibilityLabel={t("close")}>
            <SymbolView name="xmark" size={18} weight="bold" tintColor={C.muted} />
          </Pressable>
          <View
            style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: C.card2, overflow: "hidden" }}
            accessibilityRole="progressbar"
            accessibilityLabel={t("crazyReview.position", { i: pos + 1, n: queue.length })}
          >
            <View style={{ height: "100%", width: `${(pos / Math.max(queue.length, 1)) * 100}%`, backgroundColor: C.accent }} />
          </View>
          <Text style={{ color: C.muted, fontSize: 15, fontVariant: ["tabular-nums"] }}>
            {pos + 1}/{queue.length}
          </Text>
        </View>

        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "space-between", paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, gap: 32 }}>
          {/* Vùng trên: bước · câu (hoặc nghĩa khi nhớ lại) · công cụ · bản dịch */}
          <View style={{ gap: 16 }}>
            <Text style={{ color: C.muted, fontSize: 12, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" }}>
              {steps.length > 1 ? t("crazyReview.step", { i: steps.indexOf(phase) + 1, n: steps.length, name: stepName }) : stepName}
            </Text>
            {phase === "recall" ? (
              <>
                <Text style={{ color: C.muted, fontSize: 15 }}>{t("crazyReview.recallPrompt")}</Text>
                <Text style={{ color: C.text, fontSize: 26, lineHeight: 34, fontWeight: "700" }} maxFontSizeMultiplier={1.3}>
                  {v.meaning}
                </Text>
                <Text style={{ color: C.muted, fontSize: 18, letterSpacing: 2 }}>{entry.retry ? hintOf(v.word) : mask(v.word)}</Text>
              </>
            ) : (
              <>
                {chunkOn && Array.isArray(chunks[v.word]) ? (
                  <Chunks chunks={chunks[v.word] as string[]} size={sentenceSize(v.word)} onSay={sayChunk} disabled={take.state === "recording"} />
                ) : (
                  <Sentence text={v.word} take={take.take} />
                )}
                {/* Công cụ: 1 cụm liền nhau — phát mẫu · tốc độ · chia cụm · bản dịch */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <PlayBtn
                    talking={talking}
                    onPress={talking ? silence : listen}
                    disabled={take.state === "recording"}
                    label={talking ? t("crazyReview.stopModel") : t("crazyReview.playModel")}
                  />
                  <Pressable
                    onPress={cycleSpeed}
                    accessibilityRole="button"
                    accessibilityLabel={t("crazyReview.speed", { s: speed })}
                    style={({ pressed }) => ({ height: 44, minWidth: 52, paddingHorizontal: 12, borderRadius: 14, backgroundColor: C.card2, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.6 : 1 })}
                  >
                    <Text style={{ color: C.text, fontSize: 15, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{String(speed).replace(".", ",")}×</Text>
                  </Pressable>
                  {words > 4 && (
                    <IconBtn
                      icon="rectangle.split.3x1"
                      label={chunkOn ? t("crazyReview.wholeSentence") : t("crazyReview.splitChunks")}
                      on={chunkOn}
                      onPress={toggleChunks}
                    />
                  )}
                  {!!v.meaning && (
                    <IconBtn icon="character.bubble" label={showTr ? t("crazyReview.hideTr") : t("crazyReview.showTr")} on={showTr} onPress={() => setShowTr((x) => !x)} />
                  )}
                </View>
                {chunkOn && chunks[v.word] === "loading" && <Text style={{ color: C.muted, fontSize: 13 }}>{t("crazyReview.chunking")}</Text>}
                {chunkOn && Array.isArray(chunks[v.word]) && <Text style={{ color: C.muted, fontSize: 13 }}>{t("crazyReview.chunkHint")}</Text>}
                {!!chunkNote && <Text style={{ color: C.muted, fontSize: 13 }}>{chunkNote}</Text>}
                {!!v.meaning && showTr && <Text style={{ color: C.muted, fontSize: 17, lineHeight: 24 }}>{v.meaning}</Text>}
              </>
            )}
          </View>

          {/* Vùng dưới (sát nút chính, không khung): lượt · trạng thái lượt nói */}
          <View style={{ gap: 12 }}>
            {drill && (
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: C.muted, fontSize: 13, fontWeight: "600" }}>{t("crazyReview.repsLabel")}</Text>
                  <Text style={{ color: blockDone ? C.accent : C.text, fontSize: 13, fontWeight: "700", fontVariant: ["tabular-nums"] }}>
                    {Math.min(done, block)}/{block}
                  </Text>
                </View>
                <RepProgress done={done} block={block} />
              </View>
            )}
            {drill && blockDone ? (
              <View style={{ minHeight: 72, justifyContent: "center" }}>
                <Chip text={t("crazyReview.blockDone", { n: block })} tone="good" />
              </View>
            ) : (
              <TakeStatus
                state={take.state}
                take={take.take}
                talking={talking}
                level={take.level}
                elapsed={take.elapsed}
                pace={drill}
                idle={phase === "recall" ? t("crazyReview.recallHelp") : phase === "rate" ? t("crazyReview.rateHelp") : t("crazyReview.drillHelp")}
              />
            )}
            {phase === "rate" && !!take.take && <Text style={{ color: C.muted, fontSize: 15, lineHeight: 21 }}>{t("crazyReview.rateHelp")}</Text>}
          </View>
        </ScrollView>

        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4, gap: 4 }}>{bottom()}</View>
      </View>
    </SafeAreaView>
  );
}

/** Nút tự đánh giá (lưới 2×2); nút máy gợi ý có viền xanh + nhãn "Gợi ý" */
function GradeButton({ grade, on, onRate }: { grade: Grade; on: boolean; onRate: (g: Grade) => void }) {
  const { t } = useI18n();
  return (
    <Pressable
      onPress={() => onRate(grade)}
      accessibilityRole="button"
      accessibilityLabel={on ? `${t(GRADE_KEYS[grade])} · ${t("crazyReview.suggested")}` : t(GRADE_KEYS[grade])}
      style={({ pressed }) => ({
        flexBasis: "48%",
        flexGrow: 1,
        minHeight: BTN_HEIGHT,
        borderRadius: 16,
        borderWidth: on ? 2 : 1,
        borderColor: on ? C.accent : C.border,
        backgroundColor: on ? "rgba(22,163,74,0.14)" : C.card2,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 8,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <Text style={{ color: on ? C.accent : C.text, fontSize: 16, fontWeight: "700" }}>{t(GRADE_KEYS[grade])}</Text>
      {on && <Text style={{ color: C.accent, fontSize: 11, fontWeight: "600" }}>{t("crazyReview.suggested")}</Text>}
    </Pressable>
  );
}
