import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { C } from "@/lib/theme";

/** Nhóm kiểu Cài đặt iOS: tiêu đề nhỏ · khung bo góc chứa các dòng · chú thích bên dưới */
export function Section({ title, footer, children }: { title?: string; footer?: ReactNode; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      {!!title && (
        <Text style={{ color: C.muted, fontSize: 13, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", marginLeft: 14 }}>
          {title}
        </Text>
      )}
      <View style={{ backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 16, overflow: "hidden" }}>{children}</View>
      {!!footer && <Text style={{ color: C.muted, fontSize: 13, marginHorizontal: 14, lineHeight: 18 }}>{footer}</Text>}
    </View>
  );
}

/**
 * Một dòng trong nhóm: biểu tượng · tiêu đề (+ dòng phụ) · giá trị / mũi tên.
 * `open` → mở rộng phần nội dung bên dưới · `external` → mũi tên ra ngoài (mở trang web)
 */
export function Row({
  icon,
  iconBg = C.card2,
  title,
  subtitle,
  value,
  valueColor = C.muted,
  color = C.text,
  first,
  open,
  chevron = true,
  external,
  trailing,
  disabled,
  onPress,
  children,
}: {
  icon: SFSymbol;
  iconBg?: string;
  title: string;
  subtitle?: string;
  value?: string;
  valueColor?: string;
  color?: string;
  first?: boolean;
  open?: boolean;
  chevron?: boolean;
  external?: boolean;
  trailing?: ReactNode;
  disabled?: boolean;
  onPress?: () => void;
  children?: ReactNode;
}) {
  return (
    <View style={{ borderTopWidth: first ? 0 : 1, borderTopColor: C.border }}>
      <Pressable
        onPress={onPress}
        disabled={disabled || !onPress}
        accessibilityRole={onPress ? "button" : undefined}
        accessibilityState={open === undefined ? undefined : { expanded: open }}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: 14,
          paddingVertical: subtitle ? 10 : 0,
          minHeight: 52,
          opacity: disabled ? 0.5 : 1,
          backgroundColor: pressed ? C.card2 : "transparent",
        })}
      >
        <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: iconBg, alignItems: "center", justifyContent: "center" }}>
          <SymbolView name={icon} size={16} tintColor={color === C.text ? "#fff" : color} weight="semibold" />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color, fontSize: 16, fontWeight: "600" }} numberOfLines={1}>
            {title}
          </Text>
          {!!subtitle && (
            <Text style={{ color: C.muted, fontSize: 13, lineHeight: 17 }} numberOfLines={2}>
              {subtitle}
            </Text>
          )}
        </View>
        {!!value && (
          <Text style={{ color: valueColor, fontSize: 15, maxWidth: "45%" }} numberOfLines={1}>
            {value}
          </Text>
        )}
        {trailing}
        {chevron && (
          <SymbolView
            name={external ? "arrow.up.right" : open ? "chevron.down" : "chevron.right"}
            size={13}
            tintColor="#4a5a50"
            weight="semibold"
          />
        )}
      </Pressable>
      {open && <View style={{ paddingHorizontal: 14, paddingBottom: 16, gap: 10 }}>{children}</View>}
    </View>
  );
}
