import { Image } from "expo-image";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C } from "@/lib/theme";
import { PointsBadge } from "./Points";
import { ReminderBell } from "./ReminderBell";
import { DISPLAY, Text } from "./Text";
import { ThemeToggle } from "./ThemeRoot";

/** Chữ "HalloVN" như logo web: "Hallo" mực + "VN" xanh lam thương hiệu */
export function Wordmark({ size = 21 }: { size?: number }) {
  return (
    <Text
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.75}
      style={{ fontFamily: DISPLAY, fontWeight: "800", fontSize: size, letterSpacing: -0.5, color: C.text }}
      accessibilityRole="header"
    >
      Hallo<Text style={{ fontFamily: DISPLAY, fontWeight: "800", color: C.accentText }}>VN</Text>
    </Text>
  );
}

/** Thanh trên cùng các tab: linh vật + HalloVN · kim cương · nút sáng/tối — nền giấy, kẻ mảnh ở đáy (như header web) */
export function BrandBar() {
  const { top } = useSafeAreaInsets();
  return (
    <View style={{ backgroundColor: C.background, paddingTop: top, borderBottomWidth: 1, borderBottomColor: C.line }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, height: 52, paddingHorizontal: 14 }}>
        <Image source={require("@/assets/images/mascot.svg")} alt="" style={{ width: 36, height: 36 }} />
        <View style={{ flex: 1 }}>
          <Wordmark />
        </View>
        <PointsBadge />
        <ReminderBell />
        <ThemeToggle />
      </View>
    </View>
  );
}
