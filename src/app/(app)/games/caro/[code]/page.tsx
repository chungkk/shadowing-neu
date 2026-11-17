import { Suspense } from "react";
import type { Metadata } from "next";
import { PlayRoomPage } from "@/components/games/PlayPage";
import { GameSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = { title: "Phòng Caro", robots: { index: false, follow: false } };

export default function CaroRoomRoute({ params }: PageProps<"/games/caro/[code]">) {
  return (
    <main className="page">
      <Suspense fallback={<GameSkeleton />}>
        <PlayRoomPage game="caro" params={params} />
      </Suspense>
    </main>
  );
}
