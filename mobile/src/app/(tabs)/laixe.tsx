import { useCallback, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { SymbolView } from "expo-symbols";
import { summarize } from "@shared/quiz/types";
import { Text } from "@/components/Text";
import { BigTile, HeroCard, IconButton, IconRow, MenuRow, ProgressBar, QuizTabScreen, TONES, openRun } from "@/components/quiz/QuizParts";
import { useAuth } from "@/lib/auth";
import { BOGEN_COUNT, classInfo, classQuestionIds, isGrund } from "@/lib/quiz/fuehrerschein";
import { syncQuiz, useModule, usePrefs } from "@/lib/quiz/store";
import { useL } from "@/lib/quiz/strings";
import { C, R, SEC, STICKER } from "@/lib/theme";

/** Tab Lái xe: lý thuyết bằng lái Đức mọi hạng */
export default function LaixeTab() {
  const L = useL();
  const { user } = useAuth();
  const { cls } = usePrefs();
  const mod = useModule("fuehrerschein");
  const [refreshing, setRefreshing] = useState(false);
  const tone = TONES();

  useFocusEffect(
    useCallback(() => {
      syncQuiz(user);
    }, [user]),
  );

  const info = classInfo(cls);
  const ids = useMemo(() => classQuestionIds(cls), [cls]);
  const grundIds = useMemo(() => ids.filter(isGrund), [ids]);
  const zusatzIds = useMemo(() => ids.filter((id) => !isGrund(id)), [ids]);
  const all = summarize(ids, mod.stats);
  const grund = summarize(grundIds, mod.stats);
  const zusatz = summarize(zusatzIds, mod.stats);
  const pool = useMemo(() => new Set(ids), [ids]);
  const marked = mod.marked.filter((id) => pool.has(id)).length;
  const lastExam = useMemo(
    () => [...mod.exams, ...mod.remote].sort((a, b) => b.at - a.at).find((e) => e.kind === "random" && e.cls === cls),
    [mod.exams, mod.remote, cls],
  );

  return (
    <QuizTabScreen
      refreshing={refreshing}
      onRefresh={
        user
          ? () => {
              setRefreshing(true);
              syncQuiz(user, { force: true }).finally(() => setRefreshing(false));
            }
          : undefined
      }
    >
      <HeroCard
        sec="laixe"
        icon="car.fill"
        title={L(`Lái xe · Hạng ${cls}`, `Führerschein · Klasse ${cls}`)}
        subtitle={L(`${info.vi} · ${info.description}`, info.description)}
        summary={all}
        onSettings={() => router.push({ pathname: "/quiz/settings", params: { module: "fuehrerschein" } })}
        settingsLabel={L("Đổi hạng bằng và tuỳ chọn", "Klasse und Optionen ändern")}
      />

      {/* Tách tiến độ Grundstoff / Zusatzstoff */}
      <View style={{ backgroundColor: C.card, borderRadius: R.lg, ...STICKER, padding: 14, gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: C.text, fontSize: 14, fontWeight: "700" }}>
            {L("Cấu trúc hạng", "Prüfungsstruktur")} {cls}
          </Text>
          <Text style={{ color: C.muted, fontSize: 12, fontWeight: "600" }}>
            {info.exam.grundstoff} Grund + {info.exam.questions - info.exam.grundstoff} Zusatz
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            onPress={() => openRun("fuehrerschein", "ueben", "grund")}
            style={({ pressed }) => ({
              flex: 1,
              padding: 10,
              borderRadius: R.md,
              backgroundColor: pressed ? C.card2 : C.background,
              borderWidth: 1,
              borderColor: C.line,
              gap: 6,
            })}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: C.text, fontSize: 13, fontWeight: "700" }}>Grundstoff</Text>
              <SymbolView name="chevron.right" size={11} tintColor={C.muted} />
            </View>
            <ProgressBar ok={grund.ok} wrong={grund.wrong} total={grund.total} />
            <Text style={{ color: C.muted, fontSize: 12, fontVariant: ["tabular-nums"] }}>
              {grund.done}/{grund.total}
            </Text>
          </Pressable>
          {zusatz.total > 0 && (
            <Pressable
              onPress={() => openRun("fuehrerschein", "ueben", "zusatz")}
              style={({ pressed }) => ({
                flex: 1,
                padding: 10,
                borderRadius: R.md,
                backgroundColor: pressed ? C.card2 : C.background,
                borderWidth: 1,
                borderColor: C.line,
                gap: 6,
              })}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: C.text, fontSize: 13, fontWeight: "700" }}>Zusatzstoff {cls}</Text>
                <SymbolView name="chevron.right" size={11} tintColor={C.muted} />
              </View>
              <ProgressBar ok={zusatz.ok} wrong={zusatz.wrong} total={zusatz.total} />
              <Text style={{ color: C.muted, fontSize: 12, fontVariant: ["tabular-nums"] }}>
                {zusatz.done}/{zusatz.total}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <BigTile icon="book.fill" sec="laixe" title={L("Học theo chủ đề", "Lernen nach Themen")} subtitle={L(`${ids.length} câu`, `${ids.length} Fragen`)} onPress={() => router.push("/laixe/learn")} />
        <BigTile
          icon="flag.checkered"
          sec="laixe" tone="ink"
          title={L("Thi thử", "Testprüfung")}
          subtitle={
            lastExam
              ? L(`Lần trước: ${lastExam.errorPoints} điểm lỗi · ${lastExam.passed ? "đậu" : "trượt"}`, `Zuletzt: ${lastExam.errorPoints} Fehlerpunkte`)
              : L(`${info.exam.questions} câu · ${info.exam.minutes} phút`, `${info.exam.questions} Fragen · ${info.exam.minutes} Min.`)
          }
          onPress={() => openRun("fuehrerschein", "exam", "random")}
        />
      </View>
      <IconRow>
        {cls === "B" && <IconButton icon="doc.text.fill" tone={tone.doc} label={L("Đề mẫu", "Musterbögen")} count={BOGEN_COUNT} onPress={() => router.push("/laixe/bogen")} />}
        <IconButton icon="xmark.circle.fill" tone={tone.wrong} label={L("Câu sai", "Falsch")} count={all.wrong} onPress={() => openRun("fuehrerschein", "ueben", "wrong")} />
        <IconButton icon="star.fill" tone={tone.marked} label={L("Đánh dấu", "Markiert")} count={marked} onPress={() => openRun("fuehrerschein", "ueben", "marked")} />
        <IconButton icon="chart.bar.fill" tone={tone.stats} label={L("Thống kê", "Statistik")} count={mod.exams.length + mod.remote.length} onPress={() => router.push({ pathname: "/quiz/stats", params: { module: "fuehrerschein" } })} />
      </IconRow>
      <MenuRow icon="shuffle" tone={tone.all} title={L("Luyện tất cả", "Alle Fragen üben")} subtitle={L("Theo thứ tự bộ đề, nhớ câu đang học", "Der Reihe nach, mit Merkposition")} onPress={() => openRun("fuehrerschein", "ueben", "all")} />
      <Text style={{ color: SEC.laixe.secText, fontSize: 12, textAlign: "center", opacity: 0 }}> </Text>
    </QuizTabScreen>
  );
}
