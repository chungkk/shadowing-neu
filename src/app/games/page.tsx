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
  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_15%_0%,#6b5018_0%,#2c1e09_55%,#150d04_100%)]">
    {Array.from({ length: 16 }, (_, i) => (
      <span key={i} className="absolute size-1 rounded-full bg-amber-200 shadow-[0_0_6px_rgba(253,230,138,0.9)]" style={{ left: `${(i * 41) % 100}%`, top: `${(i * 29) % 75}%`, opacity: 0.4 + (i % 3) * 0.25 }} />
    ))}
    <span className="absolute top-5 left-[14%] flex flex-col items-center gap-0.5 rounded-lg border border-amber/60 bg-[#3a2a10]/90 px-2.5 py-1 transition group-hover:-translate-y-1">
      <Volume2 className="size-3.5 text-amber" />
      <span className="font-mono text-xs font-extrabold tracking-[0.18em] text-amber-200/60">
        <span className="text-amber">H</span>___
      </span>
    </span>
    <span className="absolute top-12 right-[16%] flex flex-col items-center gap-0.5 rounded-lg border border-amber bg-[#4d3712]/95 px-2.5 py-1 shadow-[0_0_14px_rgba(250,204,21,0.45)]">
      <Volume2 className="size-3.5 animate-pulse text-amber" />
      <span className="font-mono text-xs font-extrabold tracking-[0.18em] text-white">
        Bie<span className="text-amber-200/60">__</span>
      </span>
    </span>
    <div className="absolute inset-x-0 bottom-0 h-8 border-t-2 border-lime-300/50 bg-gradient-to-b from-[#4d7c1f] to-[#1a330a] [border-radius:50%_50%_0_0/10px_10px_0_0]" />
    {Array.from({ length: 12 }, (_, i) => (
      <span key={i} className={`absolute bottom-6 text-[10px] ${["text-pink-300", "text-amber", "text-violet-300"][i % 3]}`} style={{ left: `${4 + i * 8}%` }}>
        ✿
      </span>
    ))}
    <Emoji code="1f426" className="bottom-4 left-4 size-10" />
    <Emoji code="1f41d" className="bob bottom-3 left-1/2 size-10 -translate-x-1/2" />
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
    description: "Từ rơi xuống kèm phát âm — nghe rồi gõ lại đúng chính tả trước khi chạm cỏ.",
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
