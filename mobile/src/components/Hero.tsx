import { useState } from "react";
import { Animated, Easing, Pressable, View } from "react-native";
import { haptic } from "@/lib/haptics";
import { useI18n } from "@/lib/i18n";
import { useLayout } from "@/lib/layout";
import { speakGerman } from "@/lib/speak";
import { C } from "@/lib/theme";
import { Mascot } from "./Mascot";
import { useReduceMotion } from "./Points";
import { Text } from "./Text";
import { CoverTag, PageHeader } from "./ui";

const PHRASES = ["Hallo!", "Los geht's!", "Super!", "Weiter so!", "Sprich mit mir!"];

/**
 * Đầu tab Bài học: bìa vở xanh lam (khu Tiếng Đức) + nhãn vở, như PageHeader của web.
 * Linh vật ngồi trên mép nhãn — chạm: nó nhảy lên và nói một câu tiếng Đức (bong bóng thoại dán trên bìa).
 */
export function Hero({ meta }: { meta?: string }) {
  const { t } = useI18n();
  const { tablet } = useLayout();
  const reduce = useReduceMotion();
  const [hop] = useState(() => new Animated.Value(0));
  const [said, setSaid] = useState(-1);

  const poke = () => {
    const next = (said + 1) % PHRASES.length;
    setSaid(next);
    haptic.tap();
    speakGerman(PHRASES[next]).catch(() => {});
    if (reduce) return;
    hop.setValue(0);
    Animated.sequence([
      Animated.timing(hop, { toValue: 1, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(hop, { toValue: 0, friction: 4, tension: 160, useNativeDriver: true }),
    ]).start();
  };

  const size = tablet ? 96 : 76;
  return (
    <PageHeader
      sec="de"
      icon="books.vertical.fill"
      title={t("lessons.title")}
      sub={t("lessons.subtitle")}
      meta={
        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end", gap: 6, marginRight: size - 6 }}>
          {meta && <CoverTag icon="play.rectangle.fill">{meta}</CoverTag>}
          <View style={{ backgroundColor: C.gold, borderRadius: 12, borderBottomRightRadius: 3, paddingHorizontal: 10, paddingVertical: 3 }}>
            <Text style={{ color: "#16203a", fontWeight: "700", fontSize: 13 }} accessibilityLiveRegion="polite">
              {said < 0 ? t("hero.hello") : PHRASES[said]}
            </Text>
          </View>
        </View>
      }
      aside={
        <Pressable onPress={poke} accessibilityRole="button" accessibilityLabel={PHRASES[(said + 1) % PHRASES.length]} hitSlop={6}>
          <Animated.View
            style={{
              transform: [
                { translateY: hop.interpolate({ inputRange: [0, 1], outputRange: [0, -14] }) },
                { rotate: hop.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-8deg"] }) },
              ],
            }}
          >
            <Mascot size={size} animated bob />
          </Animated.View>
        </Pressable>
      }
    />
  );
}
