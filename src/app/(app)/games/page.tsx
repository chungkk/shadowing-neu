import type { Metadata } from "next";
import { pageMeta } from "@/lib/page-meta";
import Link from "next/link";
import { ArrowRight, Ear, Gamepad2, Keyboard, Shapes, Timer, Volume2, X } from "lucide-react";
import type { ComponentType, CSSProperties, ReactNode } from "react";
import Mascot from "@/components/Mascot";
import PageHeader from "@/components/PageHeader";

export const metadata: Metadata = pageMeta({
  title: "Game học tiếng Đức miễn phí – Luyện từ vựng, der die das",
  description:
    "Chơi game học từ vựng tiếng Đức theo bộ từ Goethe A1–B1, Aspekte B2 và điều dưỡng: mưa từ vựng, nối từ, der die das; thêm Sudoku và Caro với bạn bè.",
  path: "/games",
});

// Thế giới "Nhãn vở" (DESIGN.md): mỗi game là một "gói" — tranh minh hoạ đêm làm bìa, nhãn vở dán chồng lên mép dưới,
// nghiêng mỗi nhãn một chút như dán tay. Tranh vẽ bằng lớp màu phẳng cắt dán (không gradient / glow).

const Emoji = ({ code, className }: { code: string; className: string }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={`/emoji/${code}.webp`} alt="" className={`pointer-events-none absolute ${className}`} />
);

/** Tranh minh hoạ đầu gói game */
const RainArt = () => (
  <div className="absolute inset-0 bg-[#141029]">
    {Array.from({ length: 18 }, (_, i) => (
      <span key={i} className="absolute w-px bg-[#7fd3f0]/30" style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 70}%`, height: 14 + (i % 4) * 6 }} />
    ))}
    <Emoji code="1f327-fe0f" className="top-3 left-1/2 size-20 -translate-x-1/2 transition group-hover:-translate-y-1" />
    <span className="absolute top-[4.5rem] left-[18%] rounded-lg border border-[#7fd3f0]/60 bg-[#1d1840] px-2 py-0.5 text-xs font-bold text-white">cảm ơn</span>
    <span className="absolute top-14 right-[10%] rounded-lg border border-[#7fd3f0] bg-[#1f2a52] px-2 py-0.5 text-xs font-bold text-white">con chó</span>
    <div className="g-water absolute inset-x-0 bottom-0 h-[4.25rem]" />
    <Emoji code="26f5" className="bob bottom-12 left-[62%] size-10 -translate-x-1/2" />
    <Mascot animated className="absolute bottom-12 left-4 size-11" />
  </div>
);

const GoldArt = () => (
  <div className="theme-night g-field-gold absolute inset-0 [background:linear-gradient(to_bottom,#141029_0_3.5rem,#6b4520_3.5rem_55%,#4f3316_55%_80%,#2e1d0c_80%)]">
    <div className="absolute inset-x-0 top-14 h-1 bg-[#8b6a3a]" />
    {Array.from({ length: 14 }, (_, i) => (
      <span key={i} className="absolute rounded-full bg-black/25" style={{ left: `${(i * 41) % 100}%`, top: `${40 + ((i * 29) % 55)}%`, width: 6 + (i % 4) * 4, height: 4 + (i % 3) * 3 }} />
    ))}
    <span className="absolute top-6 left-1/2 h-8 w-1 origin-top rotate-[22deg] rounded-full bg-[#7a4e25]" />
    <span className="absolute top-6 left-1/2 h-8 w-1 origin-top -rotate-[22deg] rounded-full bg-[#7a4e25]" />
    <Emoji code="1f477" className="top-14 left-1/2 -ml-16 size-10 -translate-y-full" />
    {/* dây móc chéo xuống cục vàng bên phải */}
    <span className="absolute top-6 left-1/2 h-0.5 w-[34%] origin-left rotate-[35deg] bg-[#fff0b8]/80 transition group-hover:rotate-[30deg]" />
    <span className="g-nugget g-nugget-target absolute top-24 right-[10%] flex flex-col items-center gap-0.5 border px-2.5 py-1">
      <Volume2 className="size-3.5 text-gold" />
      <span className="font-mono text-xs font-extrabold tracking-[0.18em] text-white">
        Gol<span className="text-gold/60">_</span>
      </span>
    </span>
    <span className="g-nugget absolute top-[6.5rem] left-[12%] flex flex-col items-center gap-0.5 border px-2.5 py-1">
      <Volume2 className="size-3.5 text-gold" />
      <span className="font-mono text-xs font-extrabold tracking-[0.18em] text-gold/50">
        <span className="text-gold">H</span>___
      </span>
    </span>
  </div>
);

const MatchArt = () => (
  <div className="theme-night g-field-match absolute inset-0 grid grid-cols-3 grid-rows-2 gap-1.5 p-3 pt-9 pb-12 text-center text-xs">
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
  <div className="theme-night absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#141029] pb-9">
    <span className="nhan rotate-[-2deg] px-4 py-1.5 font-display text-base font-extrabold">
      ___ Hund <span className="font-sans text-sm font-medium text-muted">con chó</span>
    </span>
    <div className="flex gap-2 font-display text-sm font-extrabold">
      <span className="g-artikel g-der min-h-0 px-3.5 py-1.5 text-sm sm:min-h-0 sm:text-sm transition group-hover:-translate-y-0.5">der</span>
      <span className="g-artikel g-die min-h-0 px-3.5 py-1.5 text-sm sm:min-h-0 sm:text-sm">die</span>
      <span className="g-artikel g-das min-h-0 px-3.5 py-1.5 text-sm sm:min-h-0 sm:text-sm">das</span>
    </div>
  </div>
);

const SUDOKU_SAMPLE = [5, 0, 3, 0, 7, 0, 9, 0, 1, 0, 2, 0, 8, 0, 6, 0, 4, 0];
const SudokuArt = () => (
  <div className="theme-night absolute inset-0 flex items-center justify-center bg-[#141029]">
    <div className="grid grid-cols-3 overflow-hidden rounded-md border-2 border-line-strong bg-card">
      {SUDOKU_SAMPLE.slice(0, 9).map((n, i) => (
        <span key={i} className={`flex size-5 items-center justify-center border-r border-b border-border text-[0.7rem] font-black ${i === 4 ? "bg-gem/30" : ""}`}>
          {n || (i === 4 ? <span className="text-gem">4</span> : "")}
        </span>
      ))}
    </div>
  </div>
);

const CARO_SAMPLE = "..O.XXX.O";
const CaroArt = () => (
  <div className="theme-night absolute inset-0 flex items-center justify-center bg-[#141029]">
    <div className="grid grid-cols-3 rounded-md border-2 border-line-strong bg-card-2 p-0.5">
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

/** Game luyện từ tiếng Đức — mỗi gói một kỹ năng, nhãn nghiêng khác nhau */
const PRACTICE: { href: string; title: string; description: string; skill: string; skillIcon: Icon; art: ReactNode; tilt: string; span: string }[] = [
  {
    href: "/games/word-rain",
    title: "Mưa từ vựng",
    description: "Nghĩa tiếng Việt rơi xuống — gõ đúng từ tiếng Đức để bắn trước khi chạm nước.",
    skill: "Nhớ từ · gõ",
    skillIcon: Keyboard,
    art: <RainArt />,
    tilt: "-1.2deg",
    span: "lg:col-span-7",
  },
  {
    href: "/games/spelling-bee",
    title: "Đào vàng",
    description: "Mỗi cục vàng là một từ kèm phát âm — nghe, gõ đúng chính tả để quăng móc kéo vàng lên trước khi chìm mất.",
    skill: "Nghe · đánh vần",
    skillIcon: Ear,
    art: <GoldArt />,
    tilt: "1deg",
    span: "lg:col-span-5",
  },
  {
    href: "/games/word-match",
    title: "Nối từ",
    description: "Bấm từ tiếng Đức và nghĩa của nó để xoá cặp thẻ — nối đúng được thêm giờ, nối sai bị trừ giờ.",
    skill: "Nối cặp · đua giờ",
    skillIcon: Timer,
    art: <MatchArt />,
    tilt: "0.8deg",
    span: "lg:col-span-5",
  },
  {
    href: "/games/der-die-das",
    title: "Der Die Das",
    description: "Chọn đúng der, die hay das cho từng danh từ trong 6 giây — đúng liên tiếp được bao nhiêu từ?",
    skill: "Giống danh từ",
    skillIcon: Shapes,
    art: <ArtikelArt />,
    tilt: "-0.8deg",
    span: "lg:col-span-7",
  },
];

/** Chơi cho vui (không luyện tiếng Đức) */
const FUN: { href: string; title: string; description: string; players: string; art: ReactNode }[] = [
  { href: "/games/sudoku", title: "Sudoku", description: "Giải đề một mình, hoặc tạo phòng đua với 1–3 người bạn: ai giải đúng trước là thắng.", players: "1–4 người", art: <SudokuArt /> },
  { href: "/games/caro", title: "Caro", description: "Đấu với máy hoặc với bạn trên bàn 15×15: ai có 5 quân liền nhau trước là thắng.", players: "1–2 người", art: <CaroArt /> },
];

export default function GamesPage() {
  return (
    <main className="page gap-10" data-sec="game">
      <PageHeader
        sec="game"
        icon={Gamepad2}
        title="Game luyện từ"
        sub="Ôn từ vựng theo bộ Goethe A1–B1, Aspekte B2 và điều dưỡng. Từ sai được lưu vào sổ để ôn sau."
        meta={<span className="rounded-md bg-white/15 px-2 py-0.5 max-sm:hidden">6 game · miễn phí</span>}
        mascot
      />

      <section aria-label="Game luyện từ tiếng Đức" className="grid gap-x-6 gap-y-10 md:grid-cols-2 lg:grid-cols-12">
        {PRACTICE.map((g, i) => (
          <Link key={g.href} href={g.href} className={`group g-pack ${g.span}`} style={{ "--t": g.tilt } as CSSProperties}>
            <div className="theme-night g-art">
              {g.art}
              <span className="g-art-tag">1 người chơi</span>
            </div>
            <div className="nhan g-pack-label">
              <span className="flex items-baseline justify-between gap-3">
                <h2 className="font-display text-[1.45rem] leading-tight font-extrabold tracking-[-0.025em]">{g.title}</h2>
                <span className="g-pack-no" aria-hidden>
                  {String(i + 1).padStart(2, "0")}
                </span>
              </span>
              <p className="flex-1 text-[0.95rem] leading-relaxed text-muted">{g.description}</p>
              <span className="nhan-line flex items-center justify-between gap-3 pt-1 pb-1.5 text-sm">
                <span className="inline-flex items-center gap-1.5 font-semibold text-grape-text">
                  <g.skillIcon className="size-4" strokeWidth={2.25} /> {g.skill}
                </span>
                <span className="inline-flex items-center gap-1 font-bold">
                  Chơi <ArrowRight className="size-4 transition-transform duration-300 ease-[var(--ease-out)] group-hover:translate-x-1" />
                </span>
              </span>
            </div>
          </Link>
        ))}
      </section>

      {/* Chơi cho vui: hàng phân cách, không tranh chỗ với game luyện từ */}
      <section aria-labelledby="giai-tri" className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="giai-tri" className="section-title">
              Giải trí
            </h2>
            <p className="text-sm text-muted">Chơi cho vui với bạn bè — không cần tài khoản, nhập tên tạm là vào.</p>
          </div>
          <Mascot className="size-14 shrink-0 rotate-[6deg] max-sm:hidden" />
        </div>
        <ul className="card divide-y divide-line overflow-hidden p-0 dark:divide-border">
          {FUN.map((g) => (
            <li key={g.href}>
              <Link href={g.href} className="group flex items-center gap-4 p-3 transition-colors hover:bg-card-2 sm:p-4">
                <span className="theme-night g-art g-art-sm relative size-16 shrink-0 rounded-xl sm:size-20">{g.art}</span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-lg leading-tight font-extrabold tracking-[-0.02em]">{g.title}</span>
                    <span className="badge badge-grape">{g.players}</span>
                  </span>
                  <span className="line-clamp-2 text-sm text-muted">{g.description}</span>
                </span>
                <ArrowRight className="size-5 shrink-0 text-muted transition group-hover:translate-x-1 group-hover:text-foreground motion-reduce:transition-none" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
