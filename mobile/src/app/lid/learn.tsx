import { Image } from "expo-image";
import { Stack } from "expo-router";
import { View } from "react-native";
import { summarize } from "@shared/quiz/types";
import { Text } from "@/components/Text";
import { Group, QuizPage, SetRow, openRun } from "@/components/quiz/QuizParts";
import { CATEGORIES, getSet, getState, listSets, stateIds } from "@/lib/quiz/lid";
import { useModule, usePrefs } from "@/lib/quiz/store";
import { useL } from "@/lib/quiz/strings";
import { WAPPEN } from "@/lib/quiz/wappen";
import { C, R } from "@/lib/theme";

/** Màn học Leben in Deutschland theo 3 chủ đề BAMF, 10 bộ 30 câu và 10 câu của bang (có Đọc / Luyện) */
export default function LidLearnScreen() {
  const L = useL();
  const { state } = usePrefs();
  const { stats } = useModule("lid");
  const st = getState(state)!;
  const sets = listSets();
  const stIds = stateIds(state);
  const allSet = getSet("hoc", state)!;

  return (
    <QuizPage>
      <Stack.Screen options={{ title: L("Chủ đề & Bộ câu hỏi", "Themen & Sätze") }} />

      <Group>
        <SetRow
          first
          title={L("Học tất cả (310 câu)", "Alle lernen (310 Fragen)")}
          subtitle={allSet.subtitle}
          summary={summarize(allSet.ids, stats)}
          onLesen={() => openRun("lid", "lesen", "hoc")}
          onUeben={() => openRun("lid", "ueben", "hoc")}
        />
      </Group>

      <Group title={L("10 câu riêng của bang", "10 Landesfragen")}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingTop: 12 }}>
          {WAPPEN[st.code] && (
            <Image source={WAPPEN[st.code]} style={{ width: 28, height: 32, borderRadius: 4 }} contentFit="contain" />
          )}
          <Text style={{ color: C.muted, fontSize: 13, flex: 1 }}>
            {st.name} · {L("Thủ phủ", "Hauptstadt")}: {st.capital}
          </Text>
        </View>
        <SetRow
          first
          title={L(`10 câu của ${st.name}`, `10 Fragen · ${st.name}`)}
          summary={summarize(stIds, stats)}
          onLesen={() => openRun("lid", "lesen", "state")}
          onUeben={() => openRun("lid", "ueben", "state")}
        />
      </Group>

      <Group title={L("3 chủ đề BAMF", "3 Themenbereiche")}>
        {CATEGORIES.map((cat, i) => {
          const s = getSet(cat.key, state);
          if (!s) return null;
          return (
            <SetRow
              key={cat.key}
              first={i === 0}
              title={L(cat.vi, cat.de)}
              subtitle={L(cat.de, `${s.ids.length} Fragen`)}
              summary={summarize(s.ids, stats)}
              onLesen={() => openRun("lid", "lesen", cat.key)}
              onUeben={() => openRun("lid", "ueben", cat.key)}
            />
          );
        })}
      </Group>

      <Group title={L("10 bộ câu hỏi (300 câu chung)", "10 Sätze (300 allgemeine Fragen)")}>
        {sets.map((set, i) => (
          <SetRow
            key={set.id}
            first={i === 0}
            title={L(`Câu ${set.from}–${set.to}`, `Fragen ${set.from}–${set.to}`)}
            subtitle={`${set.ids.length} ${L("câu", "Fragen")}`}
            summary={summarize(set.ids, stats)}
            onLesen={() => openRun("lid", "lesen", set.id)}
            onUeben={() => openRun("lid", "ueben", set.id)}
          />
        ))}
      </Group>

      <View style={{ borderRadius: R.md, padding: 4 }} />
    </QuizPage>
  );
}
