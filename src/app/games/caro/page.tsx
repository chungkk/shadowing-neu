import { Suspense } from "react";
import type { Metadata } from "next";
import { PlayLobbyPage } from "@/components/PlayPage";
import { VocabSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = {
  title: "Caro — đấu máy hoặc đấu bạn bằng kim cương",
  description: "Chơi Caro 15×15 với máy hoặc với bạn bè, ai có 5 quân liền nhau trước thắng. Cược kim cương kiếm được khi học tiếng Đức.",
};

export default function CaroRoute() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 md:p-6">
      <Suspense fallback={<VocabSkeleton />}>
        <PlayLobbyPage game="caro" />
      </Suspense>
    </main>
  );
}
