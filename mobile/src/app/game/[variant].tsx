import { useLocalSearchParams } from "expo-router";
import FallingWords from "@/components/FallingWords";

/** Game từ vựng: /game/rain (Mưa từ vựng) · /game/gold (Đào vàng) — mở từ tab Từ vựng */
export default function GameScreen() {
  const { variant } = useLocalSearchParams<{ variant: string }>();
  const v = variant === "gold" ? "gold" : "rain";
  return <FallingWords key={v} variant={v} />;
}

