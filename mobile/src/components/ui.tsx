import { SymbolView, type SFSymbol } from "expo-symbols";
import type { ComponentRef, ReactNode, Ref } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View, type PressableProps, type TextInputProps, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { haptic } from "@/lib/haptics";
import { useI18n } from "@/lib/i18n";
import { C, LEVEL_COLORS, R, SEC, STICKER, alpha, isDark, themed, type Sec } from "@/lib/theme";
import { DISPLAY, Text, TextInput } from "./Text";

/**
 * Thành phần dùng chung theo design system "Nhãn vở" (DESIGN.md của web) — bản native:
 * phẳng, viền 1px, bo 12/16, không bóng cứng; bấm = co nhẹ (scale .97) + rung nhẹ; vùng chạm ≥ 44pt.
 */

type Variant = "primary" | "amber" | "red" | "plain" | "soft";

const VARIANTS = themed((): Record<Variant, { bg: string; fg: string; border: string }> => ({
  primary: { bg: C.accent, fg: "#fff", border: C.accent },
  amber: { bg: C.gold, fg: "#16203a", border: C.gold },
  red: { bg: C.red, fg: "#fff", border: C.red },
  plain: { bg: C.card, fg: C.text, border: C.border },
  soft: { bg: C.accentSoft, fg: C.accentText, border: C.accentSoft },
}));

/** Bấm: co nhẹ như .btn:active của web */
export const pressScale = (pressed: boolean, disabled?: boolean): ViewStyle => ({ transform: [{ scale: pressed && !disabled ? 0.97 : 1 }] });

/** Nút (≥ 48pt) — primary xanh lam (1 nút / màn) · amber vàng · red xoá · plain trung tính · soft nhấn nhẹ */
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
  const off = disabled || loading;
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress?.();
      }}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: disabled ? C.card2 : v.bg, borderColor: disabled ? C.line : v.border, opacity: pressed ? 0.92 : 1 },
        pressScale(pressed, off),
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={disabled ? C.muted : v.fg} /> : icon}
      <Text style={[styles.btnText, { color: disabled ? C.muted : v.fg }]}>{title}</Text>
    </Pressable>
  );
}

/** Nút chính ở đáy màn (cao 56) */
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
  tone?: "primary" | "danger" | "neutral" | "amber";
  loading?: boolean;
  style?: ViewStyle;
}) {
  const bg = tone === "primary" ? C.accent : tone === "danger" ? C.red : tone === "amber" ? C.gold : C.card;
  const fg = tone === "neutral" ? C.text : tone === "amber" ? "#16203a" : "#fff";
  return (
    <Pressable
      onPress={() => {
        haptic.firm();
        onPress();
      }}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ busy: !!loading }}
      style={({ pressed }) => [
        {
          minHeight: 56,
          borderRadius: R.lg,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          paddingHorizontal: 20,
          backgroundColor: bg,
          borderWidth: 1,
          borderColor: tone === "neutral" ? C.border : bg,
          opacity: loading ? 0.7 : pressed ? 0.92 : 1,
        },
        pressScale(pressed, loading),
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon && <SymbolView name={icon} size={18} tintColor={fg} weight="semibold" />}
      <Text style={{ color: fg, fontSize: 17, fontWeight: "700" }}>{title}</Text>
    </Pressable>
  );
}

/** Nhóm nút chọn 1 trong nhiều — khay xám, mục đang chọn là ô trắng nổi (như segmented control của iOS / .tabs của web) */
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
    <View style={[styles.seg, shrink && { flexShrink: 1 }]} accessibilityRole="tablist">
      {options.map(([v, label]) => {
        const on = value === v;
        return (
          <Pressable
            key={v}
            onPress={() => {
              if (!on) haptic.select();
              onChange(v);
            }}
            hitSlop={{ top: 5, bottom: 5 }}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={[styles.segItem, shrink && { flexShrink: 1, paddingHorizontal: 10 }, on && styles.segOn]}
          >
            <Text numberOfLines={1} adjustsFontSizeToFit={shrink} style={[styles.segText, { color: on ? C.text : C.muted }]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Nhãn trình độ — góc 6px như mẩu băng dính (.badge) */
export function LevelBadge({ level, style }: { level: string; style?: ViewStyle }) {
  const c = LEVEL_COLORS[level[0]] ?? LEVEL_COLORS.A;
  return (
    <View style={[{ backgroundColor: c.bg, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 1 }, style]}>
      <Text style={{ color: c.fg, fontWeight: "700", fontSize: 13 }}>{level}</Text>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Input(props: TextInputProps & { ref?: Ref<ComponentRef<typeof TextInput>> }) {
  return <TextInput placeholderTextColor={C.muted} accessibilityLabel={props.placeholder} {...props} style={[styles.input, props.style]} />;
}

/** Nhãn nhỏ in hoa của khung ("VIDEO", "TRANSCRIPT") — không đặt trên tiêu đề lớn */
export function Label({ children, color = C.muted }: { children: ReactNode; color?: string }) {
  return <Text style={{ color, fontWeight: "700", fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase" }}>{children}</Text>;
}

export function ErrorText({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <View style={styles.error} accessibilityRole="alert">
      <SymbolView name="exclamationmark.circle.fill" size={16} tintColor={C.redText} />
      <Text style={{ flex: 1, color: C.redText, fontSize: 14, lineHeight: 20 }}>{children}</Text>
    </View>
  );
}

/** Ô biểu tượng tròn-vuông nền nhạt (.icon-bubble + .tint-*) */
export function IconBubble({ name, color = C.accentText, bg = C.accentSoft, size = 40 }: { name: SFSymbol; color?: string; bg?: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
      <SymbolView name={name} size={size * 0.48} tintColor={color} weight="semibold" />
    </View>
  );
}

/**
 * Đầu màn chữ ký "bìa vở + nhãn vở" (PageHeader của web) — bản native, gọn hơn:
 * khối bìa màu khu vực có gáy băng dính đậm bên trái; nhãn trắng viền đôi dán chồng lên mép dưới bìa, tiêu đề nằm trên nhãn.
 * Dùng ở màn chính của mỗi tab / khu; màn làm bài, màn học không dùng.
 */
export function PageHeader({
  sec = "de",
  title,
  sub,
  icon,
  meta,
  aside,
  children,
}: {
  sec?: Sec;
  title: string;
  sub?: ReactNode;
  icon?: SFSymbol;
  /** Mẩu nhãn nhỏ trên bìa, góc phải (số liệu, hạng…) */
  meta?: ReactNode;
  /** Thứ ngồi trên mép nhãn, góc phải (linh vật) */
  aside?: ReactNode;
  children?: ReactNode;
}) {
  const s = SEC[sec];
  return (
    <View>
      {/* Bìa cao theo nội dung (meta xuống dòng khi chữ to) + chừa 44pt cho nhãn dán chồng lên mép dưới */}
      <View style={{ backgroundColor: s.sec, borderRadius: R.lg, overflow: "hidden", minHeight: 92, paddingLeft: 26, paddingRight: 14, paddingTop: 14, paddingBottom: 44, flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
        <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 12, backgroundColor: s.secDark }} />
        {icon ? <SymbolView name={icon} size={30} tintColor={s.onSec} weight="semibold" style={{ opacity: 0.92 }} /> : <View />}
        {meta && <View style={{ flexDirection: "row", gap: 6, alignItems: "flex-start", flexShrink: 1, flexWrap: "wrap", justifyContent: "flex-end" }}>{meta}</View>}
      </View>
      <View style={{ marginTop: -38, marginHorizontal: 10 }}>
        {aside && <View style={{ position: "absolute", right: 8, top: -58, zIndex: 2 }}>{aside}</View>}
        <Nhan>
          <Text style={{ color: C.text, fontFamily: DISPLAY, fontWeight: "800", fontSize: 28, lineHeight: 33, letterSpacing: -0.6 }} accessibilityRole="header">
            {title}
          </Text>
          {sub ? typeof sub === "string" ? <Text style={{ color: C.muted, fontSize: 15, lineHeight: 21 }}>{sub}</Text> : sub : null}
          {children}
        </Nhan>
      </View>
    </View>
  );
}

/** Nhãn vở trắng viền đôi (.nhan) */
export function Nhan({ children, small, style }: { children: ReactNode; small?: boolean; style?: ViewStyle }) {
  return (
    <View
      style={[
        { backgroundColor: C.card, borderWidth: small ? 1.5 : 2, borderColor: alpha(C.text, 0.9), borderRadius: small ? 14 : 18, padding: small ? 10 : 14, paddingHorizontal: small ? 12 : 16, gap: 6 },
        style,
      ]}
    >
      <View pointerEvents="none" style={{ position: "absolute", inset: small ? 3 : 4, borderWidth: 1, borderColor: alpha(C.text, 0.28), borderRadius: small ? 11 : 14 }} />
      {children}
    </View>
  );
}

/** Mẩu nhãn dán trên bìa màu (.cover-tag) */
export function CoverTag({ children, icon }: { children: ReactNode; icon?: SFSymbol }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
      {icon && <SymbolView name={icon} size={12} tintColor="#16203a" weight="bold" />}
      <Text style={{ color: "#16203a", fontSize: 12, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{children}</Text>
    </View>
  );
}

/** Tiêu đề nhóm (h2 — .section-title) */
export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
      <Text style={{ flexShrink: 1, color: C.text, fontFamily: DISPLAY, fontWeight: "700", fontSize: 21, letterSpacing: -0.3 }} accessibilityRole="header">
        {children}
      </Text>
      {right}
    </View>
  );
}

/** Hàng bấm được (≥ 44pt) — co nhẹ khi bấm */
export function Tap({ style, onPress, ...props }: Omit<PressableProps, "style"> & { style?: ViewStyle | ((s: { pressed: boolean }) => ViewStyle) }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={(e) => {
        haptic.tap();
        onPress?.(e);
      }}
      {...props}
      style={({ pressed }) => [{ minHeight: 44 }, typeof style === "function" ? style({ pressed }) : style, pressScale(pressed, !!props.disabled), pressed && { opacity: 0.9 }]}
    />
  );
}

/** Trạng thái trống / lỗi / chưa có gì: biểu tượng trong ô nhạt + tiêu đề + 1 câu + (tuỳ) nút */
export function EmptyState({
  icon = "tray",
  title,
  body,
  action,
  tone = "de",
}: {
  icon?: SFSymbol;
  title: string;
  body?: string;
  action?: ReactNode;
  tone?: Sec | "red";
}) {
  const c = tone === "red" ? { bg: C.redSoft, fg: C.redText } : { bg: SEC[tone].secSoft, fg: SEC[tone].secText };
  return (
    <View style={{ alignItems: "center", gap: 10, paddingVertical: 28, paddingHorizontal: 20 }}>
      <IconBubble name={icon} color={c.fg} bg={c.bg} size={56} />
      <Text style={{ color: C.text, fontFamily: DISPLAY, fontWeight: "700", fontSize: 19, textAlign: "center" }}>{title}</Text>
      {!!body && <Text style={{ color: C.muted, fontSize: 15, lineHeight: 21, textAlign: "center", maxWidth: 340 }}>{body}</Text>}
      {action && <View style={{ marginTop: 6 }}>{action}</View>}
    </View>
  );
}

/** Đang tải — vòng xoay màu thương hiệu, canh giữa */
export function Loading({ style }: { style?: ViewStyle }) {
  return <ActivityIndicator color={C.accentText} style={[{ marginTop: 40 }, style]} />;
}

export type ActionSheetOption = {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  checked?: boolean;
  icon?: SFSymbol;
};

/** Bảng chọn hành động từ cạnh dưới — dùng thay ActionSheetIOS / Alert > 3 nút trên Android */
export function ActionSheetModal({
  visible,
  title,
  options,
  onClose,
}: {
  visible: boolean;
  title?: string;
  options: ActionSheetOption[];
  onClose: () => void;
}) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
      supportedOrientations={["portrait", "portrait-upside-down", "landscape-left", "landscape-right"]}
    >
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.5)" }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t("close")}
        />
        <View
          style={{
            width: "100%",
            maxWidth: 520,
            alignSelf: "center",
            backgroundColor: C.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderTopWidth: 1,
            borderColor: C.border,
            paddingTop: 10,
            paddingBottom: Math.max(insets.bottom, 16) + 8,
            paddingHorizontal: 16,
            gap: 8,
          }}
        >
          <View style={{ alignSelf: "center", width: 36, height: 4, borderRadius: 2, backgroundColor: C.border, marginBottom: 4 }} />
          {!!title && (
            <Text style={{ color: C.muted, fontSize: 13, fontWeight: "700", textAlign: "center", paddingBottom: 4 }}>
              {title}
            </Text>
          )}
          <ScrollView style={{ maxHeight: 360 }} bounces={false}>
            <View style={{ borderRadius: 16, backgroundColor: C.background, ...STICKER, overflow: "hidden" }}>
              {options.map((opt, i) => (
                <Pressable
                  key={i}
                  onPress={() => {
                    haptic.select();
                    onClose();
                    opt.onPress();
                  }}
                  accessibilityRole="button"
                  accessibilityState={opt.checked !== undefined ? { selected: opt.checked } : undefined}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    minHeight: 50,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: C.line,
                    backgroundColor: pressed ? C.card2 : "transparent",
                  })}
                >
                  {opt.icon && <SymbolView name={opt.icon} size={17} tintColor={opt.destructive ? C.redText : C.text} />}
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 16,
                      fontWeight: opt.checked ? "700" : "600",
                      color: opt.destructive ? C.redText : opt.checked ? C.accentText : C.text,
                    }}
                  >
                    {opt.label}
                  </Text>
                  {opt.checked && <SymbolView name="checkmark" size={16} tintColor={C.accentText} weight="bold" />}
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            style={({ pressed }) => ({
              minHeight: 48,
              borderRadius: 14,
              backgroundColor: pressed ? C.card2 : C.background,
              ...STICKER,
              alignItems: "center",
              justifyContent: "center",
              marginTop: 2,
            })}
          >
            <Text style={{ color: C.text, fontSize: 16, fontWeight: "700" }}>{t("cancel")}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export const styles = themed(() =>
  StyleSheet.create({
    // Giấy trắng ấm phẳng như web (không chấm bi, không vầng sáng)
    screen: { flex: 1, backgroundColor: C.background },
    btn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      minHeight: 48,
      borderRadius: R.md,
      borderWidth: 1.5,
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    btnText: { fontWeight: "700", fontSize: 16, flexShrink: 1, textAlign: "center" },
    seg: { flexDirection: "row", backgroundColor: C.card2, borderRadius: R.md, padding: 3, alignSelf: "center", borderWidth: 1, borderColor: C.line },
    segItem: { borderRadius: 9, minHeight: 34, justifyContent: "center", paddingHorizontal: 16 },
    segOn: isDark()
      ? { backgroundColor: "#283559", boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }
      : { backgroundColor: C.card, boxShadow: "0 1px 3px rgba(22,32,58,0.14)" },
    segText: { fontWeight: "700", fontSize: 14 },
    card: { backgroundColor: C.card, ...STICKER, borderRadius: R.lg, padding: 16, gap: 12 },
    input: {
      backgroundColor: C.card,
      borderColor: C.border,
      borderWidth: 1.5,
      borderRadius: R.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
      minHeight: 48,
      color: C.text,
      fontSize: 16,
    },
    error: { flexDirection: "row", gap: 8, alignItems: "flex-start", backgroundColor: C.redSoft, padding: 12, borderRadius: R.md },
    h1: { color: C.text, fontFamily: DISPLAY, fontSize: 28, fontWeight: "800", letterSpacing: -0.6 },
    muted: { color: C.muted, fontSize: 14 },
  }),
);
