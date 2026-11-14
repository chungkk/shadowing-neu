import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CloudRain, Flame, Grid3x3, Pickaxe, Puzzle, Users, Volume2, X } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import Mascot from "@/components/Mascot";

export const metadata: Metadata = {
  title: "Game",
  description: "Chơi game để luyện từ vựng tiếng Đức theo các bộ từ Goethe A1–B1, Aspekte B2 và điều dưỡng, hoặc chơi Sudoku và Caro với bạn bè — không cần tài khoản.",
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
    <span className="absolute top-20 left-[24%] rounded-lg border border-cyan-400/60 bg-[#0e2a3d]/90 px-2 py-0.5 text-xs font-bold text-white">cảm ơn</span>
    <span className="absolute top-14 right-[10%] rounded-lg border border-cyan-400/60 bg-[#0e2a3d]/90 px-2 py-0.5 text-xs font-bold text-white">con chó</span>
    <div className="absolute inset-x-0 bottom-0 h-7 border-t-2 border-cyan-300/80 bg-gradient-to-b from-cyan-500/30 to-[#05233a]" />
    <Emoji code="26f5" className="bob bottom-3 left-1/2 size-10 -translate-x-1/2" />
    <Mascot animated className="absolute bottom-3 left-3 size-12" />
  </div>
);

const GoldArt = () => (
  <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#0e1a26_0,#2a3442_3.5rem,#6b4520_3.5rem,#3d2612_70%,#170d05_100%)]">
    <div className="absolute inset-x-0 top-14 h-1 border-t-2 border-lime-700/70 bg-[#8b6a3a]" />
    {Array.from({ length: 14 }, (_, i) => (
      <span key={i} className="absolute rounded-full bg-black/25" style={{ left: `${(i * 41) % 100}%`, top: `${40 + ((i * 29) % 55)}%`, width: 6 + (i % 4) * 4, height: 4 + (i % 3) * 3 }} />
    ))}
    <span className="absolute top-6 left-1/2 h-8 w-1 origin-top rotate-[22deg] rounded-full bg-[#7a4e25]" />
    <span className="absolute top-6 left-1/2 h-8 w-1 origin-top -rotate-[22deg] rounded-full bg-[#7a4e25]" />
    <Emoji code="1f477" className="top-14 left-1/2 -ml-16 size-10 -translate-y-full" />
    {/* dây móc chéo xuống cục vàng bên phải */}
    <span className="absolute top-6 left-1/2 h-0.5 w-[34%] origin-left rotate-[35deg] bg-amber-100/80 transition group-hover:rotate-[30deg]" />
    <span className="absolute top-24 right-[10%] flex flex-col items-center gap-0.5 rounded-[0.8rem_1.2rem_0.9rem_1.3rem] border border-yellow-300 bg-gradient-to-br from-[#7a5a18]/95 to-[#3d2a0e]/95 px-2.5 py-1 shadow-[0_0_14px_rgba(250,204,21,0.5)]">
      <Volume2 className="size-3.5 animate-pulse text-amber" />
      <span className="font-mono text-xs font-extrabold tracking-[0.18em] text-white">
        Gol<span className="text-amber-200/60">_</span>
      </span>
    </span>
    <span className="absolute top-[6.5rem] left-[12%] flex flex-col items-center gap-0.5 rounded-[0.8rem_1.2rem_0.9rem_1.3rem] border border-yellow-400/60 bg-gradient-to-br from-[#5c4314]/95 to-[#2e1f0b]/95 px-2.5 py-1">
      <Volume2 className="size-3.5 text-amber" />
      <span className="font-mono text-xs font-extrabold tracking-[0.18em] text-amber-200/50">
        <span className="text-amber">H</span>___
      </span>
    </span>
  </div>
);

const MatchArt = () => (
  <div className="absolute inset-0 grid grid-cols-3 grid-rows-2 gap-1.5 bg-gradient-to-b from-[#0a1f24] to-[#0b2a2a] p-3 pt-9 text-center text-xs font-bold">
    <span className="flex items-center justify-center rounded-lg border border-teal-500/60 bg-[#0e1b26] text-cyan-100">der Hund</span>
    <span className="flex items-center justify-center rounded-lg border border-orange-500/60 bg-[#33221a] text-amber-100">cảm ơn</span>
    <span className="flex items-center justify-center rounded-lg border border-amber bg-amber/25 text-white transition group-hover:-translate-y-0.5">danke</span>
    <span className="flex items-center justify-center rounded-lg border border-orange-500/60 bg-[#33221a] text-amber-100">con chó</span>
    <span className="flex items-center justify-center rounded-lg border border-teal-500/60 bg-[#0e1b26] text-cyan-100">das Haus</span>
    <span className="flex items-center justify-center rounded-lg border border-orange-500/60 bg-[#33221a] text-amber-100">ngôi nhà</span>
  </div>
);

const ArtikelArt = () => (
  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-[#0b1a33] to-[#12264a] pt-5">
    <span className="rounded-lg border border-white/20 bg-white/10 px-3 py-1 text-sm font-extrabold text-white">
      ___ Hund <span className="font-medium text-white/60">con chó</span>
    </span>
    <div className="flex gap-2 text-xs font-extrabold text-white">
      <span className="rounded-lg border border-sky-300 bg-sky-500/70 px-3 py-1.5 transition group-hover:-translate-y-0.5">der</span>
      <span className="rounded-lg border border-rose-300 bg-rose-500/70 px-3 py-1.5">die</span>
      <span className="rounded-lg border border-emerald-300 bg-emerald-500/70 px-3 py-1.5">das</span>
    </div>
  </div>
);

const SUDOKU_SAMPLE = [5, 0, 3, 0, 7, 0, 9, 0, 1, 0, 2, 0, 8, 0, 6, 0, 4, 0];
const SudokuArt = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-[#101a2e] to-[#17264a] pt-4">
    <div className="grid grid-cols-6 overflow-hidden rounded-lg border-2 border-sky-300/70 bg-[#0e1b33] transition group-hover:-translate-y-0.5">
      {SUDOKU_SAMPLE.map((n, i) => (
        <span key={i} className={`flex size-8 items-center justify-center border-r border-b border-sky-300/20 text-sm font-black ${n ? "text-white" : ""} ${i === 7 ? "bg-sky-400/40" : ""}`}>
          {n || (i === 7 ? <span className="text-sky-200">4</span> : "")}
        </span>
      ))}
    </div>
  </div>
);

const CARO_SAMPLE = "....O..XXXX.O.O..O....";
const CaroArt = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-[#2a1a14] to-[#3d261a] pt-4">
    <div className="grid grid-cols-6 rounded-lg border-2 border-amber-200/60 bg-[#fdf3dc]/95 p-1">
      {Array.from({ length: 18 }, (_, i) => {
        const p = CARO_SAMPLE[i + 2];
        return (
          <span key={i} className="flex size-7 items-center justify-center border-r border-b border-black/10">
            {p === "X" && <X className={`size-5 text-red-500 ${i === 9 ? "transition group-hover:scale-125" : ""}`} strokeWidth={3.5} />}
            {p === "O" && <span className="size-4 rounded-full border-[3px] border-sky-500" />}
          </span>
        );
      })}
    </div>
  </div>
);

// Game luyện từ tiếng Đức trước; Sudoku / Caro (chơi cho vui) xuống cuối
const GAMES: { href: string; title: string; description: string; icon: ComponentType<{ className?: string }>; art: ReactNode; players?: string; fun?: boolean }[] = [
  {
    href: "/games/word-rain",
    title: "Mưa từ vựng",
    description: "Nghĩa tiếng Việt rơi xuống — gõ đúng từ tiếng Đức để bắn trước khi chạm nước.",
    icon: CloudRain,
    art: <RainArt />,
  },
  {
    href: "/games/spelling-bee",
    title: "Đào vàng",
    description: "Mỗi cục vàng là 1 từ kèm phát âm — nghe, gõ đúng chính tả để quăng móc kéo vàng lên trước khi chìm mất.",
    icon: Pickaxe,
    art: <GoldArt />,
  },
  {
    href: "/games/word-match",
    title: "Nối từ",
    description: "Bấm từ tiếng Đức và nghĩa của nó để xoá cặp thẻ — nối đúng được thêm giờ, nối sai bị trừ giờ.",
    icon: Puzzle,
    art: <MatchArt />,
  },
  {
    href: "/games/der-die-das",
    title: "Der Die Das",
    description: "Chọn đúng der, die hay das cho từng danh từ trong 6 giây — đúng liên tiếp được bao nhiêu từ?",
    icon: Flame,
    art: <ArtikelArt />,
  },
  {
    href: "/games/sudoku",
    title: "Sudoku",
    description: "Giải đề một mình, hoặc tạo phòng đua với 1–3 người bạn: ai giải đúng trước là thắng.",
    icon: Grid3x3,
    art: <SudokuArt />,
    players: "1–4 người",
    fun: true,
  },
  {
    href: "/games/caro",
    title: "Caro",
    description: "Đấu với máy hoặc với bạn trên bàn 15×15: ai có 5 quân liền nhau trước là thắng.",
    icon: Users,
    art: <CaroArt />,
    players: "1–2 người",
    fun: true,
  },
];

export default function GamesPage() {
  const practice = GAMES.filter((g) => !g.fun);
  const fun = GAMES.filter((g) => g.fun);
  return (
    <main className="page gap-8">
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="page-title">Game luyện từ</h1>
          <p className="text-sm text-muted">Ôn từ vựng theo bộ Goethe A1–B1, Aspekte B2 và điều dưỡng. Từ sai lưu vào sổ để ôn sau.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {practice.map((g) => (
            <Link key={g.href} href={g.href} className="group sticker sticker-link flex flex-col overflow-hidden">
              <div className="theme-night relative h-32 overflow-hidden border-b-2 border-ink sm:h-40">
                {g.art}
                <span className="absolute top-2.5 right-2.5 rounded-full border border-gold/50 bg-black/60 px-2 py-0.5 text-xs font-extrabold text-gold">
                  {g.players ?? "1 người chơi"}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <h2 className="section-title flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-full border border-amber/40 text-amber">
                    <g.icon className="size-4" />
                  </span>
                  {g.title}
                </h2>
                {/* Cả thẻ đã bấm được → chỉ 1 mũi tên nhỏ thay cho nút "Chơi ngay" */}
                <p className="flex-1 text-sm text-muted">{g.description}</p>
                <span className="inline-flex items-center gap-1 self-end text-sm font-extrabold text-amber">
                  Chơi <ArrowRight className="size-4 transition group-hover:translate-x-1 motion-reduce:transition-none" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Chơi cho vui (không luyện tiếng Đức): hàng nhỏ, không tranh chỗ với game luyện từ */}
      <section className="flex flex-col gap-4">
        <h2 className="section-title">Giải trí</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {fun.map((g) => (
            <Link key={g.href} href={g.href} className="group sticker sticker-link flex items-center gap-3 p-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-card-2 text-amber">
                <g.icon className="size-5" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-extrabold">
                  {g.title} <span className="text-xs font-bold text-muted">· {g.players}</span>
                </span>
                <span className="line-clamp-2 text-sm text-muted">{g.description}</span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-amber transition group-hover:translate-x-1 motion-reduce:transition-none" />
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
