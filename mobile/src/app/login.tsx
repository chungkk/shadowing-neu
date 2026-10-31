import { Stack, router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { AuthForm } from "@/components/AuthForm";
import { styles } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { FORM_MAX } from "@/lib/layout";
import { C } from "@/lib/theme";

/** Popup đăng nhập / đăng ký — mở từ mọi nút "Đăng nhập", đăng nhập xong tự đóng về màn đang xem */
export default function LoginScreen() {
  const { user } = useAuth();
  const { t } = useI18n();

  useEffect(() => {
    if (user && router.canGoBack()) router.back();
  }, [user]);

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: "",
          headerRight: () => (
            <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("close")}>
              <SymbolView name="xmark" size={18} weight="bold" tintColor={C.muted} />
            </Pressable>
          ),
        }}
      />
      {/* Header modal iOS 26 trong suốt → tự chừa chỗ cho header; bàn phím cũng do ScrollView tự chừa (KeyboardAvoidingView tính sai trong sheet) */}
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ width: "100%", maxWidth: FORM_MAX, alignSelf: "center", padding: 16, paddingTop: 0, paddingBottom: 40 }}
      >
        <AuthForm />
      </ScrollView>
    </View>
  );
}
