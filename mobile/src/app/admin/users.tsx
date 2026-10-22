import { Stack } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActionSheetIOS, ActivityIndicator, FlatList, Pressable, RefreshControl, Text, TextInput, View } from "react-native";
import { ErrorText, Segmented, styles } from "@/components/ui";
import { api, type User } from "@/lib/api";
import { confirmDestructive, notice, showError } from "@/lib/dialogs";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { CONTENT_MAX } from "@/lib/layout";
import { C } from "@/lib/theme";

type AdminUser = User & { locked: boolean }; // locked: chính mình / admin cố định → không sửa được

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";

/** Admin: danh sách người dùng · cấp / bỏ quyền admin · xoá tài khoản (giống /admin/users trên web) */
export default function UsersScreen() {
  const { user: me } = useAuth();
  const { t, lang } = useI18n();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "admin">("all");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError("");
      setUsers((await api<{ users: AdminUser[] }>("/admin/users")).users);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải dữ liệu lần đầu
    load();
  }, [load]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (users ?? []).filter(
      (u) => (filter === "all" || u.role === "admin") && (!s || u.name.toLowerCase().includes(s) || u.email.includes(s)),
    );
  }, [users, q, filter]);

  if (me?.role !== "admin") return null;

  const setRole = (u: AdminUser, role: User["role"]) =>
    api<{ user: AdminUser }>(`/admin/users/${u.id}`, { method: "PATCH", body: { role } }).then(
      (r) => setUsers((list) => list?.map((x) => (x.id === u.id ? r.user : x)) ?? null),
      (e: Error) => showError(e),
    );

  const remove = (u: AdminUser) =>
    confirmDestructive(t("admin.deleteUserConfirm", { email: u.email }), t("admin.deleteUserSub"), t("delete"), () =>
      api(`/admin/users/${u.id}`, { method: "DELETE" }).then(
        () => setUsers((list) => list?.filter((x) => x.id !== u.id) ?? null),
        (e: Error) => showError(e),
      ),
    );

  const menu = (u: AdminUser) => {
    if (u.locked) return notice(t("admin.lockedTitle"), u.id === me.id ? t("admin.isYou") : t("admin.isMainAdmin"));
    const makeAdmin = u.role !== "admin";
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: u.name,
        message: u.email,
        options: [makeAdmin ? t("admin.makeAdmin") : t("admin.removeAdmin"), t("admin.deleteUser"), t("cancel")],
        destructiveButtonIndex: 1,
        cancelButtonIndex: 2,
      },
      (i) => {
        if (i === 0) setRole(u, makeAdmin ? "admin" : "user");
        else if (i === 1) remove(u);
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
            tintColor={C.accent}
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
                placeholderTextColor="#5b6b60"
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
                backgroundColor: u.role === "admin" ? "rgba(250,204,21,0.15)" : C.card2,
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
            <Text style={{ color: "#4a5a50", fontSize: 12 }}>
              {new Date(u.createdAt.replace(" ", "T") + "Z").toLocaleDateString(lang, { day: "numeric", month: "short", year: "2-digit" })}
            </Text>
            {u.locked ? (
              <SymbolView name="lock.fill" size={13} tintColor="#4a5a50" />
            ) : (
              <SymbolView name="ellipsis" size={15} tintColor={C.muted} />
            )}
          </Pressable>
        )}
        ListEmptyComponent={users ? <Text style={[styles.muted, { textAlign: "center", marginTop: 24 }]}>{t("admin.noUsers")}</Text> : <ActivityIndicator color={C.accent} />}
      />
    </View>
  );
}
