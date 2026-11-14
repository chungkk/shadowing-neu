import { Suspense } from "react";
import type { Metadata } from "next";
import { PlayLobbyPage } from "@/components/PlayPage";
import { VocabSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = {
  title: "Caro — đấu máy hoặc đấu bạn",
  description: "Chơi Caro 15×15 với máy hoặc với bạn bè, ai có 5 quân liền nhau trước thắng. Không cần tài khoản.",
};

export default function CaroRoute() {
  return (
    <main className="page">
      <Suspense fallback={<VocabSkeleton />}>
        <PlayLobbyPage game="caro" />
      </Suspense>
    </main>
  );
}
