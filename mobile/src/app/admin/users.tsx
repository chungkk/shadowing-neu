import { router, Stack } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActionSheetIOS, ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, TextInput } from "@/components/Text";
import { ActionSheetModal, Button, ErrorText, Input, Segmented, styles } from "@/components/ui";
import { api, type User } from "@/lib/api";
import { confirmDestructive, notice, showError } from "@/lib/dialogs";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { CONTENT_MAX } from "@/lib/layout";
import { C, STICKER, alpha } from "@/lib/theme";

type AdminUser = User & { locked: boolean }; // locked: chính mình / admin cố định → không sửa được

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";

/** Admin: danh sách người dùng · cấp / bỏ quyền admin · đổi mật khẩu · xoá tài khoản (giống /admin/users trên web) */
export default function UsersScreen() {
  const { user: me } = useAuth();
  const { t, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "admin">("all");
  const [refreshing, setRefreshing] = useState(false);
  const [actionUser, setActionUser] = useState<AdminUser | null>(null);
  const [pwUser, setPwUser] = useState<AdminUser | null>(null);
  const [pwVal, setPwVal] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  const [prevUid, setPrevUid] = useState(me?.id ?? null);
  if (prevUid !== (me?.id ?? null)) {
    setPrevUid(me?.id ?? null);
    setUsers(null);
    setError("");
    setActionUser(null);
    setPwUser(null);
    setPwVal("");
  }

  const load = useCallback(async () => {
    try {
      setError("");
      setUsers((await api<{ users: AdminUser[] }>("/admin/users")).users);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  const meId = me?.id;
  const isAdmin = me?.role === "admin";
  useEffect(() => {
    if (meId !== undefined && !isAdmin) {
      if (router.canGoBack()) router.back();
      else router.replace("/settings");
      return;
    }
    if (isAdmin) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- tải dữ liệu lần đầu
      load();
    }
  }, [meId, isAdmin, load]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (users ?? []).filter(
      (u) => (filter === "all" || u.role === "admin") && (!s || u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s)),
    );
  }, [users, q, filter]);

  if (!isAdmin) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: t("admin.users") }} />
      </View>
    );
  }

  const setRole = (u: AdminUser, role: User["role"]) =>
    api<{ user: AdminUser }>(`/admin/users/${u.id}`, { method: "PATCH", body: { role } }).then(
      (r) => setUsers((list) => list?.map((x) => (x.id === u.id ? r.user : x)) ?? null),
      (e: Error) => showError(e),
    );

  /** Đặt mật khẩu mới (chữ hiện rõ để admin báo lại cho người dùng); server kiểm tra độ dài */
  const setPassword = (u: AdminUser) => {
    setPwVal("");
    setPwUser(u);
  };

  const submitPassword = async () => {
    if (!pwUser || pwBusy) return;
    const target = pwUser;
    setPwBusy(true);
    try {
      await api(`/admin/users/${target.id}`, { method: "PATCH", body: { password: pwVal } });
      setPwUser(null);
      setPwVal("");
      notice(t("admin.passwordChanged"), t("admin.passwordChangedBody", { email: target.email }));
    } catch (e) {
      showError(e);
    } finally {
      setPwBusy(false);
    }
  };

  const remove = (u: AdminUser) =>
    confirmDestructive(t("admin.deleteUserConfirm", { email: u.email }), t("admin.deleteUserSub"), t("delete"), () =>
      api(`/admin/users/${u.id}`, { method: "DELETE" }).then(
        () => setUsers((list) => list?.filter((x) => x.id !== u.id) ?? null),
        (e: Error) => showError(e),
      ),
    );

  const menu = (u: AdminUser) => {
    if (u.locked) return notice(t("admin.lockedTitle"), u.id === me.id ? t("admin.isYou") : t("admin.isMainAdmin"));
    if (Platform.OS !== "ios") {
      setActionUser(u);
      return;
    }
    const makeAdmin = u.role !== "admin";
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: u.name,
        message: u.email,
        options: [makeAdmin ? t("admin.makeAdmin") : t("admin.removeAdmin"), t("admin.setPassword"), t("admin.deleteUser"), t("cancel")],
        destructiveButtonIndex: 2,
        cancelButtonIndex: 3,
      },
      (i) => {
        if (i === 0) setRole(u, makeAdmin ? "admin" : "user");
        else if (i === 1) setPassword(u);
        else if (i === 2) remove(u);
      },
    );
  };

  const adminCount = (users ?? []).filter((u) => u.role === "admin").length;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: t("admin.users") }} />
      <FlatList
        data={shown}
        keyExtractor={(u) => String(u.id)}
        style={{ width: "100%", maxWidth: CONTENT_MAX, alignSelf: "center" }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={C.accentText}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, height: 44, paddingHorizontal: 12, borderRadius: 12, backgroundColor: C.card2 }}>
              <SymbolView name="magnifyingglass" size={16} tintColor={C.muted} />
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder={t("admin.searchUsers")}
                placeholderTextColor={C.muted}
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
                style={{ flex: 1, color: C.text, fontSize: 16, height: "100%" }}
              />
            </View>
            {users && (
              <Segmented
                options={[
                  ["all", `${t("lessons.all")} · ${users.length}`],
                  ["admin", `Admin · ${adminCount}`],
                ]}
                value={filter}
                onChange={setFilter}
              />
            )}
            <ErrorText>{error}</ErrorText>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: C.border, marginLeft: 62 }} />}
        renderItem={({ item: u }) => (
          <Pressable
            onPress={() => menu(u)}
            style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, opacity: pressed ? 0.6 : 1 })}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: u.role === "admin" ? alpha(C.gold, 0.15) : C.card2,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: u.role === "admin" ? C.amber : C.text, fontWeight: "800" }}>{initials(u.name)}</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ color: C.text, fontSize: 16, fontWeight: "700", flexShrink: 1 }} numberOfLines={1}>
                  {u.name}
                </Text>
                {u.role === "admin" && (
                  <Text style={{ color: C.amber, fontSize: 11, fontWeight: "800", borderWidth: 1, borderColor: C.amber, borderRadius: 6, paddingHorizontal: 5, overflow: "hidden" }}>
                    ADMIN
                  </Text>
                )}
                {u.id === me.id && <Text style={{ color: C.muted, fontSize: 12 }}>({t("admin.you")})</Text>}
              </View>
              <Text style={styles.muted} numberOfLines={1}>
                {u.email}
              </Text>
            </View>
            <Text style={{ color: C.muted, fontSize: 12 }}>
              {new Date(u.createdAt.replace(" ", "T") + "Z").toLocaleDateString(lang, { day: "numeric", month: "short", year: "2-digit" })}
            </Text>
            {u.locked ? (
              <SymbolView name="lock.fill" size={13} tintColor={C.muted} />
            ) : (
              <SymbolView name="ellipsis" size={15} tintColor={C.muted} />
            )}
          </Pressable>
        )}
        ListEmptyComponent={users ? <Text style={[styles.muted, { textAlign: "center", marginTop: 24 }]}>{t("admin.noUsers")}</Text> : error ? undefined : <ActivityIndicator color={C.accentText} />}
      />
      {Platform.OS !== "ios" && (
        <ActionSheetModal
          visible={!!actionUser}
          title={actionUser ? `${actionUser.name} · ${actionUser.email}` : undefined}
          onClose={() => setActionUser(null)}
          options={
            actionUser
              ? [
                  {
                    label: actionUser.role !== "admin" ? t("admin.makeAdmin") : t("admin.removeAdmin"),
                    onPress: () => setRole(actionUser, actionUser.role !== "admin" ? "admin" : "user"),
                  },
                  {
                    label: t("admin.setPassword"),
                    onPress: () => setPassword(actionUser),
                  },
                  {
                    label: t("admin.deleteUser"),
                    destructive: true,
                    onPress: () => remove(actionUser),
                  },
                ]
              : []
          }
        />
      )}
      <Modal
        visible={!!pwUser}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          if (!pwBusy) setPwUser(null);
        }}
        supportedOrientations={["portrait", "portrait-upside-down", "landscape-left", "landscape-right"]}
      >
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, justifyContent: "center", padding: 20, paddingBottom: Math.max(insets.bottom, 20) }}>
          <Pressable
            style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.5)" }]}
            onPress={() => !pwBusy && setPwUser(null)}
            accessibilityRole="button"
            accessibilityLabel={t("close")}
          />
          <View style={{ width: "100%", maxWidth: 420, alignSelf: "center", backgroundColor: C.card, borderRadius: 20, ...STICKER, padding: 18, gap: 12 }}>
            <Text style={{ color: C.text, fontSize: 17, fontWeight: "800" }}>
              {pwUser ? t("admin.setPasswordTitle", { email: pwUser.email }) : ""}
            </Text>
            <Text style={styles.muted}>{t("admin.setPasswordBody")}</Text>
            <Input
              value={pwVal}
              onChangeText={setPwVal}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              returnKeyType="done"
              onSubmitEditing={submitPassword}
              editable={!pwBusy}
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button title={t("cancel")} onPress={() => setPwUser(null)} disabled={pwBusy} style={{ flex: 1 }} />
              <Button title={t("admin.setPasswordSave")} variant="primary" onPress={submitPassword} loading={pwBusy} style={{ flex: 1 }} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
