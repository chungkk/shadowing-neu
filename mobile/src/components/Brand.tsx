import { Image } from "expo-image";
import { Image as RNImage, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, isDark } from "@/lib/theme";
import { PointsBadge } from "./Points";
import { DISPLAY, Text } from "./Text";
import { ThemeToggle } from "./ThemeRoot";

/** Dải sọc kẹo như thân linh vật (.candy-stripe của web) */
export function CandyStripe() {
  return (
    <View style={{ height: 10, borderTopWidth: 2, borderBottomWidth: 2, borderColor: C.ink, overflow: "hidden" }}>
      <RNImage source={isDark() ? require("@/assets/images/candy-stripe-dark.png") : require("@/assets/images/candy-stripe.png")} resizeMode="repeat" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
    </View>
  );
}

/** Thanh trên cùng các tab, như web: linh vật + "Deutsch Shadowing" · tổng điểm · dải sọc kẹo */
export function BrandBar() {
  const { top } = useSafeAreaInsets();
  return (
    <View style={{ backgroundColor: C.bar, paddingTop: top }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, height: 58, paddingHorizontal: 12 }}>
        <Image source={require("@/assets/images/mascot.svg")} alt="" style={{ width: 44, height: 44 }} />
        <Text numberOfLines={1} style={{ flex: 1, color: C.text, fontFamily: DISPLAY, fontWeight: "800", fontSize: 20 }} accessibilityRole="header">
          Deutsch Shadowing
        </Text>
        <PointsBadge />
        <ThemeToggle />
      </View>
      <CandyStripe />
    </View>
  );
}
