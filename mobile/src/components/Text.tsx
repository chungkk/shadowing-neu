import type { ComponentProps, ComponentRef } from "react";
import { StyleSheet, Text as RNText, TextInput as RNTextInput, type StyleProp, type TextStyle } from "react-native";

/**
 * Chữ như web ("Nhãn vở", DESIGN.md): Be Vietnam Pro cho nội dung / UI, Bricolage Grotesque cho tiêu đề.
 * fontWeight chọn đúng nét đã nhúng (app.json). Font hệ thống của Apple không có dấu tiếng Việt đẹp bằng, nên giữ font thương hiệu
 * nhưng vẫn theo Dynamic Type (allowFontScaling mặc định) — chặn ở 1.6× để thẻ, nút không tràn khung.
 */
export const FONT = "Be Vietnam Pro";
export const DISPLAY = "Bricolage Grotesque";

/** Chữ lớn nhất theo cài đặt Cỡ chữ của iOS */
export const MAX_SCALE = 1.6;

const base = StyleSheet.create({ font: { fontFamily: FONT } });

/**
 * Be Vietnam Pro nét 800/900 nặng hơn Nunito nhiều: chữ thân dùng tối đa 700 như web ("hạn chế font-extrabold cho chữ nhỏ").
 * Tiêu đề (DISPLAY) giữ nguyên 800.
 */
const SOFTER: Record<string, TextStyle["fontWeight"]> = { "800": "700", "900": "800" };
function soften(style: StyleProp<TextStyle>): StyleProp<TextStyle> {
  const flat = StyleSheet.flatten(style);
  if (!flat?.fontWeight || flat.fontFamily === DISPLAY) return style;
  const w = SOFTER[String(flat.fontWeight)];
  return w ? [style, { fontWeight: w }] : style;
}

export function Text({ style, maxFontSizeMultiplier = MAX_SCALE, ...props }: ComponentProps<typeof RNText>) {
  return <RNText maxFontSizeMultiplier={maxFontSizeMultiplier} {...props} style={[base.font, soften(style)]} />;
}

export type TextInput = ComponentRef<typeof RNTextInput>;
// eslint-disable-next-line @typescript-eslint/no-redeclare -- kiểu + component cùng tên, như TextInput của react-native
export function TextInput({ style, maxFontSizeMultiplier = MAX_SCALE, ...props }: ComponentProps<typeof RNTextInput>) {
  return <RNTextInput maxFontSizeMultiplier={maxFontSizeMultiplier} {...props} style={[base.font, soften(style as StyleProp<TextStyle>)]} />;
}
