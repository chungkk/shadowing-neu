import { useCallback, useMemo, useState } from "react";
import { Image } from "expo-image";
import { Pressable, View } from "react-native";
import { router, useFocusEffect, type Href } from "expo-router";
import { SymbolView } from "expo-symbols";
import { summarize } from "@shared/quiz/types";
import { Text } from "@/components/Text";
import { BigTile, HeroCard, IconButton, IconRow, MenuRow, ProgressBar, QuizTabScreen, TONES, openRun } from "@/components/quiz/QuizParts";
import { useAuth } from "@/lib/auth";
import { EXAM, EXAM_TOTAL, generalIds, getSet, getState, stateIds } from "@/lib/quiz/lid";
import { syncQuiz, useModule, usePrefs } from "@/lib/quiz/store";
import { useL } from "@/lib/quiz/strings";
import { WAPPEN } from "@/lib/quiz/wappen";
import { C, R, SEC, STICKER } from "@/lib/theme";

/** Tab Leben in Deutschland: 300 câu chung + 10 câu của bang, thi thử 33 câu */
export default function LidTab() {
  const L = useL();
  const { user } = useAuth();
  const { state, stateChosen } = usePrefs();
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
  const genIds = useMemo(() => generalIds(), []);
  const stIds = useMemo(() => stateIds(state), [state]);
  const all = summarize(pool, mod.stats);
  const genSum = summarize(genIds, mod.stats);
  const stSum = summarize(stIds, mod.stats);
  const poolSet = useMemo(() => new Set(pool), [pool]);
  const marked = mod.marked.filter((id) => poolSet.has(id)).length;
  const lastExam = useMemo(
    () => [...mod.exams, ...mod.remote].sort((a, b) => b.at - a.at)[0],
    [mod.exams, mod.remote],
  );
  const sec = SEC.lid;

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
        sec="lid"
        icon="building.columns.fill"
        title="Leben in Deutschland"
        subtitle={L(`Bang: ${st.name} · ${pool.length} câu`, `Bundesland: ${st.name} · ${pool.length} Fragen`)}
        summary={all}
        onSettings={() => router.push({ pathname: "/quiz/settings", params: { module: "lid" } })}
        settingsLabel={L("Đổi bang và tuỳ chọn", "Bundesland und Optionen ändern")}
      />

      {!stateChosen && (
        <Pressable
          onPress={() => router.push({ pathname: "/quiz/settings", params: { module: "lid" } })}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            padding: 14,
            borderRadius: R.lg,
            backgroundColor: pressed ? C.card2 : sec.secSoft,
            borderWidth: 1,
            borderColor: sec.sec,
          })}
        >
          <SymbolView name="mappin.and.ellipse" size={22} tintColor={sec.secText} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: C.text, fontSize: 15, fontWeight: "700" }}>
              {L("Chọn bang bạn đang sống", "Wähle dein Bundesland")}
            </Text>
            <Text style={{ color: C.muted, fontSize: 13 }}>
              {L("Mỗi bang có 10 câu riêng và 3 câu trong đề thi 33 câu.", "Jedes Bundesland hat 10 eigene Fragen (3 davon in der Prüfung).")}
            </Text>
          </View>
          <SymbolView name="chevron.right" size={14} tintColor={sec.secText} weight="semibold" />
        </Pressable>
      )}

      {/* Thẻ Bang nổi bật kèm Wappen + nút 1 chạm vào 10 câu bang & tách 300 câu chung */}
      <View style={{ backgroundColor: C.card, borderRadius: R.lg, ...STICKER, padding: 14, gap: 12 }}>
        <Pressable
          onPress={() => openRun("lid", "ueben", "state")}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            padding: 10,
            borderRadius: R.md,
            backgroundColor: pressed ? C.card2 : sec.secSoft,
          })}
        >
          {WAPPEN[st.code] && (
            <Image source={WAPPEN[st.code]} style={{ width: 34, height: 38 }} contentFit="contain" />
          )}
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: C.text, fontSize: 15, fontWeight: "800" }}>
              {st.name} · {L("10 câu bang", "10 Landesfragen")}
            </Text>
            <Text style={{ color: C.muted, fontSize: 12 }}>
              {L("Thủ phủ", "Hauptstadt")}: {st.capital} · {stSum.done}/{stSum.total} {L("đã làm", "bearbeitet")}
            </Text>
          </View>
          <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: sec.sec }}>
            <Text style={{ color: sec.onSec, fontSize: 12, fontWeight: "800" }}>{L("Luyện ngay", "Üben")}</Text>
          </View>
        </Pressable>

        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: C.text, fontSize: 13, fontWeight: "700" }}>{L("300 câu chung toàn Đức", "300 allgemeine Fragen")}</Text>
            <Text style={{ color: C.muted, fontSize: 12, fontVariant: ["tabular-nums"] }}>
              {genSum.done}/{genSum.total}
            </Text>
          </View>
          <ProgressBar ok={genSum.ok} wrong={genSum.wrong} total={genSum.total} />
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <BigTile icon="book.fill" sec="lid" title={L("Chủ đề & Bộ câu", "Themen & Sätze")} subtitle={L("3 chủ đề · 10 bộ × 30 câu", "3 Themen · 10 Sätze")} onPress={() => router.push("/lid/learn" as Href)} />
        <BigTile
          icon="flag.checkered"
          sec="lid" tone="ink"
          title={L("Thi thử", "Testprüfung")}
          subtitle={
            lastExam
              ? L(`Lần trước: ${lastExam.correct}/${lastExam.total} · ${lastExam.passed ? "đậu" : "trượt"}`, `Zuletzt: ${lastExam.correct}/${lastExam.total}`)
              : L(`${EXAM_TOTAL} câu · ${EXAM.minutes} phút`, `${EXAM_TOTAL} Fragen · ${EXAM.minutes} Min.`)
          }
          onPress={() => openRun("lid", "exam", "random")}
        />
      </View>
      <IconRow>
        <IconButton icon="building.columns.fill" tone={tone.state} label={L("Câu của bang", "Bundesland")} count={stIds.length} onPress={() => openRun("lid", "ueben", "state")} />
        <IconButton icon="xmark.circle.fill" tone={tone.wrong} label={L("Câu sai", "Falsch")} count={all.wrong} onPress={() => openRun("lid", "ueben", "wrong")} />
        <IconButton icon="star.fill" tone={tone.marked} label={L("Đánh dấu", "Markiert")} count={marked} onPress={() => openRun("lid", "ueben", "marked")} />
        <IconButton icon="chart.bar.fill" tone={tone.stats} label={L("Thống kê", "Statistik")} count={mod.exams.length + mod.remote.length} onPress={() => router.push({ pathname: "/quiz/stats", params: { module: "lid" } })} />
      </IconRow>
      <MenuRow icon="shuffle" tone={tone.all} title={L("Luyện tất cả 310 câu", "Alle 310 Fragen üben")} subtitle={L("300 câu chung + 10 câu của bang, nhớ vị trí", "Allgemein + Bundesland, mit Merkposition")} onPress={() => openRun("lid", "ueben", "hoc")} />
      <MenuRow icon="doc.plaintext" tone={tone.doc} title={L("Đọc nhanh 300 câu chung", "300 Fragen lesen")} subtitle={L("Hiện sẵn đáp án đúng và giải thích", "Mit markierten Lösungen & Erklärung")} onPress={() => openRun("lid", "lesen", "tat-ca")} />
    </QuizTabScreen>
  );
}
