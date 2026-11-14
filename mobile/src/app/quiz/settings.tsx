import { Pressable, Switch, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Text } from "@/components/Text";
import { Group, QuizPage } from "@/components/quiz/QuizParts";
import { C } from "@/lib/theme";
import { CLASS_GROUPS, classInfo, classQuestionIds, type ClassId } from "@/lib/quiz/fuehrerschein";
import { STATES } from "@/lib/quiz/lid";
import { setPrefs, usePrefs } from "@/lib/quiz/store";
import { useL } from "@/lib/quiz/strings";

/** Cài đặt phần Lái xe (hạng bằng) / LiD (bang) + hiện/ẩn bản dịch tiếng Việt (dùng chung 2 phần) */
export default function QuizSettingsScreen() {
  const L = useL();
  const p = useLocalSearchParams<{ module: string }>();
  const lid = p.module === "lid";
  const prefs = usePrefs();

  return (
    <QuizPage>
      <Stack.Screen options={{ title: L("Cài đặt", "Einstellungen") }} />

      <Group>
        <Toggle first title={L("Hiện bản dịch khi học", "Übersetzung beim Lernen")} value={prefs.trLearn} onChange={(v) => setPrefs({ trLearn: v })} />
        <Toggle title={L("Hiện bản dịch khi thi thử", "Übersetzung in der Prüfung")} value={prefs.trExam} onChange={(v) => setPrefs({ trExam: v })} />
        {lid && <Toggle title={L("Tự đánh dấu câu làm sai", "Falsche Fragen automatisch markieren")} value={prefs.autoMark} onChange={(v) => setPrefs({ autoMark: v })} />}
      </Group>

      {lid ? (
        <Group title={L("Bang của bạn", "Dein Bundesland")}>
          {STATES.map((s, i) => (
            <Choice key={s.code} first={i === 0} title={s.name} subtitle={s.capital} on={prefs.state === s.code} onPress={() => setPrefs({ state: s.code })} />
          ))}
        </Group>
      ) : (
        CLASS_GROUPS.map((g) => (
          <Group key={g.title} title={L(g.title, g.de)}>
            {g.classes.map((id: ClassId, i) => {
              const c = classInfo(id);
              return (
                <Choice
                  key={id}
                  first={i === 0}
                  title={`${L("Hạng", "Klasse")} ${c.name}`}
                  subtitle={`${L(c.vi, c.description)} · ${classQuestionIds(id).length} ${L("câu", "Fragen")} · ${c.exam.questions} ${L("câu thi", "Prüfungsfragen")}`}
                  on={prefs.cls === id}
                  onPress={() => setPrefs({ cls: id })}
                />
              );
            })}
          </Group>
        ))
      )}
    </QuizPage>
  );
}

function Choice({ title, subtitle, on, first, onPress }: { title: string; subtitle?: string; on: boolean; first?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 52, borderTopWidth: first ? 0 : 1, borderTopColor: C.border, backgroundColor: pressed ? C.card2 : "transparent" })}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: C.text, fontSize: 16, fontWeight: on ? "800" : "600" }}>{title}</Text>
        {!!subtitle && <Text style={{ color: C.muted, fontSize: 13 }}>{subtitle}</Text>}
      </View>
      {on && <SymbolView name="checkmark" size={16} weight="bold" tintColor={C.accentText} />}
    </Pressable>
  );
}

function Toggle({ title, value, onChange, first }: { title: string; value: boolean; onChange: (v: boolean) => void; first?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, minHeight: 52, borderTopWidth: first ? 0 : 1, borderTopColor: C.border }}>
      <Text style={{ flex: 1, color: C.text, fontSize: 16, fontWeight: "600" }}>{title}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: C.accent }} />
    </View>
  );
}
