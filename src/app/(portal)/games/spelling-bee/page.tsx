import { Suspense } from "react";
import type { Metadata } from "next";
import FallingWordsPage from "@/components/FallingWordsPage";
import { VocabSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = {
  title: "Đào vàng — game chính tả tiếng Đức",
  description: "Mỗi cục vàng là một từ tiếng Đức kèm phát âm — nghe và gõ đúng chính tả để quăng móc kéo vàng lên trước khi nó chìm mất. Từ vựng Goethe A1–B1, Aspekte B2 và điều dưỡng.",
};

export default function SpellingBeePage() {
  return (
    <main className="page">
      <Suspense fallback={<VocabSkeleton />}>
        <FallingWordsPage variant="gold" />
      </Suspense>
    </main>
  );
}
