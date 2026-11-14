import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import { formatDuration, type ExamRecord } from "@shared/fuehrerschein-rules";
import { summarize } from "@shared/quiz-types";
import { Text } from "@/components/Text";
import { Group, HeroCard, QuizPage } from "@/components/quiz/QuizParts";
import { useAuth } from "@/lib/auth";
import { C, alpha } from "@/lib/theme";
import { confirmDestructive } from "@/lib/dialogs";
import { classQuestionIds } from "@/lib/quiz/fuehrerschein";
import { getSet } from "@/lib/quiz/lid";
import { examTitle } from "@/lib/quiz/run";
import { resetModule, useModule, usePrefs, type LocalExam } from "@/lib/quiz/store";
import { useL } from "@/lib/quiz/strings";

/** Thống kê 1 phần: tiến độ + lịch sử thi (bài làm trên máy xem lại được; bài làm trên web chỉ có điểm) */
export default function QuizStatsScreen() {
  const L = useL();
  const { user } = useAuth();
  const p = useLocalSearchParams<{ module: string }>();
  const module = p.module === "lid" ? "lid" : "fuehrerschein";
  const prefs = usePrefs();
  const mod = useModule(module);
  const ids = useMemo(() => (module === "lid" ? getSet("hoc", prefs.state)!.ids : classQuestionIds(prefs.cls)), [module, prefs.state, prefs.cls]);
  const all = summarize(ids, mod.stats);
  const history = useMemo(
    () => [...mod.exams.map((e) => ({ e, local: true as const })), ...mod.remote.map((e) => ({ e, local: false as const }))].sort((a, b) => b.e.at - a.e.at),
    [mod.exams, mod.remote],
  );
  const passed = history.filter((h) => h.e.passed).length;

  return (
    <QuizPage>
      <Stack.Screen options={{ title: L("Thống kê", "Statistik") }} />
      <HeroCard
        emoji={module === "lid" ? "🇩🇪" : "🚗"}
        title={module === "lid" ? "Leben in Deutschland" : L(`Hạng ${prefs.cls}`, `Klasse ${prefs.cls}`)}
        subtitle={history.length ? L(`${history.length} bài thi · đậu ${passed}`, `${history.length} Prüfungen · ${passed} bestanden`) : L("Chưa có bài thi nào", "Noch keine Prüfung")}
        summary={all}
        onSettings={() => router.push({ pathname: "/quiz/settings", params: { module } })}
        settingsLabel={L("Cài đặt", "Einstellungen")}
      />

      <Group title={L("Lịch sử thi", "Prüfungsverlauf")}>
        {history.length ? (
          history.map(({ e, local }, i) => <ExamRow key={`${local ? "l" : "r"}${e.id}`} module={module} e={e} local={local} first={i === 0} />)
        ) : (
          <Text style={{ color: C.muted, padding: 16 }}>{L("Làm bài thi thử để xem kết quả ở đây.", "Mach eine Testprüfung, um hier Ergebnisse zu sehen.")}</Text>
        )}
      </Group>

      <Pressable
        onPress={() =>
          confirmDestructive(
            L("Xoá tiến độ?", "Fortschritt löschen?"),
            L("Xoá kết quả từng câu, câu đánh dấu và lịch sử thi của phần này", "Ergebnisse, Markierungen und Prüfungsverlauf dieses Bereichs werden gelöscht") + (user ? L(" (cả trên tài khoản).", " (auch im Konto).") : "."),
            L("Xoá", "Löschen"),
            () => resetModule(module, true, user),
          )
        }
        accessibilityRole="button"
        style={({ pressed }) => ({ alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 6, padding: 10, opacity: pressed ? 0.6 : 1 })}
      >
        <SymbolView name="trash" size={15} tintColor={C.redText} />
        <Text style={{ color: C.redText, fontWeight: "700" }}>{L("Xoá tiến độ phần này", "Fortschritt zurücksetzen")}</Text>
      </Pressable>
    </QuizPage>
  );
}

function ExamRow({ module, e, local, first }: { module: "fuehrerschein" | "lid"; e: LocalExam | ExamRecord; local: boolean; first: boolean }) {
  const L = useL();
  const when = new Date(e.at).toLocaleString(undefined, { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  const score = module === "lid" ? `${e.correct}/${e.total}` : `${e.errorPoints}/${e.maxErrorPoints} FP`;
  return (
    <Pressable
      onPress={local ? () => router.push({ pathname: "/quiz/run", params: { module, mode: "review", scope: String(e.id) } }) : undefined}
      disabled={!local}
      accessibilityRole={local ? "button" : undefined}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderTopWidth: first ? 0 : 1, borderTopColor: C.border, backgroundColor: pressed ? C.card2 : "transparent" })}
    >
      <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: alpha(e.passed ? C.accent : C.red, 0.2) }}>
        <SymbolView name={e.passed ? "checkmark" : "xmark"} size={15} weight="bold" tintColor={e.passed ? C.accentText : C.redText} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: C.text, fontSize: 15, fontWeight: "700" }} numberOfLines={1}>
          {examTitle(module, e)}
        </Text>
        <Text style={{ color: C.muted, fontSize: 13 }}>
          {when} · {formatDuration(e.durationS)}
          {local ? "" : ` · ${L("làm trên web", "im Web")}`}
        </Text>
      </View>
      <Text style={{ color: e.passed ? C.accentText : C.redText, fontWeight: "800", fontVariant: ["tabular-nums"] }}>{score}</Text>
      {local && <SymbolView name="chevron.right" size={13} tintColor={C.muted} />}
    </Pressable>
  );
}
