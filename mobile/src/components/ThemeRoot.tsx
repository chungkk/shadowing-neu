import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { createContext, Fragment, use, useEffect, useState, type ReactNode } from "react";
import { Animated, Easing, Pressable, StyleSheet } from "react-native";
import { useI18n } from "@/lib/i18n";
import { C, PALETTE, getScheme, setScheme, useScheme, type Scheme } from "@/lib/theme";
import { useReduceMotion } from "./Points";

const SwitchCtx = createContext<(next: Scheme) => void>(setScheme);
/** Đổi giao diện kèm màn chuyển có linh vật */
export const useSwitchTheme = () => use(SwitchCtx);

/** Như bật tắt đèn: màn phủ màu nền mới hiện lên, linh vật nảy ra cùng mặt trời / mặt trăng rồi mờ đi */
function Veil({ next, onCovered, onDone }: { next: Scheme; onCovered: () => void; onDone: () => void }) {
  const [fade] = useState(() => new Animated.Value(0));
  const [pop] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }).start();
    Animated.timing(fade, { toValue: 1, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => {
      onCovered();
      Animated.timing(fade, { toValue: 0, duration: 280, delay: 320, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(onDone);
    });
    // Chỉ chạy một lần cho mỗi lần đổi
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const p = PALETTE[next];
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { backgroundColor: p.background, opacity: fade, alignItems: "center", justifyContent: "center" }]}
    >
      <Animated.View style={{ transform: [{ scale: pop }] }}>
        <Image source={require("@/assets/images/mascot.svg")} alt="" style={{ width: 132, height: 132 }} />
        <Animated.View
          style={{
            position: "absolute",
            right: -8,
            top: -4,
            width: 44,
            height: 44,
            borderRadius: 22,
            borderWidth: 2,
            borderColor: p.ink,
            backgroundColor: p.gold,
            alignItems: "center",
            justifyContent: "center",
            transform: [{ rotate: pop.interpolate({ inputRange: [0, 1], outputRange: ["-90deg", "0deg"] }) }],
          }}
        >
          <SymbolView name={next === "dark" ? "moon.stars.fill" : "sun.max.fill"} size={24} tintColor="#2b1520" />
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

/**
 * Dựng lại cây màn hình khi đổi giao diện: màu đọc từ `C` ngay trong lúc render, còn React Compiler nhớ kết quả theo component,
 * nên chỉ có dựng lại mới lấy được màu mới. Trạng thái điều hướng nằm ngoài cây này nên không mất.
 */
export function ThemeRoot({ children }: { children: ReactNode }) {
  const scheme = useScheme();
  const reduce = useReduceMotion();
  const [veil, setVeil] = useState<{ next: Scheme; id: number } | null>(null);
  const switchTo = (next: Scheme) => {
    if (next === getScheme() || veil) return;
    if (reduce) setScheme(next);
    else setVeil({ next, id: Date.now() });
  };
  return (
    <SwitchCtx value={switchTo}>
      <Fragment key={scheme}>{children}</Fragment>
      {veil && <Veil key={veil.id} next={veil.next} onCovered={() => setScheme(veil.next)} onDone={() => setVeil(null)} />}
    </SwitchCtx>
  );
}

/** Nút tròn sáng / tối ở thanh trên cùng, như web */
export function ThemeToggle() {
  const { t } = useI18n();
  const scheme = useScheme();
  const switchTo = useSwitchTheme();
  const dark = scheme === "dark";
  const label = t(dark ? "theme.toLight" : "theme.toDark");
  return (
    <Pressable
      onPress={() => switchTo(dark ? "light" : "dark")}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: C.ink,
        backgroundColor: C.card,
        alignItems: "center",
        justifyContent: "center",
        boxShadow: `0 ${pressed ? 1 : 3}px 0 ${C.ink}`,
        transform: [{ translateY: pressed ? 2 : 0 }],
      })}
    >
      <SymbolView name={dark ? "sun.max.fill" : "moon.fill"} size={19} tintColor={dark ? C.amber : C.text} />
    </Pressable>
  );
}
