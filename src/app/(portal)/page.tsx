import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Car, Check, Gamepad2, Headphones, Landmark, Languages, Mic, Newspaper, PencilLine, Smartphone } from "lucide-react";
import type { ComponentType } from "react";
import { LoginLink } from "@/components/LoginDialog";
import Mascot from "@/components/Mascot";

// Trang chủ = trang giới thiệu TĨNH: không đọc DB / cookie → được dựng sẵn lúc build.
// Tin tự động ở /tin-tuc; việc học hằng ngày (học tiếp, ôn từ…) ở trang của từng phần.

export const metadata: Metadata = {
  title: { absolute: "CKK – Học tiếng Đức, ôn thi bằng lái và quốc tịch bằng tiếng Việt" },
  description:
    "Học tiếng Đức với video thật, ôn lý thuyết lái xe hạng B và Leben in Deutschland có bản dịch tiếng Việt, chơi game luyện từ và đọc tin nước Đức mỗi ngày. Miễn phí.",
  alternates: { canonical: "/" },
};

type Icon = ComponentType<{ className?: string }>;

const FACTS = [
  { value: "1.100+", label: "câu lý thuyết lái xe hạng B" },
  { value: "460", label: "câu Leben in Deutschland" },
  { value: "6", label: "game luyện từ vựng" },
  { value: "0 €", label: "miễn phí, một tài khoản" },
];

const PRODUCTS: { href: string; icon: Icon; tone: string; label: string; title: string; text: string; points: string[]; cta: string }[] = [
  {
    href: "/tieng-duc",
    icon: Languages,
    tone: "bg-accent text-white",
    label: "Tiếng Đức",
    title: "Học với video của người bản xứ",
    text: "Chọn một video theo trình độ rồi luyện từng câu theo phương pháp shadowing.",
    points: ["Nghe từng câu, có phụ đề và bản dịch tiếng Việt", "Nói theo, ghi âm để so với người bản xứ", "Chép chính tả, lưu từ mới vào sổ để ôn"],
    cta: "Xem bài học",
  },
  {
    href: "/lai-xe",
    icon: Car,
    tone: "bg-gold text-black",
    label: "Lái xe hạng B",
    title: "Ôn lý thuyết thi bằng lái",
    text: "Bộ câu hỏi thi lý thuyết ở Đức, kèm bản dịch tiếng Việt cho từng câu.",
    points: ["Ôn theo chương, xem lại câu đang sai", "Thi thử 30 câu, chấm điểm lỗi như thi thật", "Tiến độ được lưu theo tài khoản"],
    cta: "Ôn lý thuyết lái xe",
  },
  {
    href: "/leben-in-deutschland",
    icon: Landmark,
    tone: "bg-candy text-black",
    label: "Leben in Deutschland",
    title: "Ôn thi nhập quốc tịch",
    text: "300 câu chung và 10 câu riêng của từng bang, có tiếng Việt.",
    points: ["Chọn bang của bạn để ôn đúng bộ câu hỏi", "Thi thử 33 câu, đúng 17 câu là đậu", "Ôn lại riêng những câu hay sai"],
    cta: "Ôn Leben in Deutschland",
  },
  {
    href: "/games",
    icon: Gamepad2,
    tone: "bg-amber text-black",
    label: "Game",
    title: "Chơi mà nhớ từ",
    text: "Vài phút mỗi ngày với các trò chơi luyện từ vựng và giống của danh từ.",
    points: ["Mưa từ vựng, nối từ, ong đánh vần", "Der Die Das — luyện giống danh từ", "Caro và Sudoku chơi cùng bạn bè"],
    cta: "Vào chơi",
  },
];

const STEPS: { icon: Icon; title: string; text: string }[] = [
  { icon: Headphones, title: "Nghe", text: "Nghe từng câu trong video thật, tua lại và nghe chậm bao nhiêu lần tuỳ ý." },
  { icon: Mic, title: "Nói theo", text: "Nhại lại ngay sau người nói, ghi âm và nghe lại để sửa phát âm, ngữ điệu." },
  { icon: PencilLine, title: "Chép chính tả", text: "Gõ lại câu vừa nghe để chắc từ vựng và chính tả, từ mới lưu vào sổ ôn." },
];

const moreLink = "inline-flex items-center gap-1 text-sm font-extrabold text-link hover:underline";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 p-4 md:gap-14 md:p-6">
      {/* Mở đầu */}
      <section className="sticker flex flex-col items-center gap-5 p-6 text-center sm:p-10 md:flex-row md:gap-10 md:text-left">
        <Mascot animated className="bob size-32 md:order-last md:size-56" />
        <div className="flex flex-col items-center gap-4 md:items-start">
          <span className="pill bg-accent/15 text-accent-text">Dành cho người Việt ở Đức</span>
          <h1 className="text-3xl leading-tight font-extrabold text-balance sm:text-4xl md:text-5xl">Học tiếng Đức, ôn thi bằng lái và quốc tịch — bằng tiếng Việt</h1>
          <p className="max-w-xl text-lg text-muted">
            Video bài học với người bản xứ, hơn 1.100 câu lý thuyết lái xe và 460 câu Leben in Deutschland có bản dịch. Một tài khoản cho tất cả, miễn phí.
          </p>
          <div className="flex flex-wrap justify-center gap-3 md:justify-start">
            <Link href="/tieng-duc" className="btn btn-primary px-5 py-3 text-base">
              Bắt đầu học <ArrowRight className="size-5" />
            </Link>
            <LoginLink href="/register" className="btn px-5 py-3 text-base">
              Đăng ký miễn phí
            </LoginLink>
          </div>
        </div>
      </section>

      {/* Vài con số */}
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {FACTS.map((f) => (
          <li key={f.label} className="sticker flex flex-col gap-1 p-4 text-center">
            <span className="font-display text-3xl leading-none font-extrabold text-accent-text">{f.value}</span>
            <span className="text-sm text-muted">{f.label}</span>
          </li>
        ))}
      </ul>

      {/* 4 phần chính */}
      <section className="flex flex-col gap-4" aria-labelledby="co-gi">
        <div className="flex flex-col gap-1">
          <h2 id="co-gi" className="text-2xl font-extrabold sm:text-3xl">
            CKK có gì?
          </h2>
          <p className="text-muted">Bốn phần, dùng thử được ngay không cần tài khoản.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {PRODUCTS.map((p) => (
            <Link key={p.href} href={p.href} className="group sticker sticker-link flex flex-col gap-3 p-5 motion-reduce:hover:translate-y-0">
              <span className="flex items-center gap-3">
                <span className={`flex size-12 shrink-0 items-center justify-center rounded-2xl border-2 border-ink ${p.tone}`}>
                  <p.icon className="size-6" />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-xs font-extrabold tracking-wider text-muted uppercase">{p.label}</span>
                  <span className="text-xl leading-snug font-extrabold">{p.title}</span>
                </span>
              </span>
              <p className="text-muted">{p.text}</p>
              <ul className="flex flex-1 flex-col gap-1.5 text-sm">
                {p.points.map((pt) => (
                  <li key={pt} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-accent-text" /> {pt}
                  </li>
                ))}
              </ul>
              <span className={moreLink}>
                {p.cta} <ArrowRight className="size-4 transition group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Cách học tiếng Đức */}
      <section className="flex flex-col gap-4" aria-labelledby="cach-hoc">
        <div className="flex flex-col gap-1">
          <h2 id="cach-hoc" className="text-2xl font-extrabold sm:text-3xl">
            Học tiếng Đức theo cách shadowing
          </h2>
          <p className="text-muted">Mỗi câu trong video đi qua ba bước — nghe được, nói được rồi mới viết được.</p>
        </div>
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="sticker flex flex-col gap-2 p-5">
              <span className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-card-2 font-display text-lg font-extrabold">{i + 1}</span>
                <s.icon className="size-6 text-accent-text" />
                <span className="text-lg font-extrabold">{s.title}</span>
              </span>
              <p className="text-sm text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Tin tức + app */}
      <section className="grid gap-4 md:grid-cols-2">
        <Link href="/tin-tuc" className="group sticker sticker-link flex flex-col gap-2 p-5">
          <Newspaper className="size-7 text-accent-text" />
          <h2 className="text-xl font-extrabold">Tin tức nước Đức bằng tiếng Việt</h2>
          <p className="flex-1 text-muted">Tin mới mỗi ngày từ báo Đức, tiêu đề và tóm tắt được dịch sang tiếng Việt, kèm link bài gốc.</p>
          <span className={moreLink}>
            Đọc tin hôm nay <ArrowRight className="size-4 transition group-hover:translate-x-1" />
          </span>
        </Link>
        <Link href="/about" className="group sticker sticker-link flex flex-col gap-2 p-5">
          <Smartphone className="size-7 text-accent-text" />
          <h2 className="text-xl font-extrabold">Có cả app cho điện thoại</h2>
          <p className="flex-1 text-muted">Các app học tiếng Đức, lý thuyết lái xe và Leben in Deutschland của CKK cho iOS và Android.</p>
          <span className={moreLink}>
            Xem các app của CKK <ArrowRight className="size-4 transition group-hover:translate-x-1" />
          </span>
        </Link>
      </section>

      {/* Kêu gọi cuối trang */}
      <section className="sticker flex flex-col items-center gap-4 bg-accent/10 p-6 text-center sm:p-10">
        <h2 className="text-2xl font-extrabold text-balance sm:text-3xl">Bắt đầu hôm nay — mười phút mỗi ngày là đủ</h2>
        <p className="max-w-xl text-muted">Tạo tài khoản để lưu tiến độ, sổ từ và điểm thi thử trên mọi thiết bị. Chưa muốn đăng ký thì cứ học thử trước.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <LoginLink href="/register" className="btn btn-primary px-5 py-3 text-base">
            Đăng ký miễn phí
          </LoginLink>
          <Link href="/lai-xe/thi-thu" className="btn px-5 py-3 text-base">
            Thi thử lái xe ngay
          </Link>
        </div>
      </section>
    </main>
  );
}
