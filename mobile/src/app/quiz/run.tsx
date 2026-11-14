import { useState } from "react";
import { Stack, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { Text } from "@/components/Text";
import { styles } from "@/components/ui";
import { QuizRunner } from "@/components/quiz/QuizRunner";
import { C } from "@/lib/theme";
import { buildRun, isRunMode } from "@/lib/quiz/run";
import { useL } from "@/lib/quiz/strings";

/** /quiz/run?module=fuehrerschein|lid&mode=lesen|ueben|exam|review&scope=… — đề dựng 1 lần lúc mở màn */
export default function QuizRunScreen() {
  const L = useL();
  const p = useLocalSearchParams<{ module: string; mode: string; scope: string }>();
  const module = p.module === "lid" ? "lid" : "fuehrerschein";
  const mode = isRunMode(p.mode) ? p.mode : "ueben";
  const [run] = useState(() => buildRun(module, mode, p.scope ?? "all"));
  if (!run)
    return (
      <View style={[styles.screen, { alignItems: "center", justifyContent: "center", padding: 24 }]}>
        <Stack.Screen options={{ title: "" }} />
        <Text style={{ color: C.muted, fontSize: 16 }}>{L("Không tìm thấy bộ câu hỏi này.", "Diese Fragen wurden nicht gefunden.")}</Text>
      </View>
    );
  return <QuizRunner key={`${module}-${mode}-${p.scope}`} module={module} mode={mode} run={run} />;
}
