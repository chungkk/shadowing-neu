import { SymbolView, type SFSymbol } from "expo-symbols";
import type { ComponentRef, ReactNode, Ref } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View, type TextInputProps, type ViewStyle } from "react-native";
import { DISPLAY, Text, TextInput } from "./Text";
import { C, LEVEL_COLORS, STICKER, alpha, themed, isDark } from "@/lib/theme";

type Variant = "primary" | "amber" | "red" | "plain";

const VARIANTS = themed((): Record<Variant, { bg: string; fg: string }> => ({
  primary: { bg: C.accent, fg: "#fff" },
  amber: { bg: C.gold, fg: "#000" },
  red: { bg: C.red, fg: "#fff" },
  plain: { bg: C.card, fg: C.text },
}));

/** Nút lớn kiểu "nổi" (viền dưới đậm) giống bản web */
export function Button({
  title,
  onPress,
  variant = "plain",
  disabled,
  loading,
  icon,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  style?: ViewStyle;
}) {
  const v = VARIANTS[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: v.bg,
          boxShadow: `0 ${pressed ? 1 : variant === "plain" ? 3 : 4}px 0 ${C.ink}`,
          opacity: disabled ? 0.4 : 1,
          transform: [{ translateY: pressed ? 2 : 0 }],
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={v.fg} /> : icon}
      <Text style={[styles.btnText, { color: v.fg, textTransform: variant === "plain" ? "none" : "uppercase" }]}>
        {title}
      </Text>
    </Pressable>
  );
}

/** Nút chính ở đáy màn (cao 56, chữ thường — không viết hoa toàn bộ) */
export function Cta({
  title,
  icon,
  onPress,
  tone = "primary",
  loading,
  style,
}: {
  title: string;
  icon?: SFSymbol;
  onPress: () => void;
  tone?: "primary" | "danger" | "neutral";
  loading?: boolean;
  style?: ViewStyle;
}) {
  const bg = tone === "primary" ? C.accent : tone === "danger" ? C.red : C.card2;
  const fg = tone === "neutral" ? C.text : "#fff";
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ busy: !!loading }}
      style={({ pressed }) => [
        {
          minHeight: 56,
          borderRadius: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          paddingHorizontal: 20,
          backgroundColor: bg,
          ...STICKER,
          boxShadow: `0 ${pressed ? 1 : 4}px 0 ${C.ink}`,
          opacity: loading ? 0.7 : 1,
          transform: [{ translateY: pressed ? 2 : 0 }],
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon && <SymbolView name={icon} size={18} tintColor={fg} />}
      <Text style={{ color: fg, fontSize: 17, fontWeight: "700" }}>{title}</Text>
    </Pressable>
  );
}

/** Nhóm nút chọn 1 trong nhiều */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  shrink = false,
}: {
  options: readonly (readonly [T, string])[];
  value: T;
  onChange: (v: T) => void;
  shrink?: boolean; // co lại (thu nhỏ chữ) khi chung hàng với nút khác trên màn hẹp
}) {
  return (
    <View style={[styles.seg, shrink && { flexShrink: 1 }]}>
      {options.map(([v, label]) => (
        <Pressable
          key={v}
          onPress={() => onChange(v)}
          style={[styles.segItem, shrink && { flexShrink: 1, paddingHorizontal: 10 }, value === v && { backgroundColor: C.accent }]}
        >
          <Text numberOfLines={1} adjustsFontSizeToFit={shrink} style={[styles.segText, { color: value === v ? "#fff" : C.muted }]}>
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function LevelBadge({ level, style }: { level: string; style?: ViewStyle }) {
  const c = LEVEL_COLORS[level[0]] ?? LEVEL_COLORS.A;
  return (
    <View style={[{ backgroundColor: c.bg, borderRadius: 999, borderWidth: 2, borderColor: C.ink, paddingHorizontal: 8 }, style]}>
      <Text style={{ color: c.fg, fontWeight: "800", fontSize: 13 }}>{level}</Text>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Input(props: TextInputProps & { ref?: Ref<ComponentRef<typeof TextInput>> }) {
  return <TextInput placeholderTextColor={C.muted} accessibilityLabel={props.placeholder} {...props} style={[styles.input, props.style]} />;
}

export function Label({ children, color = C.text }: { children: ReactNode; color?: string }) {
  return <Text style={{ color, fontWeight: "800", fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>{children}</Text>;
}

export function ErrorText({ children }: { children?: string }) {
  if (!children) return null;
  return <Text style={styles.error}>{children}</Text>;
}

export const styles = themed(() => StyleSheet.create({
  // Chấm bi nhạt như giấy dán sticker; giao diện tối thêm vầng đèn vàng phía trên
  screen: {
    flex: 1,
    backgroundColor: C.background,
    backgroundImage: isDark()
      ? `radial-gradient(${alpha(C.text, 0.05)} 1.5px, transparent 1.5px), radial-gradient(circle at 50% 0%, ${alpha(C.gold, 0.13)}, transparent 70%)`
      : `radial-gradient(${alpha(C.ink, 0.08)} 1.5px, transparent 1.5px)`,
    backgroundSize: isDark() ? "22px 22px, 100% 100%" : "22px 22px",
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: C.ink,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  btnText: { fontWeight: "800", fontSize: 15, letterSpacing: 0.5 },
  seg: { flexDirection: "row", backgroundColor: C.card2, borderRadius: 12, padding: 4, alignSelf: "center" },
  segItem: { borderRadius: 9, paddingVertical: 7, paddingHorizontal: 16 },
  segText: { fontWeight: "800", fontSize: 14 },
  card: { backgroundColor: C.card, ...STICKER, borderRadius: 24, padding: 16, gap: 12 },
  input: {
    backgroundColor: C.card,
    borderColor: alpha(C.inkLine, 0.4),
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: C.text,
    fontSize: 16,
  },
  error: { color: C.redText, backgroundColor: alpha(C.red, 0.1), padding: 10, borderRadius: 10, overflow: "hidden" },
  h1: { color: C.text, fontFamily: DISPLAY, fontSize: 26, fontWeight: "800" },
  muted: { color: C.muted, fontSize: 14 },
}));
