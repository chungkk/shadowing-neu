import { useCallback, useMemo, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { summarize } from "@shared/quiz-types";
import { ActionGrid, ActionTile, HeroCard, QuizTabScreen, TONES, openRun } from "@/components/quiz/QuizParts";
import { useAuth } from "@/lib/auth";
import { EXAM, EXAM_TOTAL, getSet, getState } from "@/lib/quiz/lid";
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

  return (
    <QuizTabScreen
      refreshing={refreshing}
      onRefresh={
        user
          ? () => {
              setRefreshing(true);
              syncQuiz(user).finally(() => setRefreshing(false));
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
      <ActionGrid>
        <ActionTile icon="book.fill" tone={tone.green} title={L("Học tất cả", "Alle lernen")} subtitle={L("Câu chung + câu của bang", "Allgemein + Bundesland")} onPress={() => openRun("lid", "ueben", "hoc")} />
        <ActionTile
          icon="timer"
          tone={tone.red}
          title={L("Thi thử", "Testprüfung")}
          subtitle={
            lastExam
              ? L(`Lần trước: ${lastExam.correct}/${lastExam.total} · ${lastExam.passed ? "đậu" : "trượt"}`, `Zuletzt: ${lastExam.correct}/${lastExam.total}`)
              : L(`${EXAM_TOTAL} câu · ${EXAM.minutes} phút · đúng ≥ ${EXAM.pass}`, `${EXAM_TOTAL} Fragen · ${EXAM.minutes} Min.`)
          }
          onPress={() => openRun("lid", "exam", "random")}
        />
        <ActionTile icon="xmark.circle.fill" tone={tone.gold} title={L("Câu đang sai", "Falsche Fragen")} subtitle={L(`${all.wrong} câu`, `${all.wrong} Fragen`)} onPress={() => openRun("lid", "ueben", "wrong")} />
        <ActionTile icon="star.fill" tone={tone.purple} title={L("Đã đánh dấu", "Markiert")} subtitle={L(`${marked} câu`, `${marked} Fragen`)} onPress={() => openRun("lid", "ueben", "marked")} />
        <ActionTile icon="chart.bar.fill" tone={tone.teal} title={L("Thống kê", "Statistik")} subtitle={L(`${mod.exams.length + mod.remote.length} bài thi`, `${mod.exams.length + mod.remote.length} Prüfungen`)} onPress={() => router.push({ pathname: "/quiz/stats", params: { module: "lid" } })} wide />
      </ActionGrid>
    </QuizTabScreen>
  );
}
