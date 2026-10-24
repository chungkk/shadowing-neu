import { useAudioPlayer } from "expo-audio";
import { Stack } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, AppState, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Grade } from "@shared/srs";
import { Elapsed, LiveWave, PlayingBars, PulseDot } from "./RecordingViz";
import { Cta, styles } from "./ui";
import { api, type CrazyRep, type VocabItem } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { FORM_MAX } from "@/lib/layout";
import { prefetchGerman, speakGerman, stopSpeaking } from "@/lib/speak";
import { C } from "@/lib/theme";
import type { useLiveTake } from "@/lib/useLiveTake";
import { clearOk, heardCount, paceOk, useTake, type Take } from "@/lib/useTake";
import { splitWords, type CheckedWord } from "@shared/dictation";

/**
 * Nhận dạng trực tiếp cần module native expo-speech-recognition. Nạp lười, lỗi thì coi như không có:
 * bản app cũ (chưa build lại) nhận bản cập nhật JS vẫn chạy, lượt Luyện to quay về thu rồi Whisper (useTake).
 */
const liveTake = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- nạp lười, thiếu module native thì bỏ qua
    return (require("@/lib/useLiveTake") as { useLiveTake: typeof useLiveTake }).useLiveTake;
  } catch {
    return null;
  }
})();
// Cùng giao diện; bản dự phòng không có `live` → chỉ đọc `live` khi có liveTake
const useDrillTake = liveTake ?? (useTake as unknown as typeof useLiveTake);

type Item = VocabItem & { stage: number };
/** 1 lượt trong hàng chờ; retry = ôn lại có gợi ý cuối buổi (không chấm lại vào lịch ôn) */
type Entry = { item: Item; retry: boolean };
type Result = { item: Item; grade: Grade; fresh: boolean };
/** recall: chỉ thấy nghĩa, nói câu · reveal: hiện câu + máy chấm · drill: luyện to lặp rảnh tay */
type Phase = "recall" | "reveal" | "drill";

const REP_TARGET = 500; // mục tiêu tích luỹ mỗi câu (rải qua nhiều buổi) — chỉ hiện ở màn tổng kết
const SILENT_STOP = 2; // vòng lặp rảnh tay: 2 lượt liền không nghe thấy tiếng → tự dừng
const SPEEDS = [0.75, 0.9, 1, 1.1]; // tốc độ giọng đọc mẫu
const SPEED_KEY = "crazy-speed";
const BTN_HEIGHT = 56;
const TONE = {
  good: { fg: C.accent, bg: "rgba(22,163,74,0.14)" },
  warn: { fg: C.amber, bg: "rgba(250,204,21,0.12)" },
  bad: { fg: C.redText, bg: "rgba(239,68,68,0.12)" },
  neutral: { fg: C.muted, bg: C.card2 },
} as const;
type Tone = keyof typeof TONE;

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
/** Máy chấm lượt nhớ lại theo tỉ lệ từ nhận ra (không nhận dạng được → null, người học tự chấm) */
const gradeOf = (clear?: number): Grade | null => (clear === undefined ? null : clear >= 0.8 ? "good" : clear >= 0.4 ? "hard" : "again");
/** Câu mới / chưa có nghĩa: không nhớ lại được → chỉ luyện to; câu đã học → nhớ lại trước rồi luyện to */
const phaseFor = (e?: Entry): Phase => (e && (e.retry || (e.item.meaning && e.item.stage > 0)) ? "recall" : "drill");
/** Cỡ chữ câu tiếng Đức theo độ dài: ngắn 32 · vừa 28 · dài 24 (không nhỏ hơn) */
const sentenceSize = (s: string) => (s.length <= 40 ? 32 : s.length <= 80 ? 28 : 24);

/**
 * Câu tiếng Đức. Đang nói (`live`): kiểu karaoke — từ máy đã nghe ra sáng xanh, từ chưa tới mờ.
 * Sau lượt đã nhận dạng: trắng = máy nhận ra, đỏ = chưa nhận ra.
 */
function Sentence({ text, take, live }: { text: string; take: Take | null; live?: CheckedWord[] | null }) {
  const size = sentenceSize(text);
  const style = { fontSize: size, lineHeight: Math.round(size * 1.3), fontWeight: "700" as const, color: C.text };
  if (live)
    return (
      <Text style={style} maxFontSizeMultiplier={1.3}>
        {(live.length ? live : splitWords(text).map((w): CheckedWord => ({ text: w, state: "missing" }))).map((w, k) => (
          <Text key={k} style={{ color: w.state === "correct" || w.state === "close" ? C.accent : C.muted }}>
            {w.text}{" "}
          </Text>
        ))}
      </Text>
    );
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

/** Nút phát câu mẫu (tròn); đang phát → thanh nhấp nhô, chạm để dừng */
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
        backgroundColor: TONE.good.bg,
        opacity: disabled ? 0.35 : pressed ? 0.7 : 1,
      })}
    >
      {talking ? <PlayingBars /> : <SymbolView name="speaker.wave.2.fill" size={20} tintColor={C.accent} />}
    </Pressable>
  );
}

/** Nhãn nhỏ dạng viên thuốc */
function Chip({ text, tone }: { text: string; tone: Tone }) {
  return (
    <View style={{ alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: TONE[tone].bg }}>
      <Text style={{ color: TONE[tone].fg, fontSize: 13, fontWeight: "700" }}>{text}</Text>
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

/** Thông báo kết quả nhớ lại: 1 khung màu, 1 câu */
function Verdict({ text, tone }: { text: string; tone: Tone }) {
  return (
    <View style={{ borderRadius: 16, padding: 14, backgroundColor: TONE[tone].bg }}>
      <Text style={{ color: TONE[tone].fg, fontSize: 16, lineHeight: 22, fontWeight: "700" }}>{text}</Text>
    </View>
  );
}

/** Vùng trạng thái lượt nói (chiều cao cố định → bố cục không nhảy): mở micro · đang thu · phát mẫu · nhận dạng · kết quả */
function TakeStatus({
  take,
  help,
  live,
}: {
  take: { state: string; take: Take | null; level: number; elapsed: number };
  help: string; // hướng dẫn khi chưa có lượt nào
  live: boolean; // nhận dạng trực tiếp → nói hết câu là dừng
}) {
  const { t } = useI18n();
  const muted = (text: string) => <Text style={{ color: C.muted, fontSize: 15, lineHeight: 21 }}>{text}</Text>;
  const row = (icon: ReactNode, text: string) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      {icon}
      {muted(text)}
    </View>
  );
  const body = () => {
    if (take.state === "starting") return row(<ActivityIndicator size="small" color={C.muted} />, t("take.micStarting"));
    if (take.state === "recording")
      return (
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <PulseDot />
            <Text style={{ flex: 1, color: C.text, fontSize: 15, fontWeight: "600" }}>{t("take.recordingShort")}</Text>
            <Elapsed ms={take.elapsed} />
          </View>
          <LiveWave level={take.level} tick={take.elapsed} />
          {muted(live ? t("take.autoStopLive") : t("take.autoStop"))}
        </View>
      );
    if (take.state === "waiting") return row(<PlayingBars />, t("take.playing"));
    if (take.state === "checking") return row(<ActivityIndicator size="small" color={C.muted} />, t("take.checking"));
    const a = take.take;
    if (!a) return muted(help);
    if (a.status === "silent") return <Chip text={t("take.silent")} tone="warn" />;
    const chips: { text: string; tone: Tone }[] = [];
    if (a.status === "done") chips.push({ text: t("take.heard", { c: heardCount(a), n: a.words?.length ?? 0 }), tone: clearOk(a) ? "good" : "warn" });
    else if (a.status === "error") chips.push({ text: t("take.noCheck"), tone: "neutral" });
    else chips.push({ text: t("take.saved"), tone: "good" });
    chips.push(paceOk(a) ? { text: t("take.paceOk"), tone: "good" } : { text: t("take.slow"), tone: "warn" });
    return (
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {chips.map((c) => (
          <Chip key={c.text} text={c.text} tone={c.tone} />
        ))}
      </View>
    );
  };
  return <View style={{ minHeight: 72, justifyContent: "center" }}>{body()}</View>;
}

/**
 * Luyện câu ⭐ kiểu Crazy Deutsch (to · nhanh · rõ, lặp thật nhiều). Mỗi câu đi theo 1 đường thẳng, máy tự chấm:
 * - Câu mới (hoặc chưa có nghĩa): chỉ Luyện to — nghe mẫu rồi nói lặp `block` lượt rảnh tay. Xong khối → vào lịch ôn
 *   (đạt ≥ nửa số lượt → Nhớ được, không thì Còn khó).
 * - Câu đã học: 1. Nhớ lại — chỉ thấy nghĩa, nói câu (Whisper nhận dạng) → máy chấm theo số từ nhận ra, hiện câu chuẩn
 *   tô đỏ chỗ sai. Nhớ lại đặt TRƯỚC khi nghe mẫu để kết quả là thật. 2. Luyện to như câu mới.
 * - Chưa nhớ / Còn khó → cuối buổi nhớ lại thêm 1 lượt có gợi ý chữ cái đầu (không chấm lại vào lịch ôn).
 * Luyện to: nhận dạng trực tiếp (useLiveTake) — chữ sáng theo giọng, nói hết câu là sang lượt tiếp; câu mẫu phát ở
 * lượt đầu và sau lượt chưa đạt. Số lượt tích luỹ mỗi câu lưu trên server (source "/vocab/<id>"), hiện ở màn tổng kết.
 */
export function CrazyReview({ items, block, onClose }: { items: Item[]; block: number; onClose: (changed: boolean) => void }) {
  const { t } = useI18n();
  const [queue, setQueue] = useState<Entry[]>(() => items.map((item) => ({ item, retry: false })));
  const [pos, setPos] = useState(0);
  const entry = queue[pos] as Entry | undefined;
  const v = entry?.item;
  const [phase, setPhase] = useState<Phase>(() => phaseFor(queue[0]));
  const [grade, setGrade] = useState<Grade | null>(null); // máy chấm lượt nhớ lại (null = chưa chấm được)
  const [done, setDone] = useState(0); // lượt đã nói của câu đang luyện
  const [passes, setPasses] = useState(0); // lượt đạt trong khối
  const [lastOk, setLastOk] = useState(true); // lượt trước đạt → lượt sau không cần phát lại mẫu
  const [looping, setLooping] = useState(false); // đang lặp rảnh tay
  const silentRun = useRef(0); // số lượt liền không nghe thấy tiếng
  const [reps, setReps] = useState<Record<number, CrazyRep>>({}); // lượt tích luỹ từng câu (qua mọi buổi)
  const [results, setResults] = useState<Result[]>([]);
  const [shouts, setShouts] = useState(0); // lượt nói trong buổi này
  const [changed, setChanged] = useState(false); // đã chấm vào lịch ôn → quay lại thì tải lại sổ từ
  const [talking, setTalking] = useState(false); // đang phát câu mẫu
  const [ttsSec, setTtsSec] = useState<Record<number, number>>({}); // thời lượng câu mẫu từng câu (ở tốc độ đang chọn)
  const [speed, setSpeed] = useState(1);
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

  // Tải sẵn giọng đọc câu đang ôn → bấm nghe là phát ngay
  useEffect(() => {
    if (v) prefetchGerman(v.word);
  }, [v]);

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
    setTalking(false);
    return stopSpeaking();
  };
  const cycleSpeed = () => {
    const s = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    setSpeed(s);
    SecureStore.setItemAsync(SPEED_KEY, String(s)).catch(() => {});
  };

  /** Chấm vào lịch ôn (1 lần mỗi câu, không chấm lượt ôn lại); Chưa nhớ / Còn khó → ôn lại có gợi ý cuối buổi */
  const submit = (g: Grade, exercise: "recall" | "shadow", autoClear?: number) => {
    if (!entry || !v || entry.retry) return;
    const fresh = exercise === "shadow";
    setResults((list) => [...list, { item: v, grade: g, fresh }]);
    setChanged(true);
    api(`/vocab/${v.id}/review`, { method: "POST", body: { grade: g, mode: "crazy", exercise, autoClear: autoClear ?? null } }).catch(() => {});
    if (!fresh && (g === "again" || g === "hard")) setQueue((q) => [...q, { item: v, retry: true }]);
  };

  /** Nhớ lại xong (hoặc "Không nhớ") → hiện câu chuẩn + phát mẫu để đối chiếu */
  const reveal = (g: Grade | null, clear?: number) => {
    setGrade(g);
    setPhase("reveal");
    if (g) submit(g, "recall", clear);
    listen();
  };
  const dontKnow = () => {
    recallTake.reset();
    reveal("again");
  };
  /** Không nhận dạng được (lỗi mạng) → người học tự đối chiếu, chọn đúng / chưa */
  const manual = (g: Grade) => {
    setGrade(g);
    submit(g, "recall");
  };

  const onAttempt = (ok: boolean, clear?: number) => {
    if (!v) return;
    setShouts((n) => n + 1);
    setReps((s) => ({ ...s, [v.id]: { reps: (s[v.id]?.reps ?? 0) + 1, passed: ok || !!s[v.id]?.passed } }));
    api<{ rep: CrazyRep }>("/crazy", { method: "POST", body: { source: `/vocab/${v.id}`, idx: 0, passed: ok } })
      .then(({ rep }) => setReps((s) => ({ ...s, [v.id]: rep })))
      .catch(() => {});
    if (phase === "recall") return reveal(gradeOf(clear), clear);
    if (phase !== "drill") return;
    silentRun.current = 0;
    setLastOk(ok);
    const n = done + 1;
    const passed = passes + (ok ? 1 : 0);
    setDone(n);
    setPasses(passed);
    if (n < block) return;
    setLooping(false); // đủ lượt → dừng lặp
    if (phaseFor(entry) === "drill") submit(passed * 2 >= block ? "good" : "hard", "shadow"); // câu mới: vào lịch ôn theo kết quả khối
  };

  const takeOpts = {
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
  };
  // Nhớ lại: thu rồi Whisper nhận dạng (cần chính xác để máy chấm)
  const recallTake = useTake(takeOpts);
  // Luyện to: nhận dạng trực tiếp — tô từ kiểu karaoke, nói hết câu là dừng ngay
  const drillTake = useDrillTake({
    ...takeOpts,
    onSilent: () => {
      if (++silentRun.current >= SILENT_STOP) setLooping(false);
    },
    onFail: () => setLooping(false),
    autoLoop: phase === "drill" && looping,
    loopListen: done === 0 || !lastOk, // phát mẫu ở lượt đầu và sau lượt chưa đạt
  });
  const drill = phase === "drill";
  const take = drill ? drillTake : recallTake;
  const cancelTakes = () => {
    recallTake.cancel();
    drillTake.cancel();
  };
  const busy = take.state !== "idle";
  const micOn = take.state === "starting" || take.state === "recording"; // không cho phát mẫu chồng lên lượt thu

  // App chạy nền → dừng lặp, bỏ lượt đang thu, dừng phát
  const onBackground = useEffectEvent(() => {
    setLooping(false);
    cancelTakes();
    silence();
  });
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => s !== "active" && onBackground());
    return () => sub.remove();
  }, []);

  const startDrill = () => {
    silence();
    setPhase("drill");
    setDone(0);
    setPasses(0);
    setLastOk(true);
    silentRun.current = 0;
    setLooping(true); // người học vừa bấm → bắt đầu lặp luôn
  };
  /** Sang câu sau. Câu luyện to bắt đầu lặp luôn (người học vừa bấm), câu nhớ lại chờ bấm micro */
  const next = () => {
    silence();
    cancelTakes();
    const n = pos + 1;
    const p = phaseFor(queue[n]);
    setPos(n);
    setPhase(p);
    setGrade(null);
    setDone(0);
    setPasses(0);
    setLastOk(true);
    silentRun.current = 0;
    setLooping(p === "drill");
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

  const recalled = results.filter((r) => !r.fresh);
  const recalledOk = recalled.filter((r) => r.grade === "good" || r.grade === "easy").length;
  const freshCount = results.filter((r) => r.fresh).length;
  const practiced = [...new Map(queue.slice(0, pos).map((e) => [e.item.id, e.item])).values()];
  const weakIds = new Set(results.filter((r) => r.grade === "again" || r.grade === "hard").map((r) => r.item.id));

  // ---- Màn tổng kết (lượt tích luỹ từng câu hiện ở đây, không ở màn luyện) ----
  if (!entry || !v)
    return (
      <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScrollView contentContainerStyle={{ flexGrow: 1, width: "100%", maxWidth: FORM_MAX, alignSelf: "center", padding: 24, gap: 16 }}>
          <Text style={{ color: C.text, fontSize: 26, fontWeight: "800", marginTop: 24 }}>{t("crazyReview.finished")}</Text>
          <Text style={{ color: C.muted, fontSize: 16, lineHeight: 22 }}>
            {t("crazyReview.summary", { ok: recalledOk, n: recalled.length, fresh: freshCount, shouts })}
          </Text>
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

  const twoSteps = phaseFor(entry) === "recall" && !entry.retry;
  const tag = entry.retry ? t("crazyReview.tagRetry") : twoSteps ? t("crazyReview.tagDue") : t("crazyReview.tagNew");
  const stepName = entry.retry
    ? t("crazyReview.retryHint")
    : !twoSteps
      ? t("crazyReview.drillOnly")
      : drill
        ? t("crazyReview.stepDrill")
        : t("crazyReview.stepRecall");
  const blockDone = done >= block;
  const isLast = pos === queue.length - 1;
  const nextTitle = isLast ? t("crazyReview.finish") : t("crazyReview.nextSentence");
  const nextIcon = isLast ? "checkmark" : "arrow.right";

  // Kết quả nhớ lại: máy chấm (theo số từ nhận ra) hoặc người học tự chấm khi không nhận dạng được
  const verdict = (): { text: string; tone: Tone } | null => {
    const a = recallTake.take;
    const counts = { c: a ? heardCount(a) : 0, n: a?.words?.length ?? 0 };
    if (entry.retry) return a?.status === "done" ? { text: t("crazyReview.retryResult", counts), tone: "neutral" } : null;
    if (grade === "again") return { text: t("crazyReview.again"), tone: "bad" };
    if (grade === "hard") return { text: t("crazyReview.hard", counts), tone: "warn" };
    if (grade) return { text: t("crazyReview.good", counts), tone: "good" };
    return null;
  };

  // ---- Đáy màn: 1 nút chính + hành động phụ dạng chữ (chỉ hiện thứ dùng được trong trạng thái hiện tại) ----
  const bottom = () => {
    if (phase === "recall")
      return (
        <>
          {take.state === "recording" ? (
            <Cta title={t("crazyReview.stopRecord")} tone="danger" icon="stop.fill" onPress={take.stop} />
          ) : (
            <Cta
              title={take.state === "checking" ? t("take.checking") : t("crazyReview.record")}
              icon="mic.fill"
              loading={take.state === "checking" || take.state === "starting"}
              onPress={take.record}
            />
          )}
          <View style={{ minHeight: 44 }}>{!busy && <TextBtn title={t("crazyReview.dontKnow")} onPress={dontKnow} />}</View>
        </>
      );
    if (phase === "reveal") {
      if (!entry.retry && !grade)
        return (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Cta title={t("crazyReview.manualNo")} tone="neutral" onPress={() => manual("again")} />
            </View>
            <View style={{ flex: 1 }}>
              <Cta title={t("crazyReview.manualOk")} onPress={() => manual("good")} />
            </View>
          </View>
        );
      return (
        <>
          {entry.retry ? (
            <Cta title={nextTitle} icon={nextIcon} onPress={next} />
          ) : (
            <Cta title={t("crazyReview.toDrill")} icon="mic.fill" onPress={startDrill} />
          )}
          <View style={{ minHeight: 44 }}>{!!take.uri && <TextBtn title={t("crazyReview.myTake")} icon="play.fill" onPress={playMine} />}</View>
        </>
      );
    }
    return (
      <>
        {blockDone ? (
          <Cta title={nextTitle} icon={nextIcon} onPress={next} />
        ) : looping ? (
          <Cta title={t("crazyReview.pause")} tone="neutral" icon="pause.fill" onPress={toggleLoop} />
        ) : talking ? (
          // Máy đang đọc mẫu → chưa hiện nút nói (tránh chồng tiếng); giữ chỗ để bố cục không nhảy
          <View style={{ minHeight: BTN_HEIGHT }} />
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

  const v2 = verdict();

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
          {/* Vùng trên: loại câu · bước → nghĩa → câu tiếng Đức (ẩn khi nhớ lại) → nghe mẫu */}
          <View style={{ gap: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Chip text={tag} tone={entry.retry ? "warn" : twoSteps ? "neutral" : "good"} />
              <Text style={{ color: C.muted, fontSize: 13, fontWeight: "700" }}>{stepName}</Text>
            </View>
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
                {!!v.meaning && <Text style={{ color: C.muted, fontSize: 17, lineHeight: 24 }}>{v.meaning}</Text>}
                <Sentence text={v.word} take={take.take} live={liveTake && drill && take.state === "recording" ? (drillTake.live ?? []) : null} />
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <PlayBtn
                    talking={talking}
                    onPress={talking ? silence : listen}
                    disabled={micOn}
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
                </View>
              </>
            )}
          </View>

          {/* Vùng dưới (sát nút chính): kết quả nhớ lại · hoặc lượt + trạng thái lượt nói */}
          <View style={{ gap: 12 }}>
            {phase === "reveal" ? (
              v2 ? <Verdict text={v2.text} tone={v2.tone} /> : !entry.retry && <Text style={{ color: C.muted, fontSize: 15, lineHeight: 21 }}>{t("crazyReview.manual")}</Text>
            ) : (
              <>
                {drill && (
                  <View style={{ gap: 8 }}>
                    <Text style={{ color: blockDone ? C.accent : C.text, fontSize: 15, fontWeight: "800", fontVariant: ["tabular-nums"] }}>
                      {blockDone ? t("crazyReview.blockDone", { n: block }) : t("crazyReview.repsLabel", { i: done + 1, n: block })}
                    </Text>
                    <View style={{ height: 6, borderRadius: 3, backgroundColor: C.card2, overflow: "hidden" }}>
                      <View style={{ height: "100%", width: `${(Math.min(done, block) / block) * 100}%`, backgroundColor: C.accent }} />
                    </View>
                  </View>
                )}
                {!blockDone && (
                  <TakeStatus
                    take={take}
                    live={!!liveTake && drill}
                    help={drill ? t("crazyReview.drillHelp") : t("crazyReview.recallHelp")}
                  />
                )}
              </>
            )}
          </View>
        </ScrollView>

        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4, gap: 4 }}>{bottom()}</View>
      </View>
    </SafeAreaView>
  );
}
