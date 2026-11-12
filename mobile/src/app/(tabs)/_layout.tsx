import { useEffect } from "react";
import { AppState } from "react-native";
import { NativeTabs } from "expo-router/native-tabs";
import { C } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { setDueCount, useDueCount } from "@/lib/due";

export default function TabLayout() {
  const { t } = useI18n();
  const { user } = useAuth();
  const due = useDueCount();

  // Badge "Từ vựng": tải số mục đến hạn lúc mở app và mỗi lần quay lại app (số đến hạn đổi theo thời gian)
  useEffect(() => {
    if (!user) return setDueCount(0);
    const load = () =>
      api<{ notebook: { due: number } | null }>("/vocab/decks")
        .then((r) => setDueCount(r.notebook?.due ?? 0))
        .catch(() => {});
    load();
    const sub = AppState.addEventListener("change", (s) => s === "active" && load());
    return () => sub.remove();
  }, [user]);

  return (
    // iPad: thanh tab trên cùng, có thể mở thành sidebar (không ảnh hưởng iPhone)
    <NativeTabs tintColor={C.accentText} backgroundColor={C.background} labelStyle={{ color: C.muted }} sidebarAdaptable>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{t("tabs.lessons")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "books.vertical", selected: "books.vertical.fill" }} md="school" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="vocab">
        <NativeTabs.Trigger.Label>{t("tabs.vocab")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "bookmark", selected: "bookmark.fill" }} md="bookmark" />
        <NativeTabs.Trigger.Badge hidden={!due}>{due > 99 ? "99+" : String(due)}</NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>{t("tabs.settings")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "gearshape", selected: "gearshape.fill" }} md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
