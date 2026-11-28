import { router, useFocusEffect, type Href } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, Switch, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "./Text";
import { Button, ErrorText } from "./ui";
import { haptic } from "@/lib/haptics";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { FORM_MAX } from "@/lib/layout";
import { getPrefs } from "@/lib/quiz/store";
import { pathOfReminder, syncDailyReminder, type Reminder } from "@/lib/reminders";
import {
  clearAllReminderMutes,
  getReminderMutes,
  getReminderSeen,
  loadReminderSeen,
  markRemindersSeen,
  syncReminderSeenLevels,
  toggleReminderMute,
  useReminderMutes,
  useReminderSeen,
  type ReminderSection,
  type SeenMap,
} from "@/lib/reminderPrefs";
import { C, STICKER, alpha } from "@/lib/theme";

const TODAY_KINDS = new Set<Reminder["kind"]>(["streak", "review", "wrong"]);

const localDay = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const isReminderNew = (r: Reminder, seen: SeenMap, today: string) => {
  if (r.quiet) return false;
  const s = seen[r.id];
  if (!s) return true;
  if (r.daily && s.day !== today) return true;
  if (r.level !== undefined && (s.level ?? 0) < r.level) return true;
  return false;
};

/** Chuông nhắc học trong BrandBar: hiện số việc mới/chưa xem (giống Web), cho phép tắt nhắc từng phần */
export function ReminderBell() {
  const { user } = useAuth();
  const { lang, t } = useI18n();
  const uid = user?.id ?? null;
  const mutes = useReminderMutes(uid);
  const seen = useReminderSeen(uid);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Reminder[] | null>(null);
  const [started, setStarted] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());

  const [prevUid, setPrevUid] = useState<number | null>(uid);
  if (prevUid !== uid) {
    setPrevUid(uid);
    setOpen(false);
    setItems(null);
    setStarted(true);
    setLoadError("");
    setFreshIds(new Set());
  }

  const load = useCallback(
    async (markSeen = false) => {
      if (uid === null) {
        setItems(null);
        return;
      }
      setBusy(true);
      setLoadError("");
      try {
        const { cls, state } = getPrefs();
        const [r, curSeen] = await Promise.all([
          api<{ reminders: Reminder[]; started?: boolean }>(
            `/reminders?tz=${new Date().getTimezoneOffset()}&cls=${cls}&state=${state}&lang=${lang}`,
          ),
          loadReminderSeen(uid),
        ]);
        syncReminderSeenLevels(uid, r.reminders);
        setItems(r.reminders);
        setStarted(r.started !== false);
        if (markSeen) {
          const today = localDay();
          const curMutes = getReminderMutes(uid);
          setFreshIds(new Set(r.reminders.filter((x) => !curMutes[x.section] && isReminderNew(x, curSeen, today)).map((x) => x.id)));
          markRemindersSeen(uid, r.reminders, today);
        }
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : t("api.noConnection"));
      } finally {
        setBusy(false);
      }
    },
    [uid, lang, t],
  );

  useFocusEffect(
    useCallback(() => {
      void load(false);
    }, [load]),
  );

  if (!user) return null;

  const today = localDay();
  const visible = (items ?? []).filter((r) => !mutes[r.section]);
  const badge = visible.filter((r) => isReminderNew(r, seen, today)).length;
  const todayItems = visible.filter((r) => TODAY_KINDS.has(r.kind));
  const contItems = visible.filter((r) => !TODAY_KINDS.has(r.kind));
  const allMuted = Boolean(mutes.de && mutes.laixe && mutes.lid);

  const sections: [ReminderSection, string][] = [
    ["de", t("remind.secDeutsch")],
    ["laixe", t("remind.secLaixe")],
    ["lid", t("remind.secLid")],
  ];

  const openModal = () => {
    haptic.select();
    const curSeen = getReminderSeen(uid);
    const curVisible = (items ?? []).filter((r) => !mutes[r.section]);
    setFreshIds(new Set(curVisible.filter((r) => isReminderNew(r, curSeen, today)).map((r) => r.id)));
    if (items) markRemindersSeen(uid, items, today);
    setOpen(true);
    void load(true);
  };

  const pick = (r: Reminder) => {
    setOpen(false);
    router.push(pathOfReminder(r) as Href);
  };

  const toggleMute = async (sec: ReminderSection) => {
    await toggleReminderMute(sec, uid);
    void syncDailyReminder(true);
  };

  const enableAll = async () => {
    await clearAllReminderMutes(uid);
    void syncDailyReminder(true);
  };

  return (
    <>
      <Pressable
        onPress={openModal}
        accessibilityRole="button"
        accessibilityLabel={t("remind.bellTitle")}
        hitSlop={4}
        style={({ pressed }) => ({
          width: 40,
          height: 40,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: C.border,
          backgroundColor: pressed ? C.card2 : C.card,
          alignItems: "center",
          justifyContent: "center",
        })}
      >
        <SymbolView name={badge > 0 ? "bell.badge.fill" : "bell"} size={18} tintColor={badge > 0 ? C.accentText : C.text} />
        {badge > 0 && (
          <View
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              minWidth: 18,
              height: 18,
              paddingHorizontal: 4,
              borderRadius: 9,
              backgroundColor: C.red,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>{badge > 9 ? "9+" : badge}</Text>
          </View>
        )}
      </Pressable>

      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        supportedOrientations={["portrait", "portrait-upside-down", "landscape-left", "landscape-right"]}
        onRequestClose={() => setOpen(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={Platform.OS === "ios" ? ["bottom"] : ["top", "bottom"]}>
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.line }}>
            <Text style={{ flex: 1, color: C.text, fontSize: 19, fontWeight: "800" }}>{t("remind.bellTitle")}</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("close")}>
              <SymbolView name="xmark.circle.fill" size={26} tintColor={C.muted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ width: "100%", maxWidth: FORM_MAX, alignSelf: "center", padding: 16, gap: 18, paddingBottom: 40 }}>
            {busy && !items && <ActivityIndicator color={C.accentText} style={{ marginTop: 24 }} />}

            {!items && !!loadError && (
              <View style={{ backgroundColor: C.card, borderRadius: 16, ...STICKER, padding: 18, gap: 12 }}>
                <ErrorText>{loadError}</ErrorText>
                <Button title={t("retry")} onPress={() => void load(true)} />
              </View>
            )}

            {items && allMuted && (
              <View style={{ backgroundColor: C.card, borderRadius: 16, ...STICKER, padding: 18, gap: 12, alignItems: "center" }}>
                <Text style={{ color: C.muted, fontSize: 15, textAlign: "center" }}>{t("remind.allMuted")}</Text>
                <Button title={t("remind.enableAll")} variant="primary" onPress={() => void enableAll()} />
              </View>
            )}

            {items && !allMuted && !started && (
              <View style={{ backgroundColor: C.card, borderRadius: 16, ...STICKER, padding: 16, gap: 10 }}>
                <Text style={{ color: C.text, fontSize: 14, fontWeight: "700" }}>{t("remind.notStarted")}</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  <Button
                    title={t("remind.secDeutsch")}
                    variant="primary"
                    onPress={() => {
                      setOpen(false);
                      router.push("/");
                    }}
                  />
                  <Button
                    title={t("remind.secLaixe")}
                    onPress={() => {
                      setOpen(false);
                      router.push("/laixe");
                    }}
                  />
                  <Button
                    title={t("remind.secLid")}
                    onPress={() => {
                      setOpen(false);
                      router.push("/lid");
                    }}
                  />
                </View>
              </View>
            )}

            {items && !allMuted && started && visible.length === 0 && (
              <View style={{ backgroundColor: C.card, borderRadius: 16, ...STICKER, padding: 18, alignItems: "center" }}>
                <Text style={{ color: C.muted, fontSize: 15, textAlign: "center" }}>{t("remind.empty")}</Text>
              </View>
            )}

            {todayItems.length > 0 && <ReminderGroup title={t("remind.todayGroup")} items={todayItems} freshIds={freshIds} onPick={pick} />}
            {contItems.length > 0 && <ReminderGroup title={t("remind.continueGroup")} items={contItems} freshIds={freshIds} onPick={pick} />}

            <View style={{ gap: 8, marginTop: 6 }}>
              <Text style={{ color: C.muted, fontSize: 12, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", paddingHorizontal: 4 }}>
                {t("remind.muteSection")}
              </Text>
              <View style={{ backgroundColor: C.card, borderRadius: 16, ...STICKER, overflow: "hidden" }}>
                {sections.map(([key, label], i) => (
                  <View
                    key={key}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderTopWidth: i === 0 ? 0 : 1,
                      borderTopColor: C.line,
                    }}
                  >
                    <Text style={{ color: C.text, fontSize: 15, fontWeight: "600" }}>{label}</Text>
                    <Switch value={!!mutes[key]} onValueChange={() => void toggleMute(key)} />
                  </View>
                ))}
              </View>
            </View>

            <Pressable
              onPress={() => {
                setOpen(false);
                router.push("/stats");
              }}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8 }}
            >
              <Text style={{ color: C.accentText, fontSize: 14, fontWeight: "700" }}>{t("remind.viewStats")}</Text>
              <SymbolView name="arrow.right" size={13} tintColor={C.accentText} weight="semibold" />
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

function ReminderGroup({
  title,
  items,
  freshIds,
  onPick,
}: {
  title: string;
  items: Reminder[];
  freshIds: Set<string>;
  onPick: (r: Reminder) => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: C.muted, fontSize: 12, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", paddingHorizontal: 4 }}>
        {title}
      </Text>
      <View style={{ backgroundColor: C.card, borderRadius: 16, ...STICKER, overflow: "hidden" }}>
        {items.map((r, i) => (
          <Pressable
            key={r.id}
            onPress={() => onPick(r)}
            accessibilityRole="button"
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: C.line,
              backgroundColor: pressed ? C.card2 : "transparent",
            })}
          >
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: freshIds.has(r.id) ? C.accent : C.border }} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: C.text, fontSize: 15, fontWeight: "700" }}>{r.title}</Text>
              <Text style={{ color: C.muted, fontSize: 13 }}>{r.detail}</Text>
              {typeof r.percent === "number" && (
                <View style={{ height: 3, borderRadius: 2, backgroundColor: alpha(C.accent, 0.15), marginTop: 4, overflow: "hidden" }}>
                  <View style={{ width: `${r.percent}%`, height: "100%", backgroundColor: C.accent }} />
                </View>
              )}
            </View>
            <SymbolView name="chevron.right" size={12} tintColor={C.muted} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
