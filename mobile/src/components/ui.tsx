import { SymbolView, type SFSymbol } from "expo-symbols";
import type { ComponentRef, ReactNode, Ref } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from "react-native";
import { C, LEVEL_COLORS } from "@/lib/theme";

type Variant = "primary" | "amber" | "red" | "plain";

const VARIANTS: Record<Variant, { bg: string; border: string; fg: string; shadow: string }> = {
  primary: { bg: C.accent, border: C.accent, fg: "#fff", shadow: C.accentDark },
  amber: { bg: "rgba(250,204,21,0.1)", border: C.amber, fg: C.amber, shadow: "#854d0e" },
  red: { bg: "rgba(220,38,38,0.15)", border: C.red, fg: C.redText, shadow: "#7f1d1d" },
  plain: { bg: C.card2, border: C.border, fg: C.text, shadow: "transparent" },
};

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
          borderColor: v.border,
          borderBottomColor: variant === "plain" ? v.border : v.shadow,
          borderBottomWidth: variant === "plain" ? 1 : pressed ? 2 : 4,
          opacity: disabled ? 0.4 : 1,
          transform: [{ translateY: pressed && variant !== "plain" ? 2 : 0 }],
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
          borderWidth: tone === "neutral" ? 1 : 0,
          borderColor: C.border,
          opacity: loading ? 0.7 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
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
}: {
  options: readonly (readonly [T, string])[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.seg}>
      {options.map(([v, label]) => (
        <Pressable key={v} onPress={() => onChange(v)} style={[styles.segItem, value === v && { backgroundColor: C.accent }]}>
          <Text style={[styles.segText, { color: value === v ? "#fff" : C.muted }]}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function LevelBadge({ level, style }: { level: string; style?: ViewStyle }) {
  const c = LEVEL_COLORS[level[0]] ?? LEVEL_COLORS.A;
  return (
    <View style={[{ backgroundColor: c.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }, style]}>
      <Text style={{ color: c.fg, fontWeight: "800", fontSize: 13 }}>{level}</Text>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Input(props: TextInputProps & { ref?: Ref<ComponentRef<typeof TextInput>> }) {
  return <TextInput placeholderTextColor={C.muted} {...props} style={[styles.input, props.style]} />;
}

export function Label({ children, color = C.text }: { children: ReactNode; color?: string }) {
  return <Text style={{ color, fontWeight: "800", fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>{children}</Text>;
}

export function ErrorText({ children }: { children?: string }) {
  if (!children) return null;
  return <Text style={styles.error}>{children}</Text>;
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  btnText: { fontWeight: "800", fontSize: 15, letterSpacing: 0.5 },
  seg: { flexDirection: "row", backgroundColor: C.card2, borderRadius: 12, padding: 4, alignSelf: "center" },
  segItem: { borderRadius: 9, paddingVertical: 7, paddingHorizontal: 16 },
  segText: { fontWeight: "800", fontSize: 14 },
  card: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 18, padding: 16, gap: 12 },
  input: {
    backgroundColor: C.background,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: C.text,
    fontSize: 16,
  },
  error: { color: C.redText, backgroundColor: "rgba(239,68,68,0.1)", padding: 10, borderRadius: 10, overflow: "hidden" },
  h1: { color: C.text, fontSize: 24, fontWeight: "800" },
  muted: { color: C.muted, fontSize: 14 },
});
