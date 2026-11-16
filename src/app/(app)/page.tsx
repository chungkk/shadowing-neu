import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Car, Check, Gamepad2, Headphones, Landmark, Languages, Mic, PencilLine, Smartphone } from "lucide-react";
import type { ComponentType, CSSProperties } from "react";
import { LoginLink } from "@/components/auth/LoginDialog";
import Mascot from "@/components/Mascot";
import { pageMeta } from "@/lib/page-meta";

// Trang chủ = trang giới thiệu TĨNH: không đọc DB / cookie → được dựng sẵn lúc build.
// Việc học hằng ngày (học tiếp, ôn từ…) ở trang của từng phần.

export const metadata: Metadata = pageMeta({
  // Trang chủ: tự ghi tên thương hiệu lên đầu (absolute → không qua template của layout)
  title: { absolute: "HalloVN – Học tiếng Đức, ôn bằng lái và Leben in Deutschland" },
  description:
    "Học tiếng Đức online cho người Việt: luyện nghe nói qua video YouTube, từ vựng Goethe A1–B1, game der die das; ôn lý thuyết lái xe, Leben in Deutschland. Miễn phí.",
  path: "/",
});

type Icon = ComponentType<{ className?: string }>;

const FACTS = [
  { value: "1.100+", label: "câu lý thuyết lái xe hạng B" },
  { value: "460", label: "câu Leben in Deutschland" },
  { value: "6", label: "game luyện từ vựng" },
  { value: "0 €", label: "miễn phí, một tài khoản" },
];

const PRODUCTS: { href: string; icon: Icon; tone: string; glow: string; label: string; title: string; text: string; points: string[]; cta: string }[] = [
  {
    href: "/tieng-duc",
    icon: Languages,
    tone: "tint-accent", glow: "var(--leaf)",
    label: "Tiếng Đức",
    title: "Học với video của người bản xứ",
    text: "Chọn một video theo trình độ rồi luyện từng câu theo phương pháp shadowing.",
    points: ["Nghe từng câu, có phụ đề và bản dịch tiếng Việt", "Nói theo, ghi âm để so với người bản xứ", "Chép chính tả, lưu từ mới vào sổ để ôn"],
    cta: "Xem bài học",
  },
  {
    href: "/lai-xe",
    icon: Car,
    tone: "tint-link", glow: "var(--aqua)",
    label: "Lái xe hạng B",
    title: "Ôn lý thuyết thi bằng lái",
    text: "Bộ câu hỏi thi lý thuyết ở Đức, kèm bản dịch tiếng Việt cho từng câu.",
    points: ["Ôn theo chương, xem lại câu đang sai", "Thi thử 30 câu, chấm điểm lỗi như thi thật", "Tiến độ được lưu theo tài khoản"],
    cta: "Ôn lý thuyết lái xe",
  },
  {
    href: "/leben-in-deutschland",
    icon: Landmark,
    tone: "tint-candy", glow: "var(--candy)",
    label: "Leben in Deutschland",
    title: "Ôn thi nhập quốc tịch",
    text: "300 câu chung và 10 câu riêng của từng bang, có tiếng Việt.",
    points: ["Chọn bang của bạn để ôn đúng bộ câu hỏi", "Thi thử 33 câu, đúng 17 câu là đậu", "Ôn lại riêng những câu hay sai"],
    cta: "Ôn Leben in Deutschland",
  },
  {
    href: "/games",
    icon: Gamepad2,
    tone: "tint-gold", glow: "var(--sun)",
    label: "Game",
    title: "Chơi mà nhớ từ",
    text: "Vài phút mỗi ngày với các trò chơi luyện từ vựng và giống của danh từ.",
    points: ["Mưa từ vựng, nối từ, ong đánh vần", "Der Die Das — luyện giống danh từ", "Caro và Sudoku chơi cùng bạn bè"],
    cta: "Vào chơi",
  },
];

const STEPS: { icon: Icon; tone: string; title: string; text: string }[] = [
  { icon: Headphones, tone: "tint-gem", title: "Nghe", text: "Nghe từng câu trong video thật, tua lại và nghe chậm bao nhiêu lần tuỳ ý." },
  { icon: Mic, tone: "tint-candy", title: "Nói theo", text: "Nhại lại ngay sau người nói, ghi âm và nghe lại để sửa phát âm, ngữ điệu." },
  { icon: PencilLine, tone: "tint-gold", title: "Chép chính tả", text: "Gõ lại câu vừa nghe để chắc từ vựng và chính tả, từ mới lưu vào sổ ôn." },
];

const moreLink = "mt-auto inline-flex items-center gap-1 pt-1 text-sm font-extrabold text-link group-hover:underline";

export default function Home() {
  return (
    <main className="page gap-12 md:gap-16">
      {/* Mở đầu */}
      <section className="sticker hero rise-in flex flex-col items-center gap-6 p-6 text-center sm:p-10 md:flex-row md:gap-10 md:p-12 md:text-left">
        <Mascot animated className="bob size-32 drop-shadow-[0_10px_18px_rgb(var(--shadow-color)/0.18)] md:order-last md:size-60" />
        <div className="flex flex-col items-center gap-4 md:items-start">
          <span className="badge badge-accent">Dành cho người Việt ở Đức</span>
          <h1 className="display text-balance">Học tiếng Đức, ôn thi bằng lái và quốc tịch — bằng tiếng Việt</h1>
          <p className="lead max-w-xl">
            Video bài học với người bản xứ, hơn 1.100 câu lý thuyết lái xe và 460 câu Leben in Deutschland có bản dịch. Một tài khoản cho tất cả, miễn phí.
          </p>
          <div className="mt-2 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap md:justify-start">
            <Link href="/tieng-duc" className="btn btn-primary btn-lg">
              Bắt đầu học <ArrowRight className="size-5" />
            </Link>
            <LoginLink href="/register" className="btn btn-lg">
              Đăng ký miễn phí
            </LoginLink>
          </div>
        </div>
      </section>

      {/* Vài con số */}
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {FACTS.map((f, i) => (
          <li key={f.label} className="tile rise-in stat items-center gap-1.5 px-3 py-5 text-center" style={{ "--i": i + 1 } as CSSProperties}>
            <span className="stat-value text-3xl text-accent-text sm:text-4xl">{f.value}</span>
            <span className="stat-label text-sm">{f.label}</span>
          </li>
        ))}
      </ul>

      {/* 4 phần chính */}
      <section className="flex flex-col gap-5" aria-labelledby="co-gi">
        <div className="flex flex-col gap-1.5">
          <span className="eyebrow">Bốn phần học</span>
          <h2 id="co-gi" className="page-title">
            HalloVN có gì?
          </h2>
          <p className="muted">Bốn phần, dùng thử được ngay không cần tài khoản.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {PRODUCTS.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className="group sticker sticker-link hero flex flex-col gap-3 p-5 sm:p-6"
              style={{ "--hero": p.glow } as CSSProperties}
            >
              <span className="flex items-center gap-3">
                <span className={`icon-bubble size-12 ${p.tone}`}>
                  <p.icon className="size-6" />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="label text-xs text-muted">{p.label}</span>
                  <span className="font-display text-xl leading-snug font-extrabold">{p.title}</span>
                </span>
              </span>
              <p className="muted">{p.text}</p>
              <ul className="flex flex-1 flex-col gap-2 text-sm">
                {p.points.map((pt) => (
                  <li key={pt} className="flex gap-2">
                    <span className="mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-full tint-accent">
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                    {pt}
                  </li>
                ))}
              </ul>
              <span className={moreLink}>
                {p.cta} <ArrowRight className="size-4 transition group-hover:translate-x-1 motion-reduce:transition-none" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Cách học tiếng Đức */}
      <section className="flex flex-col gap-5" aria-labelledby="cach-hoc">
        <div className="flex flex-col gap-1.5">
          <span className="eyebrow">Phương pháp</span>
          <h2 id="cach-hoc" className="page-title">
            Học tiếng Đức theo cách shadowing
          </h2>
          <p className="muted">Mỗi câu trong video đi qua ba bước — nghe được, nói được rồi mới viết được.</p>
        </div>
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="card relative flex flex-col gap-3 p-5">
              <span className="flex items-center gap-3">
                <span className={`icon-bubble size-11 ${s.tone}`}>
                  <s.icon className="size-5" />
                </span>
                <span className="flex flex-col">
                  <span className="text-xs font-extrabold text-muted">Bước {i + 1}</span>
                  <span className="font-display text-lg leading-tight font-extrabold">{s.title}</span>
                </span>
              </span>
              <p className="text-sm text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* App */}
      <section>
        <Link href="/about" className="group sticker sticker-link flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
          <span className="icon-bubble size-14 tint-link">
            <Smartphone className="size-7" />
          </span>
          <span className="flex flex-1 flex-col gap-1">
            <h2 className="section-title">Có cả app cho điện thoại</h2>
            <span className="muted">Các app học tiếng Đức, lý thuyết lái xe và Leben in Deutschland của HalloVN cho iOS và Android.</span>
          </span>
          <span className={`${moreLink} sm:mt-0 sm:pt-0`}>
            Xem các app của HalloVN <ArrowRight className="size-4 transition group-hover:translate-x-1 motion-reduce:transition-none" />
          </span>
        </Link>
      </section>

      {/* Kêu gọi cuối trang */}
      <section className="sticker hero flex flex-col items-center gap-4 p-6 text-center sm:p-12" style={{ "--hero": "var(--sun)" } as CSSProperties}>
        <h2 className="page-title text-balance">Bắt đầu hôm nay — mười phút mỗi ngày là đủ</h2>
        <p className="lead max-w-xl">Tạo tài khoản để lưu tiến độ, sổ từ và điểm thi thử trên mọi thiết bị. Chưa muốn đăng ký thì cứ học thử trước.</p>
        <div className="mt-2 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-center">
          <LoginLink href="/register" className="btn btn-primary btn-lg">
            Đăng ký miễn phí
          </LoginLink>
          <Link href="/lai-xe/thi-thu" className="btn btn-lg">
            Thi thử lái xe ngay
          </Link>
        </div>
      </section>
    </main>
  );
}
