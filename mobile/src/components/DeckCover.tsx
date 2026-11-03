import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { View, type ViewStyle } from "react-native";
import { Text } from "./Text";
import { deckCover, type DeckSummary } from "@/lib/api";
import { LEVEL_COLORS } from "@/lib/theme";

/** Bìa bộ từ: ảnh admin đặt, chưa có ảnh thì vẽ bìa theo màu trình độ (A xanh lá · B xanh dương · C tím) */
export function DeckCover({ deck, style, big }: { deck: Pick<DeckSummary, "cover" | "level" | "title">; style?: ViewStyle; big?: boolean }) {
  const box: ViewStyle = { aspectRatio: 16 / 10, borderRadius: big ? 18 : 12, overflow: "hidden", ...style };
  if (deck.cover)
    return (
      <View style={box}>
        <Image source={{ uri: deckCover(deck.cover) }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={150} />
      </View>
    );
  const c = LEVEL_COLORS[deck.level[0]] ?? LEVEL_COLORS.A;
  return (
    <View style={[box, { backgroundColor: c.bg, padding: big ? 18 : 12, justifyContent: "space-between" }]}>
      {/* Thẻ xếp chồng mờ ở góc — gợi "bộ thẻ" */}
      <View style={{ position: "absolute", right: big ? -10 : -14, bottom: big ? -16 : -18, opacity: 0.18, transform: [{ rotate: "-12deg" }] }}>
        <SymbolView name="rectangle.stack.fill" size={big ? 150 : 96} tintColor={c.fg} />
      </View>
      <Text style={{ color: c.fg, fontSize: big ? 44 : 30, fontWeight: "900", letterSpacing: -1 }}>{deck.level || "Aa"}</Text>
      <Text style={{ color: c.fg, fontSize: big ? 17 : 13, fontWeight: "800", opacity: 0.85 }} numberOfLines={2}>
        {deck.title}
      </Text>
    </View>
  );
}
