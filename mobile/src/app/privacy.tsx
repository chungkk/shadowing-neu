import { useCallback, useEffect, useState } from "react";
import { Stack, useFocusEffect } from "expo-router";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync, type PermissionResponse } from "expo-audio";
import { ActivityIndicator, Alert, AppState, Linking, ScrollView, Text, View } from "react-native";
import { Row, Section } from "@/components/SettingsList";
import { styles } from "@/components/ui";
import { api } from "@/lib/api";
import { notice, showError } from "@/lib/dialogs";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { openLegal } from "@/lib/legal";
import { FORM_MAX } from "@/lib/layout";
import { C } from "@/lib/theme";

function Pledge({ icon, children }: { icon: SFSymbol; children: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <SymbolView name={icon} size={15} tintColor={C.accent} weight="semibold" />
      <Text style={{ color: C.text, fontSize: 15, fontWeight: "600" }}>{children}</Text>
    </View>
  );
}

/** Thẻ đầu trang: cam kết về dữ liệu */
function Hero() {
  const { t } = useI18n();
  return (
    <View style={{ backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 20, padding: 18, gap: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View
          style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: "rgba(22,163,74,0.16)", alignItems: "center", justifyContent: "center" }}
        >
          <SymbolView name="lock.shield.fill" size={26} tintColor={C.accent} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ color: C.text, fontSize: 18, fontWeight: "800" }}>{t("priv.heroTitle")}</Text>
          <Text style={{ color: C.muted, fontSize: 14, lineHeight: 19 }}>{t("priv.heroBody")}</Text>
        </View>
      </View>
      <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 14 }}>
        <Pledge icon="nosign">{t("priv.noAds")}</Pledge>
        <Pledge icon="eye.slash.fill">{t("priv.noTracking")}</Pledge>
        <Pledge icon="hand.raised.fill">{t("priv.noSelling")}</Pledge>
      </View>
    </View>
  );
}

/**
 * Quyền riêng tư: cam kết dữ liệu · quyền micro (xem / cấp / mở Cài đặt máy) · tải bản sao dữ liệu (gửi về email) · chính sách.
 * Trạng thái quyền tải lại khi quay về app (người dùng vừa đổi trong Cài đặt của máy).
 */
export default function PrivacyScreen() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [mic, setMic] = useState<PermissionResponse | null>(null);
  const [exporting, setExporting] = useState(false);

  const refresh = useCallback(() => {
    getRecordingPermissionsAsync().then(setMic, () => {});
  }, []);
  useFocusEffect(refresh);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => s === "active" && refresh());
    return () => sub.remove();
  }, [refresh]);

  const micValue = !mic ? undefined : mic.granted ? t("priv.granted") : mic.status === "undetermined" ? t("priv.undetermined") : t("priv.denied");
  const onMic = async () => {
    // Chưa hỏi lần nào → hỏi ngay trong app; đã cho phép / đã từ chối → chỉ đổi được trong Cài đặt của máy
    if (mic?.status === "undetermined" && mic.canAskAgain) setMic(await requestRecordingPermissionsAsync());
    else Linking.openSettings().catch(() => {});
  };

  const exportData = () => {
    if (!user || exporting) return;
    Alert.alert(t("priv.exportConfirm"), t("priv.exportBody", { email: user.email }), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("priv.exportSend"),
        onPress: async () => {
          setExporting(true);
          try {
            const r = await api<{ email: string }>("/me/export", { method: "POST" });
            notice(t("priv.exportSent"), t("priv.exportSentBody", { email: r.email }));
          } catch (e) {
            showError(e);
          } finally {
            setExporting(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: t("set.privacy") }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ width: "100%", maxWidth: FORM_MAX, alignSelf: "center", padding: 16, gap: 24, paddingBottom: 48 }}
      >
        <Hero />

        <Section title={t("priv.sectionPermissions")} footer={t("priv.permissionsNote")}>
          <Row
            first
            icon="mic.fill"
            iconBg="#ea580c"
            title={t("priv.mic")}
            subtitle={t("priv.micSub")}
            value={micValue}
            valueColor={mic?.granted ? C.accent : C.muted}
            onPress={onMic}
          />
          <Row icon="gearshape.fill" iconBg="#475569" title={t("priv.systemSettings")} external onPress={() => Linking.openSettings().catch(() => {})} />
        </Section>

        <Section title={t("priv.sectionData")} footer={user ? t("priv.dataNote") : t("priv.guestNote")}>
          {user && (
            <Row
              first
              icon="arrow.down.doc.fill"
              iconBg="#2563eb"
              title={t("priv.export")}
              subtitle={t("priv.exportSub")}
              chevron={!exporting}
              trailing={exporting ? <ActivityIndicator color={C.muted} /> : undefined}
              disabled={exporting}
              onPress={exportData}
            />
          )}
          <Row first={!user} icon="lock.shield.fill" iconBg="#475569" title={t("set.privacyPolicy")} external onPress={() => openLegal("privacy")} />
        </Section>
      </ScrollView>
    </View>
  );
}
