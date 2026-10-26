import { useAudioPlayer } from "expo-audio";
import { Stack } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, AppState, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Phrase } from "@shared/phrase-match";
import type { Grade } from "@shared/srs";
import { Elapsed, LiveWave, PlayingBars, PulseDot } from "./RecordingViz";
import { Cta, styles } from "./ui";
import { WordSheet } from "./WordSheet";
import { api, type CrazyRep, type VocabItem } from "@/lib/api";
import { confirmDestructive } from "@/lib/dialogs";
import { useI18n } from "@/lib/i18n";
import { FORM_MAX } from "@/lib/layout";
import { prefetchGerman, speakGerman, stopSpeaking } from "@/lib/speak";
import { C } from "@/lib/theme";
import type { useLiveTake } from "@/lib/useLiveTake";
import { useLookup } from "@/lib/useLookup";
import { clearOk, heardCount, paceOk, useTake, type Take } from "@/lib/useTake";
import { splitWords, type CheckedWord } from "@shared/dictation";

/**
 * Nhận dạng trực tiếp cần module native expo-speech-recognition. Nạp lười, lỗi thì coi như không có:
 * bản app cũ (chưa build lại) nhận bản cập nhật JS vẫn chạy, lượt Luyện to quay về thu âm (useTake).
 */
const liveTake = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- nạp lười, thiếu module native thì bỏ qua
    return (require("@/lib/useLiveTake") as { useLiveTake: typeof useLiveTake }).useLiveTake;
  } catch {
    return null;
  }
})();
/**
 * Bản dự phòng: thu âm rồi chỉ đo nhịp, KHÔNG gửi Whisper từng lượt lặp (mỗi lượt tốn tiền, khối 10–20 lượt
 * vượt giới hạn 60 lượt / 10 phút → lỗi → lượt "đạt" chỉ nhờ nhịp). Cùng giao diện; không có `live`.
 */
function useRecordedDrill(opts: Parameters<typeof useLiveTake>[0]) {
  return useTake({ ...opts, score: false }) as unknown as ReturnType<typeof useLiveTake>;
}
const useDrillTake = liveTake ?? useRecordedDrill;

type Item = VocabItem & { stage: number };
/**
 * Loại lượt trong hàng chờ. Câu chưa thuộc: tiếng Đức trước → Luyện to bớt dần chữ → lát sau mới nhớ lại từ nghĩa.
 * Câu đã thuộc: nhớ lại từ nghĩa trước (lần kiểm tra thật), quên mới học lại.
 * - new: câu mới — Luyện to 3 bậc; xong khối → thêm 1 lượt "check" cuối buổi.
 * - learn: câu đang học (mức < RECALL_STAGE) đến hạn — như câu mới.
 * - due: câu đã thuộc (mức ≥ RECALL_STAGE) đến hạn — Nhớ lại không gợi ý (chấm vào lịch ôn) → Luyện to:
 *   nhớ tốt → chỉ bậc không nhìn; chưa tốt → đủ 3 bậc + 1 lượt "retry" cuối buổi.
 * - check: cuối buổi, câu vừa luyện — chỉ thấy nghĩa, nói câu (gợi ý chữ cái đầu khi cần); chấm vào lịch ôn.
 * - retry: cuối buổi nhớ lại thêm (không chấm): câu đến hạn nhớ chưa tốt, hoặc câu vừa luyện mà không có câu nào chen giữa.
 * - practice: luyện thêm câu yếu sau buổi — Luyện to 3 bậc (không chấm).
 */
type Kind = "new" | "learn" | "due" | "check" | "retry" | "practice";
type Entry = { item: Item; kind: Kind };
/** recall: tự nhớ ra · recall-self: người học tự chấm (nói đúng ý / lỗi mạng) · cued: nhớ có gợi ý · shadow: chỉ Luyện to */
type Exercise = "recall" | "recall-self" | "cued" | "shadow";
type Result = { item: Item; grade: Grade; exercise: Exercise; dueDays?: number }; // dueDays: còn bao nhiêu ngày tới hạn ôn mới
/** recall: chỉ thấy nghĩa, nói câu · reveal: hiện câu + máy chấm · drill: luyện to lặp rảnh tay */
type Phase = "recall" | "reveal" | "drill";

/** Bậc Luyện to: 0 nhìn đủ câu · 1 chỉ còn chữ cái đầu · 2 không nhìn */
type Level = 0 | 1 | 2;
const TOP: Level = 2;
const LEVEL_RUN = 2; // đạt chừng này lượt liền → lên bậc; ở bậc cuối → đã nói được không cần nhìn, xong khối sớm (block chỉ là số lượt tối đa)
const RECALL_STAGE = 3; // từ mức này câu coi như đã thuộc → nhớ lại từ nghĩa trước
const MIN_GAP = 1; // ít nhất chừng này lượt chen giữa Luyện to và nhớ lại cuối buổi (không thì không chấm)
const AUTO_NEXT_MS = 1500; // xong khối lúc đang lặp rảnh tay → tự sang câu sau
const SILENT_STOP = 2; // vòng lặp rảnh tay: 2 lượt liền không nghe thấy tiếng → tự dừng
const SPEEDS = [0.75, 0.9, 1, 1.1]; // tốc độ giọng đọc mẫu
const SPEED_KEY = "crazy-speed";
const BTN_HEIGHT = 56;
const DAY = 86_400_000;
const TONE = {
  good: { fg: C.accent, bg: "rgba(22,163,74,0.14)" },
  warn: { fg: C.amber, bg: "rgba(250,204,21,0.12)" },
  bad: { fg: C.redText, bg: "rgba(239,68,68,0.12)" },
  neutral: { fg: C.muted, bg: C.card2 },
} as const;
type Tone = keyof typeof TONE;

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
/** Che 1 từ theo bậc: 1 → giữ chữ cái đầu, 2 → che hết (giữ dấu câu) */
const maskWord = (w: string, level: Level) => (level === 0 ? w : level === 1 ? hintOf(w) : w.replace(/[\p{L}\p{N}]/gu, "_"));
/** Chưa nghe câu mẫu ở tốc độ này lần nào → ước lượng thời lượng để đo nhịp */
const estimate = (text: string, speed: number) => (0.3 + text.split(/\s+/).length * 0.4) / speed;
/** Cỡ chữ câu tiếng Đức theo độ dài: ngắn 32 · vừa 28 · dài 24 (không nhỏ hơn) */
const sentenceSize = (s: string) => (s.length <= 40 ? 32 : s.length <= 80 ? 28 : 24);
const cleanWord = (w: string) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");

const graded = (k: Kind) => k === "due" || k === "check";
/** Lượt nhớ lại cuối buổi (đã luyện câu này trong buổi → được gợi ý chữ cái đầu khi cần) */
const cued = (k: Kind) => k === "check" || k === "retry";
/** Câu đã thuộc (có nghĩa) / lượt cuối buổi: nhớ lại trước; còn lại: tiếng Đức trước — Luyện to */
const phaseFor = (e?: Entry): Phase => (e && (cued(e.kind) || (e.kind === "due" && !!e.item.meaning)) ? "recall" : "drill");
const kindOf = (stage: number): Kind => (stage === 0 ? "new" : stage < RECALL_STAGE ? "learn" : "due");

/** Số từ được phép thiếu mà vẫn tính "nhớ tốt": câu ≤ 3 từ phải đủ; dài hơn cho thiếu ~20% (ít nhất 1 từ) */
const allowedMiss = (n: number) => (n <= 3 ? 0 : Math.max(1, Math.round(n * 0.2)));
const LOWER: Record<Grade, Grade> = { easy: "good", good: "hard", hard: "again", again: "again" };
/**
 * Máy chấm lượt nhớ lại theo số từ nhận ra (ngưỡng theo độ dài câu). Đủ từng chữ, không nói thừa, chưa luyện trước
 * trong buổi (primed) → easy. Nói thừa nhiều (lan man, đoán mò) → hạ 1 bậc. Phải xem gợi ý → cao nhất "hard".
 * Không nhận dạng được → null (người học tự chấm).
 */
function recallGrade(a: Take | undefined, primed: boolean, hinted: boolean): Grade | null {
  if (a?.status !== "done" || !a.words?.length) return null;
  const n = a.words.length;
  const heard = heardCount(a);
  let g: Grade = n - heard <= allowedMiss(n) ? "good" : heard * 2 >= n ? "hard" : "again";
  if (g === "good" && !primed && !hinted && !a.extra && a.words.every((w) => w.state === "correct")) g = "easy";
  if ((a.extra ?? 0) > Math.max(2, n / 2)) g = LOWER[g];
  if (hinted && (g === "good" || g === "easy")) g = "hard";
  return g;
}

/**
 * Câu tiếng Đức, che theo bậc Luyện to (`level`). Đang nói (`live`): kiểu karaoke — từ máy đã nghe ra sáng xanh
 * (hiện chữ), từ chưa tới mờ (che theo bậc). Sau lượt đã nhận dạng: trắng = máy nhận ra, đỏ = chưa nhận ra
 * (bậc che chữ: vẫn che, kẻo lượt sau đọc lại kết quả). Có `onLook` → chạm từ để tra (chỉ khi không che).
 */
function Sentence({ text, take, live, level, onLook }: { text: string; take: Take | null; live?: CheckedWord[] | null; level: Level; onLook?: (word: string, context: string) => void }) {
  const size = sentenceSize(text);
  const style = { fontSize: size, lineHeight: Math.round(size * 1.3), fontWeight: "700" as const, color: C.text };
  const look = level === 0 ? onLook : undefined;
  const word = (w: string, k: number, color?: string) => (
    <Text
      key={k}
      style={color ? { color } : undefined}
      onPress={look && cleanWord(w) ? () => look(cleanWord(w), text) : undefined}
      suppressHighlighting={false}
    >
      {maskWord(w, level)}{" "}
    </Text>
  );
  if (live)
    return (
      <Text style={style} maxFontSizeMultiplier={1.3}>
        {(live.length ? live : splitWords(text).map((w): CheckedWord => ({ text: w, state: "missing" }))).map((w, k) => {
          const heard = w.state === "correct" || w.state === "close";
          return (
            <Text key={k} style={{ color: heard ? C.accent : C.muted }}>
              {heard ? w.text : maskWord(w.text, level)}{" "}
            </Text>
          );
        })}
      </Text>
    );
  if (take?.status !== "done" || !take.words)
    return (
      <Text style={style} maxFontSizeMultiplier={1.3}>
        {text.split(/\s+/).map((w, k) => word(w, k))}
      </Text>
    );
  return (
    <Text style={style} maxFontSizeMultiplier={1.3}>
      {take.words.map((w, k) => word(w.text, k, w.state === "correct" || w.state === "close" ? C.text : C.redText))}
    </Text>
  );
}

/** Thanh 3 bậc Luyện to: bậc đã qua đầy, bậc đang luyện đầy dần theo số lượt đạt liền */
function LevelSteps({ level, run, done }: { level: Level; run: number; done: boolean }) {
  const { t } = useI18n();
  const names = [t("crazyReview.level0"), t("crazyReview.level1"), t("crazyReview.level2")];
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {names.map((name, k) => {
        const fill = done || k < level ? 1 : k === level ? run / LEVEL_RUN : 0;
        return (
          <View key={k} style={{ flex: 1, gap: 6 }}>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: C.card2, overflow: "hidden" }}>
              <View style={{ height: "100%", width: `${fill * 100}%`, backgroundColor: C.accent }} />
            </View>
            <Text style={{ color: k === level && !done ? C.text : C.muted, fontSize: 12, fontWeight: "700" }} numberOfLines={1}>
              {name}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** Cụm từ cố định trong câu: dạng từ điển (xanh, chạm để tra) — nghĩa */
function PhraseLines({ phrases, sentence, onLook }: { phrases: Phrase[]; sentence: string; onLook?: (word: string, context: string, marks?: string[]) => void }) {
  if (!phrases.length) return null;
  return (
    <View style={{ gap: 4 }}>
      {phrases.map((p, k) => (
        <Text key={k} style={{ color: C.muted, fontSize: 14, lineHeight: 20 }}>
          <Text style={{ color: C.phrase, fontWeight: "700" }} onPress={onLook ? () => onLook(p.base, sentence, p.parts) : undefined}>
            {p.base}
          </Text>{" "}
          — {p.meaning}
        </Text>
      ))}
    </View>
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
 * Luyện câu ⭐ kiểu Crazy Deutsch (to · nhanh · rõ). Mỗi câu đi theo 1 đường thẳng, máy tự chấm:
 * - Luyện to 3 bậc, bớt dần chữ: nhìn đủ câu → chỉ chữ cái đầu → không nhìn. Đạt LEVEL_RUN lượt liền → lên bậc,
 *   trượt → lùi 1 bậc và phát lại mẫu; xong khi nói được không cần nhìn hoặc đủ `block` lượt.
 * - Câu mới / đang học: tiếng Đức trước — Luyện to 3 bậc. Cuối buổi (có câu khác chen giữa) chỉ thấy nghĩa, nói câu
 *   (gợi ý chữ cái đầu khi cần) → kết quả này (không phải lượt bắt chước) vào lịch ôn.
 * - Câu đã thuộc: 1. Nhớ lại — chỉ thấy nghĩa, nói câu (Whisper nhận dạng, không gợi ý câu gốc) → máy chấm theo số từ
 *   nhận ra, hiện câu chuẩn tô đỏ chỗ sai; chấm sai ý → người học tự nâng ("nói đúng ý", ghi là tự đánh giá).
 *   2. Luyện to: nhớ tốt → chỉ bậc không nhìn; chưa nhớ / còn khó → đủ 3 bậc, cuối buổi nhớ lại thêm 1 lượt (không chấm lại).
 * - Lượt đạt khi máy nhận ra đủ từ; nhịp so với mẫu chỉ là nhận xét (đúng trước, nhanh sau).
 * - Câu chưa có nghĩa → AI điền nghĩa lúc vào buổi để nhớ lại được. Chạm từ / cụm trong câu → bảng giải thích.
 * Luyện to: nhận dạng trực tiếp (useLiveTake) — chữ sáng theo giọng, nói hết câu là sang lượt tiếp; câu mẫu phát ở
 * lượt đầu và sau lượt chưa đạt. Số lượt tích luỹ mỗi câu lưu trên server (source "/vocab/<id>").
 */
export function CrazyReview({ items, pool, block, onClose }: { items: Item[]; pool: VocabItem[]; block: number; onClose: (changed: boolean) => void }) {
  const { t, lang } = useI18n();
  const [queue, setQueue] = useState<Entry[]>(() => items.map((item) => ({ item, kind: kindOf(item.stage) })));
  const [mainCount, setMainCount] = useState(items.length); // số lượt chính (trước vòng ôn lại cuối buổi)
  const [practice, setPractice] = useState(false); // đang luyện thêm câu yếu (không chấm)
  const [pos, setPos] = useState(0);
  const entry = queue[pos] as Entry | undefined;
  const v = entry?.item;
  const [phase, setPhase] = useState<Phase>(() => phaseFor(queue[0]));
  const [grade, setGrade] = useState<Grade | null>(null); // kết quả nhớ lại (null = chưa chấm được)
  const [self, setSelf] = useState(false); // kết quả do người học tự chấm
  const [hinted, setHinted] = useState(false); // lượt nhớ lại cuối buổi: đã xem gợi ý chữ cái đầu
  const committed = useRef(false); // kết quả nhớ lại của câu này đã gửi vào lịch ôn
  const [done, setDone] = useState(0); // lượt đã nói của câu đang luyện
  const [level, setLevel] = useState<Level>(0); // bậc Luyện to (che chữ tới đâu)
  const [run, setRun] = useState(0); // số lượt đạt liền ở bậc hiện tại
  const [looping, setLooping] = useState(false); // đang lặp rảnh tay
  const [autoNext, setAutoNext] = useState(false); // xong khối lúc rảnh tay → sắp tự sang câu sau
  const silentRun = useRef(0); // số lượt liền không nghe thấy tiếng
  const [reps, setReps] = useState<Record<number, CrazyRep>>({}); // lượt tích luỹ từng câu (qua mọi buổi)
  const [results, setResults] = useState<Result[]>([]);
  const [shouts, setShouts] = useState(0); // lượt nói to trong buổi này
  const changed = useRef(false); // đã chấm vào lịch ôn / AI điền nghĩa → quay lại thì tải lại sổ từ
  const introduced = useRef(new Set<number>()); // câu mới / đang học đã nói ít nhất 1 lượt → cần được chấm trong buổi
  const gradedIds = useRef(new Set<number>()); // câu đã chấm vào lịch ôn trong buổi
  const [talking, setTalking] = useState(false); // đang phát câu mẫu
  const [ttsSec, setTtsSec] = useState<Record<string, number>>({}); // "<id>@<tốc độ>" → thời lượng câu mẫu (giây)
  const [speed, setSpeed] = useState(1);
  const [phrases, setPhrases] = useState<Record<string, Phrase[]>>({}); // câu → cụm từ cố định trong câu
  const speakId = useRef(0); // bỏ onEnd của lần đọc cũ (bị dừng giữa chừng)
  const playback = useAudioPlayer(null);
  const ting = useAudioPlayer(require("@/assets/sounds/correct.wav")); // báo đã thu xong 1 lượt
  const look = useLookup(pool);

  useEffect(() => {
    api<{ reps: Record<string, CrazyRep> }>("/crazy?source=/vocab")
      .then((r) => setReps(Object.fromEntries(Object.entries(r.reps).map(([k, x]) => [Number(k), x]))))
      .catch(() => {});
    SecureStore.getItemAsync(SPEED_KEY)
      .then((s) => s && SPEEDS.includes(Number(s)) && setSpeed(Number(s)))
      .catch(() => {});
    // Câu chưa có nghĩa thì không nhớ lại được → AI điền nghĩa (server lưu luôn vào sổ từ)
    for (const it of items)
      if (!it.meaning.trim())
        api<{ meaning: string }>(`/vocab/${it.id}`, { method: "POST" })
          .then(({ meaning }) => {
            if (!meaning) return;
            changed.current = true;
            setQueue((q) => q.map((e) => (e.item.id === it.id ? { ...e, item: { ...e.item, meaning } } : e)));
          })
          .catch(() => {});
    return () => void stopSpeaking();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- chỉ lúc vào buổi

  // Cụm từ cố định trong các câu (server có sẵn trong kho thì không tốn AI)
  useEffect(() => {
    const sentences = [...new Set(items.map((i) => i.word))].filter((x) => x.length <= 500);
    if (!sentences.length) return;
    api<{ phrases: Phrase[][] }>("/phrases", { method: "POST", body: { sentences, lang } })
      .then((r) => setPhrases(Object.fromEntries(sentences.map((x, k) => [x, r.phrases[k] ?? []]))))
      .catch(() => {});
  }, [items, lang]);

  // Tải sẵn giọng đọc câu đang ôn → bấm nghe là phát ngay
  useEffect(() => {
    if (v) prefetchGerman(v.word);
  }, [v]);

  /** Phát câu mẫu; after: chạy khi phát hết câu (không chạy nếu bị dừng giữa chừng) */
  const listen = (after?: () => void) => {
    if (!v) return;
    const id = ++speakId.current;
    const started = Date.now();
    const key = `${v.id}@${speed}`;
    setTalking(true);
    speakGerman(v.word, {
      speed,
      onEnd: () => {
        if (id !== speakId.current) return;
        setTalking(false);
        setTtsSec((s) => ({ ...s, [key]: (Date.now() - started) / 1000 }));
        after?.();
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

  /** Chấm 1 câu vào lịch ôn (server trả hạn ôn mới → hiện ở màn tổng kết) */
  const submit = (it: Item, g: Grade, exercise: Exercise, autoClear?: number) => {
    gradedIds.current.add(it.id);
    changed.current = true;
    const r: Result = { item: it, grade: g, exercise };
    setResults((list) => [...list, r]);
    api<{ dueAt: number }>(`/vocab/${it.id}/review`, { method: "POST", body: { grade: g, mode: "crazy", exercise, autoClear: autoClear ?? null } })
      .then((res) => setResults((list) => list.map((x) => (x === r ? { ...x, dueDays: Math.round((res.dueAt - Date.now()) / DAY) } : x))))
      .catch(() => {});
  };

  /**
   * Rời bước xem kết quả nhớ lại → gửi kết quả (để kịp sửa "nói đúng ý" trước khi gửi).
   * Câu đến hạn nhớ chưa tốt → thêm 1 lượt ôn lại có gợi ý cuối buổi. Trả về hàng chờ mới.
   */
  const commit = (): Entry[] => {
    if (phase !== "reveal" || !entry || !grade || committed.current || !graded(entry.kind)) return queue;
    committed.current = true;
    const a = recallTake.take;
    const clear = a?.words?.length ? heardCount(a) / a.words.length : undefined;
    submit(entry.item, grade, self ? "recall-self" : entry.kind === "check" ? "cued" : "recall", clear);
    if (entry.kind !== "due" || (grade !== "again" && grade !== "hard")) return queue;
    const q = [...queue, { item: entry.item, kind: "retry" as const }];
    setQueue(q);
    return q;
  };

  /** Câu mới / đang học đã luyện mà chưa được chấm qua nhớ lại cuối buổi (bỏ qua / thoát sớm / không có câu chen giữa) → hẹn ôn lại sớm */
  const settle = () => {
    for (const id of introduced.current) {
      if (gradedIds.current.has(id)) continue;
      const it = queue.find((e) => e.item.id === id)?.item;
      if (it) submit(it, "hard", "shadow");
    }
  };

  /** Nhớ lại xong (hoặc "Không nhớ") → hiện câu chuẩn + phát mẫu để đối chiếu */
  const reveal = (g: Grade | null) => {
    setGrade(g);
    setSelf(false);
    setPhase("reveal");
    listen();
  };
  const dontKnow = () => {
    recallTake.reset();
    reveal("again");
  };
  /** Người học tự chấm: lỗi mạng không nhận dạng được, hoặc máy chấm sai ý (nói khác chữ nhưng đúng nghĩa). Đã xem gợi ý → cao nhất "hard" */
  const selfGrade = (g: Grade) => {
    setGrade(hinted && g === "good" ? "hard" : g);
    setSelf(true);
  };

  /**
   * Xong khối Luyện to: câu mới / đang học → nhớ lại từ nghĩa cuối buổi (chấm nếu có câu chen giữa, không thì chỉ
   * nhớ lại thêm và hẹn ôn sớm). Câu chưa được chấm qua nhớ lại (chưa có nghĩa nên chỉ Luyện to) → chấm theo khối;
   * Luyện to không tính là bằng chứng thành thạo.
   */
  const finishBlock = (fluent: boolean) => {
    if (!entry || !v || practice) return;
    if ((entry.kind === "new" || entry.kind === "learn") && v.meaning)
      setQueue((q) => [...q, { item: v, kind: q.length - 1 - pos >= MIN_GAP ? "check" : "retry" }]);
    else if (!gradedIds.current.has(v.id)) submit(v, fluent ? "good" : "hard", "shadow");
  };

  const onAttempt = (passed: boolean, _clear?: number, a?: Take) => {
    if (!v || !entry) return;
    if (phase === "recall") return reveal(recallGrade(a, cued(entry.kind), hinted));
    if (phase !== "drill") return;
    // Chỉ lượt Luyện to mới tính là lượt nói (lượt nhớ lại không cộng vào)
    setShouts((n) => n + 1);
    if (entry.kind === "new" || entry.kind === "learn") introduced.current.add(v.id);
    // Đạt = máy nhận ra đủ từ; không nhận dạng được (bản dự phòng) → theo nhịp
    const ok = a?.status === "done" ? clearOk(a) : passed;
    setReps((s) => ({ ...s, [v.id]: { reps: (s[v.id]?.reps ?? 0) + 1, passed: ok || !!s[v.id]?.passed } }));
    api<{ rep: CrazyRep }>("/crazy", { method: "POST", body: { source: `/vocab/${v.id}`, idx: 0, passed: ok } })
      .then(({ rep }) => setReps((s) => ({ ...s, [v.id]: rep })))
      .catch(() => {});
    silentRun.current = 0;
    const n = done + 1;
    // Đạt đủ lượt liền → lên bậc (che thêm chữ); trượt → lùi 1 bậc (hiện thêm chữ)
    let r = ok ? run + 1 : 0;
    let lv = ok ? level : (Math.max(0, level - 1) as Level);
    if (r >= LEVEL_RUN && lv < TOP) {
      lv = (lv + 1) as Level;
      r = 0;
    }
    setDone(n);
    setRun(r);
    setLevel(lv);
    const fluent = lv === TOP && r >= LEVEL_RUN;
    if (n < block && !fluent) return;
    if (looping) setAutoNext(true); // đang rảnh tay → tự sang câu sau
    setLooping(false);
    finishBlock(fluent);
  };

  const takeOpts = {
    text: v?.word ?? "",
    duration: v ? (ttsSec[`${v.id}@${speed}`] ?? estimate(v.word, speed)) : 1,
    playing: talking,
    onListen: listen,
    onBeforeRecord: silence,
    onAttempt,
    onCaptured: () => {
      ting.seekTo(0).catch(() => {});
      ting.play();
    },
  };
  // Nhớ lại: thu rồi Whisper nhận dạng (không gợi ý câu gốc → kết quả là thật)
  const recallTake = useTake(takeOpts);
  // Luyện to: nhận dạng trực tiếp — tô từ kiểu karaoke, nói hết câu là dừng ngay
  const drillTake = useDrillTake({
    ...takeOpts,
    onSilent: () => {
      if (++silentRun.current >= SILENT_STOP) setLooping(false);
    },
    onFail: () => setLooping(false),
    autoLoop: phase === "drill" && looping,
    loopListen: false, // vào nói luôn — cần nghe mẫu thì bấm nút loa
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
    setAutoNext(false);
    cancelTakes();
    silence();
  });
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => s !== "active" && onBackground());
    return () => sub.remove();
  }, []);

  /** Về đầu 1 câu: xoá trạng thái lượt nói / kết quả nhớ lại */
  const resetSentence = () => {
    setGrade(null);
    setSelf(false);
    setHinted(false);
    committed.current = false;
    setDone(0);
    setLevel(0);
    setRun(0);
    setAutoNext(false);
    silentRun.current = 0;
  };
  /** Câu đã thuộc: nhớ tốt → chỉ luyện bậc không nhìn (giữ phát âm, tốc độ); chưa tốt → học lại đủ 3 bậc */
  const startDrill = () => {
    commit();
    silence();
    setPhase("drill");
    setDone(0);
    setLevel(grade === "good" || grade === "easy" ? TOP : 0);
    setRun(0);
    silentRun.current = 0;
    setLooping(true); // người học vừa bấm → bắt đầu lặp luôn
  };
  /** Sang câu sau. Câu luyện to bắt đầu lặp luôn, câu nhớ lại chờ bấm micro */
  const next = () => {
    const q = commit();
    silence();
    cancelTakes();
    const n = pos + 1;
    const p = phaseFor(q[n]);
    setPos(n);
    setPhase(p);
    resetSentence();
    setLooping(!!q[n] && p === "drill");
  };
  const autoAdvance = useEffectEvent(() => {
    setAutoNext(false);
    if (queue[pos + 1]) next();
  });
  useEffect(() => {
    if (!autoNext) return;
    const id = setTimeout(autoAdvance, AUTO_NEXT_MS);
    return () => clearTimeout(id);
  }, [autoNext]);

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
  /** Nghe mẫu rồi nghe ngay bản thu của mình */
  const compare = () => listen(playMine);

  const close = () => {
    commit();
    settle();
    silence();
    cancelTakes();
    onClose(changed.current || look.changed);
  };
  const askClose = () => {
    if (!entry || (pos === 0 && done === 0 && phase !== "reveal")) return close();
    setLooping(false);
    confirmDestructive(t("crazyReview.exitTitle"), t("crazyReview.exitBody"), t("crazyReview.exitAction"), close);
  };

  // Hết hàng chờ → câu mới đã luyện mà chưa chấm được vào lịch (vd. bỏ qua) thì hẹn ôn lại sớm
  const atEnd = !entry;
  const onEnd = useEffectEvent(() => settle());
  useEffect(() => {
    if (atEnd) onEnd();
  }, [atEnd]);

  /** Luyện thêm các câu yếu vừa rồi (không chấm vào lịch ôn) */
  const practiceWeak = (list: Item[]) => {
    const q = list.map((item): Entry => ({ item, kind: "practice" }));
    setQueue(q);
    setMainCount(q.length);
    setPractice(true);
    setResults([]);
    setShouts(0);
    setPos(0);
    const p = phaseFor(q[0]);
    setPhase(p);
    resetSentence();
    setLooping(p === "drill");
  };

  const recalled = results.filter((r) => r.exercise === "recall" || r.exercise === "recall-self");
  const recalledOk = recalled.filter((r) => r.grade === "good" || r.grade === "easy").length;
  const freshCount = new Set(results.filter((r) => r.item.stage === 0).map((r) => r.item.id)).size;
  const practiced = [...new Map(queue.slice(0, pos).map((e) => [e.item.id, e.item])).values()];
  const weak = [...new Map(results.filter((r) => r.grade === "again" || r.grade === "hard").map((r) => [r.item.id, r.item])).values()];
  const weakIds = new Set(weak.map((w) => w.id));
  /** Hạn ôn lại gần nhất của 1 câu (theo lần chấm cuối trong buổi) */
  const dueLabel = (id: number) => {
    const days = results.findLast((r) => r.item.id === id)?.dueDays;
    if (days == null) return null;
    return days <= 0 ? t("crazyReview.dueToday") : days === 1 ? t("crazyReview.dueTomorrow") : t("crazyReview.dueIn", { n: days });
  };

  // ---- Màn tổng kết ----
  if (!entry || !v)
    return (
      <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScrollView contentContainerStyle={{ flexGrow: 1, width: "100%", maxWidth: FORM_MAX, alignSelf: "center", padding: 24, gap: 16 }}>
          <Text style={{ color: C.text, fontSize: 26, fontWeight: "800", marginTop: 24 }}>{practice ? t("review.practiceDone") : t("crazyReview.finished")}</Text>
          {!practice && (
            <Text style={{ color: C.muted, fontSize: 16, lineHeight: 22 }}>
              {t("crazyReview.summary", { ok: recalledOk, n: recalled.length, fresh: freshCount, shouts })}
            </Text>
          )}
          {practiced.length > 0 && (
            <View style={{ backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 16, gap: 14 }}>
              <Text style={{ color: C.muted, fontSize: 13, fontWeight: "700" }}>{t("crazyReview.totals")}</Text>
              {practiced.map((it) => {
                const due = dueLabel(it.id);
                return (
                  <View key={it.id} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, marginTop: 7, backgroundColor: weakIds.has(it.id) ? C.amber : "transparent" }} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ color: C.text, fontSize: 15, fontWeight: "600" }}>{it.word}</Text>
                      {!!it.meaning && <Text style={{ color: C.muted, fontSize: 13 }}>{it.meaning}</Text>}
                      {!!due && <Text style={{ color: weakIds.has(it.id) ? C.amber : C.accent, fontSize: 12, fontWeight: "700" }}>{due}</Text>}
                    </View>
                    <Text style={{ color: C.muted, fontSize: 13, fontVariant: ["tabular-nums"] }}>{reps[it.id]?.reps ?? 0}</Text>
                  </View>
                );
              })}
              {weakIds.size > 0 && <Text style={{ color: C.muted, fontSize: 13 }}>{t("crazyReview.weakNote")}</Text>}
            </View>
          )}
        </ScrollView>
        <View style={{ width: "100%", maxWidth: FORM_MAX, alignSelf: "center", padding: 16, gap: 4 }}>
          <Cta title={t("review.done")} onPress={close} />
          {!practice && weak.length > 0 && <TextBtn title={t("crazyReview.practiceWeak")} icon="arrow.counterclockwise" onPress={() => practiceWeak(weak)} />}
        </View>
      </SafeAreaView>
    );

  const kind = entry.kind;
  const twoSteps = kind === "due" && !!v.meaning;
  const tags: Record<Kind, { text: string; tone: Tone }> = {
    new: { text: t("crazyReview.tagNew"), tone: "good" },
    learn: { text: t("crazyReview.tagLearn"), tone: "good" },
    due: { text: t("crazyReview.tagDue"), tone: "neutral" },
    check: { text: t("crazyReview.tagCheck"), tone: "warn" },
    retry: { text: t("crazyReview.tagRetry"), tone: "warn" },
    practice: { text: t("crazyReview.tagPractice"), tone: "neutral" },
  };
  const stepName =
    kind === "retry"
      ? t("crazyReview.retryHint")
      : kind === "check"
        ? t("crazyReview.checkHint")
        : !twoSteps
          ? t("crazyReview.drillOnly")
          : drill
            ? t("crazyReview.stepDrill")
            : t("crazyReview.stepRecall");
  const fluent = level === TOP && run >= LEVEL_RUN;
  const blockDone = done >= block || fluent;
  const shown: Level = drill && !blockDone ? level : 0; // che chữ chỉ lúc đang Luyện to
  const isLast = pos === queue.length - 1;
  const nextTitle = isLast ? t("crazyReview.finish") : t("crazyReview.nextSentence");
  const nextIcon = isLast ? "checkmark" : "arrow.right";
  const endRound = pos >= mainCount; // vòng ôn lại cuối buổi
  const needManual = phase === "reveal" && graded(kind) && !grade; // không nhận dạng được → tự chấm
  // Máy chấm chưa nhớ / còn khó → cho người học sửa nếu thật ra nói đúng ý (khác chữ)
  const canSelfOk = phase === "reveal" && graded(kind) && !self && (grade === "again" || (grade === "hard" && !hinted)) && recallTake.take?.status === "done";
  // Tra từ khi không đang thu / đang lặp (kẻo bảng giải thích chen vào lượt nói)
  const canLook = phase === "reveal" || (drill && !looping && !busy);
  const onLook = canLook
    ? (word: string, context: string, marks?: string[]) => {
        silence();
        setAutoNext(false);
        look.open(word, context, marks, v);
      }
    : undefined;

  // Kết quả nhớ lại: máy chấm (theo số từ nhận ra) hoặc người học tự chấm
  const verdict = (): { text: string; tone: Tone } | null => {
    const a = recallTake.take;
    const counts = { c: a ? heardCount(a) : 0, n: a?.words?.length ?? 0 };
    const extra = a?.extra ? " · " + t("crazyReview.extra", { x: a.extra }) : "";
    if (!graded(kind)) return a?.status === "done" ? { text: t("crazyReview.retryResult", counts) + extra, tone: "neutral" } : null;
    if (!grade) return null;
    if (self) return { text: t("crazyReview.selfNote"), tone: "good" };
    if (kind === "check" && (grade === "again" || grade === "hard"))
      return { text: hinted && grade === "hard" ? t("crazyReview.checkHinted") : t("crazyReview.checkWeak"), tone: grade === "again" ? "bad" : "warn" };
    if (grade === "again") return { text: t("crazyReview.again") + extra, tone: "bad" };
    if (grade === "hard") return { text: t("crazyReview.hard", counts) + extra, tone: "warn" };
    if (grade === "easy") return { text: t("crazyReview.easy"), tone: "good" };
    return { text: t("crazyReview.good", counts), tone: "good" };
  };

  const takeExtras = (
    <>
      {!!take.uri && !looping && !micOn && <TextBtn title={t("crazyReview.myTake")} icon="play.fill" onPress={playMine} />}
      {!!take.uri && !looping && !micOn && <TextBtn title={t("crazyReview.compare")} icon="arrow.left.arrow.right" onPress={compare} />}
    </>
  );

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
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", minHeight: 44 }}>
            {!busy && cued(kind) && !hinted && <TextBtn title={t("crazyReview.showHint")} icon="lightbulb" onPress={() => setHinted(true)} />}
            {!busy && <TextBtn title={t("crazyReview.dontKnow")} onPress={dontKnow} />}
          </View>
        </>
      );
    if (phase === "reveal") {
      if (needManual)
        return (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Cta title={t("crazyReview.manualNo")} tone="neutral" onPress={() => selfGrade("again")} />
            </View>
            <View style={{ flex: 1 }}>
              <Cta title={t("crazyReview.manualOk")} onPress={() => selfGrade("good")} />
            </View>
          </View>
        );
      return (
        <>
          {twoSteps ? <Cta title={t("crazyReview.toDrill")} icon="mic.fill" onPress={startDrill} /> : <Cta title={nextTitle} icon={nextIcon} onPress={next} />}
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", minHeight: 44 }}>
            {canSelfOk && <TextBtn title={t("crazyReview.selfOk")} icon="checkmark" onPress={() => selfGrade("good")} />}
            {takeExtras}
          </View>
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
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, minHeight: 44 }}>
          {autoNext && <TextBtn title={t("crazyReview.stay")} onPress={() => setAutoNext(false)} />}
          {!blockDone && !looping && <TextBtn title={t("crazyReview.skip")} onPress={next} />}
          {!autoNext && takeExtras}
        </View>
      </>
    );
  };

  const v2 = verdict();
  const sentencePhrases = phrases[v.word] ?? [];

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, width: "100%", maxWidth: FORM_MAX, alignSelf: "center" }}>
        {/* Header 1 dòng: thoát · tiến độ (lượt chính; vòng ôn lại cuối buổi tính riêng để thanh không lùi) · vị trí câu */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 48, paddingHorizontal: 20 }}>
          <Pressable onPress={askClose} hitSlop={12} accessibilityRole="button" accessibilityLabel={t("close")}>
            <SymbolView name="xmark" size={18} weight="bold" tintColor={C.muted} />
          </Pressable>
          <View
            style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: C.card2, overflow: "hidden" }}
            accessibilityRole="progressbar"
            accessibilityLabel={t("crazyReview.position", { i: pos + 1, n: queue.length })}
          >
            <View style={{ height: "100%", width: `${endRound ? 100 : (pos / Math.max(mainCount, 1)) * 100}%`, backgroundColor: endRound ? C.amber : C.accent }} />
          </View>
          <Text style={{ color: endRound ? C.amber : C.muted, fontSize: 15, fontVariant: ["tabular-nums"] }}>
            {endRound ? `${t("crazyReview.endRound")} ${pos - mainCount + 1}/${queue.length - mainCount}` : `${pos + 1}/${mainCount}`}
          </Text>
        </View>

        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "space-between", paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, gap: 32 }}>
          {/* Vùng trên: loại câu · bước → nghĩa → câu tiếng Đức (ẩn khi nhớ lại) · cụm từ → nghe mẫu */}
          <View style={{ gap: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Chip text={tags[kind].text} tone={tags[kind].tone} />
              <Text style={{ flex: 1, color: C.muted, fontSize: 13, fontWeight: "700" }}>{stepName}</Text>
            </View>
            {phase === "recall" ? (
              <>
                <Text style={{ color: C.muted, fontSize: 15 }}>{t("crazyReview.recallPrompt")}</Text>
                <Text style={{ color: C.text, fontSize: 26, lineHeight: 34, fontWeight: "700" }} maxFontSizeMultiplier={1.3}>
                  {v.meaning}
                </Text>
                {hinted ? (
                  <Text style={{ color: C.muted, fontSize: 18, letterSpacing: 2 }}>{hintOf(v.word)}</Text>
                ) : (
                  <Text style={{ color: C.muted, fontSize: 15 }}>{t("crazyReview.wordCount", { n: splitWords(v.word).length })}</Text>
                )}
              </>
            ) : (
              <>
                {!!v.meaning && <Text style={{ color: C.muted, fontSize: 17, lineHeight: 24 }}>{v.meaning}</Text>}
                <Sentence
                  text={v.word}
                  take={take.take}
                  live={liveTake && drill && take.state === "recording" ? (drillTake.live ?? []) : null}
                  level={shown}
                  onLook={onLook}
                />
                {shown === 0 && <PhraseLines phrases={sentencePhrases} sentence={v.word} onLook={onLook} />}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <PlayBtn
                    talking={talking}
                    onPress={talking ? silence : () => listen()}
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
              v2 ? <Verdict text={v2.text} tone={v2.tone} /> : needManual && <Text style={{ color: C.muted, fontSize: 15, lineHeight: 21 }}>{t("crazyReview.manual")}</Text>
            ) : (
              <>
                {drill && (
                  <View style={{ gap: 8 }}>
                    <Text style={{ color: blockDone ? C.accent : C.text, fontSize: 15, fontWeight: "800", fontVariant: ["tabular-nums"] }}>
                      {fluent ? t("crazyReview.fluent") : blockDone ? t("crazyReview.blockDone", { n: block }) : t("crazyReview.repsLabel", { i: done + 1, n: block })}
                    </Text>
                    <LevelSteps level={level} run={run} done={fluent} />
                    {autoNext && <Text style={{ color: C.muted, fontSize: 14 }}>{t("crazyReview.autoNext")}</Text>}
                  </View>
                )}
                {!blockDone && (
                  <TakeStatus
                    take={take}
                    live={!!liveTake && drill}
                    help={drill ? t("crazyReview.drillHelp", { n: LEVEL_RUN }) : t("crazyReview.recallHelp")}
                  />
                )}
              </>
            )}
          </View>
        </ScrollView>

        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4, gap: 4 }}>{bottom()}</View>
      </View>
      <WordSheet {...look.sheet} />
    </SafeAreaView>
  );
}
