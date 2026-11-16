import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
} from "react";
import { Alert, FlatList, Pressable, ScrollView, View } from "react-native";
import { Stack, router, usePreventRemove } from "expo-router";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { Image } from "expo-image";
import { useEventListener } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "expo-router/react-navigation";
import {
  FAIL_TEXT,
  grade,
  isRight,
  type DrivingQ,
  type ExamAnswer,
  type ExamResult,
} from "@shared/laixe/rules";
import { Text, TextInput } from "@/components/Text";
import { styles } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { C, STICKER, alpha } from "@/lib/theme";
import { CONTENT_MAX, useLayout } from "@/lib/layout";
import { quizImage } from "@/lib/quiz/media";
import type { Run, RunMode } from "@/lib/quiz/run";
import {
  getPos,
  recordAnswer,
  saveExam,
  setMarked,
  setPos,
  setPrefs,
  useModule,
  usePrefs,
  type QuizModule,
} from "@/lib/quiz/store";
import { useL } from "@/lib/quiz/strings";

/**
 * Màn làm câu hỏi của tab Lái xe và Leben in Deutschland (như DrivingRunner của web):
 * - lesen: đọc — đáp án đúng đã đánh dấu sẵn
 * - ueben: luyện — lái xe chọn rồi bấm Kiểm tra; LiD (1 đáp án) chọn là chấm luôn
 * - exam: thi thử — có giờ, nộp bài rồi xem lại (chấm theo điểm lỗi)
 * - review: xem lại bài thi đã lưu
 */

const MAX_VIEWS = 5;
type VideoState = { count: number; answering: boolean };
type Cell = "empty" | "answered" | "ok" | "bad" | "ok-old" | "bad-old";

const CHIP_W = 44;

export function QuizRunner({
  module,
  mode,
  run,
}: {
  module: QuizModule;
  mode: RunMode;
  run: Run;
}) {
  const L = useL();
  const { user } = useAuth();
  const { fs: fz, width } = useLayout();
  const { bottom } = useSafeAreaInsets();
  const headerHeight = useHeaderHeight(); // thanh tiêu đề trong suốt (iOS 26) nằm đè lên nội dung
  const { questions, exam, review } = run;
  const single = module === "lid";
  const mod = useModule(module);
  const prefs = usePrefs();
  const marked = useMemo(() => new Set(mod.marked), [mod.marked]);

  const [idx, setIdx] = useState(() => {
    const id = run.resumeKey ? getPos(run.resumeKey) : undefined;
    return Math.max(0, id ? questions.findIndex((x) => x.id === id) : 0);
  });
  const [picked, setPicked] = useState<Record<string, string[]>>(
    review?.picked ?? {},
  );
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<ExamResult | null>(
    review?.result ?? null,
  );
  const [videos, setVideos] = useState<Record<string, VideoState>>({});
  const [showExplain, setShowExplain] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const strip = useRef<FlatList<DrivingQ>>(null);

  const isExam = mode === "exam" || mode === "review";
  const submitted = mode === "review" || (mode === "exam" && !!result);
  const showTr = isExam ? prefs.trExam : prefs.trLearn;
  const q = questions[idx];
  const mine = (q && picked[q.id]) ?? [];
  const reveal =
    mode === "lesen" ||
    submitted ||
    (mode === "ueben" && !!q && !!checked[q.id]);
  const maxErrorPoints = review?.maxErrorPoints ?? exam?.maxErrorPoints ?? 10;
  const answeredCount = questions.filter((x) => picked[x.id]?.length).length;

  useEffect(() => {
    if (run.resumeKey && q) setPos(run.resumeKey, q.id);
  }, [run.resumeKey, q]);

  const go = useCallback(
    (i: number) => {
      const next = Math.max(0, Math.min(questions.length - 1, i));
      setIdx(next);
      setShowExplain(false);
      scroll.current?.scrollTo({ y: 0, animated: false });
    },
    [questions.length],
  );

  useEffect(() => {
    // Đưa ô câu đang làm vào giữa dải (không cuộn quá đầu dải với các câu đầu)
    if (questions.length)
      strip.current?.scrollToOffset({
        offset: Math.max(0, 12 + (CHIP_W + 6) * idx - (width - CHIP_W) / 2),
        animated: true,
      });
  }, [idx, questions.length, width]);

  // Thi thử đang làm: hỏi trước khi thoát
  // expo-router 58: phải gọi repeat() để tiếp tục — dispatch lại action cũ vẫn bị chặn
  const [leaving, setLeaving] = useState(false);
  usePreventRemove(
    mode === "exam" && !submitted && answeredCount > 0 && !leaving,
    ({ repeat }) =>
      Alert.alert(
        L("Thoát bài thi?", "Prüfung abbrechen?"),
        L(
          "Bài đang làm sẽ không được lưu.",
          "Die Antworten werden nicht gespeichert.",
        ),
        [
          { text: L("Làm tiếp", "Weitermachen"), style: "cancel" },
          {
            text: L("Thoát", "Abbrechen"),
            style: "destructive",
            onPress: () => {
              setLeaving(true);
              repeat();
            },
          },
        ],
      ),
  );

  const check = (answer = mine) => {
    if (!q || !answer.length) return;
    const ok = isRight(q, answer);
    setChecked((c) => ({ ...c, [q.id]: true }));
    recordAnswer(module, q.id, ok, user);
    if (module === "lid" && prefs.autoMark && marked.has(q.id) === ok)
      setMarked(module, q.id, !ok, user);
  };

  const toggle = (key: string) => {
    if (reveal || !q) return;
    if (single) {
      setPicked((p) => ({ ...p, [q.id]: [key] }));
      if (mode === "ueben") check([key]);
      return;
    }
    setPicked((p) => {
      const cur = p[q.id] ?? [];
      return {
        ...p,
        [q.id]: cur.includes(key)
          ? cur.filter((k) => k !== key)
          : [...cur, key],
      };
    });
  };

  const retry = () => {
    if (!q) return;
    const drop = <T,>(o: Record<string, T>) =>
      Object.fromEntries(Object.entries(o).filter(([k]) => k !== q.id));
    setChecked(drop);
    setPicked(drop);
    setShowExplain(false);
  };

  const submit = useCallback(() => {
    if (!exam || result) return;
    const r = grade(questions, picked, exam.maxErrorPoints);
    setResult(r);
    go(0);
    const answers: ExamAnswer[] = questions.map((x) => ({
      qid: x.id,
      picked: picked[x.id] ?? [],
      order: x.order,
    }));
    const results = questions
      .filter((x) => picked[x.id]?.length)
      .map((x) => ({ qid: x.id, ok: isRight(x, picked[x.id]) }));
    if (module === "lid" && prefs.autoMark)
      for (const { qid, ok } of results)
        if (marked.has(qid) === ok) setMarked(module, qid, !ok, user);
    saveExam(
      module,
      {
        kind: exam.kind,
        ref: exam.ref,
        cls: exam.cls,
        maxErrorPoints: exam.maxErrorPoints,
        durationS: (Date.now() - startedAt) / 1000,
        answers,
        result: r,
        results,
      },
      user,
    );
  }, [
    exam,
    result,
    questions,
    picked,
    go,
    module,
    prefs.autoMark,
    marked,
    user,
    startedAt,
  ]);

  const askSubmit = () => {
    const left = questions.length - answeredCount;
    Alert.alert(
      L("Nộp bài?", "Abgeben?"),
      left
        ? L(
            `Còn ${left} câu chưa làm (tính là sai).`,
            `Noch ${left} Fragen offen (zählen als falsch).`,
          )
        : L("Xem kết quả ngay.", "Ergebnis sofort ansehen."),
      [
        { text: L("Làm tiếp", "Weitermachen"), style: "cancel" },
        {
          text: L("Nộp bài", "Abgeben"),
          style: "destructive",
          onPress: submit,
        },
      ],
    );
  };

  // Video: tối đa 5 lượt xem; xem ít nhất 1 lượt mới được trả lời; sang bước trả lời thì không xem lại (như thi thật)
  const gated =
    !!q?.video &&
    (mode === "lesen" || mode === "ueben" || (mode === "exam" && !submitted));
  const vstate = (q && videos[q.id]) || { count: 0, answering: false };
  const videoStep = gated && !vstate.answering && !checked[q.id];
  const setVideo = (patch: Partial<VideoState>) =>
    q && setVideos((v) => ({ ...v, [q.id]: { ...vstate, ...patch } }));

  const display = useMemo(
    () => (q ? q.order.map((i) => q.options[i]).filter(Boolean) : []),
    [q],
  );

  const status = (x: DrivingQ): Cell => {
    if (mode === "exam" && !submitted)
      return picked[x.id]?.length ? "answered" : "empty";
    if (submitted) return isRight(x, picked[x.id]) ? "ok" : "bad";
    if (mode === "ueben" && checked[x.id])
      return isRight(x, picked[x.id]) ? "ok" : "bad";
    const s = mod.stats[x.id];
    return s ? (s.lastOk ? "ok-old" : "bad-old") : "empty";
  };

  const header = (
    <Stack.Screen
      options={{
        title: run.title,
        headerRight: () => (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            {mode === "exam" && !submitted && exam && (
              <Timer
                minutes={exam.minutes}
                startedAt={startedAt}
                onEnd={submit}
              />
            )}
            <HeaderIcon
              icon={showTr ? "character.bubble.fill" : "character.bubble"}
              label={
                showTr
                  ? L("Ẩn bản dịch", "Übersetzung ausblenden")
                  : L("Hiện bản dịch", "Übersetzung einblenden")
              }
              onPress={() =>
                setPrefs(isExam ? { trExam: !showTr } : { trLearn: !showTr })
              }
            />
            {q && (
              <HeaderIcon
                icon={marked.has(q.id) ? "star.fill" : "star"}
                tint={marked.has(q.id) ? C.gold : undefined}
                label={
                  marked.has(q.id)
                    ? L("Bỏ đánh dấu", "Markierung entfernen")
                    : L("Đánh dấu câu này", "Frage markieren")
                }
                onPress={() => setMarked(module, q.id, !marked.has(q.id), user)}
              />
            )}
          </View>
        ),
      }}
    />
  );

  if (!q) {
    return (
      <View
        style={[
          styles.screen,
          {
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            gap: 12,
          },
        ]}
      >
        {header}
        <Text style={{ fontSize: 40 }}>🎉</Text>
        <Text
          style={{
            color: C.text,
            fontSize: 17,
            fontWeight: "800",
            textAlign: "center",
          }}
        >
          {L("Không có câu nào ở đây.", "Hier gibt es keine Fragen.")}
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [chipBtn(), { opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={{ color: C.text, fontWeight: "800" }}>
            {L("Quay lại", "Zurück")}
          </Text>
        </Pressable>
      </View>
    );
  }

  const right = isRight(q, mine);

  return (
    <View style={[styles.screen, { paddingTop: headerHeight }]}>
      {header}

      {/* Dải số câu */}
      <FlatList
        ref={strip}
        data={questions}
        horizontal
        keyExtractor={(x) => x.id}
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_, i) => ({
          length: CHIP_W + 6,
          offset: 12 + (CHIP_W + 6) * i,
          index: i,
        })}
        initialScrollIndex={idx > 3 ? idx : undefined}
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingVertical: 10,
          gap: 6,
        }}
        style={{
          flexGrow: 0,
          borderBottomWidth: 1,
          borderBottomColor: C.border,
          backgroundColor: C.bar,
        }}
        renderItem={({ item, index }) => (
          <NumChip
            n={index + 1}
            state={status(item)}
            current={index === idx}
            marked={marked.has(item.id)}
            video={!!item.video}
            onPress={() => go(index)}
          />
        )}
      />

      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{
          padding: 16,
          gap: 14,
          width: "100%",
          maxWidth: CONTENT_MAX,
          alignSelf: "center",
        }}
      >
        {result && (
          <ResultCard
            module={module}
            result={result}
            maxErrorPoints={maxErrorPoints}
          />
        )}

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Text
            style={{
              color: C.muted,
              fontWeight: "800",
              fontVariant: ["tabular-nums"],
            }}
          >
            {L("Câu", "Frage")} {idx + 1}/{questions.length}
          </Text>
          <Pill text={module === "lid" ? q.chapter : q.id} />
          {module === "fuehrerschein" && (
            <Pill
              text={`${q.points} ${L("điểm", "Punkte")}`}
              strong={q.points === 5}
            />
          )}
          {isExam && !q.grund && module === "fuehrerschein" && (
            <Pill text={`Zusatzstoff ${exam?.cls ?? review?.exam.cls ?? ""}`} />
          )}
        </View>

        <View style={{ gap: 6 }}>
          <Text
            style={{
              color: C.text,
              fontSize: fz(19),
              lineHeight: fz(26),
              fontWeight: "800",
            }}
          >
            {videoStep
              ? "Bitte starten Sie den Film, um sich mit der Situation vertraut zu machen."
              : q.q}
          </Text>
          {showTr && !videoStep && !!q.tr?.q && (
            <Translation text={q.tr.q} />
          )}
        </View>

        {videoStep ? (
          <VideoGate
            key={q.id}
            src={q.video!}
            poster={q.poster}
            count={vstate.count}
            onView={() => setVideo({ count: vstate.count + 1 })}
            onAnswer={() => setVideo({ answering: true })}
          />
        ) : (
          <>
            <Media q={q} gated={gated} />
            {!!q.stem && (
              <Text
                style={{ color: C.muted, fontWeight: "800", fontSize: fz(15) }}
              >
                {q.stem}
              </Text>
            )}
            {!single && q.options.length > 0 && !reveal && (
              <Text style={{ color: C.muted, fontSize: 13 }}>
                {L(
                  "Có thể có nhiều đáp án đúng",
                  "Mehrere Antworten können richtig sein",
                )}
              </Text>
            )}
            {q.options.length ? (
              <View style={{ gap: 8 }}>
                {display.map((o, n) => {
                  const orig = q.options.indexOf(o);
                  return (
                    <OptionRow
                      key={o.key}
                      n={n}
                      text={o.text}
                      tr={showTr ? q.tr?.o[orig] : undefined}
                      image={q.optionImages ? q.images[orig] : undefined}
                      single={single}
                      on={mine.includes(o.key)}
                      correct={q.answer.includes(o.key)}
                      mode={mode}
                      reveal={reveal}
                      onPress={() => toggle(o.key)}
                    />
                  );
                })}
              </View>
            ) : (
              <NumberAnswer
                value={mode === "lesen" ? q.answer[0] : (mine[0] ?? "")}
                hint={q.num ?? null}
                disabled={reveal}
                onChange={(v) =>
                  setPicked((p) => ({ ...p, [q.id]: v ? [v] : [] }))
                }
                onSubmit={() => mode === "ueben" && check()}
                correct={reveal && mode !== "lesen" ? q.answer[0] : null}
              />
            )}
          </>
        )}

        {reveal && mode !== "lesen" && (
          <View
            accessibilityRole="alert"
            style={{
              borderRadius: 16,
              borderWidth: 2,
              borderColor: right ? C.accent : C.red,
              backgroundColor: alpha(right ? C.accent : C.red, 0.12),
              padding: 12,
            }}
          >
            <Text style={{ color: C.text, fontWeight: "800", fontSize: 16 }}>
              {right
                ? L("✓ Đúng rồi!", "✓ Richtig!")
                : `${mine.length ? L("✗ Chưa đúng", "✗ Leider falsch") : L("Chưa trả lời", "Nicht beantwortet")}${module === "fuehrerschein" ? ` · ${q.points} ${L("điểm lỗi", "Fehlerpunkte")}` : ""}`}
            </Text>
          </View>
        )}

        {(reveal || mode === "ueben") && !videoStep && !!q.explain && (
          <View style={{ gap: 8 }}>
            <Pressable
              onPress={() => setShowExplain(!showExplain)}
              accessibilityState={{ expanded: showExplain }}
              style={({ pressed }) => [
                chipBtn(),
                { alignSelf: "flex-start", opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <SymbolView name="lightbulb" size={15} tintColor={C.amber} />
              <Text style={{ color: C.text, fontWeight: "800" }}>
                {showExplain
                  ? L("Ẩn giải thích", "Erklärung ausblenden")
                  : L("Giải thích", "Erklärung")}
              </Text>
            </Pressable>
            {showExplain && (
              <View
                style={{
                  borderRadius: 16,
                  borderWidth: 2,
                  borderColor: alpha(C.gold, 0.7),
                  backgroundColor: alpha(C.gold, 0.12),
                  padding: 12,
                  gap: 8,
                }}
              >
                <Text style={{ color: C.text, fontSize: 15, lineHeight: 21 }}>
                  {q.explain}
                </Text>
                {showTr && !!q.tr?.c && <Translation text={q.tr.c} />}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Thanh dưới: trước · kiểm tra / làm lại / nộp bài · sau */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingHorizontal: 12,
          paddingTop: 10,
          paddingBottom: Math.max(bottom, 10),
          borderTopWidth: 1,
          borderTopColor: C.border,
          backgroundColor: C.bar,
        }}
      >
        <NavBtn
          icon="chevron.left"
          label={L("Câu trước", "Zurück")}
          disabled={idx === 0}
          onPress={() => go(idx - 1)}
        />
        <View style={{ flex: 1, alignItems: "center" }}>
          {mode === "ueben" && !reveal && !videoStep && !single && (
            <BarBtn
              title={L("Kiểm tra", "Prüfen")}
              bg={C.gold}
              fg="#000"
              disabled={!mine.length}
              onPress={() => check()}
            />
          )}
          {mode === "ueben" && reveal && (
            <BarBtn
              title={L("Làm lại", "Nochmal")}
              bg={C.card}
              fg={C.text}
              onPress={retry}
            />
          )}
          {mode === "exam" && !submitted && (
            <BarBtn
              title={`${L("Nộp bài", "Abgeben")} · ${answeredCount}/${questions.length}`}
              bg={C.red}
              fg="#fff"
              onPress={askSubmit}
            />
          )}
        </View>
        <NavBtn
          icon="chevron.right"
          label={L("Câu sau", "Weiter")}
          disabled={idx === questions.length - 1}
          onPress={() => go(idx + 1)}
          primary={reveal || mode === "exam"}
        />
      </View>
    </View>
  );
}

const chipBtn = () => ({
  flexDirection: "row" as const,
  alignItems: "center" as const,
  gap: 6,
  paddingHorizontal: 14,
  height: 40,
  borderRadius: 12,
  borderWidth: 2,
  borderColor: C.ink,
  backgroundColor: C.card,
});

function HeaderIcon({
  icon,
  label,
  onPress,
  tint,
}: {
  icon: SFSymbol;
  label: string;
  onPress: () => void;
  tint?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <SymbolView name={icon} size={22} tintColor={tint ?? C.link} />
    </Pressable>
  );
}

function Pill({ text, strong }: { text: string; strong?: boolean }) {
  return (
    <View
      style={{
        borderRadius: 99,
        borderWidth: 1.5,
        borderColor: strong ? C.red : alpha(C.inkLine, 0.35),
        backgroundColor: strong ? C.red : "transparent",
        paddingHorizontal: 8,
        paddingVertical: 1,
      }}
    >
      <Text
        style={{
          color: strong ? "#fff" : C.muted,
          fontSize: 12,
          fontWeight: "800",
          fontVariant: ["tabular-nums"],
        }}
      >
        {text}
      </Text>
    </View>
  );
}

function Translation({ text }: { text: string }) {
  return (
    <Text
      style={{
        color: C.accentText,
        fontStyle: "italic",
        fontSize: 15,
        lineHeight: 21,
        borderLeftWidth: 3,
        borderLeftColor: alpha(C.accent, 0.6),
        paddingLeft: 8,
      }}
    >
      {text}
    </Text>
  );
}

const CELL_TONE = (): Record<Cell, { bg: string; fg: string }> => ({
  ok: { bg: C.accent, fg: "#fff" },
  bad: { bg: C.red, fg: "#fff" },
  "ok-old": { bg: alpha(C.accent, 0.22), fg: C.text },
  "bad-old": { bg: alpha(C.red, 0.22), fg: C.text },
  answered: { bg: alpha(C.gold, 0.55), fg: C.text },
  empty: { bg: C.card, fg: C.muted },
});

function NumChip({
  n,
  state,
  current,
  marked,
  video,
  onPress,
}: {
  n: number;
  state: Cell;
  current: boolean;
  marked: boolean;
  video: boolean;
  onPress: () => void;
}) {
  const tone = CELL_TONE()[state];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Câu ${n}${marked ? " ⭐" : ""}`}
      accessibilityState={{ selected: current }}
      style={{
        width: CHIP_W,
        height: 36,
        borderRadius: 10,
        borderWidth: current ? 2.5 : 1.5,
        borderColor: current ? C.ink : alpha(C.inkLine, 0.3),
        backgroundColor: tone.bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: tone.fg,
          fontWeight: "800",
          fontSize: 14,
          fontVariant: ["tabular-nums"],
        }}
      >
        {n}
      </Text>
      {video && (
        <View
          style={{
            position: "absolute",
            top: 3,
            left: 3,
            width: 0,
            height: 0,
            borderTopWidth: 4,
            borderBottomWidth: 4,
            borderLeftWidth: 6,
            borderTopColor: "transparent",
            borderBottomColor: "transparent",
            borderLeftColor: tone.fg,
          }}
        />
      )}
      {marked && (
        <View style={{ position: "absolute", top: -5, right: -5 }}>
          <SymbolView name="star.fill" size={12} tintColor={C.gold} />
        </View>
      )}
    </Pressable>
  );
}

function OptionRow({
  n,
  text,
  tr,
  image,
  single,
  on,
  correct,
  mode,
  reveal,
  onPress,
}: {
  n: number;
  text: string;
  tr?: string;
  image?: string;
  single: boolean;
  on: boolean;
  correct: boolean;
  mode: RunMode;
  reveal: boolean;
  onPress: () => void;
}) {
  const { fs: fz } = useLayout();
  // Đọc: tích sẵn đáp án đúng · Luyện/Thi sau khi chấm: tô đúng/sai
  const ticked = mode === "lesen" ? correct : on;
  const judged = reveal && mode !== "lesen";
  const border = !reveal
    ? on
      ? C.ink
      : alpha(C.inkLine, 0.3)
    : correct
      ? C.accent
      : on
        ? C.red
        : alpha(C.inkLine, 0.2);
  const bg = !reveal
    ? on
      ? alpha(C.gold, 0.3)
      : C.card
    : correct
      ? alpha(C.accent, 0.1)
      : on
        ? alpha(C.red, 0.1)
        : C.card;
  const boxBg = ticked
    ? reveal && correct
      ? C.accent
      : reveal
        ? C.red
        : C.text
    : C.card;
  return (
    <Pressable
      onPress={onPress}
      disabled={reveal}
      accessibilityRole={single ? "radio" : "checkbox"}
      accessibilityState={{ checked: ticked, disabled: reveal }}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 12,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: border,
        backgroundColor: bg,
        overflow: "hidden",
        opacity: pressed ? 0.85 : 1,
      })}
    >
      {judged && on !== correct && (
        <View
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 5,
            backgroundColor: C.red,
          }}
        />
      )}
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: single ? 17 : 9,
          borderWidth: 2,
          borderColor: ticked && reveal ? boxBg : C.ink,
          backgroundColor: boxBg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {ticked ? (
          <SymbolView
            name="checkmark"
            size={16}
            weight="heavy"
            tintColor={reveal || !ticked ? "#fff" : C.background}
          />
        ) : (
          <Text style={{ color: C.muted, fontWeight: "800" }}>{n + 1}</Text>
        )}
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        {image ? (
          <Image
            source={quizImage(image)}
            contentFit="contain"
            style={{
              height: 96,
              width: 140,
              borderRadius: 8,
              backgroundColor: "#fff",
            }}
            accessibilityLabel={`Lựa chọn ${n + 1}`}
          />
        ) : (
          <Text
            style={{
              color: C.text,
              fontSize: fz(16),
              lineHeight: fz(22),
              fontWeight: "700",
            }}
          >
            {text || `Lựa chọn ${n + 1} (xem hình)`}
          </Text>
        )}
        {!!tr && tr !== text && (
          <Text
            style={{
              color: C.accentText,
              fontStyle: "italic",
              fontSize: 14,
              lineHeight: 19,
            }}
          >
            {tr}
          </Text>
        )}
      </View>
      {judged && (correct || on) && (
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: correct ? (on ? C.accent : "transparent") : C.red,
            borderWidth: correct && !on ? 2 : 0,
            borderColor: C.accent,
          }}
        >
          <SymbolView
            name={correct ? "checkmark" : "xmark"}
            size={13}
            weight="heavy"
            tintColor={correct && !on ? C.accentText : "#fff"}
          />
        </View>
      )}
    </Pressable>
  );
}

function Media({ q, gated }: { q: DrivingQ; gated: boolean }) {
  const { tablet } = useLayout();
  const h = tablet ? 340 : 220;
  if (q.video) {
    // Đã qua bước xem video: chỉ hiện khung hình; xem lại bài thi: xem video tự do
    if (gated)
      return q.poster ? (
        <Image
          source={quizImage(q.poster)}
          contentFit="contain"
          style={{
            width: "100%",
            height: h,
            borderRadius: 16,
            backgroundColor: "#000",
          }}
        />
      ) : null;
    return <FreeVideo src={q.video} height={h} />;
  }
  if (q.optionImages || !q.images.length) return null;
  return (
    <View style={{ gap: 8 }}>
      {q.images.map((src) => (
        <Image
          key={src}
          source={quizImage(src)}
          contentFit="contain"
          transition={120}
          style={{
            width: "100%",
            height: h,
            borderRadius: 16,
            backgroundColor: "#fff",
            ...STICKER,
          }}
          accessibilityLabel="Hình minh hoạ câu hỏi"
        />
      ))}
    </View>
  );
}

function FreeVideo({ src, height }: { src: string; height: number }) {
  const player = useVideoPlayer({ uri: src, useCaching: true });
  return (
    <VideoView
      player={player}
      nativeControls
      contentFit="contain"
      style={{
        width: "100%",
        height,
        borderRadius: 16,
        backgroundColor: "#000",
      }}
    />
  );
}

/** Bước xem video như phần mềm thi: xem tối đa 5 lần; đã xem ≥ 1 lần mới sang câu hỏi được */
function VideoGate({
  src,
  poster,
  count,
  onView,
  onAnswer,
}: {
  src: string;
  poster: string | null;
  count: number;
  onView: () => void;
  onAnswer: () => void;
}) {
  const L = useL();
  const { tablet } = useLayout();
  const player = useVideoPlayer({ uri: src, useCaching: true }, (p) => {
    p.loop = false;
  });
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  // Chỉ tính 1 lượt xem khi video thật sự chạy — mất mạng / tải lỗi thì không mất lượt
  const viewPending = useRef(false);
  useEventListener(player, "playToEnd", () => setPlaying(false));
  useEventListener(player, "playingChange", ({ isPlaying }) => {
    if (isPlaying && viewPending.current) {
      viewPending.current = false;
      onView();
    }
  });
  useEventListener(player, "statusChange", ({ status }) => {
    if (status !== "error") return;
    viewPending.current = false;
    setPlaying(false);
    setFailed(true);
  });
  const left = MAX_VIEWS - count;
  const h = tablet ? 340 : 220;

  const start = () => {
    if (left <= 0) return;
    if (failed) {
      setFailed(false);
      player.replace({ uri: src, useCaching: true }); // tải lại sau lỗi
    }
    viewPending.current = true;
    player.replay();
    setPlaying(true);
  };
  const stop = () => {
    player.pause();
    setPlaying(false);
  };

  return (
    <View style={{ gap: 12 }}>
      <View
        style={{
          height: h,
          borderRadius: 16,
          overflow: "hidden",
          backgroundColor: "#000",
        }}
      >
        <VideoView
          player={player}
          nativeControls={false}
          contentFit="contain"
          style={{ flex: 1 }}
        />
        {!playing && (
          <Pressable
            onPress={start}
            disabled={left <= 0}
            accessibilityRole="button"
            accessibilityLabel={L("Xem video", "Video starten")}
            style={{
              position: "absolute",
              inset: 0,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {!!poster && count === 0 && (
              <Image
                source={quizImage(poster)}
                contentFit="contain"
                style={{ position: "absolute", inset: 0 }}
              />
            )}
            {left > 0 && (
              <View
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: 38,
                  borderWidth: 5,
                  borderColor: "rgba(255,255,255,0.85)",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(0,0,0,0.25)",
                }}
              >
                <SymbolView name="play.fill" size={32} tintColor="#fff" />
              </View>
            )}
          </Pressable>
        )}
        {playing && (
          <Pressable
            onPress={stop}
            accessibilityRole="button"
            style={{
              position: "absolute",
              right: 8,
              top: 8,
              borderRadius: 8,
              backgroundColor: "rgba(0,0,0,0.55)",
              paddingHorizontal: 10,
              paddingVertical: 5,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "800" }}>Schließen</Text>
          </Pressable>
        )}
      </View>
      {failed && (
        <Text style={{ color: C.redText, textAlign: "center" }}>
          {L("Không tải được video. Kiểm tra mạng rồi bấm xem lại.", "Video konnte nicht geladen werden. Prüfe dein Internet und starte es erneut.")}
        </Text>
      )}
      <BarBtn
        title={L(
          `Xem video (còn ${left} lần)`,
          `Video starten (noch ${left}×)`,
        )}
        bg="#0000a8"
        fg="#fff"
        disabled={left <= 0 || playing}
        onPress={start}
        wide
      />
      {count > 0 && (
        <BarBtn
          title={L("Sang câu hỏi", "Zur Aufgabenstellung")}
          bg={C.accent}
          fg="#fff"
          onPress={onAnswer}
          wide
        />
      )}
      <Text style={{ color: C.muted, fontSize: 13, textAlign: "center" }}>
        {L(
          "Xem ít nhất 1 lần mới sang câu hỏi được; sang câu hỏi rồi thì không xem lại video.",
          "Mindestens einmal ansehen; nach dem Wechsel zur Aufgabe ist das Video gesperrt.",
        )}
      </Text>
    </View>
  );
}

function NumberAnswer({
  value,
  hint,
  disabled,
  onChange,
  onSubmit,
  correct,
}: {
  value: string;
  hint: { pre?: string; unit?: string } | null;
  disabled: boolean;
  onChange: (v: string) => void;
  onSubmit: () => void;
  correct: string | null;
}) {
  const L = useL();
  const clean = (v: string) => {
    const s = v.replace(/\./g, ",").replace(/[^\d,]/g, "");
    const i = s.indexOf(",");
    return (
      i < 0 ? s : s.slice(0, i + 1) + s.slice(i + 1).replace(/,/g, "")
    ).slice(0, 8);
  };
  const ok =
    correct !== null && isRight({ options: [], answer: [correct] }, [value]);
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: C.text, fontWeight: "800" }}>
        Antwort:{hint?.pre ? ` ${hint.pre}` : ""}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <TextInput
          value={value}
          editable={!disabled}
          onChangeText={(v) => onChange(clean(v))}
          onSubmitEditing={onSubmit}
          keyboardType="decimal-pad"
          returnKeyType="done"
          placeholder={L("Nhập số", "Zahl")}
          placeholderTextColor={C.muted}
          style={{
            width: 130,
            height: 48,
            borderRadius: 12,
            borderWidth: 2,
            borderColor: correct === null ? C.ink : ok ? C.accent : C.red,
            backgroundColor: C.card,
            color: C.text,
            fontSize: 20,
            fontWeight: "700",
            paddingHorizontal: 12,
            fontVariant: ["tabular-nums"],
          }}
        />
        {!!hint?.unit && (
          <Text style={{ color: C.text, fontWeight: "800", fontSize: 16 }}>
            {hint.unit}
          </Text>
        )}
      </View>
      {correct !== null && !ok && (
        <Text style={{ color: C.accentText, fontWeight: "800" }}>
          {L("Đáp án đúng", "Richtig")}: {correct}
          {hint?.unit ? ` ${hint.unit}` : ""}
        </Text>
      )}
    </View>
  );
}

function NavBtn({
  icon,
  label,
  disabled,
  onPress,
  primary,
}: {
  icon: SFSymbol;
  label: string;
  disabled: boolean;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: 52,
        height: 48,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: C.ink,
        backgroundColor: primary ? C.accent : C.card,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.35 : 1,
        transform: [{ translateY: pressed ? 2 : 0 }],
        boxShadow: `0 ${pressed ? 1 : 3}px 0 ${C.ink}`,
      })}
    >
      <SymbolView
        name={icon}
        size={18}
        weight="bold"
        tintColor={primary ? "#fff" : C.text}
      />
    </Pressable>
  );
}

function BarBtn({
  title,
  bg,
  fg,
  disabled,
  onPress,
  wide,
}: {
  title: string;
  bg: string;
  fg: string;
  disabled?: boolean;
  onPress: () => void;
  wide?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => ({
        minWidth: wide ? undefined : 150,
        alignSelf: wide ? "stretch" : undefined,
        height: 48,
        paddingHorizontal: 18,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: C.ink,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.4 : 1,
        transform: [{ translateY: pressed ? 2 : 0 }],
        boxShadow: `0 ${pressed ? 1 : 3}px 0 ${C.ink}`,
      })}
    >
      <Text
        style={{ color: fg, fontWeight: "800", fontSize: 16 }}
        numberOfLines={1}
      >
        {title}
      </Text>
    </Pressable>
  );
}

function Timer({
  minutes,
  startedAt,
  onEnd,
}: {
  minutes: number;
  startedAt: number;
  onEnd: () => void;
}) {
  const end = startedAt + minutes * 60_000;
  const [now, setNow] = useState(() => Date.now());
  const ended = useRef(false);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, end - now);
  useEffect(() => {
    if (left === 0 && !ended.current) {
      ended.current = true;
      onEnd();
    }
  }, [left, onEnd]);
  const mm = Math.floor(left / 60_000);
  const ss = Math.floor((left % 60_000) / 1000);
  return (
    <Text
      accessibilityRole="timer"
      style={{
        color: left < 5 * 60_000 ? C.redText : C.text,
        fontWeight: "800",
        fontSize: 16,
        fontVariant: ["tabular-nums"],
      }}
    >
      {mm}:{String(ss).padStart(2, "0")}
    </Text>
  );
}

function ResultCard({
  module,
  result,
  maxErrorPoints,
}: {
  module: QuizModule;
  result: ExamResult;
  maxErrorPoints: number;
}) {
  const L = useL();
  return (
    <View
      style={{
        borderRadius: 20,
        ...STICKER,
        backgroundColor: alpha(result.passed ? C.accent : C.red, 0.15),
        padding: 14,
        gap: 4,
      }}
    >
      <Text style={{ color: C.text, fontSize: 22, fontWeight: "800" }}>
        {result.passed
          ? L("🎉 Bestanden — Đậu!", "🎉 Bestanden!")
          : L("Nicht bestanden — Chưa đậu", "Nicht bestanden")}
      </Text>
      <Text style={{ color: C.text, fontWeight: "700" }}>
        {module === "lid"
          ? L(
              `Đúng ${result.correct}/${result.total} câu · cần đúng ≥ ${result.total - maxErrorPoints}`,
              `${result.correct}/${result.total} richtig · nötig ≥ ${result.total - maxErrorPoints}`,
            )
          : `${result.errorPoints}/${maxErrorPoints} ${L("điểm lỗi", "Fehlerpunkte")} · ${L("đúng", "richtig")} ${result.correct}/${result.total}${result.failReason ? ` · ${FAIL_TEXT[result.failReason]}` : ""}`}
      </Text>
      <Text style={{ color: C.muted, fontSize: 13 }}>
        {L(
          "Chạm số câu ở trên để xem lại từng câu. Bài thi đã lưu vào Thống kê.",
          "Tippe oben auf eine Nummer, um die Frage anzusehen. Gespeichert unter Statistik.",
        )}
      </Text>
    </View>
  );
}
