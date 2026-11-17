import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { Stack } from "expo-router";
import { Text } from "@/components/Text";
import { QuizPage, openRun } from "@/components/quiz/QuizParts";
import { C, alpha } from "@/lib/theme";
import { BOGEN_COUNT } from "@/lib/quiz/fuehrerschein";
import { useModule } from "@/lib/quiz/store";
import { useL } from "@/lib/quiz/strings";

/** 99 đề mẫu chính thức hạng B — ô xanh = lần làm gần nhất đậu, đỏ = trượt */
export default function BogenScreen() {
  const L = useL();
  const { exams, remote } = useModule("fuehrerschein");
  const last = useMemo(() => {
    const m = new Map<string, { passed: boolean; errorPoints: number }>();
    for (const e of [...exams, ...remote].sort((a, b) => b.at - a.at)) if (e.kind === "bogen" && !m.has(e.ref)) m.set(e.ref, e);
    return m;
  }, [exams, remote]);

  return (
    <QuizPage>
      <Stack.Screen options={{ title: L("Đề mẫu hạng B", "Musterbögen Klasse B") }} />
      <Text style={{ color: C.muted, fontSize: 14 }}>
        {L("Mỗi đề 30 câu (20 cơ bản + 10 hạng B), 45 phút, tối đa 10 điểm lỗi.", "Je 30 Fragen (20 Grundstoff + 10 Klasse B), 45 Minuten, max. 10 Fehlerpunkte.")}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {Array.from({ length: BOGEN_COUNT }, (_, i) => {
          const n = String(i + 1);
          const r = last.get(n);
          return (
            <Pressable
              key={n}
              onPress={() => openRun("fuehrerschein", "exam", `bogen:${n}`)}
              accessibilityRole="button"
              accessibilityLabel={`${L("Đề", "Bogen")} ${n}${r ? `, ${r.errorPoints} ${L("điểm lỗi", "Fehlerpunkte")}` : ""}`}
              style={({ pressed }) => ({
                width: 64,
                height: 58,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: r ? alpha(r.passed ? C.ok : C.red, 0.45) : C.border,
                backgroundColor: r ? (r.passed ? C.okSoft : C.redSoft) : C.card,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.96 : 1 }],
              })}
            >
              <Text style={{ color: C.text, fontWeight: "800", fontSize: 17, fontVariant: ["tabular-nums"] }}>{n}</Text>
              {r && <Text style={{ color: C.muted, fontSize: 11, fontWeight: "700" }}>{r.errorPoints} FP</Text>}
            </Pressable>
          );
        })}
      </View>
    </QuizPage>
  );
}
