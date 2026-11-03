import type { ComponentProps, ComponentRef } from "react";
import { StyleSheet, Text as RNText, TextInput as RNTextInput } from "react-native";

/** Chữ dùng font như web: Nunito cho nội dung, DISPLAY (Baloo 2) cho tiêu đề — fontWeight chọn đúng nét đã nhúng (app.json) */
export const FONT = "Nunito";
export const DISPLAY = "Baloo 2";

const base = StyleSheet.create({ font: { fontFamily: FONT } });

export function Text({ style, ...props }: ComponentProps<typeof RNText>) {
  return <RNText {...props} style={[base.font, style]} />;
}

export type TextInput = ComponentRef<typeof RNTextInput>;
// eslint-disable-next-line @typescript-eslint/no-redeclare -- kiểu + component cùng tên, như TextInput của react-native
export function TextInput({ style, ...props }: ComponentProps<typeof RNTextInput>) {
  return <RNTextInput {...props} style={[base.font, style]} />;
}
