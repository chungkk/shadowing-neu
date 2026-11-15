import { Suspense } from "react";
import type { Metadata } from "next";
import { PlayRoomPage } from "@/components/PlayPage";
import { VocabSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = { title: "Phòng Caro", robots: { index: false, follow: false } };

export default function CaroRoomRoute({ params }: PageProps<"/games/caro/[code]">) {
  return (
    <main className="page">
      <Suspense fallback={<VocabSkeleton />}>
        <PlayRoomPage game="caro" params={params} />
      </Suspense>
    </main>
  );
}
