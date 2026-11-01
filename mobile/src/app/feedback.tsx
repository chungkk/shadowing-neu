import { useState } from "react";
import { Stack, router, useLocalSearchParams, useNavigation, usePreventRemove } from "expo-router";
import { SymbolView } from "expo-symbols";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { Button, Input, Segmented, styles } from "@/components/ui";
import { api } from "@/lib/api";
import { confirmDestructive, notice, showError } from "@/lib/dialogs";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { FORM_MAX } from "@/lib/layout";
import { C } from "@/lib/theme";

type Kind = "idea" | "bug" | "content" | "other";
const KINDS: Kind[] = ["idea", "bug", "content", "other"];
const PLACEHOLDER = { idea: "fb.phIdea", bug: "fb.phBug", content: "fb.phContent", other: "fb.phOther" } as const;
const MAX = 5000; // giới hạn của server

/** "iOS 26.1 · iPhone 16 Pro · app 1.0.1" — gửi kèm để tái hiện lỗi */
const deviceInfo = () =>
  [
    `${Platform.OS === "ios" ? "iOS" : "Android"} ${Device.osVersion ?? ""}`.trim(),
    Device.modelName,
    `app ${Constants.expoConfig?.version ?? "?"}`,
  ]
    .filter(Boolean)
    .join(" · ");

/**
 * Góp ý / báo lỗi (?kind=idea|bug): chọn chủ đề · viết nội dung · email trả lời (khách) → POST /feedback.
 * Đang viết dở mà đóng (vuốt xuống / nút ✕) → hỏi trước khi bỏ.
 */
export default function FeedbackScreen() {
  const { t } = useI18n();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ kind?: string }>();
  const [kind, setKind] = useState<Kind>(KINDS.includes(params.kind as Kind) ? (params.kind as Kind) : "idea");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const navigation = useNavigation();
  const device = deviceInfo();

  const text = message.trim();
  const dirty = !!text && !sent;

  // Chặn đóng modal khi còn nội dung chưa gửi
  usePreventRemove(dirty, ({ data }) =>
    confirmDestructive(t("fb.discard"), t("fb.discardBody"), t("fb.discardAction"), () => navigation.dispatch(data.action)),
  );

  const send = async () => {
    if (!text || sending) return;
    setSending(true);
    try {
      await api("/feedback", { method: "POST", body: { kind, message: text, email: user ? undefined : email.trim(), device } });
      setSent(true);
      notice(t("fb.sent"), t("fb.sentBody"));
      router.back();
    } catch (e) {
      showError(e);
    } finally {
      setSending(false);
    }
  };

  const label = (s: string) => <Text style={{ color: C.muted, fontSize: 13, fontWeight: "700" }}>{s}</Text>;

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: kind === "bug" ? t("fb.titleBug") : t("fb.title"),
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("close")}>
              <SymbolView name="xmark" size={18} weight="bold" tintColor={C.muted} />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ width: "100%", maxWidth: FORM_MAX, alignSelf: "center", padding: 16, gap: 18, paddingBottom: 40 }}
      >
        <View style={{ gap: 8 }}>
          {label(t("fb.kind"))}
          <Segmented options={KINDS.map((k) => [k, t(`fb.${k}`)] as const)} value={kind} onChange={setKind} />
        </View>

        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            {label(t("fb.message"))}
            {message.length > MAX * 0.8 && (
              <Text style={{ color: message.length > MAX ? C.redText : C.muted, fontSize: 12 }}>
                {message.length}/{MAX}
              </Text>
            )}
          </View>
          <Input
            value={message}
            onChangeText={setMessage}
            placeholder={t(PLACEHOLDER[kind])}
            multiline
            autoFocus
            textAlignVertical="top"
            style={{ minHeight: 160, paddingTop: 12 }}
          />
        </View>

        {user ? (
          <Text style={styles.muted}>{t("fb.replyTo", { email: user.email })}</Text>
        ) : (
          <View style={{ gap: 8 }}>
            {label(t("fb.email"))}
            <Input value={email} onChangeText={setEmail} placeholder="name@example.com" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" />
          </View>
        )}

        <Button title={t("fb.send")} variant="primary" icon={<SymbolView name="paperplane.fill" size={15} tintColor="#fff" />} onPress={send} loading={sending} disabled={!text || message.length > MAX} />

        <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
          <SymbolView name="info.circle" size={14} tintColor={C.muted} style={{ marginTop: 2 }} />
          <Text style={{ flex: 1, color: C.muted, fontSize: 12, lineHeight: 17 }}>{t("fb.deviceNote", { device })}</Text>
        </View>
      </ScrollView>
    </View>
  );
}
