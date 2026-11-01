import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Text, View } from "react-native";
import { C } from "@/lib/theme";

/** Điểm chính tả (bản di động của PointsBadge / hiệu ứng +1 trên web): chép đúng hết 1 câu → +1, mỗi câu chỉ tính 1 lần */

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

/** Đồng xu điểm: tròn vàng viền đậm, viên hình thoi 2 mặt cắt ở giữa (như bản web) */
export function Coin({ size = 20 }: { size?: number }) {
  const d = size * 0.32; // cạnh hình vuông → hình thoi rộng ~0,45 đồng xu, như bản web
  const f = d * 1.5; // mặt cắt: hình vuông lớn hơn, xoay ngược lại cho thẳng hàng với màn hình
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: C.amber,
        borderWidth: Math.max(1.5, size / 11),
        borderColor: "#a16207",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Hình vuông xoay 45° = hình thoi; nửa phải (chia dọc) tô đậm hơn làm mặt cắt */}
      <View
        style={{
          width: d,
          height: d,
          borderRadius: size * 0.03,
          backgroundColor: "#fffbeb",
          overflow: "hidden",
          transform: [{ rotate: "45deg" }],
        }}
      >
        <View
          style={{
            position: "absolute",
            left: (d - f) / 2,
            top: (d - f) / 2,
            width: f,
            height: f,
            backgroundColor: "#fde68a",
            transform: [{ rotate: "-45deg" }, { translateX: f / 2 }],
          }}
        />
      </View>
    </View>
  );
}

const SPARKS = Array.from({ length: 12 }, (_, k) => {
  const a = ((k * 30 + (k % 2 ? 12 : 0)) * Math.PI) / 180;
  const d = k % 2 ? 46 : 72;
  return { x: Math.cos(a) * d, y: Math.sin(a) * d, c: k % 3 === 0 ? C.accent : k % 3 === 1 ? C.amber : "#fff7d6" };
});
const BURST_MS = 1100;

/**
 * Hiệu ứng +1 điểm, đặt giữa khung cha (position absolute, không nhận chạm):
 * vòng sáng lan ra, tia lấp lánh bắn ra, "+1" bật lên rồi bay lên mờ dần. Giảm chuyển động → chỉ "+1" hiện rồi mờ.
 */
export function PointBurst({ onEnd }: { onEnd: () => void }) {
  const reduce = useReduceMotion();
  const [p] = useState(() => new Animated.Value(0));
  const end = useRef(onEnd);
  useEffect(() => {
    end.current = onEnd;
  });
  useEffect(() => {
    const anim = Animated.timing(p, { toValue: 1, duration: BURST_MS, easing: Easing.linear, useNativeDriver: true });
    anim.start(({ finished }) => finished && end.current());
    return () => anim.stop();
  }, [p]);

  const ease = (input: number[], output: number[]) => p.interpolate({ inputRange: input, outputRange: output, extrapolate: "clamp", easing: Easing.out(Easing.cubic) });
  const ring = (delay: number) => ({
    transform: [{ scale: ease([delay, delay + 0.6], [0.15, 1.6]) }],
    opacity: ease([delay, delay + 0.6], [1, 0]),
  });

  return (
    <View pointerEvents="none" style={{ position: "absolute", left: "50%", top: "50%", width: 0, height: 0, zIndex: 10 }}>
      {!reduce && (
        <>
          <Animated.View
            style={[
              { position: "absolute", left: -48, top: -48, width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: C.amber },
              ring(0),
            ]}
          />
          <Animated.View
            style={[
              { position: "absolute", left: -48, top: -48, width: 96, height: 96, borderRadius: 48, borderWidth: 2, borderColor: C.accent },
              ring(0.08),
            ]}
          />
          {SPARKS.map((s, k) => (
            <Animated.View
              key={k}
              style={{
                position: "absolute",
                left: -4,
                top: -4,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: s.c,
                opacity: ease([0, 0.05, 0.45, 0.6], [0, 1, 1, 0]),
                transform: [
                  { translateX: ease([0.03, 0.6], [0, s.x]) },
                  { translateY: ease([0.03, 0.6], [0, s.y]) },
                  { scale: ease([0.03, 0.6], [1.2, 0.2]) },
                ],
              }}
            />
          ))}
        </>
      )}
      <Animated.View
        style={{
          position: "absolute",
          width: 140,
          left: -70,
          top: -24,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          opacity: p.interpolate({ inputRange: [0, 0.12, 0.65, 1], outputRange: [0, 1, 1, 0] }),
          transform: reduce
            ? []
            : [
                { translateY: p.interpolate({ inputRange: [0, 0.32, 0.65, 1], outputRange: [0, 0, -14, -48], extrapolate: "clamp" }) },
                { scale: p.interpolate({ inputRange: [0, 0.18, 0.32, 1], outputRange: [0.3, 1.25, 1, 0.9], extrapolate: "clamp" }) },
              ],
        }}
      >
        <Coin size={30} />
        <Text
          style={{
            color: C.amber,
            fontSize: 30,
            fontWeight: "900",
            textShadowColor: "rgba(250,204,21,0.6)",
            textShadowRadius: 14,
            textShadowOffset: { width: 0, height: 0 },
          }}
        >
          +1
        </Text>
      </Animated.View>
    </View>
  );
}

/**
 * Huy hiệu tổng điểm. Điểm tăng → chờ "+1" trong ô chép bay lên (~0,5 giây) rồi đồng xu nảy, số mới hiện;
 * giảm (server sửa lại) → đổi số ngay.
 */
export function PointsPill({ total }: { total: number }) {
  const reduce = useReduceMotion();
  const [shown, setShown] = useState(total);
  const [bump] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (total === shown) return;
    const up = total > shown;
    const id = setTimeout(
      () => {
        setShown(total);
        if (!up || reduce) return;
        bump.setValue(0);
        Animated.timing(bump, { toValue: 1, duration: 520, easing: Easing.out(Easing.back(3)), useNativeDriver: true }).start();
      },
      up ? 520 : 0,
    );
    return () => clearTimeout(id);
  }, [total, shown, reduce, bump]);

  const scale = bump.interpolate({ inputRange: [0, 0.35, 1], outputRange: [1, 1.4, 1] });
  const rotate = bump.interpolate({ inputRange: [0, 0.35, 1], outputRange: ["0deg", "-12deg", "0deg"] });
  return (
    <View
      accessibilityLabel={`${shown}`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingLeft: 3,
        paddingRight: 9,
        paddingVertical: 3,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "rgba(250,204,21,0.35)",
        backgroundColor: "rgba(250,204,21,0.1)",
      }}
    >
      <Animated.View style={{ transform: [{ scale }, { rotate }] }}>
        <Coin size={20} />
      </Animated.View>
      <Text style={{ color: C.amber, fontWeight: "800", fontSize: 14, fontVariant: ["tabular-nums"] }}>{shown}</Text>
    </View>
  );
}
