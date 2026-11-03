import { useCallback, useEffect, useState } from "react";
import { Image } from "expo-image";
import { useFocusEffect } from "expo-router";
import { AccessibilityInfo, Animated, Easing, View } from "react-native";
import { FONT, Text } from "./Text";
import { api, type Points } from "@/lib/api";
import { C } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { setPointsTotal, usePoints } from "@/lib/points";
import { POINTS_CORRECT } from "@shared/dictation";

/** Điểm chính tả (bản di động của PointsBadge trên web): chép đúng hết 1 câu → +2, mỗi câu chỉ tính 1 lần; mỗi từ bấm xem → −1 */

/** Hệ thống đang bật "Giảm chuyển động" */
function useReduceMotion() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setOn).catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setOn);
    return () => sub.remove();
  }, []);
  return on;
}

/** Kim cương điểm — cùng hình với bản web (assets/images/gem.svg) */
export function Gem({ size = 20 }: { size?: number }) {
  return <Image source={require("@/assets/images/gem.svg")} style={{ width: size, height: size }} />;
}

/** Màu điểm: xanh kim cương (chữ, viền) */
export const GEM = C.gem;

const SPARKS = Array.from({ length: 8 }, (_, k) => {
  const a = ((k * 45 + 22) * Math.PI) / 180;
  const d = k % 2 ? 16 : 24;
  return { x: Math.cos(a) * d, y: Math.sin(a) * d, c: k % 3 === 0 ? GEM : k % 3 === 1 ? "#f9a8d4" : "#f0f9ff" };
});
const POP_MS = 1100;

/**
 * Huy hiệu tổng điểm. `earned` tăng (vừa được điểm) → kim cương nảy, tia lấp lánh, "+2" bật lên ngay cạnh kim cương rồi mờ dần.
 * Giảm chuyển động → chỉ "+2" hiện rồi mờ.
 */
export function PointsPill({ total, earned }: { total: number; earned: number }) {
  const reduce = useReduceMotion();
  const [bump] = useState(() => new Animated.Value(0));
  const [pop] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!earned) return;
    bump.setValue(0);
    pop.setValue(0);
    Animated.parallel([
      Animated.timing(bump, { toValue: 1, duration: 520, easing: Easing.out(Easing.back(3)), useNativeDriver: true }),
      Animated.timing(pop, { toValue: 1, duration: POP_MS, easing: Easing.linear, useNativeDriver: true }),
    ]).start();
  }, [earned, bump, pop]);

  const spark = (input: number[], output: number[]) => pop.interpolate({ inputRange: input, outputRange: output, extrapolate: "clamp", easing: Easing.out(Easing.cubic) });
  const scale = reduce ? 1 : bump.interpolate({ inputRange: [0, 0.35, 1], outputRange: [1, 1.4, 1] });
  const rotate = reduce ? "0deg" : bump.interpolate({ inputRange: [0, 0.35, 1], outputRange: ["0deg", "-12deg", "0deg"] });
  return (
    <View
      accessibilityLabel={`${total}`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingLeft: 3,
        paddingRight: 9,
        paddingVertical: 3,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "rgba(3,105,161,0.35)",
        backgroundColor: "rgba(3,105,161,0.1)",
      }}
    >
      <Animated.Text
        pointerEvents="none"
        style={{
          position: "absolute",
          right: "100%",
          marginRight: 6,
          color: GEM,
          fontFamily: FONT,
          fontSize: 16,
          fontWeight: "900",
          textShadowColor: "rgba(3,105,161,0.6)",
          textShadowRadius: 10,
          textShadowOffset: { width: 0, height: 0 },
          opacity: pop.interpolate({ inputRange: [0, 0.12, 0.7, 1], outputRange: [0, 1, 1, 0] }),
          transform: reduce
            ? []
            : [
                { translateX: pop.interpolate({ inputRange: [0, 0.2, 0.7, 1], outputRange: [10, 0, 0, -6] }) },
                { scale: pop.interpolate({ inputRange: [0, 0.2, 0.35, 0.7, 1], outputRange: [0.4, 1.25, 1, 1, 0.9] }) },
              ],
        }}
      >
        +{POINTS_CORRECT}
      </Animated.Text>
      <View>
        <Animated.View style={{ transform: [{ scale }, { rotate }] }}>
          <Gem size={20} />
        </Animated.View>
        {!reduce && (
          <View pointerEvents="none" style={{ position: "absolute", left: "50%", top: "50%", width: 0, height: 0 }}>
            {SPARKS.map((s, k) => (
              <Animated.View
                key={k}
                style={{
                  position: "absolute",
                  left: -2.5,
                  top: -2.5,
                  width: 5,
                  height: 5,
                  borderRadius: 2.5,
                  backgroundColor: s.c,
                  opacity: spark([0, 0.03, 0.38, 0.55], [0, 1, 1, 0]),
                  transform: [{ translateX: spark([0, 0.55], [0, s.x]) }, { translateY: spark([0, 0.55], [0, s.y]) }, { scale: spark([0, 0.55], [1.2, 0.2]) }],
                }}
              />
            ))}
          </View>
        )}
      </View>
      <Text style={{ color: GEM, fontWeight: "800", fontSize: 14, fontVariant: ["tabular-nums"] }}>{total.toLocaleString("vi-VN")}</Text>
    </View>
  );
}

/** Huy hiệu tổng điểm trên đầu các tab (như thanh trên cùng của web): mở tab → lấy số mới nhất; khách không hiện */
export function PointsBadge() {
  const { user } = useAuth();
  const id = user?.id;
  const total = usePoints(id);
  useFocusEffect(
    useCallback(() => {
      if (id === undefined) return;
      api<Points>(`/points?tz=${new Date().getTimezoneOffset()}`).then((r) => setPointsTotal(id, r.total), () => {});
    }, [id]),
  );
  return total === null ? null : <PointsPill total={total} earned={0} />;
}
