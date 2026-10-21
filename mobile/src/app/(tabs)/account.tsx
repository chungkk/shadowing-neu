import { useCallback, useState, type ReactNode } from "react";
import { router, useFocusEffect } from "expo-router";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { VoiceQuality, type Voice } from "expo-speech";
import { Alert, KeyboardAvoidingView, LayoutAnimation, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, ErrorText, Input, styles } from "@/components/ui";
import { AuthForm } from "@/components/AuthForm";
import { api, API_URL, type User } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { C } from "@/lib/theme";
import { LANGS, useI18n } from "@/lib/i18n";
import { FORM_MAX, useLayout } from "@/lib/layout";
import { chosenVoice, germanVoices, setChosenVoice, speakGerman, stopSpeaking } from "@/lib/speak";

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

/** Thẻ đầu trang: ảnh đại diện chữ cái · tên · email · số từ đã lưu */
function ProfileHeader({ user, words }: { user: User; words: number | null }) {
  const { t, lang } = useI18n();
  return (
    <View style={{ alignItems: "center", gap: 6, paddingTop: 8 }}>
      <View
        style={{
          width: 84,
          height: 84,
          borderRadius: 42,
          backgroundColor: C.accent,
          borderWidth: 3,
          borderColor: C.accentDark,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 6,
        }}
      >
        <Text style={{ color: "#fff", fontSize: 32, fontWeight: "800" }}>{initials(user.name)}</Text>
      </View>
      <Text style={{ color: C.text, fontSize: 24, fontWeight: "800" }} numberOfLines={1}>
        {user.name}
      </Text>
      <Text style={styles.muted} numberOfLines={1}>
        {user.email}
      </Text>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 6, flexWrap: "wrap", justifyContent: "center" }}>
        <Pill color={user.role === "admin" ? C.amber : C.accent}>{user.role === "admin" ? t("acc.admin") : t("acc.student")}</Pill>
        <Pill color={C.muted}>{t("acc.memberSince", { date: monthYear(user.createdAt, lang) })}</Pill>
        {words !== null && (
          <Pressable onPress={() => router.navigate("/vocab")}>
            <Pill color={C.amber} icon="bookmark.fill">
              {t("acc.savedWords", { n: words })}
            </Pill>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function Pill({ color, icon, children }: { color: string; icon?: SFSymbol; children: ReactNode }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 99,
        borderWidth: 1,
        borderColor: C.border,
        backgroundColor: C.card2,
      }}
    >
      {icon && <SymbolView name={icon} size={11} tintColor={color} />}
      <Text style={{ color, fontSize: 12, fontWeight: "700" }}>{children}</Text>
    </View>
  );
}

/** Ngôn ngữ giao diện — đang đăng nhập thì lưu vào tài khoản */
function LanguageSection() {
  const { lang, t } = useI18n();
  const { user, changeLang } = useAuth();
  return (
    <Section title={t("acc.language")} footer={user ? t("acc.langNote") : t("acc.langNoteGuest")}>
      {LANGS.map((l, i) => (
        <Row
          key={l.code}
          first={i === 0}
          icon="globe"
          iconBg={lang === l.code ? C.accent : C.card2}
          title={l.label}
          chevron={false}
          trailing={lang === l.code && <SymbolView name="checkmark" size={16} tintColor={C.accent} weight="bold" />}
          onPress={() => changeLang(l.code)}
        />
      ))}
    </Section>
  );
}

/** Giọng đọc tiếng Đức — chọn trong các giọng có sẵn của máy, lưu trên máy. Chạm vào giọng là nghe thử luôn */
function VoiceSection() {
  const { t } = useI18n();
  const [voices, setVoices] = useState<Voice[] | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);

  // Tải lại mỗi lần mở tab: người dùng có thể vừa tải thêm giọng trong Cài đặt
  useFocusEffect(
    useCallback(() => {
      germanVoices(true).then(setVoices);
      chosenVoice().then(setChosen);
      return () => void stopSpeaking();
    }, []),
  );

  const pick = (id: string | null) => {
    setChosen(id);
    setChosenVoice(id);
    speakGerman(t("voice.sample"), { voice: id ?? voices?.[0]?.identifier }).catch(() => {});
  };
  const check = (on: boolean) => on && <SymbolView name="checkmark" size={16} tintColor={C.accent} weight="bold" />;
  const current = voices?.some((v) => v.identifier === chosen) ? chosen : null;

  if (!voices) return null;
  return (
    <Section title={t("voice.title")} footer={voices.length ? t(Platform.OS === "ios" ? "voice.note" : "voice.noteAndroid") : t("voice.none")}>
      <Row first icon="wand.and.stars" iconBg={current === null ? C.accent : C.card2} title={t("voice.auto")} value={t("voice.autoSub")} chevron={false} trailing={check(current === null)} onPress={() => pick(null)} />
      {voices.map((v, i) => (
        <Row
          key={v.identifier}
          icon="speaker.wave.2.fill"
          iconBg={current === v.identifier ? C.accent : C.card2}
          title={v.name === v.identifier ? t("voice.n", { n: i + 1 }) : v.name}
          value={[v.language, v.quality === VoiceQuality.Enhanced && t("voice.enhanced")].filter(Boolean).join(" · ")}
          chevron={false}
          trailing={check(current === v.identifier)}
          onPress={() => pick(v.identifier)}
        />
      ))}
    </Section>
  );
}

type Panel = "profile" | "password" | "delete" | null;

function Signed({ user }: { user: User }) {
  const { logout, setUser, setToken } = useAuth();
  const { t } = useI18n();
  const [panel, setPanel] = useState<Panel>(null);
  const [words, setWords] = useState<number | null>(null);
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [delPw, setDelPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const hasPassword = user.hasPassword !== false; // tài khoản Google / Apple: chưa có mật khẩu

  // Số từ đã lưu: tải lại mỗi lần mở tab
  useFocusEffect(
    useCallback(() => {
      api<{ vocab: unknown[] }>("/vocab").then(
        (r) => setWords(r.vocab.length),
        () => {},
      );
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

  const confirmLogout = () =>
    Alert.alert(t("acc.logoutConfirm"), undefined, [
      { text: t("cancel"), style: "cancel" },
      { text: t("acc.logout"), style: "destructive", onPress: logout },
    ]);

  const deleteAccount = () =>
    Alert.alert(t("acc.deleteConfirm"), t("acc.deleteConfirmSub"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: () =>
          run(async () => {
            await api("/me", { method: "DELETE", body: { password: delPw } });
            await logout();
          }),
      },
    ]);

  const feedback = (
    <>
      <ErrorText>{err}</ErrorText>
      {!!msg && <Text style={{ color: C.accent, fontWeight: "600" }}>{msg}</Text>}
    </>
  );
  const nameChanged = name.trim() !== user.name || email.trim() !== user.email;

  return (
    <>
      <ProfileHeader user={user} words={words} />

      <LanguageSection />

      <VoiceSection />

      {user.role === "admin" && (
        <Section title={t("admin.section")} footer={t("admin.hint")}>
          <Row first icon="person.2.fill" iconBg="#b45309" title={t("admin.users")} onPress={() => router.push("/admin/users")} />
          <Row icon="plus.rectangle.on.rectangle" iconBg={C.accentDark} title={t("admin.addFromYoutube")} onPress={() => router.navigate("/youtube")} />
        </Section>
      )}

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
        <Row icon="rectangle.portrait.and.arrow.right" iconBg={C.card2} color={C.redText} title={t("acc.logout")} chevron={false} onPress={confirmLogout} />
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
          {ready && (user ? <Signed key={user.id} user={user} /> : <AuthForm />)}
          {ready && !user && <LanguageSection />}
          {ready && !user && <VoiceSection />}
          {__DEV__ && <Text style={[styles.muted, { fontSize: 12, textAlign: "center" }]}>Server: {API_URL}</Text>}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
