import { useCallback, useState, type ReactNode } from "react";
import { router, useFocusEffect } from "expo-router";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { Image } from "expo-image";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import Constants from "expo-constants";
import { ActionSheetIOS, ActivityIndicator, KeyboardAvoidingView, LayoutAnimation, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, ErrorText, Input, Segmented, styles } from "@/components/ui";
import { AuthForm } from "@/components/AuthForm";
import { api, API_URL, avatarSource, fileForm, type Stats, type User } from "@/lib/api";
import { confirmDestructive, showError } from "@/lib/dialogs";
import { useAuth } from "@/lib/auth";
import { C } from "@/lib/theme";
import { LANGS, useI18n } from "@/lib/i18n";
import { FORM_MAX, useLayout } from "@/lib/layout";
import { germanVoices, speakGerman, stopSpeaking } from "@/lib/speak";

/** Nhóm kiểu Cài đặt iOS: tiêu đề nhỏ · khung bo góc chứa các dòng · chú thích bên dưới */
function Section({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      {!!title && (
        <Text style={{ color: C.muted, fontSize: 13, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", marginLeft: 14 }}>
          {title}
        </Text>
      )}
      <View style={{ backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 16, overflow: "hidden" }}>{children}</View>
      {!!footer && <Text style={{ color: C.muted, fontSize: 13, marginHorizontal: 14, lineHeight: 18 }}>{footer}</Text>}
    </View>
  );
}

/** Một dòng trong nhóm: biểu tượng · tiêu đề · giá trị / mũi tên. `open` → mở rộng phần nội dung bên dưới */
function Row({
  icon,
  iconBg = C.card2,
  title,
  value,
  color = C.text,
  first,
  open,
  chevron = true,
  trailing,
  onPress,
  children,
}: {
  icon: SFSymbol;
  iconBg?: string;
  title: string;
  value?: string;
  color?: string;
  first?: boolean;
  open?: boolean;
  chevron?: boolean;
  trailing?: ReactNode;
  onPress?: () => void;
  children?: ReactNode;
}) {
  return (
    <View style={{ borderTopWidth: first ? 0 : 1, borderTopColor: C.border }}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: 14,
          minHeight: 52,
          backgroundColor: pressed ? C.card2 : "transparent",
        })}
      >
        <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: iconBg, alignItems: "center", justifyContent: "center" }}>
          <SymbolView name={icon} size={16} tintColor={color === C.text ? "#fff" : color} weight="semibold" />
        </View>
        <Text style={{ flex: 1, color, fontSize: 16, fontWeight: "600" }} numberOfLines={1}>
          {title}
        </Text>
        {!!value && (
          <Text style={{ color: C.muted, fontSize: 15, maxWidth: "45%" }} numberOfLines={1}>
            {value}
          </Text>
        )}
        {trailing}
        {chevron && (
          <SymbolView name={open ? "chevron.down" : "chevron.right"} size={13} tintColor="#4a5a50" weight="semibold" />
        )}
      </Pressable>
      {open && <View style={{ paddingHorizontal: 14, paddingBottom: 16, gap: 10 }}>{children}</View>}
    </View>
  );
}

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";

/** "2026-10-19 08:00:00" (UTC) → "tháng 10 năm 2026" / "October 2026" / "Oktober 2026" */
const monthYear = (createdAt: string, lang: string) => {
  const d = new Date(createdAt.replace(" ", "T") + "Z");
  return isNaN(+d) ? createdAt.slice(0, 10) : d.toLocaleDateString(lang, { month: "long", year: "numeric" });
};

const AVATAR_SIZE = 400; // cạnh ảnh đại diện gửi lên server (px) — đủ nét cho màn Retina, chỉ ~50 KB

/** Ảnh đại diện (chữ cái đầu tên khi chưa có ảnh) — chạm để chọn ảnh từ thư viện / xoá ảnh */
function Avatar({ user }: { user: User }) {
  const { t } = useI18n();
  const { setUser } = useAuth();
  const [busy, setBusy] = useState(false);

  const upload = async () => {
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 1 });
    if (picked.canceled || !picked.assets[0]) return;
    setBusy(true);
    try {
      // Cắt vuông (đã chọn khung ở bước trên) → thu nhỏ → JPEG trước khi gửi
      const img = await ImageManipulator.manipulate(picked.assets[0].uri).resize({ width: AVATAR_SIZE, height: AVATAR_SIZE }).renderAsync();
      const out = await img.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
      const r = await api<{ user: User }>("/me/avatar", { method: "POST", body: fileForm(out.uri) });
      setUser(r.user);
    } catch (e) {
      showError(e, t("acc.avatarFailed"));
    } finally {
      setBusy(false);
    }
  };
  const remove = () =>
    confirmDestructive(t("acc.avatarRemoveConfirm"), t("acc.avatarRemoveBody"), t("acc.avatarRemove"), async () => {
      setBusy(true);
      try {
        setUser((await api<{ user: User }>("/me/avatar", { method: "DELETE" })).user);
      } catch (e) {
        showError(e);
      } finally {
        setBusy(false);
      }
    });
  const menu = () => {
    if (busy) return;
    if (!user.avatarUrl || Platform.OS !== "ios") return upload();
    ActionSheetIOS.showActionSheetWithOptions(
      { options: [t("acc.avatarPick"), t("acc.avatarRemove"), t("cancel")], destructiveButtonIndex: 1, cancelButtonIndex: 2 },
      (i) => (i === 0 ? upload() : i === 1 ? remove() : undefined),
    );
  };

  return (
    <Pressable onPress={menu} accessibilityRole="button" accessibilityLabel={t("acc.avatarChange")}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: C.accent,
          borderWidth: 2,
          borderColor: C.accentDark,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {user.avatarUrl ? (
          <Image source={avatarSource(user.avatarUrl)} alt="" style={{ width: "100%", height: "100%" }} contentFit="cover" transition={150} />
        ) : (
          <Text style={{ color: "#fff", fontSize: 26, fontWeight: "800" }}>{initials(user.name)}</Text>
        )}
        {busy && (
          <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color="#fff" />
          </View>
        )}
      </View>
      {/* Huy hiệu máy ảnh: báo ảnh đại diện đổi được */}
      <View
        style={{
          position: "absolute",
          right: -2,
          bottom: -2,
          width: 26,
          height: 26,
          borderRadius: 13,
          backgroundColor: C.card2,
          borderWidth: 2,
          borderColor: C.card,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <SymbolView name="camera.fill" size={11} tintColor={C.text} />
      </View>
    </Pressable>
  );
}

/** Một ô số liệu trong thẻ hồ sơ */
function Tile({ value, label, first }: { value: string; label: string; first?: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 2, paddingVertical: 12, borderLeftWidth: first ? 0 : 1, borderLeftColor: C.border }}>
      <Text style={{ color: C.text, fontSize: 22, fontWeight: "800" }}>{value}</Text>
      <Text style={{ color: C.muted, fontSize: 12, textAlign: "center" }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Thẻ đầu trang: ảnh · tên · email · vai trò — bên dưới là số liệu học tập (chạm → màn Thống kê) */
function ProfileCard({ user, words, stats }: { user: User; words: number | null; stats: Pick<Stats, "streak" | "dueToday"> | null }) {
  const { t, lang } = useI18n();
  const num = (n: number | null | undefined) => (n === null || n === undefined ? "—" : String(n));
  return (
    <View style={{ backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 20, overflow: "hidden" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16 }}>
        <Avatar user={user} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ color: C.text, fontSize: 20, fontWeight: "800" }} numberOfLines={1}>
            {user.name}
          </Text>
          <Text style={{ color: C.muted, fontSize: 14 }} numberOfLines={1}>
            {user.email}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
            <Pill color={user.role === "admin" ? C.amber : C.accent}>{user.role === "admin" ? t("acc.admin") : t("acc.student")}</Pill>
            <Text style={{ color: C.muted, fontSize: 12 }} numberOfLines={1}>
              {t("acc.memberSince", { date: monthYear(user.createdAt, lang) })}
            </Text>
          </View>
        </View>
      </View>
      <Pressable
        onPress={() => router.push("/stats")}
        accessibilityRole="button"
        accessibilityLabel={t("acc.viewStats")}
        style={({ pressed }) => ({ borderTopWidth: 1, borderTopColor: C.border, backgroundColor: pressed ? C.card2 : "transparent" })}
      >
        <View style={{ flexDirection: "row" }}>
          <Tile first value={num(words)} label={t("acc.tileWords")} />
          <Tile value={num(stats?.streak)} label={t("acc.tileStreak")} />
          <Tile value={num(stats?.dueToday)} label={t("acc.tileDue")} />
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            paddingVertical: 11,
            borderTopWidth: 1,
            borderTopColor: C.border,
          }}
        >
          <SymbolView name="chart.bar.fill" size={13} tintColor={C.accent} />
          <Text style={{ color: C.accent, fontSize: 14, fontWeight: "700" }}>{t("acc.viewStats")}</Text>
          <SymbolView name="chevron.right" size={11} tintColor={C.accent} weight="semibold" />
        </View>
      </Pressable>
    </View>
  );
}

function Pill({ color, children }: { color: string; children: ReactNode }) {
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, borderWidth: 1, borderColor: C.border, backgroundColor: C.card2 }}>
      <Text style={{ color, fontSize: 12, fontWeight: "700" }}>{children}</Text>
    </View>
  );
}

/** Cài đặt: ngôn ngữ giao diện (đang đăng nhập thì lưu vào tài khoản) · giọng đọc tiếng Đức (luôn tự động, chạm để nghe thử) */
function SettingsSection() {
  const { lang, t } = useI18n();
  const { user, changeLang } = useAuth();
  const [langOpen, setLangOpen] = useState(false);
  const [voices, setVoices] = useState<number | null>(null); // số giọng tiếng Đức trong máy

  // Tải lại mỗi lần mở tab: người dùng có thể vừa tải thêm giọng trong Cài đặt
  useFocusEffect(
    useCallback(() => {
      germanVoices(true).then((v) => setVoices(v.length));
      return () => void stopSpeaking();
    }, []),
  );

  const voiceNote = voices === null ? undefined : voices ? t(Platform.OS === "ios" ? "voice.note" : "voice.noteAndroid") : t("voice.none");
  return (
    <Section title={t("acc.sectionSettings")} footer={voiceNote}>
      <Row
        first
        icon="globe"
        iconBg="#0891b2"
        title={t("acc.language")}
        value={LANGS.find((l) => l.code === lang)?.label}
        open={langOpen}
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setLangOpen(!langOpen);
        }}
      >
        <Segmented options={LANGS.map((l) => [l.code, l.label] as const)} value={lang} onChange={changeLang} />
        <Text style={{ color: C.muted, fontSize: 13, lineHeight: 18 }}>{user ? t("acc.langNote") : t("acc.langNoteGuest")}</Text>
      </Row>
      {voices !== null && (
        <Row
          icon="waveform"
          iconBg={C.accent}
          title={t("voice.title")}
          value={t("voice.auto")}
          chevron={false}
          trailing={<SymbolView name="play.circle.fill" size={22} tintColor={C.accent} />}
          onPress={() => speakGerman(t("voice.sample")).catch(() => {})}
        />
      )}
    </Section>
  );
}

type Panel = "profile" | "password" | "delete" | null;

function Signed({ user }: { user: User }) {
  const { logout, setUser, setToken } = useAuth();
  const { t } = useI18n();
  const [panel, setPanel] = useState<Panel>(null);
  const [words, setWords] = useState<number | null>(null);
  const [stats, setStats] = useState<Pick<Stats, "streak" | "dueToday"> | null>(null);
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [delPw, setDelPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const hasPassword = user.hasPassword !== false; // tài khoản Google / Apple: chưa có mật khẩu

  // Số từ đã lưu + chuỗi ngày / mục đến hạn: tải lại mỗi lần mở tab
  useFocusEffect(
    useCallback(() => {
      api<{ vocab: unknown[] }>("/vocab").then(
        (r) => setWords(r.vocab.length),
        () => {},
      );
      api<Stats>(`/stats?tz=${new Date().getTimezoneOffset()}`).then(setStats, () => {});
    }, []),
  );

  const toggle = (p: Panel) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPanel(panel === p ? null : p);
    setErr("");
    setMsg("");
  };

  const run = async (fn: () => Promise<void>) => {
    setErr("");
    setMsg("");
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = () =>
    run(async () => {
      const r = await api<{ user: User }>("/me", { method: "PATCH", body: { name, email } });
      setUser(r.user);
      setMsg(t("acc.saved"));
    });

  const changePassword = () =>
    run(async () => {
      const r = await api<{ token: string }>("/me/password", { method: "POST", body: { current, next } });
      await setToken(r.token);
      setCurrent("");
      setNext("");
      setMsg(hasPassword ? t("acc.pwChanged") : t("acc.pwSet"));
      setUser({ ...user, hasPassword: true });
    });

  const confirmLogout = () => confirmDestructive(t("acc.logoutConfirm"), t("acc.logoutBody"), t("acc.logout"), logout);

  const deleteAccount = () =>
    confirmDestructive(t("acc.deleteConfirm"), t("acc.deleteConfirmSub"), t("acc.deleteAction"), () =>
      run(async () => {
        await api("/me", { method: "DELETE", body: { password: delPw } });
        await logout();
      }),
    );

  const feedback = (
    <>
      <ErrorText>{err}</ErrorText>
      {!!msg && <Text style={{ color: C.accent, fontWeight: "600" }}>{msg}</Text>}
    </>
  );
  const nameChanged = name.trim() !== user.name || email.trim() !== user.email;

  return (
    <>
      <ProfileCard user={user} words={words} stats={stats} />

      <Section title={t("acc.sectionAccount")}>
        <Row first icon="person.text.rectangle" iconBg="#2563eb" title={t("acc.profile")} open={panel === "profile"} onPress={() => toggle("profile")}>
          <Input value={name} onChangeText={setName} placeholder={t("acc.displayName")} />
          <Input value={email} onChangeText={setEmail} placeholder={t("auth.email")} autoCapitalize="none" keyboardType="email-address" />
          {feedback}
          <Button title={t("acc.save")} variant="primary" onPress={saveProfile} loading={busy} disabled={!nameChanged} />
        </Row>
        <Row
          icon="key.fill"
          iconBg="#7c3aed"
          title={hasPassword ? t("acc.changePw") : t("acc.setPw")}
          open={panel === "password"}
          onPress={() => toggle("password")}
        >
          {hasPassword ? (
            <Input value={current} onChangeText={setCurrent} placeholder={t("acc.currentPw")} secureTextEntry />
          ) : (
            <Text style={styles.muted}>{t("acc.setPwNote")}</Text>
          )}
          <Input value={next} onChangeText={setNext} placeholder={t("acc.newPw")} secureTextEntry />
          {feedback}
          <Button
            title={hasPassword ? t("acc.changePw") : t("acc.setPw")}
            variant="primary"
            onPress={changePassword}
            loading={busy}
            disabled={(hasPassword && !current) || !next}
          />
        </Row>
      </Section>

      <SettingsSection />

      {user.role === "admin" && (
        <Section title={t("admin.section")} footer={t("admin.hint")}>
          <Row first icon="person.2.fill" iconBg="#b45309" title={t("admin.users")} onPress={() => router.push("/admin/users")} />
          <Row icon="plus.rectangle.on.rectangle" iconBg={C.accentDark} title={t("admin.addFromYoutube")} onPress={() => router.navigate("/youtube")} />
        </Section>
      )}

      <Section>
        <Row
          first
          icon="rectangle.portrait.and.arrow.right"
          iconBg={C.card2}
          color={C.redText}
          title={t("acc.logout")}
          chevron={false}
          onPress={confirmLogout}
        />
      </Section>

      <Section footer={t("acc.deleteSub")}>
        <Row first icon="trash.fill" iconBg="rgba(220,38,38,0.25)" color={C.redText} title={t("acc.deleteTitle")} open={panel === "delete"} onPress={() => toggle("delete")}>
          {hasPassword ? (
            <Input value={delPw} onChangeText={setDelPw} placeholder={t("acc.deletePw")} secureTextEntry />
          ) : (
            <Text style={styles.muted}>{t("acc.deleteNoPw")}</Text>
          )}
          {feedback}
          <Button title={t("acc.deleteTitle")} variant="red" onPress={deleteAccount} loading={busy} disabled={hasPassword && !delPw} />
        </Row>
      </Section>
    </>
  );
}

export default function AccountScreen() {
  const { user, ready } = useAuth();
  const { t } = useI18n();
  const { tablet } = useLayout();
  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            width: "100%",
            maxWidth: FORM_MAX,
            alignSelf: "center",
            padding: 16,
            paddingTop: tablet ? 40 : 16,
            gap: 24,
            paddingBottom: 120, // chừa chỗ cho thanh tab nổi
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.h1}>{t("tabs.account")}</Text>
          {ready && (user ? <Signed key={user.id} user={user} /> : <AuthForm />)}
          {ready && !user && <SettingsSection />}
          <View style={{ alignItems: "center", gap: 2 }}>
            <Text style={{ color: "#4a5a50", fontSize: 12, fontWeight: "600" }}>
              {Constants.expoConfig?.name} · {t("acc.version", { v: Constants.expoConfig?.version ?? "—" })}
            </Text>
            {__DEV__ && <Text style={{ color: "#4a5a50", fontSize: 12 }}>Server: {API_URL}</Text>}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
