import { useMemo, useState } from "react";
import { LayoutAnimation, Pressable, View } from "react-native";
import { Stack } from "expo-router";
import { SymbolView } from "expo-symbols";
import { summarize } from "@shared/quiz/types";
import { Text } from "@/components/Text";
import { Group, ProgressBar, QuizPage, SetRow, SmallBtn, openRun } from "@/components/quiz/QuizParts";
import { C } from "@/lib/theme";
import { learnTree, type ThemeNode } from "@/lib/quiz/fuehrerschein";
import { useModule, usePrefs } from "@/lib/quiz/store";
import { useL } from "@/lib/quiz/strings";

/** Học theo chủ đề: Grundstoff / Zusatzstoff → chủ đề (mở ra xem các chương) */
export default function LearnScreen() {
  const L = useL();
  const { cls } = usePrefs();
  const { stats } = useModule("fuehrerschein");
  const tree = useMemo(() => learnTree(cls), [cls]);
  const [open, setOpen] = useState<string | null>(null);

  return (
    <QuizPage>
      <Stack.Screen options={{ title: L(`Học · Hạng ${cls}`, `Lernen · Klasse ${cls}`) }} />
      {tree.map((p) => (
        <Group key={p.key} title={`${p.title} · ${p.ids.length}`}>
          <SetRow
            first
            title={L(p.key === "grund" ? "Toàn bộ phần cơ bản" : `Toàn bộ phần riêng hạng ${cls}`, p.key === "grund" ? "Alle Grundstoff-Fragen" : `Alle Zusatzstoff-Fragen ${cls}`)}
            summary={summarize(p.ids, stats)}
            onLesen={() => openRun("fuehrerschein", "lesen", p.key)}
            onUeben={() => openRun("fuehrerschein", "ueben", p.key)}
          />
          {p.themes.map((t) => (
            <ThemeRow
              key={t.id}
              theme={t}
              stats={stats}
              open={open === t.id}
              onToggle={() => {
                LayoutAnimation.easeInEaseOut();
                setOpen(open === t.id ? null : t.id);
              }}
            />
          ))}
        </Group>
      ))}
    </QuizPage>
  );
}

function ThemeRow({ theme, stats, open, onToggle }: { theme: ThemeNode; stats: Parameters<typeof summarize>[1]; open: boolean; onToggle: () => void }) {
  const L = useL();
  const s = summarize(theme.ids, stats);
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: C.border }}>
      <View style={{ padding: 14, gap: 8 }}>
        <Pressable
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 10, opacity: pressed ? 0.75 : 1 })}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: C.text, fontSize: 16, fontWeight: "700" }}>{L(theme.vi || theme.de, theme.de)}</Text>
            <Text style={{ color: C.muted, fontSize: 13 }}>
              {theme.id} · {L(`${theme.de} · ${theme.ids.length}`, `${theme.ids.length} Fragen`)}
            </Text>
          </View>
          <SymbolView name={open ? "chevron.down" : "chevron.right"} size={13} tintColor={C.muted} weight="semibold" />
        </Pressable>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <ProgressBar ok={s.ok} wrong={s.wrong} total={s.total} />
          </View>
          <Text style={{ color: C.muted, fontSize: 12, fontWeight: "700", fontVariant: ["tabular-nums"] }}>
            {s.done}/{s.total}
          </Text>
          <SmallBtn title="Lesen" onPress={() => openRun("fuehrerschein", "lesen", theme.id)} />
          <SmallBtn title="Üben" primary onPress={() => openRun("fuehrerschein", "ueben", theme.id)} />
        </View>
      </View>
      {open && (
        <View style={{ marginLeft: 14, borderLeftWidth: 1, borderLeftColor: C.line }}>
          {theme.chapters.map((c, i) => (
            <SetRow
              key={c.id}
              first={i === 0}
              title={L(c.vi || c.de, c.de)}
              subtitle={L(`${c.id} · ${c.de} · ${c.ids.length}`, `${c.id} · ${c.ids.length} Fragen`)}
              summary={summarize(c.ids, stats)}
              onLesen={() => openRun("fuehrerschein", "lesen", c.id)}
              onUeben={() => openRun("fuehrerschein", "ueben", c.id)}
            />
          ))}
        </View>
      )}
    </View>
  );
}
