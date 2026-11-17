import { Suspense } from "react";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/page-meta";
import FallingWordsPage from "@/components/games/FallingWordsPage";
import { GameSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = pageMeta({
  title: "Đào vàng – Game luyện nghe và chính tả từ vựng tiếng Đức",
  description:
    "Nghe phát âm từng từ tiếng Đức rồi gõ đúng chính tả để kéo vàng lên trước khi nó chìm. Luyện nghe và viết từ vựng Goethe A1–B1, Aspekte B2 và điều dưỡng.",
  path: "/games/spelling-bee",
});

export default function SpellingBeePage() {
  return (
    <main className="page">
      <Suspense fallback={<GameSkeleton />}>
        <FallingWordsPage variant="gold" />
      </Suspense>
    </main>
  );
}
