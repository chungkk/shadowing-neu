import { Image } from "expo-image";
import { useEffect, useState, type ReactNode } from "react";
import { Animated, Easing, View, type ViewStyle } from "react-native";
import { C } from "@/lib/theme";
import { useReduceMotion } from "./Points";
import { Text } from "./Text";

const STATIC = require("@/assets/images/mascot.svg");

/** Giá trị chạy lặp 0 → 1 (back: 0 → 1 → 0) */
export function useLoop(duration: number, { back = false, delay = 0 } = {}) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const ease = back ? Easing.inOut(Easing.ease) : Easing.linear;
    const seq = back
      ? Animated.sequence([Animated.timing(v, { toValue: 1, duration: duration / 2, easing: ease, useNativeDriver: true }), Animated.timing(v, { toValue: 0, duration: duration / 2, easing: ease, useNativeDriver: true })])
      : Animated.timing(v, { toValue: 1, duration, easing: ease, useNativeDriver: true });
    const loop = Animated.loop(seq, { iterations: -1, resetBeforeIteration: !back });
    const timer = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(timer);
      loop.stop();
    };
  }, [v, duration, back, delay]);
  return v;
}

const MASCOT_PARTS = {
  waves: require("@/assets/images/mascot-parts/waves.png"),
  branch: require("@/assets/images/mascot-parts/branch.png"),
  tail: require("@/assets/images/mascot-parts/tail.png"),
  body: require("@/assets/images/mascot-parts/body.png"),
  head: require("@/assets/images/mascot-parts/head.png"),
  eyes: require("@/assets/images/mascot-parts/eyes.png"),
  legs: require("@/assets/images/mascot-parts/legs.png"),
};

/** Linh vật ghép từ các lớp (scripts/make-mascot.mjs): sóng âm nhấp nháy, đuôi vẫy, thân thở, đầu lắc, mắt chớp — cùng nhịp bản web */
export function AnimatedMascot({ size, style }: { size: number; style?: ViewStyle }) {
  const sway = useLoop(2800, { back: true });
  const pulse = useLoop(1100, { back: true });
  const blink = useLoop(4200);
  const layer = { position: "absolute", top: 0, left: 0, width: size, height: size } as const;
  return (
    <View pointerEvents="none" style={[{ width: size, height: size }, style]}>
      <Animated.View style={[layer, { transformOrigin: "12.7% 45.5%", transform: [{ scaleY: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] }) }] }]}>
        <Image source={MASCOT_PARTS.waves} style={{ width: size, height: size }} />
      </Animated.View>
      <Image source={MASCOT_PARTS.branch} style={layer} />
      <Animated.View style={[layer, { transformOrigin: "79.2% 64.9%", transform: [{ rotate: sway.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "7deg"] }) }] }]}>
        <Image source={MASCOT_PARTS.tail} style={{ width: size, height: size }} />
      </Animated.View>
      <Animated.View style={[layer, { transformOrigin: "68.8% 68.8%", transform: [{ scale: sway.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] }) }] }]}>
        <Image source={MASCOT_PARTS.body} style={{ width: size, height: size }} />
      </Animated.View>
      <Animated.View style={[layer, { transformOrigin: "62.1% 51.7%", transform: [{ rotate: sway.interpolate({ inputRange: [0, 1], outputRange: ["-3deg", "4deg"] }) }] }]}>
        <Image source={MASCOT_PARTS.head} style={{ width: size, height: size }} />
        <Animated.View style={[layer, { transformOrigin: "50% 29.6%", transform: [{ scaleY: blink.interpolate({ inputRange: [0, 0.92, 0.96, 1], outputRange: [1, 1, 0.08, 1] }) }] }]}>
          <Image source={MASCOT_PARTS.eyes} style={{ width: size, height: size }} />
        </Animated.View>
      </Animated.View>
      <Image source={MASCOT_PARTS.legs} style={layer} />
    </View>
  );
}

function BobLoop({ children }: { children: ReactNode }) {
  const v = useLoop(2400, { back: true });
  return (
    <Animated.View
      style={{
        transform: [
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) },
          { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-3deg"] }) },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

/** Linh vật (tắc kè hoa đeo tai nghe) · animated: các bộ phận chuyển động · bob: nhấp nhô như .bob của web. Giảm chuyển động → hình tĩnh */
export function Mascot({ size, animated, bob, style }: { size: number; animated?: boolean; bob?: boolean; style?: ViewStyle }) {
  const reduce = useReduceMotion();
  const art = animated && !reduce ? <AnimatedMascot size={size} /> : <Image source={STATIC} alt="" style={{ width: size, height: size }} />;
  return <View style={style}>{bob && !reduce ? <BobLoop>{art}</BobLoop> : art}</View>;
}

/** Linh vật + lời nhắn: thay cho trạng thái trống và màn hoàn thành */
export function MascotMessage({ title, text, size = 96, marginTop = 16, children }: { title?: string; text?: string; size?: number; marginTop?: number; children?: ReactNode }) {
  return (
    <View style={{ alignItems: "center", gap: 8, marginTop, paddingHorizontal: 24 }}>
      <Mascot size={size} animated bob />
      {!!title && <Text style={{ color: C.text, fontWeight: "800", fontSize: 17, textAlign: "center" }}>{title}</Text>}
      {!!text && <Text style={{ color: C.muted, fontSize: 14, lineHeight: 20, textAlign: "center" }}>{text}</Text>}
      {children}
    </View>
  );
}
