import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Car, Gamepad2, Headphones, Landmark, Languages, Mic, PencilLine, Smartphone } from "lucide-react";
import type { ComponentType, CSSProperties } from "react";
import { LoginLink } from "@/components/auth/LoginDialog";
import Mascot from "@/components/Mascot";
import { pageMeta } from "@/lib/page-meta";

// Trang chủ = trang giới thiệu TĨNH: không đọc DB / cookie → được dựng sẵn lúc build.
// Việc học hằng ngày (học tiếp, ôn từ…) ở trang của từng phần.
// Thế giới "Nhãn vở" (DESIGN.md): ba cuốn vở bìa màu là điều hướng chính, dải "obi" số liệu vắt ngang trang.

export const metadata: Metadata = pageMeta({
  // Trang chủ: tự ghi tên thương hiệu lên đầu (absolute → không qua template của layout)
  title: { absolute: "HalloVN – Học tiếng Đức, ôn bằng lái và Leben in Deutschland" },
  description:
    "Học tiếng Đức online cho người Việt: luyện nghe nói qua video YouTube, từ vựng Goethe A1–B1, game der die das; ôn lý thuyết lái xe, Leben in Deutschland. Miễn phí.",
  path: "/",
});

type Icon = ComponentType<{ className?: string; strokeWidth?: number }>;

/** Ba cuốn vở ở đầu trang — mỗi cuốn là một khu học */
const HEFTE: { href: string; sec: string; icon: Icon; subject: string; line: string; style: CSSProperties }[] = [
  { href: "/leben-in-deutschland", sec: "lid", icon: Landmark, subject: "Leben in DE", line: "460 câu · tiếng Việt", style: { "--r": "5deg", "--x": "56%", "--y": "1%", "--fr": "8deg", "--fx": "60%", "--fy": "-1%" } as CSSProperties },
  { href: "/lai-xe", sec: "laixe", icon: Car, subject: "Lái xe", line: "Hạng B · 1.100+ câu", style: { "--r": "-1deg", "--x": "28.5%", "--y": "18%", "--fr": "-2deg", "--fx": "28%", "--fy": "17%" } as CSSProperties },
  { href: "/tieng-duc", sec: "de", icon: Languages, subject: "Tiếng Đức", line: "Video · A1 – B1", style: { "--r": "-6deg", "--x": "1%", "--y": "37%", "--fr": "-10deg", "--fx": "-4%", "--fy": "38%" } as CSSProperties },
];

/** Dải obi: số liệu thật, xếp dày như dòng credit trên băng giấy quấn bìa đĩa */
const OBI: [string, string][] = [
  ["1.100+", "câu lý thuyết lái xe hạng B"],
  ["30", "câu một đề thi thử, chấm lỗi như thi thật"],
  ["460", "câu Leben in Deutschland"],
  ["300 + 10", "câu chung và câu riêng của bang"],
  ["17 / 33", "câu đúng là đậu"],
  ["6", "game luyện từ vựng"],
  ["A1 – B1", "từ vựng theo Goethe"],
  ["0 €", "một tài khoản cho tất cả"],
];

const STEPS: { icon: Icon; tint: string; title: string; text: string }[] = [
  { icon: Headphones, tint: "tint-accent", title: "Nghe", text: "Nghe từng câu trong video thật, tua lại và nghe chậm bao nhiêu lần tuỳ ý." },
  { icon: Mic, tint: "tint-coral", title: "Nói theo", text: "Nhại lại ngay sau người nói, ghi âm và nghe lại để sửa phát âm, ngữ điệu." },
  { icon: PencilLine, tint: "tint-gold", title: "Chép chính tả", text: "Gõ lại câu vừa nghe để chắc từ và chính tả, từ mới lưu vào sổ để ôn." },
];

const EXAMS: { href: string; sec: string; icon: Icon; title: string; label: string; text: string; points: string[]; cta: string }[] = [
  {
    href: "/lai-xe",
    sec: "laixe",
    icon: Car,
    label: "Lái xe hạng B",
    title: "Ôn lý thuyết thi bằng lái",
    text: "Bộ câu hỏi thi lý thuyết ở Đức, kèm bản dịch tiếng Việt cho từng câu.",
    points: ["Ôn theo chương, xem lại câu đang sai", "Thi thử 30 câu, chấm điểm lỗi như thi thật", "Tiến độ được lưu theo tài khoản"],
    cta: "Ôn lý thuyết lái xe",
  },
  {
    href: "/leben-in-deutschland",
    sec: "lid",
    icon: Landmark,
    label: "Leben in Deutschland",
    title: "Ôn thi nhập quốc tịch",
    text: "300 câu chung và 10 câu riêng của từng bang, có tiếng Việt.",
    points: ["Chọn bang của bạn để ôn đúng bộ câu hỏi", "Thi thử 33 câu, đúng 17 câu là đậu", "Ôn lại riêng những câu hay sai"],
    cta: "Ôn Leben in Deutschland",
  },
];

const GAMES = ["Mưa từ vựng", "Nối từ", "Ong đánh vần", "Der Die Das", "Caro", "Sudoku"];

const wrap = "mx-auto w-full max-w-6xl px-4 md:px-6";

export default function Home() {
  return (
    <main className="home flex flex-col">
      {/* ── Mở đầu: chữ bên trái, chồng vở bên phải (chồng vở = lối vào ba khu) ── */}
      <section className={`${wrap} grid items-center gap-10 pt-8 pb-14 sm:pt-12 md:grid-cols-[1.1fr_1fr] md:gap-8 md:pt-16 md:pb-20`}>
        <div className="flex flex-col items-start gap-6">
          <h1 className="display max-w-[13ch]">
            Tiếng Đức, bằng lái, quốc tịch — <span className="highlight">bằng tiếng Việt</span>.
          </h1>
          <p className="lead max-w-[46ch]">
            Video bài học với người bản xứ, hơn 1.100 câu lý thuyết lái xe và 460 câu Leben in Deutschland có bản dịch. Một tài khoản cho tất cả.
          </p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link href="/tieng-duc" className="btn btn-primary btn-lg">
              Bắt đầu học <ArrowRight className="size-5" />
            </Link>
            <LoginLink href="/register" className="btn btn-lg">
              Đăng ký miễn phí
            </LoginLink>
          </div>
          <p className="text-sm text-muted">Miễn phí, dành cho người Việt ở Đức — học thử được ngay, chưa cần tài khoản.</p>
        </div>

        <nav aria-label="Ba khu học" className="heft-stack" tabIndex={-1}>
          <Mascot animated className="heft-mascot" />
          {HEFTE.map((h) => (
            <Link key={h.href} href={h.href} data-sec={h.sec} className="heft" style={h.style}>
              <span className="nhan heft-label">
                <span className="font-display text-[1.05em] leading-tight font-bold tracking-[-0.02em]">{h.subject}</span>
                <span className="nhan-line pb-0.5 text-[0.72em] text-muted">{h.line}</span>
              </span>
              <h.icon className="heft-icon self-end" strokeWidth={2.25} />
            </Link>
          ))}
        </nav>
      </section>

      {/* ── Dải obi: băng giấy xanh vắt chéo, dày đặc số liệu ── */}
      <section aria-label="HalloVN có gì" className="obi-wrap">
        <div className="obi">
          <ul className={`${wrap} grid grid-cols-2 gap-x-6 gap-y-4 py-7 sm:grid-cols-4 lg:grid-cols-8 lg:gap-x-4`}>
            {OBI.map(([n, t]) => (
              <li key={t} className="flex flex-col gap-1 border-l border-white/30 pl-3">
                <span className="font-display text-2xl leading-none font-extrabold tracking-[-0.03em] tabular-nums lg:text-[1.65rem]">{n}</span>
                <span className="text-[0.8rem] leading-snug text-white/80">{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Tiếng Đức: bìa xanh + trang ô ly minh hoạ một câu đi qua 3 bước ── */}
      <section aria-labelledby="tieng-duc" data-sec="de" className={`${wrap} pt-20 pb-6 md:pt-28`}>
        <div className="grid overflow-hidden rounded-[var(--radius-xl)] border border-line bg-card lg:grid-cols-[0.9fr_1.1fr] dark:border-border">
          <div className="cover flex flex-col gap-5 rounded-none py-8 pr-6 pl-10 sm:py-10 sm:pr-10 sm:pl-14">
            <Languages className="size-10" strokeWidth={2.25} />
            <h2 id="tieng-duc" className="font-display text-[clamp(2rem,1.4rem+2.2vw,3.25rem)] leading-[1.05] font-extrabold tracking-[-0.035em]">
              Học tiếng Đức với video của người bản xứ
            </h2>
            <p className="max-w-[40ch] text-base leading-relaxed text-white/85 sm:text-lg">
              Chọn một video theo trình độ rồi luyện từng câu theo phương pháp shadowing — nghe được, nói được rồi mới viết được.
            </p>
            <div className="mt-auto flex flex-wrap gap-3 pt-2">
              <Link href="/tieng-duc" className="btn btn-lg border-transparent bg-white text-[#16203a] hover:bg-white/90">
                Xem bài học <ArrowRight className="size-5" />
              </Link>
              <Link href="/vocab" className="btn btn-lg border-white/40 bg-transparent text-white hover:border-white hover:bg-white/10">
                Từ vựng A1–B1
              </Link>
            </div>
          </div>

          {/* Trang vở ô ly: một câu thật đi qua ba bước */}
          <div className="o-ly flex flex-col gap-6 p-6 sm:p-10">
            <figure className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 items-end gap-[3px]" aria-hidden>
                  {[40, 75, 55, 95, 65, 85, 45, 70, 30].map((h, i) => (
                    <i key={i} className="wave-bar w-[4px] rounded-full bg-accent" style={{ height: `${h}%`, "--i": i } as CSSProperties} />
                  ))}
                </span>
                <span className="text-xs font-semibold text-muted">Câu 3 / 24 · Nghe lại 0,75×</span>
              </div>
              <blockquote lang="de" className="font-display text-[clamp(1.5rem,1.2rem+1.2vw,2.1rem)] leading-tight font-bold tracking-[-0.02em]">
                Ich hätte gern einen <span className="highlight">Kaffee</span>, bitte.
              </blockquote>
              <figcaption className="text-base text-muted">Cho tôi một ly cà phê nhé.</figcaption>
            </figure>

            <p lang="de" aria-label="Chép chính tả: Ich hätte gern einen Kaffee, bitte." className="flex flex-wrap gap-1.5 font-mono text-sm">
              {["Ich", "hätte", "gern", "einen", "K_ff_e", "bitte"].map((w, i) => (
                <span key={w} className={`rounded-md border px-2 py-1 ${i === 4 ? "border-dashed border-gold bg-gold-soft text-amber" : "border-ok/30 bg-ok-soft text-ok-text"}`}>
                  {w}
                </span>
              ))}
            </p>

            <ol className="grid gap-4 border-t border-line pt-6 sm:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.title} className="flex flex-col gap-2">
                  <span className="flex items-center gap-2">
                    <span className={`icon-bubble size-9 ${s.tint}`}>
                      <s.icon className="size-[18px]" />
                    </span>
                    <span className="font-display text-base leading-tight font-bold">
                      <span className="text-muted tabular-nums">{i + 1}.</span> {s.title}
                    </span>
                  </span>
                  <p className="text-sm leading-relaxed text-muted">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ── Hai bộ thi: hai cuốn vở cạnh nhau, nhãn vở là tiêu đề ── */}
      <section aria-label="Ôn thi" className={`${wrap} grid gap-6 py-10 md:grid-cols-2 md:gap-8`}>
        {EXAMS.map((e) => (
          <Link key={e.href} href={e.href} data-sec={e.sec} className="exam-heft group flex flex-col">
            <div className="cover flex min-h-36 items-start justify-between pt-6 pr-6 pb-16 pl-10">
              <e.icon className="size-10" strokeWidth={2.25} />
              <span className="text-sm font-semibold">{e.label}</span>
            </div>
            <div className="relative z-10 mx-4 -mt-12 flex flex-1 flex-col sm:mx-6">
              <div className="nhan flex flex-1 flex-col gap-3 pb-5">
                <h2 className="font-display text-2xl leading-tight font-extrabold tracking-[-0.025em] sm:text-[1.75rem]">{e.title}</h2>
                <p className="text-muted">{e.text}</p>
                <ul className="flex flex-col">
                  {e.points.map((pt) => (
                    <li key={pt} className="nhan-line py-2 text-[0.95rem]">
                      {pt}
                    </li>
                  ))}
                </ul>
                <span className="mt-auto inline-flex items-center gap-1.5 pt-2 font-semibold text-sec-text">
                  {e.cta} <ArrowRight className="size-4 transition-transform duration-300 ease-[var(--ease-out)] group-hover:translate-x-1" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </section>

      {/* ── Game: dải tím, tên game như nhãn dán ── */}
      <section aria-labelledby="game" data-sec="game" className={`${wrap} py-6`}>
        <Link href="/games" className="cover group flex flex-col gap-6 py-8 pr-6 pl-10 sm:flex-row sm:items-center sm:justify-between sm:py-10 sm:pr-10 sm:pl-14">
          <div className="flex flex-col gap-2">
            <Gamepad2 className="size-9" strokeWidth={2.25} />
            <h2 id="game" className="font-display text-3xl leading-tight font-extrabold tracking-[-0.03em]">
              Chơi mà nhớ từ
            </h2>
            <p className="max-w-[38ch] text-white/85">Vài phút mỗi ngày với trò chơi luyện từ vựng và giống của danh từ.</p>
          </div>
          <ul className="flex max-w-md flex-wrap gap-2 sm:justify-end" aria-label="Các game">
            {GAMES.map((g, i) => (
              <li
                key={g}
                className="game-sticker rounded-lg bg-white px-3 py-1.5 text-sm font-bold text-[#2b1d6b]"
                style={{ "--t": `${(i % 3) - 1}deg` } as CSSProperties}
              >
                {g}
              </li>
            ))}
          </ul>
        </Link>
      </section>

      {/* ── App + kêu gọi cuối trang ── */}
      <section className={`${wrap} grid gap-6 pt-14 pb-6 md:grid-cols-[1fr_1.3fr] md:items-stretch`}>
        <Link href="/about" className="group card card-link flex flex-col justify-between gap-6 p-6 sm:p-8">
          <Smartphone className="size-9 text-accent-text" strokeWidth={2} />
          <div className="flex flex-col gap-2">
            <h2 className="section-title">Có cả app cho điện thoại</h2>
            <p className="text-muted">Các app học tiếng Đức, lý thuyết lái xe và Leben in Deutschland của HalloVN cho iOS và Android.</p>
            <span className="mt-2 inline-flex items-center gap-1.5 font-semibold text-link">
              Xem các app <ArrowRight className="size-4 transition-transform duration-300 ease-[var(--ease-out)] group-hover:translate-x-1" />
            </span>
          </div>
        </Link>

        <div className="o-ly relative flex flex-col items-start gap-5 overflow-hidden rounded-[var(--radius-xl)] border border-line p-6 sm:p-10 dark:border-border">
          <h2 className="max-w-[16ch] font-display text-[clamp(1.75rem,1.3rem+1.6vw,2.6rem)] leading-[1.08] font-extrabold tracking-[-0.03em]">
            Bắt đầu hôm nay — <span className="highlight">mười phút</span> mỗi ngày là đủ.
          </h2>
          <p className="max-w-[44ch] text-muted">Tạo tài khoản để lưu tiến độ, sổ từ và điểm thi thử trên mọi thiết bị. Chưa muốn đăng ký thì cứ học thử trước.</p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <LoginLink href="/register" className="btn btn-primary btn-lg">
              Đăng ký miễn phí
            </LoginLink>
            <Link href="/lai-xe/thi-thu" className="btn btn-lg">
              Thi thử lái xe ngay
            </Link>
          </div>
          <Mascot className="pointer-events-none absolute -right-4 -bottom-6 size-36 rotate-[-8deg] max-sm:hidden lg:size-44" />
        </div>
      </section>
    </main>
  );
}
