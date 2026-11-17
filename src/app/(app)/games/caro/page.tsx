import { Suspense } from "react";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/page-meta";
import { PlayLobbyPage } from "@/components/games/PlayPage";
import { GameSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = pageMeta({
  title: "Chơi Caro online miễn phí – Đấu máy hoặc đấu với bạn bè",
  description:
    "Chơi Caro 15×15 online miễn phí: đấu với máy hoặc tạo phòng đấu với bạn bè, ai có 5 quân liền nhau trước là thắng. Không cần tài khoản.",
  path: "/games/caro",
});

export default function CaroRoute() {
  return (
    <main className="page">
      <Suspense fallback={<GameSkeleton />}>
        <PlayLobbyPage game="caro" />
      </Suspense>
    </main>
  );
}
