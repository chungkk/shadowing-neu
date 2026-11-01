import { SymbolView } from "expo-symbols";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { blankExample, checkGuess, fullWord, hintOf, quizOptions, type StudyMode } from "@shared/deck-study";
import { shuffle } from "@shared/review";
import { Button } from "@/components/ui";
import type { DeckWord } from "@/lib/api";
import { C } from "@/lib/theme";
import { useI18n, type TFn } from "@/lib/i18n";
import { speakGerman } from "@/lib/speak";

export type Mode = StudyMode | "list";
export const MODES: Mode[] = ["guess", "flash", "quiz", "reverse", "listen", "list"];
export const modeLabel = (m: Mode, t: TFn) => t(`study.${m}`);

/** Màu mạo từ theo giống — như sổ từ: der xanh dương · die đỏ · das xanh lá */
const GENDER: Record<string, string> = { der: C.phrase, die: C.redText, das: C.accent };
const say = (w: DeckWord, speed?: number) => speakGerman(fullWord(w), speed ? { speed } : {}).catch(() => {});

function German({ w, size }: { w: DeckWord; size: number }) {
  const art = w.gender === "der" || w.gender === "die" || w.gender === "das" ? w.gender : "";
  return (
    <Text style={{ color: C.text, fontSize: size, fontWeight: "800", textAlign: "center" }}>
      {!!art && <Text style={{ color: GENDER[art] }}>{art} </Text>}
      {w.word}
    </Text>
  );
}

function SpeakButton({ w }: { w: DeckWord }) {
  const { t } = useI18n();
  return (
    <Pressable onPress={() => say(w)} hitSlop={8} style={{ padding: 8 }} accessibilityLabel={t("vocab.listen")}>
      <SymbolView name="speaker.wave.2.fill" size={20} tintColor={C.amber} />
    </Pressable>
  );
}

/** Ô biểu tượng chủ đề (thay cho ảnh minh hoạ) */
const Icon = ({ icon }: { icon: string }) => (
  <View style={{ width: 88, height: 88, borderRadius: 22, backgroundColor: "rgba(250,204,21,0.8)", alignItems: "center", justifyContent: "center" }}>
    <Text style={{ fontSize: 44 }}>{icon}</Text>
  </View>
);

/** Đáp án đầy đủ hiện sau khi trả lời: từ · số nhiều · nghĩa · câu ví dụ */
function Reveal({ w, ok, title }: { w: DeckWord; ok: boolean; title: string }) {
  const { t } = useI18n();
  return (
    <View
      style={{
        alignSelf: "stretch",
        alignItems: "center",
        gap: 6,
        padding: 16,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: ok ? C.accent : C.red,
        backgroundColor: ok ? "rgba(22,163,74,0.12)" : "rgba(220,38,38,0.12)",
      }}
    >
      <Text
        style={{
          color: ok ? C.accent : C.redText,
          fontWeight: "800",
          fontSize: 13,
          letterSpacing: 0.5,
          textTransform: "uppercase",
          textAlign: "center",
        }}
      >
        {title}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
        <German w={w} size={24} />
        <SpeakButton w={w} />
      </View>
      {!!w.plural && w.plural !== w.word && <Text style={{ color: C.muted, fontSize: 14 }}>{t("vocab.plural", { p: `die ${w.plural}` })}</Text>}
      <Text style={{ color: C.text, fontSize: 16, textAlign: "center" }}>{w.meaning}</Text>
      {!!w.example && <Text style={{ color: C.muted, fontSize: 14, fontStyle: "italic", textAlign: "center" }}>{w.example}</Text>}
    </View>
  );
}

const answerOf = (w: DeckWord, mode: StudyMode) => (mode === "reverse" ? fullWord(w) : w.meaning);

/** 1 thẻ học — onDone(true) = thuộc (thêm vào sổ) · onDone(false) = chưa thuộc (gặp lại sau vài thẻ) */
function StudyCard({ w, mode, pool, icon, onDone }: { w: DeckWord; mode: StudyMode; pool: DeckWord[]; icon: string; onDone: (ok: boolean) => void }) {
  const { t } = useI18n();
  const [input, setInput] = useState("");
  const [result, setResult] = useState<ReturnType<typeof checkGuess> | "skip" | null>(null);
  const [hint, setHint] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [options] = useState(() => (mode === "quiz" || mode === "reverse" ? quizOptions(w, pool, mode === "reverse") : []));
  const blanked = useMemo(() => blankExample(w), [w]);

  // Nghe viết: đọc từ ngay khi hiện thẻ
  useEffect(() => {
    if (mode === "listen") say(w, 0.85);
  }, [mode, w]);

  const correct = picked !== null ? picked === answerOf(w, mode) : result === "ok" || result === "almost";
  const next = (
    <Button title={t("study.next")} variant={correct ? "primary" : "red"} onPress={() => onDone(correct)} style={{ alignSelf: "stretch" }} />
  );

  if (mode === "flash")
    return (
      <View style={{ alignItems: "center", gap: 16 }}>
        <Pressable
          onPress={() => setFlipped((f) => !f)}
          accessibilityRole="button"
          style={({ pressed }) => ({
            alignSelf: "stretch",
            minHeight: 240,
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: 20,
            borderRadius: 20,
            borderWidth: 2,
            borderColor: pressed ? C.accent : C.border,
            backgroundColor: C.card2,
          })}
        >
          {!flipped ? (
            <>
              <Text style={{ fontSize: 48 }}>{icon}</Text>
              <German w={w} size={30} />
              {!!w.plural && w.plural !== w.word && <Text style={{ color: C.muted, fontSize: 14 }}>die {w.plural}</Text>}
              <Text style={{ color: C.muted, fontSize: 12, fontWeight: "700" }}>{t("study.tapFlip")}</Text>
            </>
          ) : (
            <>
              <Text style={{ color: C.amber, fontSize: 24, fontWeight: "800", textAlign: "center" }}>{w.meaning}</Text>
              {!!w.example && <Text style={{ color: C.muted, fontSize: 15, fontStyle: "italic", textAlign: "center" }}>{w.example}</Text>}
            </>
          )}
        </Pressable>
        <SpeakButton w={w} />
        {flipped ? (
          <View style={{ flexDirection: "row", gap: 12, alignSelf: "stretch" }}>
            <Button title={t("study.notYet")} variant="red" onPress={() => onDone(false)} style={{ flex: 1 }} />
            <Button title={t("study.know")} variant="primary" onPress={() => onDone(true)} style={{ flex: 1 }} />
          </View>
        ) : (
          <Button title={t("study.flip")} variant="amber" onPress={() => setFlipped(true)} style={{ alignSelf: "stretch" }} />
        )}
      </View>
    );

  if (mode === "quiz" || mode === "reverse") {
    const right = answerOf(w, mode);
    return (
      <View style={{ alignItems: "center", gap: 14 }}>
        <Icon icon={icon} />
        {mode === "quiz" ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
            <German w={w} size={28} />
            <SpeakButton w={w} />
          </View>
        ) : (
          <Text style={{ color: C.amber, fontSize: 24, fontWeight: "800", textAlign: "center" }}>{w.meaning}</Text>
        )}
        <Text style={{ color: C.muted, fontSize: 14, fontWeight: "700" }}>{t(mode === "quiz" ? "study.chooseMeaning" : "study.chooseWord")}</Text>
        <View style={{ alignSelf: "stretch", gap: 10 }}>
          {options.map((o) => {
            const tone = picked === null ? null : o === right ? C.accent : o === picked ? C.red : null;
            return (
              <Pressable
                key={o}
                disabled={picked !== null}
                onPress={() => {
                  setPicked(o);
                  if (mode === "reverse" || o === right) say(w);
                }}
                style={({ pressed }) => ({
                  padding: 14,
                  borderRadius: 14,
                  borderWidth: 2,
                  borderColor: tone ?? C.border,
                  backgroundColor: pressed ? C.border : C.card2,
                  opacity: picked !== null && !tone ? 0.5 : 1,
                })}
              >
                <Text style={{ color: tone ?? C.text, fontSize: 16, fontWeight: "600" }}>{o}</Text>
              </Pressable>
            );
          })}
        </View>
        {picked !== null && (
          <>
            {picked !== right && <Reveal w={w} ok={false} title={t("study.wrongPick")} />}
            {next}
          </>
        )}
      </View>
    );
  }

  // Đoán từ / Nghe viết
  const check = (skip: boolean) => {
    if (!skip && !input.trim()) return;
    const r = skip ? "skip" : checkGuess(input, w);
    setResult(r);
    if (r !== "wrong" && r !== "skip") say(w);
  };
  return (
    <View style={{ alignItems: "center", gap: 14 }}>
      <Icon icon={icon} />
      {mode === "listen" ? (
        <Button
          title={t("study.replay")}
          variant="amber"
          icon={<SymbolView name="speaker.wave.2.fill" size={18} tintColor={C.amber} />}
          onPress={() => say(w, 0.85)}
        />
      ) : (
        <>
          <Text style={{ color: C.amber, fontSize: 24, fontWeight: "800", textAlign: "center" }}>{w.meaning}</Text>
          {!!blanked && (
            <View style={{ alignItems: "center", gap: 2 }}>
              <Text style={{ color: C.muted, fontSize: 12, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" }}>
                {t("study.example")}
              </Text>
              <Text style={{ color: C.text, fontSize: 16, fontStyle: "italic", fontWeight: "600", textAlign: "center" }}>{blanked}</Text>
            </View>
          )}
        </>
      )}
      {result === null ? (
        <View style={{ alignSelf: "stretch", gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <Text
              style={{
                minWidth: 96,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 12,
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: C.border,
                color: C.muted,
                fontSize: 16,
                letterSpacing: 2,
                textAlign: "center",
                fontFamily: "Menlo",
              }}
            >
              {hintOf(w, hint)}
            </Text>
            <Button title={t("study.hint")} variant="amber" onPress={() => setHint((h) => Math.min(h + 1, w.word.length))} />
          </View>
          <TextInput
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => check(false)}
            placeholder={t(mode === "listen" ? "study.typeHeard" : "study.typeWord")}
            placeholderTextColor={C.muted}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            returnKeyType="done"
            autoFocus
            style={{
              height: 52,
              borderRadius: 14,
              borderWidth: 2,
              borderColor: C.border,
              backgroundColor: C.background,
              color: C.text,
              fontSize: 18,
              textAlign: "center",
            }}
          />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Button title={t("study.dontKnow")} variant="red" onPress={() => check(true)} style={{ flex: 1 }} />
            <Button title={t("study.check")} variant="primary" onPress={() => check(false)} disabled={!input.trim()} style={{ flex: 1 }} />
          </View>
        </View>
      ) : (
        <>
          <Reveal
            w={w}
            ok={correct}
            title={
              result === "ok"
                ? t("study.correct")
                : result === "almost"
                  ? t("study.almost")
                  : result === "article"
                    ? t("study.article")
                    : result === "skip"
                      ? t("study.answer")
                      : t("study.wrong", { w: input.trim() })
            }
          />
          {next}
        </>
      )}
    </View>
  );
}

/**
 * 1 lượt học 1 chủ đề: hàng đợi các từ chưa thuộc (ôn lại: mọi từ, xáo trộn).
 * Trả lời sai → từ quay lại sau 3 thẻ; hết hàng đợi → hoàn thành
 */
export function StudySession({
  words,
  pool,
  mode,
  icon,
  practice,
  onLearned,
  onPractice,
}: {
  words: DeckWord[];
  pool: DeckWord[];
  mode: StudyMode;
  icon: string;
  practice: boolean;
  onLearned: (w: DeckWord) => void;
  onPractice: () => void;
}) {
  const { t } = useI18n();
  const [queue, setQueue] = useState(() => (practice ? shuffle(words) : words.filter((w) => !w.saved)));
  const [seq, setSeq] = useState(0);
  const w = queue[0];
  if (!w)
    return (
      <View style={{ alignItems: "center", gap: 12, paddingVertical: 24 }}>
        <Text style={{ fontSize: 56 }}>🎉</Text>
        <Text style={{ color: C.text, fontSize: 20, fontWeight: "800", textAlign: "center" }}>
          {t(practice ? "study.practiceDone" : "study.doneTitle")}
        </Text>
        <Text style={{ color: C.muted, fontSize: 14, textAlign: "center" }}>{t("study.doneHint")}</Text>
        <Button
          title={t("study.practice")}
          variant="primary"
          icon={<SymbolView name="arrow.counterclockwise" size={15} tintColor="#fff" />}
          onPress={onPractice}
          style={{ marginTop: 6 }}
        />
      </View>
    );
  return (
    <StudyCard
      key={seq}
      w={w}
      mode={mode}
      pool={pool}
      icon={icon}
      onDone={(ok) => {
        if (ok && !practice && !w.saved) onLearned(w);
        setQueue((q) => (ok ? q.slice(1) : [...q.slice(1, 4), q[0], ...q.slice(4)]));
        setSeq((n) => n + 1);
      }}
    />
  );
}

/** Thanh chọn chế độ học (cuộn ngang) */
export function ModeBar({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const { t } = useI18n();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {MODES.map((m) => (
        <Pressable
          key={m}
          onPress={() => onChange(m)}
          accessibilityRole="button"
          accessibilityState={{ selected: mode === m }}
          style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, backgroundColor: mode === m ? C.accent : C.card2 }}
        >
          <Text style={{ color: mode === m ? "#fff" : C.text, fontWeight: "700", fontSize: 14 }}>{modeLabel(m, t)}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
