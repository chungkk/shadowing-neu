import { Stack, router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useRef, useState, type ComponentRef } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { Text, TextInput } from "@/components/Text";
import { Button, ErrorText, Input, styles } from "@/components/ui";
import { api, type VocabItem } from "@/lib/api";
import { showError } from "@/lib/dialogs";
import { useI18n } from "@/lib/i18n";
import { FORM_MAX } from "@/lib/layout";
import { speakGerman, stopSpeaking } from "@/lib/speak";
import { C, alpha } from "@/lib/theme";

/**
 * Thêm từ tự do vào sổ từ vựng (không cần gặp trong bài học): điền từ / cụm từ / câu, câu ví dụ (không bắt buộc),
 * tự ghi nghĩa hoặc nhờ AI tạo nghĩa (điền sẵn vào ô để sửa trước khi lưu).
 * "Lưu và thêm từ khác" để nhập liên tục.
 */
export default function VocabAddScreen() {
  const { t, lang } = useI18n();
  const [word, setWord] = useState("");
  const [context, setContext] = useState("");
  const [meaning, setMeaning] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(""); // từ vừa lưu (chế độ thêm liên tục)
  const wordRef = useRef<ComponentRef<typeof TextInput>>(null);
  const aiGenRef = useRef(0);

  useEffect(
    () => () => {
      aiGenRef.current += 1;
      void stopSpeaking();
    },
    [],
  );

  const w = word.trim().replace(/\s+/g, " ");
  const multi = w.includes(" ");
  const tooLong = w.length > (multi ? 500 : 80); // giới hạn của server
  const canSave = !!w && !tooLong && !saving && !aiBusy;

  // AI tạo nghĩa: từ / cụm → nghĩa theo câu ví dụ (nếu có)
  const fillAi = async () => {
    if (!w || aiBusy) return;
    const g = ++aiGenRef.current;
    setAiBusy(true);
    setAiError("");
    try {
      const r = await api<{ meaning: string }>("/word", {
        method: "POST",
        body: { word: w, context: context.trim(), lang },
      });
      if (aiGenRef.current === g) setMeaning(r.meaning);
    } catch (e) {
      if (aiGenRef.current === g) setAiError((e as Error).message);
    } finally {
      if (aiGenRef.current === g) setAiBusy(false);
    }
  };

  const save = async (more: boolean) => {
    if (!canSave) return;
    setSaving(true);
    try {
      // Cụm từ không kèm câu ví dụ → lấy chính cụm làm ngữ cảnh để không bị coi là câu ⭐ (câu đánh dấu trong bài học)
      const ctx = context.trim() || (multi ? w : "");
      const r = await api<{ item?: VocabItem; vocab: VocabItem[] }>("/vocab", { method: "POST", body: { word: w, context: ctx } });
      const item = r.item ?? r.vocab[0];
      // Nghĩa người học vừa ghi / AI vừa tạo được ưu tiên (từ đã có trong sổ thì cập nhật nghĩa)
      const m = meaning.trim();
      if (item && m && item.meaning !== m) await api(`/vocab/${item.id}`, { method: "PATCH", body: { meaning: m } });
      if (!more) return router.back();
      aiGenRef.current += 1;
      setAiBusy(false);
      setSaved(w);
      setWord("");
      setContext("");
      setMeaning("");
      setAiError("");
      wordRef.current?.focus();
    } catch (e) {
      showError(e, t("vocabAdd.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const label = (text: string) => <Text style={{ color: C.muted, fontSize: 13, fontWeight: "700" }}>{text}</Text>;

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: t("vocab.add"),
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("close")}>
              <SymbolView name="xmark" size={18} weight="bold" tintColor={C.muted} />
            </Pressable>
          ),
        }}
      />
      {/* Header modal iOS 26 trong suốt → tự chừa chỗ cho header; iOS ScrollView tự chừa bàn phím, Android dùng KeyboardAvoidingView */}
      <KeyboardAvoidingView behavior={Platform.OS === "android" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ width: "100%", maxWidth: FORM_MAX, alignSelf: "center", padding: 16, gap: 18, paddingBottom: 40 }}
        >
        {!!saved && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, backgroundColor: alpha(C.ok, 0.14) }}>
            <SymbolView name="checkmark.circle.fill" size={16} tintColor={C.okText} />
            <Text style={{ flex: 1, color: C.okText, fontWeight: "700" }} numberOfLines={1}>
              {t("vocabAdd.saved", { w: saved })}
            </Text>
          </View>
        )}

        {/* Từ */}
        <View style={{ gap: 8 }}>
          {label(t("vocabAdd.word"))}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Input
              ref={wordRef}
              value={word}
              onChangeText={(v) => {
                aiGenRef.current += 1;
                setAiBusy(false);
                setWord(v);
              }}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              multiline
              maxLength={500}
              placeholder="z. B. die Gelegenheit"
              style={{ flex: 1, fontSize: 18, fontWeight: "700" }}
            />
            <Pressable
              onPress={() => w && speakGerman(w).catch(() => {})}
              disabled={!w}
              hitSlop={8}
              style={{ padding: 6, opacity: w ? 1 : 0.35 }}
              accessibilityLabel={t("vocab.listen")}
            >
              <SymbolView name="speaker.wave.2.fill" size={20} tintColor={C.accentText} />
            </Pressable>
          </View>
          {tooLong && <ErrorText>{t("vocabAdd.tooLong")}</ErrorText>}
        </View>

        {/* Câu ví dụ */}
        <View style={{ gap: 8 }}>
          {label(t("vocabAdd.context"))}
          <Input value={context} onChangeText={setContext} multiline maxLength={500} autoCapitalize="sentences" autoCorrect={false} placeholder="…" />
          <Text style={[styles.muted, { fontSize: 13 }]}>{t("vocabAdd.contextHint")}</Text>
        </View>

        {/* Nghĩa: tự ghi hoặc AI */}
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            {label(t("vocabAdd.meaning"))}
            <Pressable
              onPress={fillAi}
              disabled={!w || tooLong || aiBusy}
              hitSlop={8}
              accessibilityRole="button"
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 99,
                borderWidth: 1,
                borderColor: C.amber,
                backgroundColor: pressed ? alpha(C.gold, 0.2) : alpha(C.gold, 0.1),
                opacity: !w || tooLong ? 0.4 : 1,
              })}
            >
              {aiBusy ? <ActivityIndicator size="small" color={C.amber} /> : <SymbolView name="sparkles" size={14} tintColor={C.amber} />}
              <Text style={{ color: C.amber, fontWeight: "700", fontSize: 14 }}>{t("vocabAdd.ai")}</Text>
            </Pressable>
          </View>
          <Input value={meaning} onChangeText={setMeaning} multiline maxLength={500} editable={!aiBusy} placeholder={t("vocabAdd.meaningPlaceholder")} />
          <ErrorText>{aiError}</ErrorText>
        </View>

        <View style={{ gap: 10 }}>
          <Button title={t("vocabAdd.save")} variant="primary" onPress={() => save(false)} disabled={!canSave} loading={saving} />
          <Button title={t("vocabAdd.saveMore")} onPress={() => save(true)} disabled={!canSave} />
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
