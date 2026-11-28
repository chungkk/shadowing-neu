import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { Stack } from "expo-router";
import { Text } from "@/components/Text";
import { ProgressBar, QuizPage, openRun } from "@/components/quiz/QuizParts";
import { Segmented } from "@/components/ui";
import { C, R, STICKER, alpha } from "@/lib/theme";
import { BOGEN_COUNT } from "@/lib/quiz/fuehrerschein";
import { useModule } from "@/lib/quiz/store";
import { useL } from "@/lib/quiz/strings";

type BogenMode = "exam" | "ueben" | "lesen";

/** 99 đề mẫu chính thức hạng B — hỗ trợ Thi thử, Luyện và Đọc + 3 chấm lịch sử gần nhất */
export default function BogenScreen() {
  const L = useL();
  const { exams, remote } = useModule("fuehrerschein");
  const [mode, setMode] = useState<BogenMode>("exam");

  const progress = useMemo(() => {
    const m = new Map<string, { passed: boolean; errorPoints: number; last: boolean[]; everPassed: boolean }>();
    for (const e of [...exams, ...remote].sort((a, b) => b.at - a.at)) {
      if (e.kind !== "bogen") continue;
      const cur = m.get(e.ref);
      if (!cur) {
        m.set(e.ref, { passed: e.passed, errorPoints: e.errorPoints, last: [e.passed], everPassed: e.passed });
      } else {
        if (cur.last.length < 3) cur.last.push(e.passed);
        if (e.passed) cur.everPassed = true;
      }
    }
    return m;
  }, [exams, remote]);

  const passedCount = useMemo(() => {
    let n = 0;
    for (const v of progress.values()) if (v.everPassed) n++;
    return n;
  }, [progress]);

  return (
    <QuizPage>
      <Stack.Screen options={{ title: L("Đề mẫu hạng B", "Musterbögen Klasse B") }} />
      <Text style={{ color: C.muted, fontSize: 14 }}>
        {L("Mỗi đề 30 câu (20 cơ bản + 10 hạng B), 45 phút, tối đa 10 điểm lỗi.", "Je 30 Fragen (20 Grundstoff + 10 Klasse B), 45 Minuten, max. 10 Fehlerpunkte.")}
      </Text>

      <View style={{ backgroundColor: C.card, borderRadius: R.lg, ...STICKER, padding: 14, gap: 10 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: C.text, fontSize: 14, fontWeight: "700" }}>
            {L(`Đã đậu ${passedCount}/${BOGEN_COUNT} đề`, `${passedCount}/${BOGEN_COUNT} Bögen bestanden`)}
          </Text>
          <Text style={{ color: C.muted, fontSize: 12, fontWeight: "600" }}>
            {Math.round((passedCount / BOGEN_COUNT) * 100)}%
          </Text>
        </View>
        <ProgressBar ok={passedCount} wrong={0} total={BOGEN_COUNT} />
      </View>

      <Segmented<BogenMode>
        options={[
          ["exam", L("Thi thử", "Prüfung")],
          ["ueben", L("Luyện", "Üben")],
          ["lesen", L("Đọc", "Lesen")],
        ]}
        value={mode}
        onChange={setMode}
      />

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {Array.from({ length: BOGEN_COUNT }, (_, i) => {
          const n = String(i + 1);
          const r = progress.get(n);
          return (
            <Pressable
              key={n}
              onPress={() => openRun("fuehrerschein", mode, `bogen:${n}`)}
              accessibilityRole="button"
              accessibilityLabel={`${L("Đề", "Bogen")} ${n}${r ? `, ${r.errorPoints} ${L("điểm lỗi", "Fehlerpunkte")}` : ""}`}
              style={({ pressed }) => ({
                width: 68,
                height: 64,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: r ? alpha(r.passed ? C.ok : C.red, 0.45) : C.border,
                backgroundColor: r ? (r.passed ? C.okSoft : C.redSoft) : C.card,
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                opacity: pressed ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.96 : 1 }],
              })}
            >
              <Text style={{ color: C.text, fontWeight: "800", fontSize: 17, fontVariant: ["tabular-nums"] }}>{n}</Text>
              {r ? (
                <View style={{ alignItems: "center", gap: 2 }}>
                  <Text style={{ color: C.muted, fontSize: 10, fontWeight: "700" }}>{r.errorPoints} FP</Text>
                  <View style={{ flexDirection: "row", gap: 3 }}>
                    {r.last.map((ok, k) => (
                      <View
                        key={k}
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: 3,
                          backgroundColor: ok ? C.ok : C.red,
                        }}
                      />
                    ))}
                  </View>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </QuizPage>
  );
}
