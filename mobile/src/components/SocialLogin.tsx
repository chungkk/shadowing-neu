import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { C } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";
import { apple, googleAvailable, signInWithApple, signInWithGoogle, type SocialResult } from "@/lib/social";

/** Đăng nhập nhanh bằng Apple / Google (tự tạo tài khoản lần đầu) — ẩn nếu máy / bản build không hỗ trợ */
export function SocialLogin({ onError }: { onError: (message: string) => void }) {
  const { oauthLogin } = useAuth();
  const { t } = useI18n();
  const [appleOk, setAppleOk] = useState(false);
  const [busy, setBusy] = useState<"apple" | "google" | null>(null);
  const showGoogle = googleAvailable();

  useEffect(() => {
    apple?.isAvailableAsync().then(setAppleOk, () => {});
  }, []);

  if (!appleOk && !showGoogle) return null;

  const run = async (provider: "apple" | "google", get: () => Promise<SocialResult>) => {
    if (busy) return;
    onError("");
    setBusy(provider);
    try {
      const r = await get();
      if (r) await oauthLogin(provider, r.idToken, { name: r.name, authorizationCode: r.authorizationCode });
    } catch (e) {
      // Lỗi từ server đã có thông báo dễ hiểu; lỗi SDK (mã kỹ thuật) → thông báo chung
      onError(e instanceof ApiError ? e.message : t("auth.socialFailed"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
        <Text style={{ color: C.muted, fontSize: 13, fontWeight: "600" }}>{t("auth.or")}</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
      </View>

      {appleOk && apple && (
        <View style={{ height: 54, opacity: busy === "google" ? 0.6 : 1 }}>
          {busy === "apple" ? (
            <View style={{ flex: 1, borderRadius: 14, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator color="#000" />
            </View>
          ) : (
            <apple.AppleAuthenticationButton
              buttonType={apple.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={apple.AppleAuthenticationButtonStyle.WHITE}
              cornerRadius={14}
              style={{ width: "100%", height: 54 }}
              onPress={() => run("apple", signInWithApple)}
            />
          )}
        </View>
      )}

      {showGoogle && (
        <Pressable
          onPress={() => run("google", signInWithGoogle)}
          disabled={!!busy}
          accessibilityRole="button"
          style={({ pressed }) => ({
            height: 54,
            borderRadius: 14,
            backgroundColor: "#fff",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            opacity: busy === "apple" ? 0.6 : pressed ? 0.85 : 1,
          })}
        >
          {busy === "google" ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <Image source={require("@/assets/images/google-g.svg")} style={{ width: 20, height: 20 }} />
              <Text style={{ color: "#1f1f1f", fontSize: 17, fontWeight: "600" }}>{t("auth.google")}</Text>
            </>
          )}
        </Pressable>
      )}
    </View>
  );
}
