import { useCallback, useMemo, useState } from "react";
import { View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { summarize } from "@shared/quiz/types";
import { BigTile, HeroCard, IconButton, IconRow, MenuRow, QuizTabScreen, TONES, openRun } from "@/components/quiz/QuizParts";
import { useAuth } from "@/lib/auth";
import { BOGEN_COUNT, classInfo, classQuestionIds } from "@/lib/quiz/fuehrerschein";
import { syncQuiz, useModule, usePrefs } from "@/lib/quiz/store";
import { useL } from "@/lib/quiz/strings";

/** Tab Lái xe: lý thuyết bằng lái Đức mọi hạng (như tab Lái xe của web / app Führerschein cũ) */
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
  const all = summarize(ids, mod.stats);
  const pool = useMemo(() => new Set(ids), [ids]);
  const marked = mod.marked.filter((id) => pool.has(id)).length;
  const lastExam = mod.exams.find((e) => e.kind === "random" && e.cls === cls);

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
        subtitle={`${info.vi} · ${info.description}`}
        summary={all}
        onSettings={() => router.push({ pathname: "/quiz/settings", params: { module: "fuehrerschein" } })}
        settingsLabel={L("Đổi hạng bằng, ngôn ngữ bản dịch", "Klasse und Sprache ändern")}
      />
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
    </QuizTabScreen>
  );
}
