import type { Metadata } from "next";
import { pageMeta } from "@/lib/page-meta";
import Link from "next/link";
import { ArrowRight, Ear, Gamepad2, Keyboard, Shapes, Timer, Volume2, X } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import Mascot from "@/components/Mascot";
import PageHeader from "@/components/PageHeader";

export const metadata: Metadata = pageMeta({
  title: "Game học tiếng Đức miễn phí – Luyện từ vựng, der die das",
  description:
    "Chơi game học từ vựng tiếng Đức theo bộ từ Goethe A1–B1, Aspekte B2 và điều dưỡng: mưa từ vựng, nối từ, der die das; thêm Sudoku và Caro với bạn bè.",
  path: "/games",
});

const Emoji = ({ code, className }: { code: string; className: string }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={`/emoji/${code}.webp`} alt="" className={`pointer-events-none absolute ${className}`} />
);

const RainArt = () => (
  <div className="absolute inset-0 bg-[#141029]">
    {Array.from({ length: 18 }, (_, i) => (
      <span key={i} className="absolute w-px bg-[#7fd3f0]/30" style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 70}%`, height: 14 + (i % 4) * 6 }} />
    ))}
    <Emoji code="1f327-fe0f" className="top-3 left-1/2 size-18 -translate-x-1/2 transition group-hover:-translate-y-1" />
    <span className="absolute top-[4.2rem] left-[16%] rounded-lg border border-[#7fd3f0]/60 bg-[#1d1840] px-2 py-0.5 text-xs font-semibold text-white">cảm ơn</span>
    <span className="absolute top-12 right-[12%] rounded-lg border border-[#7fd3f0] bg-[#1f2a52] px-2 py-0.5 text-xs font-semibold text-white">con chó</span>
    <div className="g-water absolute inset-x-0 bottom-0 h-14" />
    <Emoji code="26f5" className="bob bottom-10 left-[62%] size-9 -translate-x-1/2" />
    <Mascot animated className="absolute bottom-10 left-4 size-10" />
  </div>
);

const GoldArt = () => (
  <div className="theme-night g-field-gold absolute inset-0 [background:linear-gradient(to_bottom,#141029_0_3.2rem,#6b4520_3.2rem_55%,#4f3316_55%_80%,#2e1d0c_80%)]">
    <div className="absolute inset-x-0 top-[3.2rem] h-1 bg-[#8b6a3a]" />
    {Array.from({ length: 14 }, (_, i) => (
      <span key={i} className="absolute rounded-full bg-black/25" style={{ left: `${(i * 41) % 100}%`, top: `${40 + ((i * 29) % 55)}%`, width: 6 + (i % 4) * 4, height: 4 + (i % 3) * 3 }} />
    ))}
    <span className="absolute top-5 left-1/2 h-8 w-1 origin-top rotate-[22deg] rounded-full bg-[#7a4e25]" />
    <span className="absolute top-5 left-1/2 h-8 w-1 origin-top -rotate-[22deg] rounded-full bg-[#7a4e25]" />
    <Emoji code="1f477" className="top-[3.2rem] left-1/2 -ml-14 size-9 -translate-y-full" />
    <span className="absolute top-5 left-1/2 h-0.5 w-[34%] origin-left rotate-[35deg] bg-[#fff0b8]/80 transition group-hover:rotate-[30deg]" />
    <span className="g-nugget g-nugget-target absolute top-20 right-[10%] flex flex-col items-center gap-0.5 border px-2.5 py-1">
      <Volume2 className="size-3.5 text-gold" />
      <span className="font-mono text-xs font-bold tracking-[0.18em] text-white">
        Gol<span className="text-gold/60">_</span>
      </span>
    </span>
    <span className="g-nugget absolute top-24 left-[12%] flex flex-col items-center gap-0.5 border px-2.5 py-1">
      <Volume2 className="size-3.5 text-gold" />
      <span className="font-mono text-xs font-bold tracking-[0.18em] text-gold/50">
        <span className="text-gold">H</span>___
      </span>
    </span>
  </div>
);

const MatchArt = () => (
  <div className="theme-night g-field-match absolute inset-0 grid grid-cols-3 grid-rows-2 gap-1.5 p-3 pt-10 text-center text-xs">
    <span className="g-mcard g-mcard-word px-1 text-xs sm:px-1 sm:text-xs">der Hund</span>
    <span className="g-mcard g-mcard-mean px-1 text-xs sm:px-1 sm:text-xs">cảm ơn</span>
    <span className="g-mcard g-mcard-word px-1 text-xs transition group-hover:-translate-y-0.5 sm:px-1 sm:text-xs" aria-pressed="true">
      danke
    </span>
    <span className="g-mcard g-mcard-mean px-1 text-xs sm:px-1 sm:text-xs">con chó</span>
    <span className="g-mcard g-mcard-done px-1 text-xs sm:px-1 sm:text-xs">das Haus</span>
    <span className="g-mcard g-mcard-done px-1 text-xs sm:px-1 sm:text-xs">ngôi nhà</span>
  </div>
);

const ArtikelArt = () => (
  <div className="theme-night absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#141029]">
    <span className="rounded-lg border border-border bg-card px-4 py-1.5 text-sm font-bold text-foreground">
      ___ Hund <span className="font-normal text-muted">· con chó</span>
    </span>
    <div className="flex gap-2 text-sm font-bold">
      <span className="g-artikel g-der min-h-0 px-3.5 py-1.5 text-sm sm:min-h-0 sm:text-sm">der</span>
      <span className="g-artikel g-die min-h-0 px-3.5 py-1.5 text-sm sm:min-h-0 sm:text-sm">die</span>
      <span className="g-artikel g-das min-h-0 px-3.5 py-1.5 text-sm sm:min-h-0 sm:text-sm">das</span>
    </div>
  </div>
);

const SUDOKU_SAMPLE = [5, 0, 3, 0, 7, 0, 9, 0, 1, 0, 2, 0, 8, 0, 6, 0, 4, 0];
const SudokuArt = () => (
  <div className="theme-night absolute inset-0 flex items-center justify-center bg-[#141029]">
    <div className="grid grid-cols-3 overflow-hidden rounded-md border border-line-strong bg-card">
      {SUDOKU_SAMPLE.slice(0, 9).map((n, i) => (
        <span key={i} className={`flex size-5 items-center justify-center border-r border-b border-border text-[0.7rem] font-bold ${i === 4 ? "bg-gem/30" : ""}`}>
          {n || (i === 4 ? <span className="text-gem">4</span> : "")}
        </span>
      ))}
    </div>
  </div>
);

const CARO_SAMPLE = "..O.XXX.O";
const CaroArt = () => (
  <div className="theme-night absolute inset-0 flex items-center justify-center bg-[#141029]">
    <div className="grid grid-cols-3 rounded-md border border-line-strong bg-card-2 p-0.5">
      {[...CARO_SAMPLE].map((p, i) => (
        <span key={i} className="flex size-5 items-center justify-center">
          {p === "X" && <X className="size-4 text-red" strokeWidth={3.5} />}
          {p === "O" && <span className="size-3 rounded-full border-[2.5px] border-gem" />}
        </span>
      ))}
    </div>
  </div>
);

type Icon = ComponentType<{ className?: string; strokeWidth?: number }>;

const PRACTICE: { href: string; title: string; description: string; skill: string; skillIcon: Icon; art: ReactNode }[] = [
  {
    href: "/games/word-rain",
    title: "Mưa từ vựng",
    description: "Nghĩa tiếng Việt rơi xuống — gõ đúng từ tiếng Đức để bắn trước khi chạm nước.",
    skill: "Nhớ từ · gõ",
    skillIcon: Keyboard,
    art: <RainArt />,
  },
  {
    href: "/games/spelling-bee",
    title: "Đào vàng",
    description: "Mỗi cục vàng là một từ kèm phát âm — nghe và gõ đúng chính tả để kéo vàng lên.",
    skill: "Nghe · đánh vần",
    skillIcon: Ear,
    art: <GoldArt />,
  },
  {
    href: "/games/word-match",
    title: "Nối từ",
    description: "Bấm từ tiếng Đức và nghĩa của nó để xoá cặp thẻ — nối đúng được cộng thêm giờ.",
    skill: "Nối cặp · đua giờ",
    skillIcon: Timer,
    art: <MatchArt />,
  },
  {
    href: "/games/der-die-das",
    title: "Der Die Das",
    description: "Chọn đúng der, die hay das cho từng danh từ trong 6 giây — nối dài chuỗi đúng liên tiếp.",
    skill: "Giống danh từ",
    skillIcon: Shapes,
    art: <ArtikelArt />,
  },
];

const FUN: { href: string; title: string; description: string; players: string; art: ReactNode }[] = [
  { href: "/games/sudoku", title: "Sudoku", description: "Giải đề một mình hoặc tạo phòng đua với 1–3 người bạn.", players: "1–4 người", art: <SudokuArt /> },
  { href: "/games/caro", title: "Caro", description: "Đấu với máy hoặc với bạn trên bàn 15×15: 5 quân liền nhau là thắng.", players: "1–2 người", art: <CaroArt /> },
];

export default function GamesPage() {
  return (
    <main className="page gap-8" data-sec="game">
      <PageHeader
        sec="game"
        icon={Gamepad2}
        title="Trò chơi luyện từ"
        sub="Ôn từ vựng theo bộ Goethe A1–B1, Aspekte B2 và điều dưỡng. Từ làm sai được lưu để ôn lại."
        meta={<span className="badge badge-grape">6 game · miễn phí</span>}
        mascot
      />

      <section aria-label="Game luyện từ tiếng Đức" className="grid gap-4 md:grid-cols-2">
        {PRACTICE.map((g, i) => (
          <Link key={g.href} href={g.href} className="group card card-link flex flex-col overflow-hidden p-0">
            <div className="theme-night g-art border-b border-line">
              {g.art}
              <span className="g-art-tag">1 người chơi</span>
            </div>
            <div className="flex flex-1 flex-col gap-2.5 p-4 sm:p-5">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-display text-lg leading-snug font-bold tracking-[-0.015em] group-hover:text-sec-text">{g.title}</h2>
                <span className="font-mono text-xs font-semibold text-muted tabular-nums" aria-hidden>
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <p className="flex-1 text-sm leading-relaxed text-muted">{g.description}</p>
              <div className="mt-1 flex items-center justify-between gap-3 border-t border-line pt-3 text-xs font-semibold">
                <span className="inline-flex items-center gap-1.5 text-grape-text">
                  <g.skillIcon className="size-3.5" strokeWidth={2} /> {g.skill}
                </span>
                <span className="inline-flex items-center gap-1 text-foreground">
                  Chơi <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </section>

      <section aria-labelledby="giai-tri" className="flex flex-col gap-3">
        <div>
          <h2 id="giai-tri" className="section-title">
            Giải trí cùng bạn bè
          </h2>
          <p className="text-sm text-muted">Không cần tài khoản — nhập tên tạm hoặc tạo mã phòng là vào chơi ngay.</p>
        </div>
        <ul className="card divide-y divide-line overflow-hidden p-0">
          {FUN.map((g) => (
            <li key={g.href}>
              <Link href={g.href} className="group flex items-center gap-4 p-3.5 transition-colors hover:bg-card-2 sm:p-4">
                <span className="theme-night g-art g-art-sm relative size-16 shrink-0 rounded-lg border border-line sm:size-18">{g.art}</span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-base leading-tight font-bold text-foreground">{g.title}</span>
                    <span className="badge badge-grape">{g.players}</span>
                  </span>
                  <span className="line-clamp-2 text-sm text-muted">{g.description}</span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-foreground motion-reduce:transition-none" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
