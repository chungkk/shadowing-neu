import { NativeTabs } from "expo-router/native-tabs";
import { C } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";

export default function TabLayout() {
  const { t } = useI18n();
  return (
    // iPad: thanh tab trên cùng, có thể mở thành sidebar (không ảnh hưởng iPhone)
    <NativeTabs tintColor={C.accent} backgroundColor={C.background} labelStyle={{ color: C.muted }} sidebarAdaptable>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{t("tabs.lessons")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "books.vertical", selected: "books.vertical.fill" }} md="school" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="youtube">
        <NativeTabs.Trigger.Label>{t("tabs.youtube")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "play.rectangle", selected: "play.rectangle.fill" }} md="smart_display" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="vocab">
        <NativeTabs.Trigger.Label>{t("tabs.vocab")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "bookmark", selected: "bookmark.fill" }} md="bookmark" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Label>{t("tabs.account")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "person.crop.circle", selected: "person.crop.circle.fill" }} md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
