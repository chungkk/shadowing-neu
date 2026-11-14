import { Suspense } from "react";
import type { Metadata } from "next";
import ArtikelGamePage from "@/components/ArtikelGamePage";
import { VocabSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = {
  title: "Der Die Das — game luyện mạo từ tiếng Đức",
  description: "Chọn đúng der, die hay das cho từng danh từ, đúng liên tiếp càng nhiều càng giỏi. Từ vựng Goethe A1–B1, Aspekte B2 và điều dưỡng.",
};

export default function ArtikelRoute() {
  return (
    <main className="page">
      <Suspense fallback={<VocabSkeleton />}>
        <ArtikelGamePage />
      </Suspense>
    </main>
  );
}
