import { Image } from "expo-image";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { useEffect, useRef, useState, type ComponentRef, type Ref } from "react";
import { ActivityIndicator, Pressable, View, type TextInputProps } from "react-native";
import { DISPLAY, Text, TextInput } from "./Text";
import { useAuth } from "@/lib/auth";
import { SocialLogin } from "@/components/SocialLogin";
import { haptic } from "@/lib/haptics";
import { C, alpha } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Ô nhập có nhãn, icon đầu dòng, viền sáng khi focus, báo lỗi ngay dưới ô */
type InputRef = ComponentRef<typeof TextInput>;

function Field({
  label,
  icon,
  error,
  secure,
  ref,
  ...props
}: TextInputProps & {
  label: string;
  icon: SFSymbol;
  error?: string;
  secure?: boolean;
  ref?: Ref<InputRef>;
}) {
  const { t } = useI18n();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const borderColor = error ? C.red : focused ? C.accent : C.border;
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ color: C.muted, fontSize: 13, fontWeight: "700" }}>{label}</Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          minHeight: 48,
          paddingVertical: 8,
          paddingHorizontal: 14,
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor,
          backgroundColor: C.card,
        }}
      >
        <SymbolView name={icon} size={18} tintColor={focused ? C.accentText : C.muted} />
        <TextInput
          ref={ref}
          placeholderTextColor={C.muted}
          secureTextEntry={secure && hidden}
          {...props}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          style={[{ flex: 1, color: C.text, fontSize: 16 }, props.style]}
        />
        {secure && (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={hidden ? t("auth.showPw") : t("auth.hidePw")}
          >
            <SymbolView name={hidden ? "eye" : "eye.slash"} size={18} tintColor={C.muted} />
          </Pressable>
        )}
      </View>
      {!!error && <Text style={{ color: C.redText, fontSize: 12 }}>{error}</Text>}
    </View>
  );
}

/** Nút chính màu xanh (đang xử lý → vòng xoay) */
function PrimaryButton({ title, onPress, busy, disabled }: { title: string; onPress: () => void; busy?: boolean; disabled?: boolean }) {
  return (
    <Pressable
      onPress={() => {
        haptic.firm();
        onPress();
      }}
      disabled={busy || disabled}
      accessibilityRole="button"
      accessibilityState={{ busy: !!busy, disabled: !!disabled }}
      style={({ pressed }) => ({
        height: 52,
        borderRadius: 12,
        backgroundColor: C.accent,
        alignItems: "center",
        justifyContent: "center",
        opacity: busy || disabled ? 0.6 : 1,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontSize: 17, fontWeight: "700" }}>{title}</Text>}
    </Pressable>
  );
}

/** Quên mật khẩu: nhập email → nhận mã 6 số → nhập mã + mật khẩu mới ngay trong app (đặt xong là đăng nhập luôn) */
function ForgotPassword({ initialEmail, onBack }: { initialEmail: string; onBack: () => void }) {
  const { t } = useI18n();
  const { sendPasswordReset, resetPassword } = useAuth();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const busyRef = useRef(false);
  const passwordRef = useRef<InputRef>(null);
  const confirmRef = useRef<InputRef>(null);
  const invalidEmail = !EMAIL_RE.test(email.trim());

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const run = async (fn: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const send = (resend = false) =>
    run(async () => {
      await sendPasswordReset(email.trim());
      setCode("");
      setStep("code");
      setCooldown(60);
      if (resend) setNotice(t("auth.resent"));
    });

  const pwError = password && password.length < 8 ? t("auth.errPwShort") : undefined;
  const confirmError = confirmPw && confirmPw !== password ? t("auth.errPwMismatch") : undefined;
  const canSave = code.length === 6 && password.length >= 8 && password === confirmPw;
  const save = () => {
    if (!canSave || busyRef.current) return;
    run(() => resetPassword(email.trim(), code, password)); // thành công → đã đăng nhập, màn này tự đóng
  };

  return (
    <View style={{ gap: 18, paddingTop: 4 }}>
      <View style={{ alignItems: "center", gap: 8 }}>
        <View
          style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: C.accentSoft, alignItems: "center", justifyContent: "center" }}
        >
          <SymbolView name={step === "code" ? "envelope.badge" : "key.fill"} size={32} tintColor={C.accentText} weight="semibold" />
        </View>
        <Text style={{ color: C.text, fontFamily: DISPLAY, fontSize: 22, fontWeight: "800" }}>
          {step === "code" ? t("auth.resetTitle") : t("auth.forgotTitle")}
        </Text>
        <Text style={{ color: C.muted, fontSize: 15, textAlign: "center", lineHeight: 21 }}>
          {step === "code" ? t("auth.resetSub", { email: email.trim() }) : t("auth.forgotSub")}
        </Text>
      </View>

      <View style={{ gap: 12 }}>
        {step === "email" ? (
          <Field
            label={t("auth.email")}
            icon="envelope"
            value={email}
            onChangeText={setEmail}
            placeholder={t("auth.emailPh")}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            keyboardType="email-address"
            returnKeyType="send"
            onSubmitEditing={() => !invalidEmail && !busyRef.current && send()}
            autoFocus={!initialEmail}
          />
        ) : (
          <>
            <Field
              label={t("auth.code")}
              icon="number"
              value={code}
              onChangeText={(v) => {
                const c = v.replace(/\D/g, "").slice(0, 6);
                setCode(c);
                if (c.length === 6) passwordRef.current?.focus(); // đủ 6 số → sang ô mật khẩu
              }}
              placeholder="000000"
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              autoFocus
              maxLength={6}
              style={{ fontSize: 24, fontWeight: "800", letterSpacing: 8 }}
            />
            <Field
              ref={passwordRef}
              label={t("auth.newPw")}
              icon="lock"
              secure
              value={password}
              onChangeText={setPassword}
              placeholder={t("auth.pwNewPh")}
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => confirmRef.current?.focus()}
              error={pwError}
            />
            <Field
              ref={confirmRef}
              label={t("auth.confirmPw")}
              icon="lock"
              secure
              value={confirmPw}
              onChangeText={setConfirmPw}
              placeholder={t("auth.confirmPwPh")}
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="go"
              onSubmitEditing={save}
              error={confirmError}
            />
          </>
        )}

        {!!error && (
          <Text accessibilityRole="alert" style={{ color: C.redText, fontSize: 14 }}>
            {error}
          </Text>
        )}
        {!!notice && <Text style={{ color: C.accentText, fontSize: 14, textAlign: "center" }}>{notice}</Text>}

        {step === "email" ? (
          <PrimaryButton title={t("auth.sendResetCode")} onPress={() => send()} busy={busy} disabled={invalidEmail} />
        ) : (
          <PrimaryButton title={t("auth.savePw")} onPress={save} busy={busy} disabled={!canSave} />
        )}

        {step === "code" && (
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Pressable
              onPress={() => {
                setStep("email");
                setCode("");
                setPassword("");
                setConfirmPw("");
                setCooldown(0);
                setError("");
                setNotice("");
              }}
              accessibilityRole="button"
              hitSlop={12}
            >
              <Text style={{ color: C.accentText, fontSize: 15, fontWeight: "700" }}>← {t("auth.changeEmail")}</Text>
            </Pressable>
            <Pressable
              onPress={() => send(true)}
              disabled={cooldown > 0 || busy}
              accessibilityRole="button"
              accessibilityState={{ disabled: cooldown > 0 || busy }}
              hitSlop={12}
            >
              <Text style={{ color: cooldown > 0 ? C.muted : C.accentText, fontSize: 15, fontWeight: "700" }}>
                {cooldown > 0 ? t("auth.resendIn", { s: cooldown }) : t("auth.resend")}
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      <Pressable onPress={onBack} accessibilityRole="button" hitSlop={12} style={{ alignSelf: "center" }}>
        <Text style={{ color: C.accentText, fontSize: 15, fontWeight: "800" }}>← {t("auth.backToLogin")}</Text>
      </Pressable>
    </View>
  );
}

/**
 * Màn đăng nhập / đăng ký (dùng chung tài khoản với web).
 * Đăng ký 2 bước: điền thông tin → nhận mã 6 số qua email → nhập mã mới tạo được tài khoản.
 */
export function AuthForm() {
  const { login, register, sendSignupCode } = useAuth();
  const { t } = useI18n();
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false); // chỉ báo lỗi từng ô sau lần bấm gửi đầu tiên
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"info" | "code">("info");
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0); // giây chờ trước khi được gửi lại mã
  const [notice, setNotice] = useState("");
  const busyRef = useRef(false);
  const emailRef = useRef<InputRef>(null);
  const passwordRef = useRef<InputRef>(null);

  const isRegister = mode === "register";
  const errors = {
    name: isRegister && !name.trim() ? t("auth.errName") : undefined,
    email: !email.trim() ? t("auth.errEmail") : !EMAIL_RE.test(email.trim()) ? t("auth.errEmailInvalid") : undefined,
    password: !password ? t("auth.errPw") : isRegister && password.length < 8 ? t("auth.errPwShort") : undefined,
  };
  const valid = !errors.name && !errors.email && !errors.password;
  const show = (k: keyof typeof errors) => (touched ? errors[k] : undefined);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const run = async (fn: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const sendCode = (resend = false) =>
    run(async () => {
      await sendSignupCode(name.trim(), email.trim(), password);
      setStep("code");
      setCode("");
      setCooldown(60);
      if (resend) setNotice(t("auth.resent"));
    });

  const confirm = (c = code) => {
    if (c.length !== 6 || busyRef.current) return;
    run(() => register(name.trim(), email.trim(), password, c));
  };

  const submit = () => {
    setTouched(true);
    if (!valid || busyRef.current) return;
    if (isRegister) sendCode();
    else run(() => login(email.trim(), password));
  };

  const switchMode = () => {
    setMode(isRegister ? "login" : "register");
    setStep("info");
    setTouched(false);
    setError("");
    setNotice("");
    setCode("");
    setCooldown(0);
  };

  const codeStep = isRegister && step === "code";

  if (mode === "forgot") {
    return (
      <ForgotPassword
        initialEmail={EMAIL_RE.test(email.trim()) ? email.trim() : ""}
        onBack={() => {
          setMode("login");
          setError("");
        }}
      />
    );
  }

  return (
    <View style={{ gap: 18, paddingTop: 4 }}>
      {/* Thương hiệu */}
      <View style={{ alignItems: "center", gap: 8 }}>
        {codeStep ? (
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 22,
              backgroundColor: C.accentSoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <SymbolView name="envelope.badge" size={34} tintColor={C.accentText} weight="semibold" />
          </View>
        ) : (
          <Image source={require("@/assets/images/mascot.svg")} alt="" style={{ width: 84, height: 84 }} />
        )}
        <View style={{ alignItems: "center", gap: 2 }}>
          <Text style={{ color: C.text, fontFamily: DISPLAY, fontSize: 22, fontWeight: "800" }}>
            {codeStep ? t("auth.codeTitle") : isRegister ? t("auth.createTitle") : t("auth.welcome")}
          </Text>
          <Text
            style={{
              color: C.muted,
              fontSize: 15,
              textAlign: "center",
              lineHeight: 21,
            }}
          >
            {codeStep ? t("auth.codeSub", { email: email.trim() }) : isRegister ? t("auth.createSub") : t("auth.welcomeSub")}
          </Text>
        </View>
      </View>

      {/* Form */}
      <View style={{ gap: 12 }}>
        {codeStep && (
          <Field
            label={t("auth.code")}
            icon="number"
            value={code}
            onChangeText={(v) => {
              const c = v.replace(/\D/g, "").slice(0, 6);
              setCode(c);
              if (c.length === 6) confirm(c); // đủ 6 số → tự xác nhận
            }}
            placeholder="000000"
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            autoFocus
            maxLength={6}
            style={{ fontSize: 24, fontWeight: "800", letterSpacing: 8 }}
          />
        )}
        {!codeStep && isRegister && (
          <Field
            label={t("auth.name")}
            icon="person"
            value={name}
            onChangeText={setName}
            placeholder={t("auth.namePh")}
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            submitBehavior="submit"
            error={show("name")}
          />
        )}
        {!codeStep && (
          <Field
            ref={emailRef}
            label={t("auth.email")}
            icon="envelope"
            value={email}
            onChangeText={setEmail}
            placeholder={t("auth.emailPh")}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="username"
            keyboardType="email-address"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            submitBehavior="submit"
            error={show("email")}
          />
        )}
        {!codeStep && (
          <Field
            ref={passwordRef}
            label={t("auth.password")}
            icon="lock"
            secure
            value={password}
            onChangeText={setPassword}
            placeholder={isRegister ? t("auth.pwNewPh") : t("auth.pwPh")}
            autoCapitalize="none"
            autoComplete={isRegister ? "new-password" : "current-password"}
            textContentType={isRegister ? "newPassword" : "password"}
            returnKeyType="go"
            onSubmitEditing={submit}
            error={show("password")}
          />
        )}
        {mode === "login" && (
          <Pressable
            onPress={() => {
              setMode("forgot");
              setError("");
              setNotice("");
            }}
            accessibilityRole="button"
            hitSlop={12}
            style={{ alignSelf: "flex-end", marginTop: -4 }}
          >
            <Text style={{ color: C.accentText, fontSize: 14, fontWeight: "700" }}>{t("auth.forgot")}</Text>
          </Pressable>
        )}

        {!!error && (
          <View
            accessibilityRole="alert"
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              padding: 12,
              borderRadius: 12,
              backgroundColor: alpha(C.red, 0.1),
              borderWidth: 1,
              borderColor: alpha(C.red, 0.3),
            }}
          >
            <SymbolView name="exclamationmark.circle.fill" size={18} tintColor={C.redText} />
            <Text style={{ flex: 1, color: C.redText, fontSize: 14 }}>{error}</Text>
          </View>
        )}

        {!!notice && <Text style={{ color: C.accentText, fontSize: 14, textAlign: "center" }}>{notice}</Text>}

        <Pressable
          onPress={() => {
            haptic.firm();
            if (codeStep) confirm();
            else submit();
          }}
          disabled={busy || (codeStep && code.length !== 6)}
          accessibilityRole="button"
          accessibilityState={{ busy: !!busy, disabled: busy || (codeStep && code.length !== 6) }}
          style={({ pressed }) => ({
            height: 52,
            marginTop: 2,
            borderRadius: 12,
            backgroundColor: C.accent,
            alignItems: "center",
            justifyContent: "center",
            opacity: busy || (codeStep && code.length !== 6) ? 0.6 : 1,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          })}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontSize: 17, fontWeight: "800" }}>
              {codeStep ? t("auth.confirm") : isRegister ? t("auth.sendCode") : t("login")}
            </Text>
          )}
        </Pressable>

        {!codeStep && <SocialLogin onError={setError} />}
      </View>

      {/* Bước nhập mã: đổi email / gửi lại mã */}
      {codeStep && (
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: -6 }}>
          <Pressable
            onPress={() => {
              setStep("info");
              setCode("");
              setCooldown(0);
              setError("");
              setNotice("");
            }}
            accessibilityRole="button"
            hitSlop={12}
          >
            <Text style={{ color: C.accentText, fontSize: 15, fontWeight: "700" }}>← {t("auth.changeEmail")}</Text>
          </Pressable>
          <Pressable
            onPress={() => sendCode(true)}
            disabled={cooldown > 0 || busy}
            accessibilityRole="button"
            accessibilityState={{ disabled: cooldown > 0 || busy }}
            hitSlop={12}
          >
            <Text style={{ color: cooldown > 0 ? C.muted : C.accentText, fontSize: 15, fontWeight: "700" }}>
              {cooldown > 0 ? t("auth.resendIn", { s: cooldown }) : t("auth.resend")}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Chuyển chế độ */}
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 6 }}>
        <Text style={{ color: C.muted, fontSize: 15 }}>{isRegister ? t("auth.hasAccount") : t("auth.noAccount")}</Text>
        <Pressable onPress={switchMode} accessibilityRole="button" hitSlop={12}>
          <Text style={{ color: C.accentText, fontSize: 15, fontWeight: "800" }}>{isRegister ? t("login") : t("auth.signupFree")}</Text>
        </Pressable>
      </View>

      <Text
        style={{
          color: C.muted,
          fontSize: 12,
          textAlign: "center",
          opacity: 0.8,
        }}
      >
        {t("auth.shared")}
      </Text>
    </View>
  );
}
