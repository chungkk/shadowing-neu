import { useState } from "react";
import { Animated, Easing, Pressable, View } from "react-native";
import { useI18n } from "@/lib/i18n";
import { useLayout } from "@/lib/layout";
import { speakGerman } from "@/lib/speak";
import { C, STICKER } from "@/lib/theme";
import { Mascot } from "./Mascot";
import { useReduceMotion } from "./Points";
import { DISPLAY, Text } from "./Text";

const PHRASES = ["Hallo!", "Los geht's!", "Super!", "Weiter so!", "Sprich mit mir!"];

/** Đầu trang Bài học, như web: linh vật + bong bóng thoại. Chạm linh vật: nó nhảy lên và nói một câu tiếng Đức */
export function Hero() {
  const { t } = useI18n();
  const { tablet } = useLayout();
  const reduce = useReduceMotion();
  const [hop] = useState(() => new Animated.Value(0));
  const [said, setSaid] = useState(-1);

  const poke = () => {
    const next = (said + 1) % PHRASES.length;
    setSaid(next);
    speakGerman(PHRASES[next]).catch(() => {});
    if (reduce) return;
    hop.setValue(0);
    Animated.sequence([
      Animated.timing(hop, { toValue: 1, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(hop, { toValue: 0, friction: 4, tension: 160, useNativeDriver: true }),
    ]).start();
  };

  const size = tablet ? 112 : 88;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 24, backgroundColor: C.card, ...STICKER }}>
      <Pressable onPress={poke} accessibilityRole="button" accessibilityLabel={PHRASES[(said + 1) % PHRASES.length]} hitSlop={6}>
        <Animated.View style={{ transform: [{ translateY: hop.interpolate({ inputRange: [0, 1], outputRange: [0, -16] }) }, { rotate: hop.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-8deg"] }) }] }}>
          <Mascot size={size} animated bob />
        </Animated.View>
      </Pressable>
      <View style={{ flex: 1, alignItems: "flex-start", gap: 6 }}>
        <View
          style={{
            backgroundColor: C.gold,
            borderWidth: 2,
            borderColor: C.ink,
            borderRadius: 16,
            borderBottomLeftRadius: 4,
            paddingHorizontal: 10,
            paddingVertical: 2,
            transform: [{ rotate: "-2deg" }],
          }}
        >
          <Text style={{ color: "#000", fontWeight: "800", fontSize: 13 }} accessibilityLiveRegion="polite">
            {said < 0 ? t("hero.hello") : PHRASES[said]}
          </Text>
        </View>
        <Text style={{ color: C.text, fontFamily: DISPLAY, fontWeight: "800", fontSize: tablet ? 36 : 28, lineHeight: tablet ? 42 : 34 }} accessibilityRole="header">
          {t("lessons.title")}
        </Text>
        <Text style={{ color: C.muted, fontSize: 14, lineHeight: 19 }}>{t("lessons.subtitle")}</Text>
      </View>
    </View>
  );
}
