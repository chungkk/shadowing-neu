import { Suspense } from "react";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/page-meta";
import FallingWordsPage from "@/components/games/FallingWordsPage";
import { GameSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = pageMeta({
  title: "Mưa từ vựng – Game gõ từ vựng tiếng Đức theo Goethe A1–B1",
  description:
    "Nghĩa tiếng Việt rơi xuống, gõ đúng từ tiếng Đức để bắn trước khi chạm nước. Game luyện nhớ và viết từ vựng Goethe A1–B1, Aspekte B2 và điều dưỡng, miễn phí.",
  path: "/games/word-rain",
});

export default function WordRainPage() {
  return (
    <main className="page">
      <Suspense fallback={<GameSkeleton />}>
        <FallingWordsPage variant="rain" />
      </Suspense>
    </main>
  );
}
