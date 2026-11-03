import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import { useCallback } from "react";
import FallingWords from "@/components/FallingWords";

/** Game từ vựng: /game/rain (Mưa từ vựng) · /game/gold (Đào vàng) — mở từ tab Từ vựng */
export default function GameScreen() {
  const { variant } = useLocalSearchParams<{ variant: string }>();
  const v = variant === "gold" ? "gold" : "rain";
  // Game nền đêm → chữ thanh trạng thái sáng; rời màn (kể cả màn game vẫn nằm dưới trong stack) → trả về chữ tối
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("light");
      return () => setStatusBarStyle("dark");
    }, []),
  );
  return <FallingWords key={v} variant={v} />;
}

