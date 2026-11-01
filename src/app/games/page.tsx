import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, CloudRain } from "lucide-react";

export const metadata: Metadata = {
  title: "Game từ vựng",
  description: "Chơi game để luyện từ vựng tiếng Đức theo bộ từ Goethe A1, A2, B1.",
};

const GAMES = [
  {
    href: "/games/mua-tu-vung",
    title: "Mưa từ vựng",
    description: "Nghĩa tiếng Việt rơi xuống — gõ đúng từ tiếng Đức để bắn trước khi chạm đất.",
    icon: CloudRain,
  },
];

export default function GamesPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-6">
      <h1 className="text-2xl font-extrabold">Game từ vựng</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {GAMES.map((g) => (
          <Link key={g.href} href={g.href} className="card flex items-center gap-4 p-4 transition hover:-translate-y-1 hover:border-accent">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-[0_4px_0_var(--accent-dark)]">
              <g.icon className="size-7" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-lg font-extrabold">{g.title}</span>
              <span className="text-sm text-muted">{g.description}</span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-muted" />
          </Link>
        ))}
      </div>
    </main>
  );
}
