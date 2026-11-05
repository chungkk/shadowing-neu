import { DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { DISPLAY } from "@/components/Text";
import { AuthProvider } from "@/lib/auth";
import { ThemeRoot } from "@/components/ThemeRoot";
import { C, isDark } from "@/lib/theme";
import { I18nProvider } from "@/lib/i18n";

/** Dựng lại khi đổi giao diện (ThemeRoot), nên đọc màu trực tiếp ở đây */
function AppStack() {
  const theme = {
    ...DefaultTheme,
    dark: isDark(),
    colors: { ...DefaultTheme.colors, background: C.background, card: C.card, primary: C.accentText, text: C.text, border: C.border },
  };
  return (
        <ThemeProvider value={theme}>
          <StatusBar style={isDark() ? "light" : "dark"} />
          <Stack screenOptions={{ headerTintColor: C.link, headerTitleStyle: { color: C.text, fontFamily: DISPLAY, fontWeight: "800" }, headerBackButtonDisplayMode: "minimal" }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="lesson/[id]" options={{ title: "" }} />
            <Stack.Screen name="watch/[videoId]" options={{ title: "" }} />
            <Stack.Screen name="admin/users" options={{ title: "" }} />
            <Stack.Screen name="review" options={{ title: "" }} />
            <Stack.Screen name="stats" options={{ title: "" }} />
            <Stack.Screen name="leaderboard" options={{ title: "" }} />
            <Stack.Screen name="vocab-add" options={{ title: "", presentation: "modal" }} />
            <Stack.Screen name="notebook" options={{ title: "" }} />
            <Stack.Screen name="deck/[slug]" options={{ title: "" }} />
            <Stack.Screen name="game/[variant]" options={{ headerShown: false }} />
            <Stack.Screen name="privacy" options={{ title: "" }} />
            <Stack.Screen name="feedback" options={{ title: "", presentation: "modal" }} />
          </Stack>
        </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <I18nProvider>
      <AuthProvider>
        <ThemeRoot>
          <AppStack />
        </ThemeRoot>
      </AuthProvider>
    </I18nProvider>
  );
}
