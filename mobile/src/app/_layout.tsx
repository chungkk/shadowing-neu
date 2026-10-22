import { DarkTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/lib/auth";
import { C } from "@/lib/theme";
import { I18nProvider } from "@/lib/i18n";

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: C.background, card: C.background, primary: C.accent, text: C.text, border: C.border },
};

export default function RootLayout() {
  return (
    <I18nProvider>
      <AuthProvider>
        <ThemeProvider value={theme}>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerTintColor: C.amber, headerTitleStyle: { color: C.text }, headerBackButtonDisplayMode: "minimal" }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="lesson/[id]" options={{ title: "" }} />
            <Stack.Screen name="watch/[videoId]" options={{ title: "" }} />
            <Stack.Screen name="admin/users" options={{ title: "" }} />
            <Stack.Screen name="review" options={{ title: "" }} />
            <Stack.Screen name="stats" options={{ title: "" }} />
          </Stack>
        </ThemeProvider>
      </AuthProvider>
    </I18nProvider>
  );
}
