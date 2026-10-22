import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { C } from "@/lib/theme";

const BARS = 36; // số vạch sóng âm hiển thị (mới nhất ở bên phải)
const WAVE_H = 48;
const amp = (db: number) => Math.min(1, Math.max(0, (db + 55) / 45)); // dBFS → 0…1 (nói thường ≈ 0,5)

/** Chấm đỏ đang thu, có vòng lan toả */
export function PulseDot() {
  const reduce = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    if (!reduce) p.value = withRepeat(withTiming(1, { duration: 1200, easing: Easing.out(Easing.quad) }), -1, false);
  }, [p, reduce]);
  const ring = useAnimatedStyle(() => ({ opacity: 0.55 * (1 - p.value), transform: [{ scale: 1 + p.value * 1.6 }] }));
  return (
    <View style={{ width: 12, height: 12, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={[{ position: "absolute", width: 12, height: 12, borderRadius: 6, backgroundColor: C.red }, ring]} />
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.red }} />
    </View>
  );
}

/**
 * Sóng âm trực tiếp khi thu (kiểu Ghi âm của iOS): mỗi nhịp đo âm lượng thêm 1 vạch bên phải, vạch cũ trôi sang trái.
 * tick = thời điểm của nhịp đo (ms) — đổi tick mới thêm vạch, tránh thêm trùng khi re-render.
 */
export function LiveWave({ level, tick }: { level: number; tick: number }) {
  const [hist, setHist] = useState<number[]>(() => Array(BARS).fill(0));
  const [lastTick, setLastTick] = useState(tick);
  if (tick !== lastTick) {
    setLastTick(tick);
    setHist((h) => [...h.slice(1), amp(level)]);
  }
  return (
    <View style={{ height: WAVE_H, flexDirection: "row", alignItems: "center", gap: 3 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {hist.map((a, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: Math.max(3, a * WAVE_H),
            borderRadius: 2,
            backgroundColor: a > 0.25 ? C.accent : C.border,
            opacity: 0.45 + (i / BARS) * 0.55, // vạch cũ nhạt dần
          }}
        />
      ))}
    </View>
  );
}

/** Đồng hồ thu mm:ss */
export function Elapsed({ ms }: { ms: number }) {
  const s = Math.floor(ms / 1000);
  return (
    <Text style={{ color: C.muted, fontSize: 15, fontVariant: ["tabular-nums"] }}>
      {Math.floor(s / 60)}:{String(s % 60).padStart(2, "0")}
    </Text>
  );
}

function EqBar({ delay }: { delay: number }) {
  const reduce = useReducedMotion();
  const h = useSharedValue(0.35);
  useEffect(() => {
    if (reduce) return;
    h.value = withDelay(
      delay,
      withRepeat(withSequence(withTiming(1, { duration: 320 }), withTiming(0.3, { duration: 320 })), -1, true),
    );
  }, [h, delay, reduce]);
  const style = useAnimatedStyle(() => ({ height: 4 + h.value * 14 }));
  return <Animated.View style={[{ width: 3, borderRadius: 2, backgroundColor: C.accent }, style]} />;
}

/** Thanh nhấp nhô khi đang phát câu mẫu */
export function PlayingBars() {
  return (
    <View style={{ height: 18, flexDirection: "row", alignItems: "center", gap: 3 }}>
      {[0, 160, 80, 240].map((d) => (
        <EqBar key={d} delay={d} />
      ))}
    </View>
  );
}
