import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import { formatDuration, type ExamRecord } from "@shared/laixe/rules";
import { summarize } from "@shared/quiz/types";
import { Text } from "@/components/Text";
import { Group, HeroCard, ProgressBar, QuizPage, openRun } from "@/components/quiz/QuizParts";
import { useAuth } from "@/lib/auth";
import { C, R, STICKER, alpha } from "@/lib/theme";
import { confirmDestructive } from "@/lib/dialogs";
import { classQuestionIds, isGrund } from "@/lib/quiz/fuehrerschein";
import { generalIds, getSet, stateIds } from "@/lib/quiz/lid";
import { examTitle } from "@/lib/quiz/run";
import { resetModule, useModule, usePrefs, type LocalExam } from "@/lib/quiz/store";
import { useL } from "@/lib/quiz/strings";

/** Thống kê 1 phần: tiến độ phân nhóm, 4 chỉ số KPI, câu sai bài gần nhất & lịch sử thi (kể cả bài trên Web) */
export default function QuizStatsScreen() {
  const L = useL();
  const { user } = useAuth();
  const p = useLocalSearchParams<{ module: string }>();
  const module = p.module === "lid" ? "lid" : "fuehrerschein";
  const prefs = usePrefs();
  const mod = useModule(module);
  const ids = useMemo(() => (module === "lid" ? getSet("hoc", prefs.state)!.ids : classQuestionIds(prefs.cls)), [module, prefs.state, prefs.cls]);
  const all = summarize(ids, mod.stats);

  const part1 = useMemo(() => {
    const sub = module === "lid" ? generalIds() : ids.filter(isGrund);
    return {
      label: module === "lid" ? L("300 câu chung", "300 allgemeine Fragen") : "Grundstoff",
      sum: summarize(sub, mod.stats),
    };
  }, [module, ids, mod.stats, L]);

  const part2 = useMemo(() => {
    const sub = module === "lid" ? stateIds(prefs.state) : ids.filter((id) => !isGrund(id));
    return {
      label: module === "lid" ? L("10 câu của bang", "10 Landesfragen") : `Zusatzstoff ${prefs.cls}`,
      sum: summarize(sub, mod.stats),
    };
  }, [module, prefs.state, prefs.cls, ids, mod.stats, L]);

  const history = useMemo(
    () => [...mod.exams.map((e) => ({ e, local: true as const })), ...mod.remote.map((e) => ({ e, local: false as const }))].sort((a, b) => b.e.at - a.e.at),
    [mod.exams, mod.remote],
  );
  const passed = history.filter((h) => h.e.passed).length;
  const accuracy = all.done ? Math.round((all.ok / all.done) * 100) : 0;
  const passRate = history.length ? Math.round((passed / history.length) * 100) : 0;
  const avgScore = history.length
    ? module === "lid"
      ? (history.reduce((s, h) => s + h.e.correct, 0) / history.length).toFixed(1)
      : (history.reduce((s, h) => s + h.e.errorPoints, 0) / history.length).toFixed(1)
    : "—";
  const poolSet = useMemo(() => new Set(ids), [ids]);
  const markedCount = mod.marked.filter((id) => poolSet.has(id)).length;
  const latestExam = history[0];
  const latestHasMistakes = !!latestExam && latestExam.e.correct < latestExam.e.total;

  return (
    <QuizPage>
      <Stack.Screen options={{ title: L("Thống kê", "Statistik") }} />
      <HeroCard
        sec={module === "lid" ? "lid" : "laixe"}
        icon={module === "lid" ? "building.columns.fill" : "car.fill"}
        title={module === "lid" ? "Leben in Deutschland" : L(`Hạng ${prefs.cls}`, `Klasse ${prefs.cls}`)}
        subtitle={history.length ? L(`${history.length} bài thi · đậu ${passed}`, `${history.length} Prüfungen · ${passed} bestanden`) : L("Chưa có bài thi nào", "Noch keine Prüfung")}
        summary={all}
        onSettings={() => router.push({ pathname: "/quiz/settings", params: { module } })}
        settingsLabel={L("Cài đặt", "Einstellungen")}
      />

      {/* Phân chia 2 phần */}
      <View style={{ backgroundColor: C.card, borderRadius: R.lg, ...STICKER, padding: 14, gap: 12 }}>
        <View style={{ gap: 5 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: C.text, fontSize: 13, fontWeight: "700" }}>{part1.label}</Text>
            <Text style={{ color: C.muted, fontSize: 12, fontVariant: ["tabular-nums"] }}>
              {part1.sum.done}/{part1.sum.total} · ✓ {part1.sum.ok}
            </Text>
          </View>
          <ProgressBar ok={part1.sum.ok} wrong={part1.sum.wrong} total={part1.sum.total} />
        </View>
        {part2.sum.total > 0 && (
          <View style={{ gap: 5 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: C.text, fontSize: 13, fontWeight: "700" }}>{part2.label}</Text>
              <Text style={{ color: C.muted, fontSize: 12, fontVariant: ["tabular-nums"] }}>
                {part2.sum.done}/{part2.sum.total} · ✓ {part2.sum.ok}
              </Text>
            </View>
            <ProgressBar ok={part2.sum.ok} wrong={part2.sum.wrong} total={part2.sum.total} />
          </View>
        )}
      </View>

      {/* 4 ô KPI */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        <KpiCard label={L("Tỉ lệ đúng", "Trefferquote")} value={all.done ? `${accuracy}%` : "—"} color={C.okText} />
        <KpiCard label={L("Đánh dấu", "Markiert")} value={String(markedCount)} color={C.amber} />
        <KpiCard label={L("Tỉ lệ đậu", "Bestanden")} value={history.length ? `${passRate}%` : "—"} color={C.accentText} />
        <KpiCard
          label={module === "lid" ? L("Đúng TB", "Ø Richtig") : L("Lỗi TB (FP)", "Ø Fehlerp.")}
          value={String(avgScore)}
          color={C.text}
        />
      </View>

      {latestHasMistakes && (
        <Pressable
          onPress={() => openRun(module, "ueben", "wrong-last")}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            padding: 14,
            borderRadius: R.lg,
            backgroundColor: pressed ? C.card2 : C.redSoft,
            borderWidth: 1,
            borderColor: alpha(C.red, 0.35),
          })}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
            <SymbolView name="xmark.circle.fill" size={20} tintColor={C.redText} />
            <Text style={{ color: C.redText, fontSize: 14, fontWeight: "700", flex: 1 }}>
              {L("Ôn câu sai của bài thi gần nhất", "Fehler der letzten Prüfung üben")}
            </Text>
          </View>
          <SymbolView name="chevron.right" size={14} tintColor={C.redText} weight="semibold" />
        </Pressable>
      )}

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

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ flexGrow: 1, flexBasis: "45%", backgroundColor: C.card, borderRadius: R.lg, ...STICKER, padding: 14, gap: 4 }}>
      <Text style={{ color, fontSize: 22, fontWeight: "800", fontVariant: ["tabular-nums"] }}>{value}</Text>
      <Text style={{ color: C.muted, fontSize: 12, fontWeight: "600" }}>{label}</Text>
    </View>
  );
}

function ExamRow({ module, e, local, first }: { module: "fuehrerschein" | "lid"; e: LocalExam | ExamRecord; local: boolean; first: boolean }) {
  const L = useL();
  const when = new Date(e.at).toLocaleString(undefined, { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  const score = module === "lid" ? `${e.correct}/${e.total}` : `${e.errorPoints}/${e.maxErrorPoints} FP`;
  const scope = local ? String(e.id) : `remote:${e.id}`;
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/quiz/run", params: { module, mode: "review", scope } })}
      accessibilityRole="button"
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderTopWidth: first ? 0 : 1, borderTopColor: C.border, backgroundColor: pressed ? C.card2 : "transparent" })}
    >
      <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: alpha(e.passed ? C.ok : C.red, 0.2) }}>
        <SymbolView name={e.passed ? "checkmark" : "xmark"} size={15} weight="bold" tintColor={e.passed ? C.okText : C.redText} />
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
      <Text style={{ color: e.passed ? C.okText : C.redText, fontWeight: "800", fontVariant: ["tabular-nums"] }}>{score}</Text>
      <SymbolView name="chevron.right" size={13} tintColor={C.muted} />
    </Pressable>
  );
}
