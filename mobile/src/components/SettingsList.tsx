import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { Text } from "./Text";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { haptic } from "@/lib/haptics";
import { C, STICKER } from "@/lib/theme";

/**
 * Ô biểu tượng màu đặc kiểu Cài đặt iOS — chỉ dùng màu thương hiệu (DESIGN.md), cố định ở cả sáng / tối để biểu tượng trắng luôn rõ
 */
export const ICON = {
  blue: "#2a4fe0",
  gold: "#a67000",
  coral: "#e5533d",
  grape: "#6a4ae0",
  gem: "#0b7aa6",
  ok: "#1a7f45",
  red: "#d92d35",
  slate: "#5a6175",
} as const;

/** Nhóm kiểu Cài đặt iOS: tiêu đề nhỏ · khung bo góc chứa các dòng · chú thích bên dưới */
export function Section({ title, footer, children }: { title?: string; footer?: ReactNode; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      {!!title && (
        <Text style={{ color: C.muted, fontSize: 12, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", marginLeft: 14 }} accessibilityRole="header">
          {title}
        </Text>
      )}
      <View style={{ backgroundColor: C.card, ...STICKER, borderRadius: 16, overflow: "hidden" }}>{children}</View>
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
  const inner = (
    <>
      <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: iconBg === C.card2 ? ICON.slate : iconBg, alignItems: "center", justifyContent: "center" }}>
        <SymbolView name={icon} size={16} tintColor={color === C.text ? "#fff" : color} weight="semibold" />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color, fontSize: 16, fontWeight: "600" }} numberOfLines={2}>
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
          tintColor={C.muted}
          weight="semibold"
        />
      )}
    </>
  );

  const rowStyle = {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 54,
    opacity: disabled ? 0.5 : 1,
  };

  return (
    <View>
      {/* Kẻ phân cách thụt vào sau ô biểu tượng, như danh sách iOS */}
      {!first && <View style={{ height: 1, backgroundColor: C.line, marginLeft: 56 }} />}
      {onPress ? (
        <Pressable
          onPress={() => {
            haptic.select();
            onPress();
          }}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityState={{
            ...(open !== undefined ? { expanded: open } : {}),
            ...(disabled ? { disabled: true } : {}),
          }}
          style={({ pressed }) => [rowStyle, { backgroundColor: pressed ? C.card2 : "transparent" }]}
        >
          {inner}
        </Pressable>
      ) : (
        <View style={rowStyle}>{inner}</View>
      )}
      {open && <View style={{ paddingHorizontal: 14, paddingBottom: 16, gap: 10 }}>{children}</View>}
    </View>
  );
}
