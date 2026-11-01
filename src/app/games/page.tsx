import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CloudRain, Volume2 } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

export const metadata: Metadata = {
  title: "Game từ vựng",
  description: "Chơi game để luyện từ vựng tiếng Đức theo bộ từ Goethe A1, A2, B1.",
};

const Emoji = ({ code, className }: { code: string; className: string }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={`/emoji/${code}.webp`} alt="" className={`pointer-events-none absolute ${className}`} />
);

/** Tranh minh hoạ đầu thẻ game */
const RainArt = () => (
  <div className="absolute inset-0 bg-gradient-to-b from-[#0a1622] via-[#0c2033] to-[#0b2a40]">
    {Array.from({ length: 18 }, (_, i) => (
      <span key={i} className="absolute w-px bg-sky-200/30" style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 70}%`, height: 14 + (i % 4) * 6 }} />
    ))}
    <Emoji code="1f327-fe0f" className="top-3 left-1/2 size-20 -translate-x-1/2 transition group-hover:-translate-y-1" />
    <span className="absolute top-24 left-[12%] rounded-lg border border-cyan-400/60 bg-[#0e2a3d]/90 px-2 py-0.5 text-xs font-bold text-white">cảm ơn</span>
    <span className="absolute top-14 right-[10%] rounded-lg border border-cyan-400/60 bg-[#0e2a3d]/90 px-2 py-0.5 text-xs font-bold text-white">con chó</span>
    <div className="absolute inset-x-0 bottom-0 h-7 border-t-2 border-cyan-300/80 bg-gradient-to-b from-cyan-500/30 to-[#05233a]" />
    <Emoji code="26f5" className="bob bottom-3 left-1/2 size-10 -translate-x-1/2" />
    <Emoji code="1f427" className="bottom-4 left-4 size-10" />
  </div>
);

const BeeArt = () => (
  <div className="honeycomb absolute inset-0 bg-[radial-gradient(ellipse_at_top,#9a4d0c_0%,#3a1c05_60%,#1c0e03_100%)]">
    <Emoji code="1f41d" className="bob top-5 left-[8%] size-16" />
    <Emoji code="1f50a" className="top-4 left-1/2 size-16 -translate-x-1/2 transition group-hover:scale-110" />
    <Emoji code="1f36f" className="bob top-6 right-[8%] size-14 [animation-delay:-1.2s]" />
    <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-1.5">
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="flex h-9 w-8 items-center justify-center rounded-md bg-white text-lg font-black text-stone-300 shadow-[0_3px_0_#a8a29e]">
          _
        </span>
      ))}
    </div>
    <Emoji code="1f33b" className="-bottom-2 -left-2 size-12" />
    <Emoji code="1f338" className="-right-1 -bottom-1 size-10" />
  </div>
);

const GAMES: { href: string; title: string; description: string; icon: ComponentType<{ className?: string }>; art: ReactNode }[] = [
  {
    href: "/games/word-rain",
    title: "Mưa từ vựng",
    description: "Nghĩa tiếng Việt rơi xuống — gõ đúng từ tiếng Đức để bắn trước khi chạm nước.",
    icon: CloudRain,
    art: <RainArt />,
  },
  {
    href: "/games/spelling-bee",
    title: "Ong đánh vần",
    description: "Nghe phát âm rồi gõ lại từ tiếng Đức đúng chính tả, từng chữ cái.",
    icon: Volume2,
    art: <BeeArt />,
  },
];

export default function GamesPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-6">
      <h1 className="text-2xl font-extrabold">Game từ vựng</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GAMES.map((g) => (
          <Link key={g.href} href={g.href} className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-1 hover:border-amber/60">
            <div className="relative h-40 overflow-hidden">
              {g.art}
              <span className="absolute top-2.5 right-2.5 rounded-full border border-cyan-300/50 bg-black/60 px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-cyan-200 uppercase">
                1 người chơi
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-3 p-4">
              <h2 className="flex items-center gap-2.5 text-lg font-extrabold">
                <span className="flex size-8 items-center justify-center rounded-full border border-amber/40 text-amber">
                  <g.icon className="size-4" />
                </span>
                {g.title}
              </h2>
              <p className="flex-1 text-sm text-sky-300/80">{g.description}</p>
              <span className="btn border-amber bg-amber py-2.5 tracking-wide text-black uppercase shadow-[0_4px_0_#a16207] group-hover:brightness-110">
                Chơi ngay <ArrowRight className="size-4" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
