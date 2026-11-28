import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
} from "react";
import { Alert, FlatList, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from "react-native";
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
import { stemVi } from "@shared/laixe/stems-vi";
import { NUM_PRE_VI, NUM_UNIT_VI } from "@shared/laixe/units";
import { Text, TextInput } from "@/components/Text";
import { Button, Segmented, styles } from "@/components/ui";
import { haptic } from "@/lib/haptics";
import { useAuth } from "@/lib/auth";
import { C, STICKER, alpha, isDark } from "@/lib/theme";
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

const MAX_VIEWS = 5;
type VideoState = { count: number; answering: boolean };
type Cell = "empty" | "answered" | "ok" | "bad" | "ok-old" | "bad-old";
type PickerFilter = "all" | "todo" | "bad" | "marked";

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
  const { bottom, top } = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { questions, exam, review } = run;
  const single = module === "lid";
  const mod = useModule(module);
  const prefs = usePrefs();
  const marked = useMemo(() => new Set(mod.marked), [mod.marked]);

  // Màn xác nhận trước khi bắt đầu đếm giờ thi thử
  const [examStarted, setExamStarted] = useState(mode !== "exam");
  const [startedAt, setStartedAt] = useState(() => Date.now());

  const [idx, setIdx] = useState(() => {
    const id = run.resumeKey ? getPos(run.resumeKey) : undefined;
    return Math.max(0, id ? questions.findIndex((x) => x.id === id) : 0);
  });
  const [picked, setPicked] = useState<Record<string, string[]>>(review?.picked ?? {});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<ExamResult | null>(review?.result ?? null);
  const [savedExamId, setSavedExamId] = useState<string | null>(null);
  const [videos, setVideos] = useState<Record<string, VideoState>>({});
  const [showExplain, setShowExplain] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerFilter, setPickerFilter] = useState<PickerFilter>("all");
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);
  const [freeReplay, setFreeReplay] = useState<Record<string, boolean>>({});
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const strip = useRef<FlatList<DrivingQ>>(null);

  const isExam = mode === "exam" || mode === "review";
  const submitted = mode === "review" || (mode === "exam" && !!result);
  const showTr = isExam ? prefs.trExam : prefs.trLearn;
  const q = questions[idx];
  const mine = (q && picked[q.id]) ?? [];
  const reveal = mode === "lesen" || submitted || (mode === "ueben" && !!q && !!checked[q.id]);
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
    if (questions.length && examStarted)
      strip.current?.scrollToOffset({
        offset: Math.max(0, 12 + (CHIP_W + 6) * idx - (width - CHIP_W) / 2),
        animated: true,
      });
  }, [idx, questions.length, width, examStarted]);

  const [leaving, setLeaving] = useState(false);
  usePreventRemove(
    mode === "exam" && examStarted && !submitted && answeredCount > 0 && !leaving,
    ({ repeat }) =>
      Alert.alert(
        L("Thoát bài thi?", "Prüfung abbrechen?"),
        L("Bài đang làm sẽ không được lưu.", "Die Antworten werden nicht gespeichert."),
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
    if (ok) haptic.success();
    else haptic.error();
    setChecked((c) => ({ ...c, [q.id]: true }));
    recordAnswer(module, q.id, ok, user);
    // Không tự gỡ đánh dấu khi người học đang luyện ngay trong danh sách câu đánh dấu
    if (module === "lid" && prefs.autoMark && run.scope !== "marked" && marked.has(q.id) === ok)
      setMarked(module, q.id, !ok, user);
  };

  const toggle = (key: string) => {
    if (reveal || !q) return;
    haptic.select();
    if (single) {
      setPicked((p) => ({ ...p, [q.id]: [key] }));
      if (mode === "ueben") check([key]);
      return;
    }
    setPicked((p) => {
      const cur = p[q.id] ?? [];
      return {
        ...p,
        [q.id]: cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key],
      };
    });
  };

  const retry = () => {
    if (!q) return;
    const drop = <T,>(o: Record<string, T>) =>
      Object.fromEntries(Object.entries(o).filter(([k]) => k !== q.id));
    setChecked(drop);
    setPicked(drop);
    setVideos(drop);
    setFreeReplay(drop);
    setShowExplain(false);
  };

  const submit = useCallback(() => {
    if (!exam || result) return;
    const r = grade(questions, picked, exam.maxErrorPoints);
    setPickerOpen(false);
    setZoomSrc(null);
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
    const id = saveExam(
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
    setSavedExamId(id);
  }, [exam, result, questions, picked, go, module, prefs.autoMark, marked, user, startedAt]);

  const askSubmit = () => {
    const left = questions.length - answeredCount;
    Alert.alert(
      L("Nộp bài?", "Abgeben?"),
      left
        ? L(`Còn ${left} câu chưa làm (tính là sai).`, `Noch ${left} Fragen offen (zählen als falsch).`)
        : L("Xem kết quả ngay.", "Ergebnis sofort ansehen."),
      [
        { text: L("Làm tiếp", "Weitermachen"), style: "cancel" },
        { text: L("Nộp bài", "Abgeben"), style: "destructive", onPress: submit },
      ],
    );
  };

  // Chế độ Đọc (lesen) & xem lại bài thi được phát video tự do không cần qua VideoGate
  const gated = !!q?.video && (mode === "ueben" || (mode === "exam" && !submitted));
  const vstate = (q && videos[q.id]) || { count: 0, answering: false };
  const videoStep = gated && !vstate.answering && !checked[q.id];
  const canFreeReplay = mode === "ueben" && !!q && !!checked[q.id] && !!freeReplay[q.id];
  const setVideo = (patch: Partial<VideoState> | ((cur: VideoState) => Partial<VideoState>)) =>
    q &&
    setVideos((v) => {
      const cur = v[q.id] ?? { count: 0, answering: false };
      const delta = typeof patch === "function" ? patch(cur) : patch;
      return { ...v, [q.id]: { ...cur, ...delta } };
    });

  const display = useMemo(
    () => (q ? q.order.map((i) => q.options[i]).filter(Boolean) : []),
    [q],
  );

  const status = useCallback(
    (x: DrivingQ): Cell => {
      if (mode === "exam" && !submitted) return picked[x.id]?.length ? "answered" : "empty";
      if (submitted) return isRight(x, picked[x.id]) ? "ok" : "bad";
      if (mode === "ueben" && checked[x.id]) return isRight(x, picked[x.id]) ? "ok" : "bad";
      const s = mod.stats[x.id];
      return s ? (s.lastOk ? "ok-old" : "bad-old") : "empty";
    },
    [mode, submitted, picked, checked, mod.stats],
  );

  const pickerCounts = useMemo(() => {
    let todo = 0;
    let bad = 0;
    let mk = 0;
    for (const x of questions) {
      const st = status(x);
      if (st === "empty") todo++;
      if (st === "bad" || st === "bad-old") bad++;
      if (marked.has(x.id)) mk++;
    }
    return { all: questions.length, todo, bad, marked: mk };
  }, [questions, status, marked]);

  const pickerItems = useMemo(() => {
    return questions
      .map((x, i) => ({ x, i, st: status(x) }))
      .filter(({ x, st }) => {
        if (pickerFilter === "todo") return st === "empty";
        if (pickerFilter === "bad") return st === "bad" || st === "bad-old";
        if (pickerFilter === "marked") return marked.has(x.id);
        return true;
      });
  }, [questions, status, pickerFilter, marked]);

  const header = (
    <Stack.Screen
      options={{
        title: run.title,
        headerRight: () => (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            {mode === "exam" && examStarted && !submitted && exam && (
              <Timer minutes={exam.minutes} startedAt={startedAt} onEnd={submit} />
            )}
            <HeaderIcon
              icon={showTr ? "character.bubble.fill" : "character.bubble"}
              label={showTr ? L("Ẩn bản dịch", "Übersetzung ausblenden") : L("Hiện bản dịch", "Übersetzung einblenden")}
              onPress={() => setPrefs(isExam ? { trExam: !showTr } : { trLearn: !showTr })}
            />
            {q && examStarted && (
              <HeaderIcon
                icon={marked.has(q.id) ? "star.fill" : "star"}
                tint={marked.has(q.id) ? C.gold : undefined}
                label={marked.has(q.id) ? L("Bỏ đánh dấu", "Markierung entfernen") : L("Đánh dấu câu này", "Frage markieren")}
                onPress={() => setMarked(module, q.id, !marked.has(q.id), user)}
              />
            )}
          </View>
        ),
      }}
    />
  );

  // Màn xác nhận quy tắc trước khi bắt đầu đếm giờ thi thử
  if (mode === "exam" && !examStarted && exam) {
    return (
      <View style={[styles.screen, { paddingTop: headerHeight, justifyContent: "center", padding: 20 }]}>
        {header}
        <View style={{ backgroundColor: C.card, borderRadius: 20, ...STICKER, padding: 20, gap: 14, width: "100%", maxWidth: 460, alignSelf: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <SymbolView name="flag.checkered" size={26} tintColor={C.accentText} weight="semibold" />
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.text, fontSize: 19, fontWeight: "800" }}>{run.title}</Text>
              {!!run.subtitle && <Text style={{ color: C.muted, fontSize: 13 }}>{run.subtitle}</Text>}
            </View>
          </View>
          <View style={{ gap: 6, backgroundColor: C.card2, borderRadius: 12, padding: 14 }}>
            <Text style={{ color: C.text, fontSize: 14, fontWeight: "700" }}>
              • {questions.length} {L("câu hỏi", "Fragen")} · {exam.minutes} {L("phút", "Minuten")}
            </Text>
            <Text style={{ color: C.muted, fontSize: 13, lineHeight: 19 }}>
              {module === "lid"
                ? L(`Cần trả lời đúng ít nhất ${questions.length - exam.maxErrorPoints}/${questions.length} câu để đậu.`, `Mindestens ${questions.length - exam.maxErrorPoints}/${questions.length} richtige Antworten zum Bestehen.`)
                : L(`Tối đa ${exam.maxErrorPoints} điểm lỗi và không sai quá 1 câu 5 điểm.`, `Maximal ${exam.maxErrorPoints} Fehlerpunkte und höchstens eine 5-Punkte-Frage falsch.`)}
            </Text>
            <Text style={{ color: C.muted, fontSize: 13 }}>
              {L("Câu bỏ trống khi nộp bài bị tính là sai.", "Unbeantwortete Fragen zählen als falsch.")}
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button title={L("Quay lại", "Zurück")} onPress={() => router.back()} style={{ flex: 1 }} />
            <Button
              title={L("Bắt đầu thi", "Prüfung starten")}
              variant="primary"
              onPress={() => {
                setStartedAt(Date.now());
                setExamStarted(true);
              }}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    );
  }

  if (!q) {
    return (
      <View style={[styles.screen, { alignItems: "center", justifyContent: "center", padding: 24, gap: 12 }]}>
        {header}
        <Text style={{ fontSize: 40 }}>🎉</Text>
        <Text style={{ color: C.text, fontSize: 17, fontWeight: "800", textAlign: "center" }}>
          {L("Không có câu nào ở đây.", "Hier gibt es keine Fragen.")}
        </Text>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [chipBtn(), { opacity: pressed ? 0.7 : 1 }]}>
          <Text style={{ color: C.text, fontWeight: "800" }}>{L("Quay lại", "Zurück")}</Text>
        </Pressable>
      </View>
    );
  }

  const right = isRight(q, mine);
  const stemTr = showTr ? stemVi(q.stem) : null;
  const wrongCountInResult = result ? result.total - result.correct : 0;

  return (
    <View style={[styles.screen, { paddingTop: headerHeight }]}>
      {header}

      {/* Thanh chuyển nhanh Đọc ⇄ Luyện */}
      {run.canSwitchMode && (mode === "lesen" || mode === "ueben") && (
        <View style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: C.bar, borderBottomWidth: 1, borderBottomColor: C.border }}>
          <Segmented<"lesen" | "ueben">
            options={[
              ["lesen", L("Đọc (Lesen)", "Lesen")],
              ["ueben", L("Luyện (Üben)", "Üben")],
            ]}
            value={mode}
            onChange={(nextMode) =>
              router.replace({ pathname: "/quiz/run", params: { module, mode: nextMode, scope: run.scope } })
            }
          />
        </View>
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {/* Dải số câu + nút mở lưới lọc câu */}
      <View style={{ flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.bar }}>
        <FlatList
          ref={strip}
          data={questions}
          horizontal
          keyExtractor={(x) => x.id}
          showsHorizontalScrollIndicator={false}
          getItemLayout={(_, i) => ({ length: CHIP_W + 6, offset: 12 + (CHIP_W + 6) * i, index: i })}
          initialScrollIndex={idx > 3 ? idx : undefined}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 6 }}
          style={{ flex: 1 }}
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
        <Pressable
          onPress={() => {
            haptic.tap();
            setPickerOpen(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={L("Mở danh sách câu hỏi", "Fragenübersicht öffnen")}
          style={({ pressed }) => ({
            paddingHorizontal: 10,
            paddingVertical: 8,
            marginRight: 8,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: C.border,
            backgroundColor: pressed ? C.card2 : C.card,
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
          })}
        >
          <SymbolView name="square.grid.2x2" size={14} tintColor={C.text} />
          <Text style={{ color: C.text, fontSize: 12, fontWeight: "700", fontVariant: ["tabular-nums"] }}>
            {idx + 1}/{questions.length}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
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
            onNewExam={
              mode === "exam" || mode === "review"
                ? () => {
                    const ex = exam ?? review?.exam;
                    const newScope = ex?.kind === "bogen" ? `bogen:${ex.ref}` : mode === "exam" ? run.scope : "random";
                    router.replace({
                      pathname: "/quiz/run",
                      params: { module, mode: "exam", scope: newScope, t: String(Date.now()) },
                    });
                  }
                : undefined
            }
            onPracticeWrong={
              wrongCountInResult > 0 && (mode === "exam" || mode === "review")
                ? () =>
                    router.push({
                      pathname: "/quiz/run",
                      params: {
                        module,
                        mode: "ueben",
                        scope:
                          mode === "review"
                            ? run.scope.startsWith("remote:")
                              ? `wrong-remote:${run.scope.slice(7)}`
                              : `wrong-exam:${run.scope}`
                            : savedExamId
                              ? `wrong-exam:${savedExamId}`
                              : "wrong-last",
                      },
                    })
                : undefined
            }
          />
        )}

        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
          <Pressable
            onPress={() => {
              haptic.tap();
              setPickerOpen(true);
            }}
            style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
          >
            <Text style={{ color: C.muted, fontWeight: "800", fontVariant: ["tabular-nums"] }}>
              {L("Câu", "Frage")} {idx + 1}/{questions.length}
            </Text>
            <SymbolView name="chevron.down" size={11} tintColor={C.muted} weight="bold" />
          </Pressable>
          <Pill text={module === "lid" ? q.chapter : q.id} />
          {module === "fuehrerschein" && <Pill text={`${q.points} ${L("điểm", "Punkte")}`} strong={q.points === 5} />}
          {isExam && !q.grund && module === "fuehrerschein" && (
            <Pill text={`Zusatzstoff ${exam?.cls ?? review?.exam.cls ?? ""}`} />
          )}
        </View>

        <View style={{ gap: 6 }}>
          <Text style={{ color: C.text, fontSize: fz(19), lineHeight: fz(26), fontWeight: "800" }}>
            {videoStep
              ? showTr
                ? L("Hãy bấm phát video để quan sát tình huống.", "Bitte starten Sie den Film, um sich mit der Situation vertraut zu machen.")
                : "Bitte starten Sie den Film, um sich mit der Situation vertraut zu machen."
              : q.q}
          </Text>
          {showTr && !videoStep && !!q.tr?.q && <Translation text={q.tr.q} />}
        </View>

        {videoStep ? (
          <VideoGate
            key={q.id}
            src={q.video!}
            poster={q.poster}
            count={vstate.count}
            onView={() => setVideo((cur) => ({ count: cur.count + 1 }))}
            onAnswer={() => setVideo({ answering: true })}
          />
        ) : (
          <>
            <Media
              q={q}
              gated={gated && !canFreeReplay}
              onZoom={(src) => setZoomSrc(src)}
              onUnlockReplay={mode === "ueben" && !!checked[q.id] && !!q.video ? () => setFreeReplay((m) => ({ ...m, [q.id]: true })) : undefined}
            />
            {!!q.stem && (
              <View style={{ gap: 2 }}>
                <Text style={{ color: C.muted, fontWeight: "800", fontSize: fz(15) }}>{q.stem}</Text>
                {!!stemTr && <Translation text={stemTr} />}
              </View>
            )}
            {!single && q.options.length > 0 && !reveal && (
              <Text style={{ color: C.muted, fontSize: 13 }}>
                {L("Có thể có nhiều đáp án đúng", "Mehrere Antworten können richtig sein")}
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
                      onZoom={q.optionImages && q.images[orig] ? () => setZoomSrc(q.images[orig]) : undefined}
                    />
                  );
                })}
              </View>
            ) : (
              <NumberAnswer
                value={mode === "lesen" ? q.answer[0] : (mine[0] ?? "")}
                hint={q.num ?? null}
                showTr={showTr}
                disabled={reveal}
                onChange={(v) => setPicked((p) => ({ ...p, [q.id]: v ? [v] : [] }))}
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
              borderRadius: 12,
              borderWidth: 1,
              borderColor: alpha(right ? C.ok : C.red, 0.35),
              backgroundColor: right ? C.okSoft : C.redSoft,
              padding: 12,
            }}
          >
            <Text style={{ color: right ? C.okText : C.redText, fontWeight: "700", fontSize: 16 }}>
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
              style={({ pressed }) => [chipBtn(), { alignSelf: "flex-start", opacity: pressed ? 0.7 : 1 }]}
            >
              <SymbolView name="lightbulb" size={15} tintColor={C.amber} />
              <Text style={{ color: C.text, fontWeight: "800" }}>
                {showExplain ? L("Ẩn giải thích", "Erklärung ausblenden") : L("Giải thích", "Erklärung")}
              </Text>
            </Pressable>
            {showExplain && (
              <View
                style={{
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: alpha(C.gold, 0.6),
                  backgroundColor: C.goldSoft,
                  padding: 12,
                  gap: 8,
                }}
              >
                <Text style={{ color: C.text, fontSize: 15, lineHeight: 21 }}>{q.explain}</Text>
                {showTr && !!q.tr?.c && <Translation text={q.tr.c} />}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Thanh dưới */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingHorizontal: 12,
          paddingTop: 10,
          paddingBottom: Math.max(bottom, 10),
          borderTopWidth: 1,
          borderTopColor: C.line,
          backgroundColor: C.bar,
        }}
      >
        <NavBtn icon="chevron.left" label={L("Câu trước", "Zurück")} disabled={idx === 0} onPress={() => go(idx - 1)} />
        <View style={{ flex: 1, alignItems: "center" }}>
          {mode === "ueben" && !reveal && !videoStep && !single && (
            <BarBtn title={L("Kiểm tra", "Prüfen")} bg={C.gold} fg="#16203a" disabled={!mine.length} onPress={() => check()} />
          )}
          {mode === "ueben" && reveal && (
            <BarBtn title={L("Làm lại", "Nochmal")} bg={C.card} fg={C.text} onPress={retry} />
          )}
          {mode === "exam" && !submitted && (
            <BarBtn title={`${L("Nộp bài", "Abgeben")} · ${answeredCount}/${questions.length}`} bg={C.red} fg="#fff" onPress={askSubmit} />
          )}
        </View>
        <NavBtn icon="chevron.right" label={L("Câu sau", "Weiter")} disabled={idx === questions.length - 1} onPress={() => go(idx + 1)} primary={reveal || mode === "exam"} />
      </View>
      </KeyboardAvoidingView>

      {/* Modal chọn câu hỏi & lọc nhanh */}
      <Modal
        visible={pickerOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        supportedOrientations={["portrait", "portrait-upside-down", "landscape-left", "landscape-right"]}
        onRequestClose={() => setPickerOpen(false)}
      >
        {pickerOpen && (
          <View style={{ flex: 1, backgroundColor: C.background, paddingTop: PlatformHeaderPad(top) }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.line }}>
              <Text style={{ color: C.text, fontSize: 17, fontWeight: "800" }}>
                {L("Danh sách câu hỏi", "Fragenübersicht")} ({questions.length})
              </Text>
              <Pressable onPress={() => setPickerOpen(false)} hitSlop={8} accessibilityRole="button" style={{ padding: 4 }}>
                <Text style={{ color: C.accentText, fontSize: 15, fontWeight: "700" }}>{L("Đóng", "Schließen")}</Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, borderBottomWidth: 1, borderBottomColor: C.line }} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}>
              {(
                [
                  ["all", `${L("Tất cả", "Alle")} (${pickerCounts.all})`],
                  ["todo", `${L("Chưa làm", "Offen")} (${pickerCounts.todo})`],
                  ...(mode === "exam" && !submitted ? [] : ([["bad", `${L("Đang sai", "Falsch")} (${pickerCounts.bad})`]] as const)),
                  ["marked", `${L("Đánh dấu", "Markiert")} (${pickerCounts.marked})`],
                ] as const
              ).map(([k, label]) => {
                const on = pickerFilter === k;
                return (
                  <Pressable
                    key={k}
                    onPress={() => setPickerFilter(k)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 999,
                      borderWidth: 1,
                      backgroundColor: on ? C.accentSoft : C.card,
                      borderColor: on ? C.accent : C.line,
                    }}
                  >
                    <Text style={{ color: on ? C.accentText : C.text, fontSize: 13, fontWeight: "700" }}>{label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: Math.max(bottom, 24), flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {pickerItems.length === 0 ? (
                <Text style={{ color: C.muted, fontSize: 14, width: "100%", textAlign: "center", paddingVertical: 24 }}>
                  {L("Không có câu hỏi nào khớp mục lọc này.", "Keine passenden Fragen in diesem Filter.")}
                </Text>
              ) : (
                pickerItems.map(({ x, i, st }) => (
                  <NumChip
                    key={x.id}
                    n={i + 1}
                    state={st}
                    current={i === idx}
                    marked={marked.has(x.id)}
                    video={!!x.video}
                    onPress={() => {
                      setPickerOpen(false);
                      go(i);
                    }}
                  />
                ))
              )}
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* Lightbox phóng to ảnh */}
      <Modal
        visible={!!zoomSrc}
        transparent
        animationType="fade"
        statusBarTranslucent
        supportedOrientations={["portrait", "portrait-upside-down", "landscape-left", "landscape-right"]}
        onRequestClose={() => setZoomSrc(null)}
      >
        <Pressable
          onPress={() => setZoomSrc(null)}
          accessibilityRole="button"
          accessibilityLabel={L("Đóng", "Schließen")}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.92)", justifyContent: "center", alignItems: "center", padding: 16 }}
        >
          {zoomSrc && (
            <View style={{ width: "100%", height: "78%", backgroundColor: "#fff", borderRadius: 14, padding: 8 }}>
              <Image source={quizImage(zoomSrc)} contentFit="contain" style={{ width: "100%", height: "100%" }} />
            </View>
          )}
          <Pressable
            onPress={() => setZoomSrc(null)}
            accessibilityRole="button"
            style={{ position: "absolute", top: Math.max(top, 20) + 12, right: 20, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.22)" }}
          >
            <Text style={{ color: "#fff", fontWeight: "800" }}>{L("Đóng", "Schließen")}</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const PlatformHeaderPad = (top: number) => (Platform.OS === "ios" ? 8 : Math.max(8, top));

const chipBtn = () => ({
  flexDirection: "row" as const,
  alignItems: "center" as const,
  gap: 6,
  paddingHorizontal: 14,
  height: 40,
  borderRadius: 12,
  borderWidth: 1.5,
  borderColor: C.border,
  backgroundColor: C.card,
});

function HeaderIcon({ icon, label, onPress, tint }: { icon: SFSymbol; label: string; onPress: () => void; tint?: string }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={label}>
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
      <Text style={{ color: strong ? "#fff" : C.muted, fontSize: 12, fontWeight: "800", fontVariant: ["tabular-nums"] }}>
        {text}
      </Text>
    </View>
  );
}

function Translation({ text }: { text: string }) {
  return <Text style={{ color: C.accentText, fontStyle: "italic", fontSize: 15, lineHeight: 21 }}>{text}</Text>;
}

const CELL_TONE = (): Record<Cell, { bg: string; fg: string }> => ({
  ok: { bg: C.ok, fg: "#fff" },
  bad: { bg: C.red, fg: "#fff" },
  "ok-old": { bg: alpha(C.ok, 0.22), fg: C.text },
  "bad-old": { bg: alpha(C.red, 0.22), fg: C.text },
  answered: isDark() ? { bg: C.gold, fg: "#16203a" } : { bg: alpha(C.gold, 0.55), fg: "#16203a" },
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
  const L = useL();
  const tone = CELL_TONE()[state];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${L("Câu", "Frage")} ${n}${marked ? " ⭐" : ""}`}
      accessibilityState={{ selected: current }}
      style={{
        width: CHIP_W,
        height: 36,
        borderRadius: 10,
        borderWidth: current ? 2 : 1,
        borderColor: current ? C.accent : C.border,
        backgroundColor: tone.bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: tone.fg, fontWeight: "800", fontSize: 14, fontVariant: ["tabular-nums"] }}>{n}</Text>
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
  onZoom,
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
  onZoom?: () => void;
}) {
  const L = useL();
  const { fs: fz } = useLayout();
  const ticked = mode === "lesen" ? correct : on;
  const judged = reveal && mode !== "lesen";
  const border = !reveal ? (on ? C.accent : C.border) : correct ? C.ok : on ? C.red : C.line;
  const bg = !reveal ? (on ? C.accentSoft : C.card) : correct ? C.okSoft : on ? C.redSoft : C.card;
  const boxBg = ticked ? (reveal && correct ? C.ok : reveal ? C.red : C.accent) : C.card;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: border,
        backgroundColor: bg,
        overflow: "hidden",
      }}
    >
      <Pressable
        onPress={onPress}
        disabled={reveal}
        accessibilityRole={single ? "radio" : "checkbox"}
        accessibilityState={{ checked: ticked, disabled: reveal }}
        style={({ pressed }) => ({
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          padding: 12,
          minHeight: 56,
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed && !reveal ? 0.98 : 1 }],
        })}
      >
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: single ? 17 : 9,
            borderWidth: 1.5,
            borderColor: ticked && reveal ? boxBg : ticked ? C.accent : alpha(C.inkLine, 0.35),
            backgroundColor: boxBg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {ticked ? (
            <SymbolView name="checkmark" size={16} weight="heavy" tintColor="#fff" />
          ) : (
            <Text style={{ color: C.muted, fontWeight: "800" }}>{n + 1}</Text>
          )}
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          {image ? (
            <Image
              source={quizImage(image)}
              contentFit="contain"
              style={{ height: 96, width: 140, borderRadius: 8, backgroundColor: "#fff" }}
              accessibilityLabel={`${L("Lựa chọn", "Option")} ${n + 1}`}
            />
          ) : (
            <Text style={{ color: C.text, fontSize: fz(16), lineHeight: fz(22), fontWeight: "700" }}>
              {text || L(`Lựa chọn ${n + 1} (xem hình)`, `Option ${n + 1} (siehe Bild)`)}
            </Text>
          )}
          {!!tr && tr !== text && (
            <Text style={{ color: C.accentText, fontStyle: "italic", fontSize: 14, lineHeight: 19 }}>{tr}</Text>
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
              backgroundColor: correct ? (on ? C.ok : "transparent") : C.red,
              borderWidth: correct && !on ? 2 : 0,
              borderColor: C.ok,
            }}
          >
            <SymbolView name={correct ? "checkmark" : "xmark"} size={13} weight="heavy" tintColor={correct && !on ? C.okText : "#fff"} />
          </View>
        )}
      </Pressable>
      {image && onZoom && (
        <Pressable
          onPress={onZoom}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={L("Phóng to hình", "Bild vergrößern")}
          style={({ pressed }) => ({ paddingHorizontal: 14, paddingVertical: 14, opacity: pressed ? 0.6 : 1 })}
        >
          <SymbolView name="arrow.up.left.and.arrow.down.right" size={15} tintColor={C.muted} />
        </Pressable>
      )}
    </View>
  );
}

function Media({
  q,
  gated,
  onZoom,
  onUnlockReplay,
}: {
  q: DrivingQ;
  gated: boolean;
  onZoom: (src: string) => void;
  onUnlockReplay?: () => void;
}) {
  const L = useL();
  const { tablet } = useLayout();
  const h = tablet ? 340 : 220;
  if (q.video) {
    if (gated) {
      return (
        <View style={{ gap: 8 }}>
          {q.poster ? (
            <Pressable onPress={() => onZoom(q.poster!)}>
              <Image
                source={quizImage(q.poster)}
                contentFit="contain"
                style={{ width: "100%", height: h, borderRadius: 16, backgroundColor: "#000" }}
              />
            </Pressable>
          ) : (
            <View
              style={{
                width: "100%",
                height: 110,
                borderRadius: 16,
                backgroundColor: C.card2,
                borderWidth: 1,
                borderColor: C.line,
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <SymbolView name="film" size={26} tintColor={C.muted} />
              <Text style={{ color: C.muted, fontSize: 13, fontWeight: "600" }}>
                {L("Video câu hỏi đã xem", "Fragevideo angesehen")}
              </Text>
            </View>
          )}
          {onUnlockReplay && (
            <Pressable onPress={onUnlockReplay} style={({ pressed }) => [chipBtn(), { alignSelf: "flex-start", opacity: pressed ? 0.7 : 1 }]}>
              <SymbolView name="play.circle" size={16} tintColor={C.accentText} />
              <Text style={{ color: C.accentText, fontWeight: "700" }}>{L("Xem lại video", "Video erneut ansehen")}</Text>
            </Pressable>
          )}
        </View>
      );
    }
    return <FreeVideo src={q.video} height={h} />;
  }
  if (q.optionImages || !q.images.length) return null;
  return (
    <View style={{ gap: 8 }}>
      {q.images.map((src) => (
        <Pressable key={src} onPress={() => onZoom(src)}>
          <Image
            source={quizImage(src)}
            contentFit="contain"
            transition={120}
            style={{ width: "100%", height: h, borderRadius: 16, backgroundColor: "#fff", ...STICKER }}
            accessibilityLabel={L("Hình minh hoạ câu hỏi", "Fragebild")}
          />
          <View style={{ position: "absolute", right: 10, bottom: 10, width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" }}>
            <SymbolView name="arrow.up.left.and.arrow.down.right" size={13} tintColor="#fff" />
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function FreeVideo({ src, height }: { src: string; height: number }) {
  const player = useVideoPlayer({ uri: src, useCaching: true });
  return <VideoView player={player} nativeControls contentFit="contain" style={{ width: "100%", height, borderRadius: 16, backgroundColor: "#000" }} />;
}

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
    viewPending.current = true;
    setPlaying(true);
    if (failed) {
      setFailed(false);
      void player.replaceAsync({ uri: src, useCaching: true }).then(() => {
        if (viewPending.current) player.replay();
      });
      return;
    }
    player.replay();
  };
  const stop = () => {
    viewPending.current = false;
    player.pause();
    setPlaying(false);
  };

  return (
    <View style={{ gap: 12 }}>
      <View style={{ height: h, borderRadius: 16, overflow: "hidden", backgroundColor: "#000" }}>
        <VideoView player={player} nativeControls={false} contentFit="contain" style={{ flex: 1 }} />
        {!playing && (
          <Pressable
            onPress={start}
            disabled={left <= 0}
            accessibilityRole="button"
            accessibilityLabel={L("Xem video", "Video starten")}
            style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" }}
          >
            {!!poster && count === 0 && <Image source={quizImage(poster)} contentFit="contain" style={{ position: "absolute", inset: 0 }} />}
            {left > 0 && (
              <View style={{ width: 76, height: 76, borderRadius: 38, borderWidth: 5, borderColor: "rgba(255,255,255,0.85)", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.25)" }}>
                <SymbolView name="play.fill" size={32} tintColor="#fff" />
              </View>
            )}
          </Pressable>
        )}
        {playing && (
          <Pressable onPress={stop} accessibilityRole="button" style={{ position: "absolute", right: 8, top: 8, borderRadius: 8, backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 10, paddingVertical: 5 }}>
            <Text style={{ color: "#fff", fontWeight: "800" }}>{L("Đóng", "Schließen")}</Text>
          </Pressable>
        )}
      </View>
      {failed && (
        <Text style={{ color: C.redText, textAlign: "center" }}>
          {L("Không tải được video. Kiểm tra mạng rồi bấm xem lại.", "Video konnte nicht geladen werden. Prüfe dein Internet und starte es erneut.")}
        </Text>
      )}
      <BarBtn title={L(`Xem video (còn ${left} lần)`, `Video starten (noch ${left}×)`)} bg="#0000a8" fg="#fff" disabled={left <= 0 || playing} onPress={start} wide />
      {count > 0 && <BarBtn title={L("Sang câu hỏi", "Zur Aufgabenstellung")} bg={C.accent} fg="#fff" onPress={onAnswer} wide />}
      <Text style={{ color: C.muted, fontSize: 13, textAlign: "center" }}>
        {L("Xem ít nhất 1 lần mới sang câu hỏi được; sang câu hỏi rồi thì không xem lại video.", "Mindestens einmal ansehen; nach dem Wechsel zur Aufgabe ist das Video gesperrt.")}
      </Text>
    </View>
  );
}

function NumberAnswer({
  value,
  hint,
  showTr,
  disabled,
  onChange,
  onSubmit,
  correct,
}: {
  value: string;
  hint: { pre?: string; unit?: string } | null;
  showTr: boolean;
  disabled: boolean;
  onChange: (v: string) => void;
  onSubmit: () => void;
  correct: string | null;
}) {
  const L = useL();
  const clean = (v: string) => {
    const s = v.replace(/\./g, ",").replace(/[^\d,]/g, "");
    const i = s.indexOf(",");
    return (i < 0 ? s : s.slice(0, i + 1) + s.slice(i + 1).replace(/,/g, "")).slice(0, 8);
  };
  const ok = correct !== null && isRight({ options: [], answer: [correct] }, [value]);
  const preVi = showTr && hint?.pre ? NUM_PRE_VI[hint.pre] : null;
  const unitVi = showTr && hint?.unit ? NUM_UNIT_VI[hint.unit] : null;

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: C.text, fontWeight: "800" }}>
        Antwort:{hint?.pre ? ` ${hint.pre}` : ""}
        {!!preVi && <Text style={{ color: C.accentText, fontStyle: "italic" }}> ({preVi})</Text>}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
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
            borderWidth: 1.5,
            borderColor: correct === null ? C.border : ok ? C.ok : C.red,
            backgroundColor: C.card,
            color: C.text,
            fontSize: 20,
            fontWeight: "700",
            paddingHorizontal: 12,
            fontVariant: ["tabular-nums"],
          }}
        />
        {!!hint?.unit && (
          <Text style={{ color: C.text, fontWeight: "800", fontSize: 16, flexShrink: 1 }}>
            {hint.unit}
            {!!unitVi && <Text style={{ color: C.accentText, fontStyle: "italic" }}> ({unitVi})</Text>}
          </Text>
        )}
        {!disabled && (
          <Pressable
            onPress={() => {
              Keyboard.dismiss();
              onSubmit();
            }}
            style={({ pressed }) => ({
              height: 44,
              paddingHorizontal: 14,
              borderRadius: 12,
              backgroundColor: pressed ? C.card2 : C.accentSoft,
              borderWidth: 1,
              borderColor: alpha(C.accent, 0.35),
              justifyContent: "center",
            })}
          >
            <Text style={{ color: C.accentText, fontSize: 14, fontWeight: "800" }}>{L("Xong", "Fertig")}</Text>
          </Pressable>
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

function NavBtn({ icon, label, disabled, onPress, primary }: { icon: SFSymbol; label: string; disabled: boolean; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: 52,
        height: 48,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: primary ? C.accent : C.border,
        backgroundColor: primary ? C.accent : C.card,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.35 : 1,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <SymbolView name={icon} size={18} weight="bold" tintColor={primary ? "#fff" : C.text} />
    </Pressable>
  );
}

function BarBtn({ title, bg, fg, disabled, onPress, wide }: { title: string; bg: string; fg: string; disabled?: boolean; onPress: () => void; wide?: boolean }) {
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
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: bg === C.card ? C.border : bg,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.4 : 1,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <Text style={{ color: fg, fontWeight: "700", fontSize: 16 }} numberOfLines={1}>
        {title}
      </Text>
    </Pressable>
  );
}

function Timer({ minutes, startedAt, onEnd }: { minutes: number; startedAt: number; onEnd: () => void }) {
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
    <Text accessibilityRole="timer" style={{ color: left < 5 * 60_000 ? C.redText : C.text, fontWeight: "800", fontSize: 16, fontVariant: ["tabular-nums"] }}>
      {mm}:{String(ss).padStart(2, "0")}
    </Text>
  );
}

function ResultCard({
  module,
  result,
  maxErrorPoints,
  onNewExam,
  onPracticeWrong,
}: {
  module: QuizModule;
  result: ExamResult;
  maxErrorPoints: number;
  onNewExam?: () => void;
  onPracticeWrong?: () => void;
}) {
  const L = useL();
  const failMsg = result.failReason
    ? result.failReason === "twoFivePointErrors"
      ? L(FAIL_TEXT.twoFivePointErrors, "Zwei 5-Punkte-Fragen falsch")
      : L(FAIL_TEXT.tooManyErrors, "Zu viele Fehlerpunkte")
    : "";
  const pct = result.total ? Math.round((result.correct / result.total) * 100) : 0;

  return (
    <View style={{ borderRadius: 20, ...STICKER, backgroundColor: alpha(result.passed ? C.ok : C.red, 0.14), padding: 16, gap: 10 }}>
      <Text style={{ color: C.text, fontSize: 21, fontWeight: "800" }}>
        {result.passed ? L("🎉 Bestanden — Đậu!", "🎉 Bestanden!") : L("Nicht bestanden — Chưa đậu", "Nicht bestanden")}
      </Text>
      <Text style={{ color: C.text, fontWeight: "700" }}>
        {module === "lid"
          ? L(`Đúng ${result.correct}/${result.total} câu · cần đúng ≥ ${result.total - maxErrorPoints}`, `${result.correct}/${result.total} richtig · nötig ≥ ${result.total - maxErrorPoints}`)
          : `${result.errorPoints}/${maxErrorPoints} ${L("điểm lỗi", "Fehlerpunkte")} · ${L("đúng", "richtig")} ${result.correct}/${result.total}${failMsg ? ` · ${failMsg}` : ""}`}
      </Text>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: C.card2, overflow: "hidden" }}>
        <View style={{ height: "100%", width: `${pct}%`, backgroundColor: result.passed ? C.ok : C.red }} />
      </View>
      <Text style={{ color: C.muted, fontSize: 13 }}>
        {L("Chạm số câu ở trên để xem lại từng câu. Bài thi đã lưu vào Thống kê.", "Tippe oben auf eine Nummer, um die Frage anzusehen. Gespeichert unter Statistik.")}
      </Text>
      {(onNewExam || onPracticeWrong) && (
        <View style={{ flexDirection: "row", gap: 8, marginTop: 2 }}>
          {onNewExam && <Button title={L("Thi đề mới", "Neue Prüfung")} variant="primary" onPress={onNewExam} style={{ flex: 1 }} />}
          {onPracticeWrong && (
            <Button
              title={L(`Ôn câu sai (${result.total - result.correct})`, `Fehler üben (${result.total - result.correct})`)}
              onPress={onPracticeWrong}
              style={{ flex: 1 }}
            />
          )}
        </View>
      )}
    </View>
  );
}
