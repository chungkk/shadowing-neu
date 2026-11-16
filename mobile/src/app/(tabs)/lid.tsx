import { useCallback, useMemo, useState } from "react";
import { View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { summarize } from "@shared/quiz/types";
import { BigTile, HeroCard, IconButton, IconRow, MenuRow, QuizTabScreen, TONES, openRun } from "@/components/quiz/QuizParts";
import { useAuth } from "@/lib/auth";
import { EXAM, EXAM_TOTAL, getSet, getState, stateIds } from "@/lib/quiz/lid";
import { syncQuiz, useModule, usePrefs } from "@/lib/quiz/store";
import { useL } from "@/lib/quiz/strings";

/** Tab Leben in Deutschland: 300 câu chung + câu của bang, thi thử 33 câu (như app LiD HalloVN cũ) */
export default function LidTab() {
  const L = useL();
  const { user } = useAuth();
  const { state } = usePrefs();
  const mod = useModule("lid");
  const [refreshing, setRefreshing] = useState(false);
  const tone = TONES();

  useFocusEffect(
    useCallback(() => {
      syncQuiz(user);
    }, [user]),
  );

  const st = getState(state)!;
  const pool = useMemo(() => getSet("hoc", state)!.ids, [state]);
  const all = summarize(pool, mod.stats);
  const poolSet = useMemo(() => new Set(pool), [pool]);
  const marked = mod.marked.filter((id) => poolSet.has(id)).length;
  const lastExam = mod.exams[0];
  const stateCount = useMemo(() => stateIds(state).length, [state]);

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
        emoji="🇩🇪"
        title="Leben in Deutschland"
        subtitle={L(`Bang: ${st.name} · ${pool.length} câu`, `Bundesland: ${st.name} · ${pool.length} Fragen`)}
        summary={all}
        onSettings={() => router.push({ pathname: "/quiz/settings", params: { module: "lid" } })}
        settingsLabel={L("Đổi bang, ngôn ngữ bản dịch", "Bundesland und Sprache ändern")}
      />
      <View style={{ flexDirection: "row", gap: 12 }}>
        <BigTile icon="book.fill" tone={tone.green} title={L("Học tất cả", "Alle lernen")} subtitle={L(`${pool.length} câu`, `${pool.length} Fragen`)} onPress={() => openRun("lid", "ueben", "hoc")} />
        <BigTile
          icon="flag.checkered"
          tone={tone.red}
          title={L("Thi thử", "Testprüfung")}
          subtitle={
            lastExam
              ? L(`Lần trước: ${lastExam.correct}/${lastExam.total} · ${lastExam.passed ? "đậu" : "trượt"}`, `Zuletzt: ${lastExam.correct}/${lastExam.total}`)
              : L(`${EXAM_TOTAL} câu · ${EXAM.minutes} phút`, `${EXAM_TOTAL} Fragen · ${EXAM.minutes} Min.`)
          }
          onPress={() => openRun("lid", "exam", "random")}
        />
      </View>
      <IconRow>
        <IconButton icon="building.columns.fill" tone={tone.blue} label={L("Câu của bang", "Bundesland")} count={stateCount} onPress={() => openRun("lid", "ueben", "state")} />
        <IconButton icon="xmark.circle.fill" tone={tone.gold} label={L("Câu sai", "Falsch")} count={all.wrong} onPress={() => openRun("lid", "ueben", "wrong")} />
        <IconButton icon="star.fill" tone={tone.purple} label={L("Đánh dấu", "Markiert")} count={marked} onPress={() => openRun("lid", "ueben", "marked")} />
        <IconButton icon="chart.bar.fill" tone={tone.teal} label={L("Thống kê", "Statistik")} count={mod.exams.length + mod.remote.length} onPress={() => router.push({ pathname: "/quiz/stats", params: { module: "lid" } })} />
      </IconRow>
      <MenuRow icon="shuffle" tone={tone.ink} title={L("Luyện 300 câu chung", "Alle 300 Fragen üben")} subtitle={L("Theo thứ tự bộ đề, nhớ câu đang học", "Der Reihe nach, mit Merkposition")} onPress={() => openRun("lid", "ueben", "tat-ca")} />
    </QuizTabScreen>
  );
}
