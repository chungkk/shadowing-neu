import { useAudioPlayer } from "expo-audio";
import { Stack, router, useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { buildQueue, canCloze, checkTyped, insertLater, isPhrase, newStep, resolveStep, shuffle, type Kind, type Step } from "@shared/review";
import { isDue } from "@shared/srs";
import { Button, ErrorText, styles } from "@/components/ui";
import { api, type VocabItem } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n, type TFn } from "@/lib/i18n";
import { CONTENT_MAX, FORM_MAX, useLayout } from "@/lib/layout";
import { speakGerman, stopSpeaking } from "@/lib/speak";
import { C } from "@/lib/theme";

/** Mục sổ từ kèm lịch ôn (server cũ không gửi → từ mới) */
type Word = VocabItem & { stage: number; dueAt: number | null };
type Day = { key: string; title: string; data: Word[] };

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** "2026-10-19 08:00:00" (UTC) → "2026-10-19" theo giờ máy */
const dayOf = (s: string) => {
  const d = new Date(s.replace(" ", "T") + "Z");
  return isNaN(+d) ? s.slice(0, 10) : ymd(d);
};

/** Nhóm từ theo từng ngày lưu (mới → cũ, giữ thứ tự server trả về) */
function byDay(items: Word[], t: TFn, lang: string): Day[] {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const groups = new Map<string, Word[]>();
  for (const v of items) {
    const k = dayOf(v.createdAt);
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(v);
  }
  return [...groups].map(([key, data]) => {
    const [y, m, d] = key.split("-").map(Number);
    const title =
      key === ymd(today)
        ? t("vocab.today")
        : key === ymd(yesterday)
          ? t("vocab.yesterday")
          : new Date(y, m - 1, d).toLocaleDateString(lang, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    return { key, title, data };
  });
}

/** Mức nhớ → nhãn + màu */
function stageMeta(stage: number, t: TFn) {
  if (stage === 0) return { label: t("review.stage.new"), color: C.muted };
  if (stage <= 2) return { label: t("review.stage.learning"), color: C.redText };
  if (stage <= 4) return { label: t("review.stage.good"), color: C.amber };
  return { label: t("review.stage.mastered"), color: C.accent };
}

const say = (text: string, slow?: boolean) => speakGerman(text, { slow }).catch(() => {});

// ---- Thành phần giao diện ----

const BLUE = C.phrase;
type Tone = "idle" | "sel" | "right" | "wrong" | "dim";
const TONES: Record<Tone, { border: string; bg: string; fg: string }> = {
  idle: { border: C.border, bg: C.card2, fg: C.text },
  sel: { border: BLUE, bg: "rgba(56,189,248,0.15)", fg: BLUE },
  right: { border: C.accent, bg: "rgba(22,163,74,0.18)", fg: "#4ade80" },
  wrong: { border: C.red, bg: "rgba(220,38,38,0.15)", fg: C.redText },
  dim: { border: C.border, bg: C.card2, fg: C.muted },
};

/** Ô / nút kiểu "nổi" có viền dưới dày (giống bài học Duolingo) */
function Tile({
  tone = "idle",
  onPress,
  disabled,
  children,
  style,
}: {
  tone?: Tone;
  onPress?: () => void;
  disabled?: boolean;
  children: ReactNode;
  style?: ViewStyle;
}) {
  const c = TONES[tone];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          borderWidth: 2,
          borderBottomWidth: pressed ? 2 : 4,
          borderRadius: 16,
          borderColor: c.border,
          backgroundColor: c.bg,
          opacity: tone === "dim" ? 0.45 : 1,
          transform: [{ translateY: pressed ? 2 : 0 }],
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

const tileText = (tone: Tone, size = 18) => ({ color: TONES[tone].fg, fontSize: size, fontWeight: "700" as const });

/** Câu ví dụ: che từ (khi hỏi), điền từ đang chọn, hoặc tô đậm */
function Context({ text, word, blank, fill, size = 15, color = C.muted }: { text: string; word: string; blank?: boolean; fill?: string | null; size?: number; color?: string }) {
  const i = text.toLowerCase().indexOf(word.toLowerCase());
  const base = { color, fontSize: size, lineHeight: size * 1.6 };
  if (i === -1) return <Text style={base}>{text}</Text>;
  return (
    <Text style={base}>
      {text.slice(0, i)}
      {blank ? (
        <Text style={{ color: fill ? BLUE : C.muted, fontWeight: "800", textDecorationLine: "underline" }}>
          {fill ? ` ${fill} ` : " " + "_".repeat(Math.min(Math.max(word.length, 5), 12)) + " "}
        </Text>
      ) : (
        <Text style={{ color: C.amber, fontWeight: "700" }}>{text.slice(i, i + word.length)}</Text>
      )}
      {text.slice(i + word.length)}
    </Text>
  );
}

function SpeakButton({ text, big }: { text: string; big?: boolean }) {
  const { t } = useI18n();
  if (big)
    return (
      <Tile onPress={() => say(text)} style={{ width: 56, height: 56 }}>
        <SymbolView name="speaker.wave.2.fill" size={26} tintColor={BLUE} />
      </Tile>
    );
  return (
    <Pressable onPress={() => say(text)} hitSlop={10} accessibilityLabel={t("vocab.listen")}>
      <SymbolView name="speaker.wave.2.fill" size={20} tintColor={BLUE} />
    </Pressable>
  );
}

/** Nút loa to + nút nghe chậm (dạng nghe) */
function ListenButtons({ word }: { word: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 14 }}>
      <Pressable
        onPress={() => say(word)}
        style={({ pressed }) => ({
          width: 104,
          height: 104,
          borderRadius: 24,
          backgroundColor: BLUE,
          borderBottomWidth: pressed ? 2 : 6,
          borderColor: "#0369a1",
          alignItems: "center",
          justifyContent: "center",
          transform: [{ translateY: pressed ? 3 : 0 }],
        })}
      >
        <SymbolView name="speaker.wave.3.fill" size={48} tintColor="#fff" />
      </Pressable>
      <Tile onPress={() => say(word, true)} style={{ width: 60, height: 60 }}>
        <SymbolView name="tortoise.fill" size={26} tintColor={BLUE} />
      </Tile>
    </View>
  );
}

const Big = ({ children, color = C.text }: { children: ReactNode; color?: string }) => (
  <Text style={{ color, fontSize: 32, fontWeight: "800", textAlign: "center" }}>{children}</Text>
);

type Feedback = { ok: boolean; note?: string; combo: number };
type Graded = { item: Word; correct: boolean; stage?: number };
type Streak = { day: string; count: number };

const STREAK_KEY = "vocab-streak";
const SOUND_KEY = "review-sound";

const PROMPT_KEY: Record<Kind, Parameters<TFn>[0]> = {
  intro: "review.k.intro",
  "choose-meaning": "review.k.chooseMeaning",
  "listen-choose": "review.k.listenChoose",
  "choose-word": "review.k.chooseWord",
  "cloze-bank": "review.k.clozeBank",
  tiles: "review.k.tiles",
  type: "review.k.type",
  "cloze-type": "review.k.clozeType",
  "listen-type": "review.k.listenType",
  match: "review.k.match",
  flash: "review.k.flash",
};

/**
 * Buổi ôn kiểu bài học Duolingo, theo lịch lặp lại ngắt quãng (logic dùng chung với web: @shared/review):
 * - Từ mới: làm quen → chọn nghĩa → nhận diện lần 2 (nghe / điền câu) → tự xếp chữ / viết ra.
 * - Từ đã học: dạng bài khó dần theo mức nhớ; xen bài ghép cặp các từ vừa gặp.
 * - Lần hỏi đầu tiên của mỗi từ được chấm vào lịch ôn; từ sai được hỏi lại vài thẻ sau cho tới khi đúng.
 */
function Session({ items, pool, onClose }: { items: Word[]; pool: Word[]; onClose: (changed: boolean) => void }) {
  const { t } = useI18n();
  const okSound = useAudioPlayer(require("@/assets/sounds/correct.wav"));
  const badSound = useAudioPlayer(require("@/assets/sounds/wrong.wav"));
  const [sound, setSound] = useState(true);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [queue, setQueue] = useState(() => {
    const q = buildQueue(items);
    return q.length ? [resolveStep(q[0], pool, true), ...q.slice(1)] : q;
  });
  const [pos, setPos] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  // Câu trả lời đang làm
  const [sel, setSel] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [built, setBuilt] = useState<number[]>([]); // chỉ số các ô chữ đã xếp
  const [hint, setHint] = useState(0); // số chữ cái đầu đã gợi ý
  const [flipped, setFlipped] = useState(false);
  const [matched, setMatched] = useState<number[]>([]);
  const [pick, setPick] = useState<{ side: "l" | "r"; id: number } | null>(null);
  const [badPair, setBadPair] = useState<string[]>([]); // ["l<id>", "r<id>"] vừa ghép sai
  // Kết quả buổi ôn
  const [graded, setGraded] = useState<Graded[]>([]);
  const [practice, setPractice] = useState(false); // luyện thêm từ sai: không chấm lại vào lịch ôn
  const [changed, setChanged] = useState(false); // đã chấm vào lịch ôn → quay lại thì tải lại sổ từ
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [xp, setXp] = useState(0);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [finishedAt, setFinishedAt] = useState<number | null>(null);

  const step = queue[pos] as Step | undefined;
  const done = !step;
  const kind = step?.kind;
  const v = step?.item as Word;
  const typing = kind === "type" || kind === "cloze-type" || kind === "listen-type";
  const choosing = kind === "choose-meaning" || kind === "choose-word" || kind === "listen-choose" || kind === "cloze-bank";
  const right = kind === "choose-meaning" ? v?.meaning.trim() : v?.word.trim();
  const builtWord = built.map((i) => step?.tiles?.[i]).join("");

  useEffect(() => {
    SecureStore.getItemAsync(SOUND_KEY)
      .then((s) => s === "0" && setSound(false))
      .catch(() => {});
    SecureStore.getItemAsync(STREAK_KEY)
      .then((s) => setStreak(s ? JSON.parse(s) : { day: "", count: 0 }))
      .catch(() => setStreak({ day: "", count: 0 }));
    return () => void stopSpeaking();
  }, []);

  // Tự đọc khi tới thẻ làm quen / thẻ nghe
  useEffect(() => {
    if (kind === "listen-choose" || kind === "listen-type") say(v.word);
    else if (kind === "intro" && sound) say(v.word);
  }, [step?.id, kind]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSound = () => {
    setSound(!sound);
    SecureStore.setItemAsync(SOUND_KEY, sound ? "0" : "1").catch(() => {});
  };

  const playSfx = (ok: boolean) => {
    const p = ok ? okSound : badSound;
    p.seekTo(0).catch(() => {});
    p.play();
  };

  const answer = (ok: boolean, note?: string) => {
    const s = step!;
    const nextCombo = ok ? combo + 1 : 0;
    setFeedback({ ok, note, combo: nextCombo });
    setCombo(nextCombo);
    setBestCombo((b) => Math.max(b, nextCombo));
    if (ok) setXp((x) => x + (s.role === "graded" || s.role === "match" ? 10 : 5));
    if (sound) {
      playSfx(ok);
      if (kind !== "match") setTimeout(() => say(v.word), 450);
    }
    if (s.role === "graded") {
      const entry: Graded = { item: v, correct: ok };
      setGraded((g) => [...g, entry]);
      if (!practice) {
        setChanged(true);
        api<{ stage: number; dueAt: number }>(`/vocab/${v.id}/review`, { method: "POST", body: { correct: ok } })
          .then((res) => setGraded((g) => g.map((x) => (x === entry ? { ...x, stage: res.stage } : x))))
          .catch(() => {});
      }
    }
    if (kind === "match") return;
    let q = queue;
    if (!ok) q = insertLater(q, pos, 3, newStep({ role: "retry", item: v }));
    else if (s.role === "graded" && v.stage <= 2 && !isPhrase(v) && kind !== "tiles" && !typing) {
      // Từ còn non mà mới đúng ở dạng nhận diện → thêm lượt nhận diện khác (từ mới) và lượt tự viết ra
      if (v.stage === 0) q = insertLater(q, pos, 2, newStep({ role: "practice", item: v }));
      q = insertLater(q, pos, 5, newStep({ role: "reinforce", item: v }));
    }
    setQueue(q);
  };

  const check = () => {
    if (!step || feedback) return;
    if (choosing && sel) return answer(sel === right);
    if (kind === "tiles" && built.length) {
      const exact = builtWord === v.word.trim();
      return answer(exact || builtWord.toLowerCase() === v.word.trim().toLowerCase(), exact ? undefined : t("review.spelling", { w: v.word }));
    }
    if (typing && typed.trim()) {
      const c = checkTyped(typed, v.word);
      const note = c === "almost" ? t("review.almost", { w: v.word }) : c === "ok" ? t("review.spelling", { w: v.word }) : undefined;
      return answer(c !== "wrong", note);
    }
  };

  const reset = () => {
    setFeedback(null);
    setSel(null);
    setTyped("");
    setBuilt([]);
    setHint(0);
    setFlipped(false);
    setMatched([]);
    setPick(null);
    setBadPair([]);
  };

  const next = () => {
    const n = pos + 1;
    if (queue[n]) setQueue((q) => q.map((s, i) => (i === n ? resolveStep(s, pool, true) : s)));
    else {
      // eslint-disable-next-line react-hooks/purity -- chỉ chạy khi bấm nút, không phải lúc render
      setFinishedAt(Date.now());
      // Chuỗi ngày ôn liên tiếp (lưu trên máy)
      if (!practice && graded.length && streak) {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        if (streak.day !== ymd(today)) {
          const s = { day: ymd(today), count: streak.day === ymd(yesterday) ? streak.count + 1 : 1 };
          setStreak(s);
          SecureStore.setItemAsync(STREAK_KEY, JSON.stringify(s)).catch(() => {});
        }
      }
    }
    setPos(n);
    reset();
  };

  const restart = (list: Word[]) => {
    const q = buildQueue(list);
    setQueue(q.length ? [resolveStep(q[0], pool, true), ...q.slice(1)] : q);
    setPos(0);
    reset();
    setGraded([]);
    setPractice(true);
    setCombo(0);
    setBestCombo(0);
    setXp(0);
    setStartedAt(Date.now());
    setFinishedAt(null);
  };

  // Ghép cặp: chọn 1 ô mỗi bên; đúng thì cả 2 mờ đi, sai thì nháy đỏ
  const tapPair = (side: "l" | "r", id: number) => {
    if (feedback || matched.includes(id)) return;
    if (!pick || pick.side === side) return setPick({ side, id });
    setPick(null);
    if (pick.id === id) {
      const m = [...matched, id];
      setMatched(m);
      if (sound) say(step!.pairs!.find((p) => p.id === id)!.word);
      if (m.length === step!.pairs!.length) answer(true, t("review.matchedAll"));
    } else {
      setBadPair([pick.side + pick.id, side + id]);
      if (sound) playSfx(false);
      setTimeout(() => setBadPair([]), 450);
    }
  };

  const canCheck = (choosing && !!sel) || (kind === "tiles" && built.length > 0) || (typing && !!typed.trim());
  const firstTry = graded.filter((g) => g.correct).length;
  const wrong = graded.filter((g) => !g.correct);
  const seconds = finishedAt ? Math.round((finishedAt - startedAt) / 1000) : 0;

  // ---- Đề bài theo từng dạng ----
  const renderExercise = () => {
    if (!step || !kind) return null;
    const meaningBig = <Big color={C.amber}>{v.meaning}</Big>;
    const clozeBox = (fill?: string | null) => (
      <View style={{ borderWidth: 2, borderColor: C.border, borderRadius: 18, padding: 16, gap: 8 }}>
        <Context text={v.context} word={v.word} blank={!feedback} fill={fill} size={19} color={C.text} />
        {!!v.meaning && <Text style={{ color: C.amber, fontSize: 14 }}>{t("review.meaning", { m: v.meaning })}</Text>}
      </View>
    );
    switch (kind) {
      case "intro":
        return (
          <View style={{ alignItems: "center", gap: 18 }}>
            <Text style={{ color: C.amber, fontWeight: "800", fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}>{t("review.newWord")}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <SpeakButton text={v.word} big />
              <View style={{ flexShrink: 1 }}>
                <Big>{v.word}</Big>
              </View>
            </View>
            <Text style={{ color: v.meaning ? C.amber : C.muted, fontSize: 22, fontWeight: "700", textAlign: "center", fontStyle: v.meaning ? "normal" : "italic" }}>
              {v.meaning || t("vocab.noMeaning")}
            </Text>
            {!!v.context && (
              <View style={{ flexDirection: "row", gap: 8, borderWidth: 2, borderColor: C.border, borderRadius: 18, padding: 14, alignSelf: "stretch" }}>
                <View style={{ flex: 1 }}>
                  <Context text={v.context} word={v.word} size={16} color={C.text} />
                </View>
                <SpeakButton text={v.context} />
              </View>
            )}
          </View>
        );
      case "choose-meaning":
      case "listen-choose":
      case "choose-word":
      case "cloze-bank":
        return (
          <View style={{ gap: 22 }}>
            {kind === "choose-meaning" && (
              <View style={{ alignItems: "center", gap: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <SpeakButton text={v.word} big />
                  <View style={{ flexShrink: 1 }}>
                    <Big>{v.word}</Big>
                  </View>
                </View>
                {!!v.context && <Context text={v.context} word={v.word} />}
              </View>
            )}
            {kind === "listen-choose" && <ListenButtons word={v.word} />}
            {kind === "choose-word" && meaningBig}
            {kind === "cloze-bank" && clozeBox(sel)}
            <View style={{ gap: 10 }}>
              {step.options?.map((opt) => {
                const tone: Tone = !feedback ? (sel === opt ? "sel" : "idle") : opt === right ? "right" : sel === opt ? "wrong" : "dim";
                return (
                  <Tile
                    key={opt}
                    tone={tone}
                    disabled={!!feedback}
                    onPress={() => {
                      setSel(opt);
                      // Chọn từ tiếng Đức thì đọc lên cho quen tai (dạng nghe thì không, kẻo lộ đáp án)
                      if (sound && kind !== "choose-meaning" && kind !== "listen-choose") say(opt);
                    }}
                    style={{ paddingVertical: 15, paddingHorizontal: 16 }}
                  >
                    <Text style={[tileText(tone, 18), { textAlign: "center" }]}>{opt}</Text>
                  </Tile>
                );
              })}
            </View>
          </View>
        );
      case "tiles": {
        const lineTone: Tone = feedback ? (feedback.ok ? "right" : "wrong") : "idle";
        return (
          <View style={{ gap: 22 }}>
            {v.meaning ? meaningBig : canCloze(v) ? clozeBox() : <ListenButtons word={v.word} />}
            {/* Hàng chữ đã xếp */}
            <View
              style={{
                minHeight: 70,
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "center",
                alignItems: "center",
                gap: 6,
                paddingBottom: 10,
                borderBottomWidth: 2,
                borderColor: feedback ? TONES[lineTone].border : C.border,
              }}
            >
              {built.map((i) => (
                <Tile key={i} tone={lineTone} disabled={!!feedback} onPress={() => setBuilt((b) => b.filter((x) => x !== i))} style={{ minWidth: 44, height: 52, paddingHorizontal: 10 }}>
                  <Text style={tileText(lineTone, 24)}>{step.tiles![i]}</Text>
                </Tile>
              ))}
              {!built.length && <Text style={styles.muted}>{t("review.tilesHint")}</Text>}
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
              {step.tiles!.map((c, i) =>
                built.includes(i) ? (
                  <View key={i} style={{ minWidth: 44, height: 52, borderRadius: 16, backgroundColor: C.card2 }} />
                ) : (
                  <Tile key={i} disabled={!!feedback} onPress={() => setBuilt((b) => [...b, i])} style={{ minWidth: 44, height: 52, paddingHorizontal: 10 }}>
                    <Text style={tileText("idle", 24)}>{c}</Text>
                  </Tile>
                ),
              )}
              {!feedback && built.length > 0 && (
                <Pressable onPress={() => setBuilt((b) => b.slice(0, -1))} hitSlop={8} style={{ width: 44, height: 52, alignItems: "center", justifyContent: "center" }}>
                  <SymbolView name="delete.left" size={24} tintColor={C.muted} />
                </Pressable>
              )}
            </View>
          </View>
        );
      }
      case "type":
      case "cloze-type":
      case "listen-type":
        return (
          <View style={{ gap: 18 }}>
            {kind === "type" && meaningBig}
            {kind === "cloze-type" && clozeBox()}
            {kind === "listen-type" && <ListenButtons word={v.word} />}
            <Text style={{ color: C.muted, fontSize: 18, letterSpacing: 5, textAlign: "center", fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }) }}>
              {v.word.slice(0, hint)}
              {"_".repeat(Math.max(0, v.word.length - hint))}
            </Text>
            <TextInput
              value={typed}
              onChangeText={setTyped}
              editable={!feedback}
              autoFocus
              placeholder={t("review.typeHere")}
              placeholderTextColor="#5b6b60"
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              returnKeyType="done"
              submitBehavior="submit"
              onSubmitEditing={() => (feedback ? next() : check())}
              style={{
                borderWidth: 2,
                borderRadius: 16,
                borderColor: feedback ? TONES[feedback.ok ? "right" : "wrong"].border : C.border,
                backgroundColor: C.card,
                color: feedback ? TONES[feedback.ok ? "right" : "wrong"].fg : C.text,
                fontSize: 22,
                fontWeight: "700",
                textAlign: "center",
                paddingVertical: 14,
                textDecorationLine: feedback && !feedback.ok ? "line-through" : "none",
              }}
            />
            {!feedback && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
                {["ä", "ö", "ü", "ß"].map((c) => (
                  <Tile key={c} onPress={() => setTyped((s) => s + c)} style={{ width: 46, height: 46 }}>
                    <Text style={tileText("idle", 20)}>{c}</Text>
                  </Tile>
                ))}
                <Tile
                  onPress={() => setHint((h) => Math.min(h + 1, v.word.length - 1))}
                  disabled={hint >= v.word.length - 1}
                  style={{ height: 46, paddingHorizontal: 12, flexDirection: "row", gap: 6 }}
                >
                  <SymbolView name="lightbulb.fill" size={16} tintColor={C.amber} />
                  <Text style={{ color: C.amber, fontWeight: "700" }}>{t("review.hint")}</Text>
                </Tile>
              </View>
            )}
          </View>
        );
      case "match": {
        const pairs = step.pairs!;
        const owner = (m: string) => pairs.find((p) => p.meaning.trim() === m)!.id;
        const tone = (side: "l" | "r", id: number): Tone =>
          matched.includes(id) ? "dim" : badPair.includes(side + id) ? "wrong" : pick?.side === side && pick.id === id ? "sel" : "idle";
        const cell = { minHeight: 64, paddingVertical: 10, paddingHorizontal: 8 };
        return (
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1, gap: 10 }}>
              {pairs.map((p) => (
                <Tile key={p.id} tone={tone("l", p.id)} disabled={matched.includes(p.id)} onPress={() => tapPair("l", p.id)} style={cell}>
                  <Text style={[tileText(tone("l", p.id), 17), { textAlign: "center" }]}>{p.word}</Text>
                </Tile>
              ))}
            </View>
            <View style={{ flex: 1, gap: 10 }}>
              {step.options!.map((m) => {
                const id = owner(m);
                return (
                  <Tile key={m} tone={tone("r", id)} disabled={matched.includes(id)} onPress={() => tapPair("r", id)} style={cell}>
                    <Text style={[tileText(tone("r", id), 15), { textAlign: "center" }]}>{m}</Text>
                  </Tile>
                );
              })}
            </View>
          </View>
        );
      }
      case "flash":
        return (
          <View style={{ alignItems: "center", gap: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <SpeakButton text={v.word} big />
              <View style={{ flexShrink: 1 }}>
                <Big>{v.word}</Big>
              </View>
            </View>
            {flipped || feedback ? (
              <>
                <Text style={{ color: v.meaning ? C.amber : C.muted, fontSize: 22, fontWeight: "700", textAlign: "center" }}>{v.meaning || t("vocab.noMeaning")}</Text>
                {!!v.context && <Context text={v.context} word={v.word} />}
              </>
            ) : (
              <Text style={styles.muted}>{t("review.tapToFlip")}</Text>
            )}
          </View>
        );
    }
  };

  // ---- Thanh dưới: Kiểm tra / kết quả ----
  const renderBottom = () => {
    if (!step) return null;
    if (feedback) {
      const ok = feedback.ok;
      const tone = TONES[ok ? "right" : "wrong"];
      const praise = t("review.praise").split("|");
      return (
        <View style={{ backgroundColor: ok ? "rgba(22,163,74,0.16)" : "rgba(220,38,38,0.14)", borderTopWidth: 2, borderColor: tone.border, padding: 16, gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: C.card, alignItems: "center", justifyContent: "center" }}>
              <SymbolView name={ok ? "checkmark" : "xmark"} size={18} weight="black" tintColor={tone.fg} />
            </View>
            <Text style={{ flex: 1, color: tone.fg, fontSize: 20, fontWeight: "800" }}>
              {ok ? (feedback.note ?? praise[step.id % praise.length]) : t("review.answer")}
            </Text>
          </View>
          {feedback.combo >= 3 && feedback.combo % 3 === 0 && (
            <Text style={{ color: C.amber, fontWeight: "800" }}>🔥 {t("review.combo", { n: feedback.combo })}</Text>
          )}
          {kind !== "match" && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ flex: 1, color: tone.fg, fontSize: 17, fontWeight: "800" }}>
                {v.word}
                {!!v.meaning && <Text style={{ fontWeight: "400" }}> — {v.meaning}</Text>}
              </Text>
              <SpeakButton text={v.word} />
            </View>
          )}
          {!ok && !!v.context && kind !== "choose-meaning" && <Context text={v.context} word={v.word} size={14} />}
          <Button title={t("review.continue")} variant={ok ? "primary" : "red"} onPress={next} />
        </View>
      );
    }
    return (
      <View style={{ borderTopWidth: 2, borderColor: C.border, padding: 16, flexDirection: "row", gap: 12 }}>
        {kind === "intro" ? (
          <Button title={t("review.gotIt")} variant="primary" onPress={next} style={{ flex: 1 }} />
        ) : kind === "flash" ? (
          flipped ? (
            <>
              <Button title={t("review.forgot")} variant="red" onPress={() => answer(false)} style={{ flex: 1 }} />
              <Button title={t("review.known")} variant="primary" onPress={() => answer(true)} style={{ flex: 1 }} />
            </>
          ) : (
            <Button title={t("review.flip")} variant="amber" onPress={() => setFlipped(true)} style={{ flex: 1 }} />
          )
        ) : kind === "match" ? (
          <Button title={t("review.skip")} onPress={() => answer(false)} style={{ flex: 1 }} />
        ) : (
          <>
            <Button title={t("review.dontKnow")} onPress={() => answer(false)} style={{ flex: 1 }} />
            <Button title={t("review.check")} variant="primary" onPress={check} disabled={!canCheck} style={{ flex: 1.4 }} />
          </>
        )}
      </View>
    );
  };

  const progress = queue.length ? Math.min(pos + (feedback ? 1 : 0), queue.length) / queue.length : 1;

  const stats = [
    { label: t("review.xp"), value: `⚡ ${xp}`, color: C.amber },
    { label: t("review.accuracy"), value: graded.length ? `${Math.round((firstTry / graded.length) * 100)}%` : "—", color: C.accent },
    { label: t("review.time"), value: `${Math.floor(seconds / 60)}:${pad(seconds % 60)}`, color: BLUE },
  ];

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView style={{ flex: 1, width: "100%", maxWidth: FORM_MAX, alignSelf: "center" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* Thanh trên: thoát · tiến độ · chuỗi đúng · âm thanh */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 10 }}>
          <Pressable onPress={() => onClose(changed)} hitSlop={12}>
            <SymbolView name="xmark" size={22} weight="bold" tintColor={C.muted} />
          </Pressable>
          <View style={{ flex: 1, height: 16, borderRadius: 8, backgroundColor: C.card2, overflow: "hidden" }}>
            <View style={{ height: "100%", width: `${progress * 100}%`, borderRadius: 8, backgroundColor: C.accent }}>
              <View style={{ position: "absolute", left: 8, right: 8, top: 3, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.3)" }} />
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3, minWidth: 40 }}>
            <SymbolView name="flame.fill" size={18} tintColor={combo >= 3 ? C.amber : C.muted} />
            <Text style={{ color: combo >= 3 ? C.amber : C.muted, fontWeight: "800", fontSize: 16 }}>{combo}</Text>
          </View>
          <Pressable onPress={toggleSound} hitSlop={10}>
            <SymbolView name={sound ? "speaker.wave.2.fill" : "speaker.slash.fill"} size={20} tintColor={sound ? C.text : C.muted} />
          </Pressable>
        </View>

        {!items.length ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 24 }}>
            <Text style={{ fontSize: 52 }}>🎉</Text>
            <Text style={{ color: C.text, fontSize: 20, fontWeight: "800", textAlign: "center" }}>{t("review.noWords")}</Text>
            <Button title={t("review.done")} variant="primary" onPress={() => onClose(false)} style={{ alignSelf: "stretch" }} />
          </View>
        ) : done ? (
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center", gap: 18, padding: 24 }}>
            <Text style={{ fontSize: 64 }}>{wrong.length ? "💪" : "🏆"}</Text>
            <View style={{ alignItems: "center", gap: 4 }}>
              <Text style={{ color: C.amber, fontSize: 28, fontWeight: "800", textAlign: "center" }}>{practice ? t("review.practiceDone") : t("review.finished")}</Text>
              {!practice && !!streak?.count && <Text style={{ color: C.amber, fontWeight: "800" }}>🔥 {t("review.streak", { n: streak.count })}</Text>}
            </View>
            <View style={{ flexDirection: "row", gap: 10, alignSelf: "stretch" }}>
              {stats.map((s) => (
                <View key={s.label} style={{ flex: 1, borderWidth: 2, borderColor: s.color, borderRadius: 16, overflow: "hidden" }}>
                  <Text
                    style={{ backgroundColor: s.color, color: C.background, textAlign: "center", fontSize: 11, fontWeight: "800", paddingVertical: 4, textTransform: "uppercase" }}
                    numberOfLines={1}
                  >
                    {s.label}
                  </Text>
                  <Text style={{ color: s.color, textAlign: "center", fontSize: 20, fontWeight: "800", paddingVertical: 12 }}>{s.value}</Text>
                </View>
              ))}
            </View>
            <Text style={[styles.muted, { textAlign: "center" }]}>{t("review.summary", { ok: firstTry, n: graded.length, best: bestCombo })}</Text>
            {wrong.length > 0 && (
              <View style={{ alignSelf: "stretch", borderWidth: 2, borderColor: C.border, borderRadius: 16, padding: 14, gap: 10 }}>
                <Text style={{ color: C.redText, fontWeight: "800" }}>{t("review.watch")}</Text>
                {wrong.map((g) => (
                  <View key={g.item.id} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ flex: 1, color: C.text }}>
                      <Text style={{ fontWeight: "800" }}>{g.item.word}</Text>
                      <Text style={{ color: C.muted }}> — {g.item.meaning || t("vocab.noMeaning")}</Text>
                    </Text>
                    {g.stage != null && <Text style={{ color: stageMeta(g.stage, t).color, fontSize: 12, fontWeight: "700" }}>{stageMeta(g.stage, t).label}</Text>}
                    <SpeakButton text={g.item.word} />
                  </View>
                ))}
              </View>
            )}
            <View style={{ alignSelf: "stretch", gap: 10 }}>
              <Button title={t("review.continue")} variant="primary" onPress={() => onClose(changed)} />
              {wrong.length > 0 && <Button title={t("review.practiceWrong")} onPress={() => restart(shuffle(wrong.map((g) => ({ ...g.item, stage: g.stage ?? 1 }))))} />}
            </View>
          </ScrollView>
        ) : (
          <>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, padding: 16, gap: 20 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ flex: 1, color: C.text, fontSize: 22, fontWeight: "800" }}>{t(PROMPT_KEY[kind ?? "flash"])}</Text>
                {step.role === "retry" && <Text style={{ color: C.redText, fontSize: 12, fontWeight: "800" }}>{t("review.retry")}</Text>}
                {step.role === "graded" && kind !== "intro" && (
                  <Text style={{ color: stageMeta(v.stage, t).color, fontSize: 12, fontWeight: "700" }}>{stageMeta(v.stage, t).label}</Text>
                )}
              </View>
              <View style={{ flex: 1, justifyContent: "center", paddingBottom: 12 }}>{renderExercise()}</View>
            </ScrollView>
            {renderBottom()}
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Ôn tập từ đã lưu: hôm nay (đến hạn + từ mới), 1 ngày đã lưu, hoặc tất cả */
export default function ReviewScreen() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const { day } = useLocalSearchParams<{ day?: string }>();
  const [data, setData] = useState<{ items: Word[]; at: number } | null>(null);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState<string | null>(day ?? null); // "today" | "all" | "YYYY-MM-DD"
  const { tablet } = useLayout();
  const items = data?.items ?? null;

  const load = useCallback(async () => {
    try {
      setError("");
      const { vocab } = await api<{ vocab: VocabItem[] }>("/vocab");
      setData({ items: vocab.map((v) => ({ ...v, stage: v.stage ?? 0, dueAt: v.dueAt ?? null })), at: Date.now() });
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải dữ liệu lần đầu
    if (user) load();
  }, [user, load]);

  const days = useMemo(() => byDay(items ?? [], t, lang), [items, t, lang]);
  const today = useMemo(() => {
    if (!data) return { due: 0, fresh: 0, list: [] as Word[] };
    const due = data.items.filter((v) => isDue(v, data.at)).sort((a, b) => (a.dueAt ?? 0) - (b.dueAt ?? 0));
    const fresh = data.items.filter((v) => v.stage === 0);
    // Mỗi buổi: tối đa 30 từ đến hạn (quá hạn lâu nhất trước) + 10 từ mới (mới lưu nhất trước)
    return { due: due.length, fresh: fresh.length, list: [...due.slice(0, 30), ...fresh.slice(0, 10)] };
  }, [data]);

  const session =
    picked === "today" ? today.list : picked === "all" ? (items ?? []) : (days.find((d) => d.key === picked)?.data ?? null);

  if (items && session) {
    return (
      <Session
        key={picked}
        items={session}
        pool={items}
        onClose={(changed) => {
          setPicked(null);
          if (changed) load(); // cập nhật mức nhớ / lịch ôn
          if (day) router.back();
        }}
      />
    );
  }

  const mastered = items?.filter((v) => v.stage >= 5).length ?? 0;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: t("review.title"), headerShown: true }} />
      <FlatList
        data={days}
        keyExtractor={(d) => d.key}
        style={{ width: "100%", maxWidth: CONTENT_MAX, alignSelf: "center" }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: tablet ? 24 : 16, gap: 10, paddingBottom: 60 }}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 6 }}>
            <Text style={styles.muted}>{t("review.subtitle")}</Text>
            <ErrorText>{error}</ErrorText>
            {!items && !error && <ActivityIndicator color={C.accent} />}
            {!!items?.length && (
              <>
                <Button
                  title={t("review.today", { n: today.list.length })}
                  variant="primary"
                  icon={<SymbolView name="flame.fill" size={16} tintColor="#fff" />}
                  onPress={() => setPicked("today")}
                />
                <Text style={[styles.muted, { textAlign: "center", fontSize: 13 }]}>
                  {t("review.todayInfo", { due: today.due, fresh: today.fresh })} · {stageMeta(5, t).label} {mastered}
                </Text>
                <Button
                  title={t("review.allCount", { n: items.length })}
                  variant="amber"
                  icon={<SymbolView name="shuffle" size={16} tintColor={C.amber} />}
                  onPress={() => setPicked("all")}
                />
              </>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const empty = item.data.filter((v) => !v.meaning).length;
          const due = data ? item.data.filter((v) => isDue(v, data.at)).length : 0;
          return (
            <Pressable
              onPress={() => setPicked(item.key)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                padding: 14,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: C.border,
                backgroundColor: pressed ? C.card2 : C.card,
              })}
            >
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: C.card2, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: C.amber, fontSize: 18, fontWeight: "800" }}>{item.data.length}</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: C.text, fontSize: 16, fontWeight: "700", textTransform: "capitalize" }} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={{ color: C.muted, fontSize: 13 }} numberOfLines={1}>
                  {item.data
                    .slice(0, 4)
                    .map((v) => v.word)
                    .join(", ")}
                  {item.data.length > 4 ? "…" : ""}
                  {empty ? ` · ${t("vocab.noMeaning")} ${empty}` : ""}
                </Text>
              </View>
              {due > 0 && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                  <SymbolView name="flame.fill" size={13} tintColor={C.amber} />
                  <Text style={{ color: C.amber, fontWeight: "800", fontSize: 13 }}>{due}</Text>
                </View>
              )}
              <SymbolView name="chevron.right" size={14} tintColor={C.muted} />
            </Pressable>
          );
        }}
        ListEmptyComponent={items ? <Text style={[styles.muted, { textAlign: "center", marginTop: 40 }]}>{t("vocab.empty")}</Text> : undefined}
      />
    </View>
  );
}
