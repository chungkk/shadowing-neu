import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import {
  ChristmasBookIcon as BookOpen,
  ChristmasCarIcon as Car,
  ChristmasDeutschIcon as Languages,
  ChristmasHeadphonesIcon as Headphones,
  ChristmasLidIcon as Landmark,
  ChristmasMicIcon as Mic,
  ChristmasPencilIcon as PencilLine,
  ChristmasSmartphoneIcon as Smartphone,
  ChristmasSnowflakeIcon,
} from "@/components/FestiveIcons";
import type { ComponentType, CSSProperties } from "react";
import { LoginLink } from "@/components/auth/LoginDialog";
import Mascot from "@/components/Mascot";
import { NoelHeroBeams } from "@/components/NoelAtmosphere";
import { pageMeta } from "@/lib/page-meta";
import { SEASONAL_THEME } from "@/lib/theme";

// Trang chủ TĨNH: không đọc DB / cookie → dựng sẵn lúc build.
// Phong cách Tối giản & Chuyên nghiệp (DESIGN.md): tập trung vào giao diện sản phẩm thật, số liệu thật, phân cấp rõ ràng.

export const metadata: Metadata = pageMeta({
  title: { absolute: "HalloVN – Học tiếng Đức, ôn bằng lái và Leben in Deutschland" },
  description:
    "Học tiếng Đức online cho người Việt: luyện nghe nói qua video YouTube, từ vựng Goethe A1–B1; ôn lý thuyết lái xe, Leben in Deutschland. Miễn phí.",
  path: "/",
});

type Icon = ComponentType<{ className?: string; strokeWidth?: number }>;

const METRICS: { value: string; label: string }[] = [
  { value: "1.700+", label: "Câu lý thuyết lái xe · 13 hạng bằng" },
  { value: "460", label: "Câu Leben in Deutschland (BAMF)" },
  { value: "A1 – C2", label: "Video bản xứ & từ vựng Goethe" },
  { value: "0 €", label: "Miễn phí · một tài khoản" },
];

const GERMAN_STEPS: { icon: Icon; tint: string; title: string; text: string }[] = [
  {
    icon: Headphones,
    tint: "tint-accent",
    title: "Nghe từng câu",
    text: "Phụ đề đồng bộ từng câu trong video bản xứ, điều chỉnh tốc độ 0,5×–1,25× và lặp lại ngay.",
  },
  {
    icon: Mic,
    tint: "tint-coral",
    title: "Nói theo (Shadowing)",
    text: "Nhại lại ngữ điệu người bản xứ, ghi âm trực tiếp và nghe lại để tự sửa phát âm.",
  },
  {
    icon: PencilLine,
    tint: "tint-gold",
    title: "Chép chính tả & Sổ từ",
    text: "Gõ lại câu vừa nghe để nhớ mặt chữ; chạm bất kỳ từ nào để xem IPA, giống danh từ và lưu ôn SRS.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Chọn đúng mục tiêu",
    text: "Bắt đầu ngay với Tiếng Đức (A1–C2), chọn hạng bằng lái xe Đức hoặc chọn bang đang sống cho Leben in Deutschland.",
  },
  {
    step: "02",
    title: "Luyện 10 phút mỗi ngày",
    text: "Giao diện tối ưu cho điện thoại để bạn học trên tàu, giờ nghỉ trưa hay buổi tối mà không bị phân tâm.",
  },
  {
    step: "03",
    title: "Ôn lỗ hổng & thi thử",
    text: "Hệ thống tự gom câu sai, từ đến hạn ôn và đề thi thử đúng cấu trúc thật để bạn biết khi nào đã sẵn sàng.",
  },
];

const HOME_FAQ = [
  {
    q: "HalloVN có miễn phí thật không?",
    a: "Có. Toàn bộ bài học video và chức năng cốt lõi đều mở miễn phí bằng một tài khoản duy nhất. Khi luyện chép chính tả bạn tích thêm kim cương để tính điểm trên bảng xếp hạng học viên.",
  },
  {
    q: "Có cần tạo tài khoản trước khi học thử không?",
    a: "Không cần. Bạn có thể mở ngay bài học tiếng Đức miễn phí, xem kho từ vựng Goethe, làm thử câu hỏi lái xe hoặc Leben in Deutschland. Khi muốn lưu tiến độ, câu sai và sổ từ giữa các thiết bị thì mới cần đăng ký.",
  },
  {
    q: "Bộ câu hỏi Lái xe và Leben in Deutschland có đúng đề chính thức không?",
    a: "Có. Lái xe dùng bộ câu hỏi lý thuyết chính thức của Đức (hơn 1.700 câu cho 13 hạng bằng, riêng hạng B gồm 1.169 câu, chấm điểm lỗi đúng quy định). Leben in Deutschland bám sát danh mục BAMF 2025 gồm 300 câu chung + 10 câu riêng cho từng bang.",
  },
  {
    q: "Mọi câu hỏi đều có bản dịch tiếng Việt chứ?",
    a: "Có. Câu gốc tiếng Đức luôn hiển thị trước; bạn bật hoặc tắt bản dịch tiếng Việt và giải thích bất cứ lúc nào khi luyện tập. Ở chế độ thi thử, bản dịch mặc định ẩn để sát điều kiện thi thật.",
  },
];

const wrap = "mx-auto w-full max-w-6xl px-4 md:px-6";

export default function Home() {
  return (
    <main className="flex flex-col">
      {/* ── Hero: tối giản, rõ ràng, minh họa bằng preview giao diện thật ── */}
      <section className="noel-hero relative overflow-hidden border-b border-line bg-sidebar">
        <NoelHeroBeams />
        <div className={`${wrap} relative z-10 grid items-center gap-10 py-10 sm:py-14 lg:grid-cols-[1.08fr_0.92fr] lg:gap-12 lg:py-16`}>
          <div className="flex flex-col items-start gap-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1 text-xs font-medium text-muted">
              <ChristmasSnowflakeIcon className="size-3.5 text-link" />
              {SEASONAL_THEME === "noel"
                ? "Giáng Sinh an lành · Dành cho người Việt tại Đức · Miễn phí 0 €"
                : "Dành cho người Việt tại Đức · Miễn phí 0 €"}
            </span>

            <h1 className="noel-headline display max-w-[18ch]">
              Học tiếng Đức. Thi bằng lái. Tự tin hòa nhập tại Đức.
            </h1>

            <p className="lead max-w-[48ch]">
              HalloVN đồng hành cùng người Việt tại Đức với video bản xứ, hơn 1.700 câu lý thuyết lái xe cho 13 hạng bằng (1.169 câu hạng B) và 460 câu Leben in Deutschland — tất cả đều có bản dịch tiếng Việt rõ ràng.
            </p>

            <div className="flex w-full flex-col gap-2.5 pt-1 sm:w-auto sm:flex-row">
              <Link href="/tieng-duc" className="btn btn-primary btn-lg">
                Bắt đầu học miễn phí <ArrowRight className="size-4" />
              </Link>
              <a href="#san-pham" className="btn btn-lg">
                Khám phá HalloVN
              </a>
            </div>

            <p className="text-xs text-muted">Học thử ngay không cần tài khoản · Một tài khoản đồng bộ Web & App.</p>
          </div>

          {/* Product UI Preview Composition: mô phỏng 3 màn hình sản phẩm thật */}
          <div className="flex flex-col gap-3" aria-label="Xem trước 3 sản phẩm trên HalloVN">
            {/* Preview 1: Tiếng Đức */}
            <Link href="/tieng-duc" data-sec="de" className="group card card-link flex flex-col gap-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-sec-text">
                  <span className="icon-bubble tint-sec size-6 rounded-md">
                    <Languages className="size-3.5" />
                  </span>
                  Tiếng Đức · Shadowing
                </span>
                <span className="font-mono text-[11px] text-muted tabular-nums">Câu 3 / 24 · 0,75×</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex h-7 shrink-0 items-end gap-[2.5px]" aria-hidden>
                  {[35, 75, 50, 95, 65, 85, 45, 70].map((h, i) => (
                    <i key={i} className="wave-bar w-[3px] rounded-full bg-accent" style={{ height: `${h}%`, "--i": i } as CSSProperties} />
                  ))}
                </span>
                <div className="min-w-0">
                  <p lang="de" className="text-sm font-semibold text-foreground sm:text-[0.9375rem]">
                    Ich hätte gern einen Kaffee, bitte.
                  </p>
                  <p className="text-xs text-muted">Cho tôi một ly cà phê nhé.</p>
                </div>
              </div>
            </Link>

            {/* Preview 2 & 3: Lái xe + LiD */}
            <div className="grid gap-3 sm:grid-cols-2">
              <Link href="/lai-xe" data-sec="laixe" className="group card card-link flex flex-col gap-2.5 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sec-text">
                    <span className="icon-bubble tint-sec size-6 rounded-md">
                      <Car className="size-3.5" />
                    </span>
                    Führerschein
                  </span>
                  <span className="badge badge-gold tabular-nums">Hạng B</span>
                </div>
                <p className="text-sm leading-snug font-semibold text-foreground">Thi thử 30 câu · 45 phút</p>
                <p className="text-xs leading-relaxed text-muted">Chấm điểm lỗi chuẩn đề Đức, ôn theo chương &amp; giải thích tiếng Việt.</p>
                <span className="mt-auto inline-flex items-center gap-1 pt-1 text-xs font-semibold text-sec-text">
                  Luyện ngay <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>

              <Link href="/leben-in-deutschland" data-sec="lid" className="group card card-link flex flex-col gap-2.5 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sec-text">
                    <span className="icon-bubble tint-sec size-6 rounded-md">
                      <Landmark className="size-3.5" />
                    </span>
                    Leben in DE
                  </span>
                  <span className="badge badge-coral tabular-nums">17 / 33 đậu</span>
                </div>
                <p className="text-sm leading-snug font-semibold text-foreground">300 câu chung + 10 câu bang</p>
                <div className="flex flex-col gap-1.5">
                  <div className="progress h-1.5">
                    <div className="progress-bar" style={{ width: "68%" }} />
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-sec-text">
                    Ôn thi LiD <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Dải số liệu thật: phẳng, sắc nét, phân cách bằng hairline ── */}
      <section aria-label="Số liệu nền tảng" className="border-b border-line bg-background">
        <ul className={`${wrap} grid grid-cols-2 gap-y-4 py-4 sm:py-5 lg:grid-cols-4 lg:gap-y-0 lg:divide-x lg:divide-line`}>
          {METRICS.map((m) => (
            <li key={m.label} className="flex flex-col gap-1 pr-3 lg:px-6 first:lg:pl-0 last:lg:pr-0">
              <span className="font-display text-xl font-bold tracking-[-0.02em] text-foreground tabular-nums sm:text-2xl">{m.value}</span>
              <span className="text-xs leading-snug text-muted">{m.label}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Sản phẩm 1: Tiếng Đức ── */}
      <section id="san-pham" aria-labelledby="sec-de" data-sec="de" className={`${wrap} scroll-mt-20 pt-14 pb-8 sm:pt-16`}>
        <div className="card grid gap-8 p-6 sm:p-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-10">
          <div className="flex flex-col items-start gap-4">
            <span className="badge badge-accent">
              <Languages className="size-3.5" /> Tiếng Đức A1 – C2
            </span>
            <h2 id="sec-de" className="font-display text-2xl leading-snug font-bold tracking-[-0.025em] sm:text-3xl">
              Học tiếng Đức tự nhiên qua video của người bản xứ
            </h2>
            <p className="text-sm leading-relaxed text-muted sm:text-[0.9375rem]">
              Không học thuộc lòng khô khan. Chọn bài theo trình độ hoặc dán link YouTube bạn thích để luyện nghe, nói theo (shadowing), chép chính tả và lưu từ mới vào sổ ôn tập.
            </p>
            <ul className="grid w-full gap-2 text-sm text-foreground sm:grid-cols-2">
              {["Video bản xứ có phụ đề từng câu", "Ghi âm & so sánh phát âm", "Chép chính tả kiểm tra từng từ", "Kho từ Goethe A1–B1 & ôn SRS"].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 shrink-0 text-accent-text" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2.5 pt-2">
              <Link href="/tieng-duc" className="btn btn-primary">
                Khám phá Tiếng Đức <ArrowRight className="size-4" />
              </Link>
              <Link href="/vocab" className="btn">
                <BookOpen className="size-4 text-muted" /> Kho từ vựng
              </Link>
            </div>
          </div>

          {/* Minh họa trực quan quy trình 3 bước của 1 câu */}
          <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-line bg-background p-5">
            <div className="flex flex-col gap-2 border-b border-line pb-4">
              <div className="flex items-center justify-between text-xs text-muted">
                <span className="font-semibold text-foreground">Luyện chép chính tả</span>
                <span className="font-mono tabular-nums">A1 · Alltag</span>
              </div>
              <p lang="de" className="text-base font-semibold text-foreground">
                Ich hätte gern einen Kaffee, bitte.
              </p>
              <div lang="de" aria-label="Ví dụ ô chép chính tả" className="flex flex-wrap gap-1.5 pt-1 font-mono text-xs">
                {["Ich", "hätte", "gern", "einen", "K_ff_e", "bitte"].map((w, i) => (
                  <span
                    key={w}
                    className={`rounded-md border px-2 py-1 font-medium ${
                      i === 4 ? "border-dashed border-gold-dark bg-gold-soft text-amber" : "border-ok/30 bg-ok-soft text-ok-text"
                    }`}
                  >
                    {w}
                  </span>
                ))}
              </div>
            </div>

            <ol className="flex flex-col divide-y divide-line">
              {GERMAN_STEPS.map((s, i) => (
                <li key={s.title} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <span className={`icon-bubble size-8 shrink-0 ${s.tint}`}>
                    <s.icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      <span className="mr-1 font-mono text-xs text-muted">{i + 1}.</span>
                      {s.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ── Sản phẩm 2 & 3: Führerschein & Leben in Deutschland (tách biệt rõ ràng) ── */}
      <section aria-label="Luyện thi lý thuyết và quốc tịch" className={`${wrap} grid gap-6 py-4 md:grid-cols-2`}>
        {/* Führerschein */}
        <article data-sec="laixe" className="card flex flex-col gap-5 p-6 sm:p-7">
          <div className="flex items-start justify-between gap-3">
            <span className="badge badge-gold">
              <Car className="size-3.5" /> Führerschein · 13 hạng bằng (Hạng B: 1.169 câu)
            </span>
            <span className="font-mono text-xs text-muted tabular-nums">1.700+ câu</span>
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="font-display text-xl font-bold tracking-[-0.02em] sm:text-2xl">Luyện thi lý thuyết bằng lái xe Đức</h2>
            <p className="text-sm leading-relaxed text-muted">
              Bộ câu hỏi chính thức kèm hình ảnh, video tình huống, bản dịch tiếng Việt và giải thích chi tiết từng đáp án.
            </p>
          </div>
          <ul className="flex flex-col divide-y divide-line text-sm">
            {[
              "Học theo chương Grundstoff & Zusatzstoff, xem rõ tỷ lệ đúng",
              "Đề mẫu chính thức (Musterbögen) & thi thử 30 câu / 45 phút",
              "Chấm điểm lỗi như thi thật (tối đa 10 điểm lỗi, 2 câu 5đ trượt)",
              "Tự động gom câu sai và câu đánh dấu để ôn tập trung",
            ].map((pt) => (
              <li key={pt} className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
                <Check className="mt-0.5 size-4 shrink-0 text-sec-text" aria-hidden />
                <span className="text-foreground/90">{pt}</span>
              </li>
            ))}
          </ul>
          <div className="mt-auto flex flex-wrap gap-2.5 pt-2">
            <Link href="/lai-xe" className="btn btn-primary">
              Luyện thi bằng lái <ArrowRight className="size-4" />
            </Link>
            <Link href="/lai-xe/thi-thu" className="btn">
              Thi thử 30 câu
            </Link>
          </div>
        </article>

        {/* Leben in Deutschland */}
        <article data-sec="lid" className="card flex flex-col gap-5 p-6 sm:p-7">
          <div className="flex items-start justify-between gap-3">
            <span className="badge badge-coral">
              <Landmark className="size-3.5" /> Leben in Deutschland · BAMF 2025
            </span>
            <span className="font-mono text-xs text-muted tabular-nums">300 + 10 câu</span>
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="font-display text-xl font-bold tracking-[-0.02em] sm:text-2xl">Ôn thi nhập tịch &amp; hội nhập</h2>
            <p className="text-sm leading-relaxed text-muted">
              Trọn bộ 300 câu hỏi chung cùng 10 câu riêng của từng bang trong 16 bang của Đức, dịch sát nghĩa và dễ nhớ.
            </p>
          </div>
          <ul className="flex flex-col divide-y divide-line text-sm">
            {[
              "Chọn đúng bang bạn đang sống để học đủ 310 câu cần thiết",
              "Chia nhỏ theo bộ 30 câu và chủ đề chính trị, lịch sử, xã hội",
              "Thi thử 33 câu trong 60 phút — đạt từ 17/33 câu là đậu",
              "Bật/tắt bản dịch tiếng Việt linh hoạt, ôn nhanh câu hay sai",
            ].map((pt) => (
              <li key={pt} className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
                <Check className="mt-0.5 size-4 shrink-0 text-sec-text" aria-hidden />
                <span className="text-foreground/90">{pt}</span>
              </li>
            ))}
          </ul>
          <div className="mt-auto flex flex-wrap gap-2.5 pt-2">
            <Link href="/leben-in-deutschland" className="btn btn-primary">
              Ôn thi LiD <ArrowRight className="size-4" />
            </Link>
            <Link href="/leben-in-deutschland/thi-thu" className="btn">
              Thi thử 33 câu
            </Link>
          </div>
        </article>
      </section>

      {/* ── Cách hoạt động ── */}
      <section aria-labelledby="sec-how" className={`${wrap} py-12 sm:py-14`}>
        <div className="mb-6 flex flex-col gap-1">
          <p className="label">Lộ trình đơn giản</p>
          <h2 id="sec-how" className="font-display text-2xl font-bold tracking-[-0.02em]">
            Tập trung học, không mất thời gian sắp xếp
          </h2>
        </div>
        <ol className="grid gap-4 md:grid-cols-3">
          {HOW_IT_WORKS.map((item) => (
            <li key={item.step} className="card flex flex-col gap-2 p-5">
              <span className="font-mono text-xs font-semibold text-accent-text">{item.step}</span>
              <h3 className="text-base font-bold text-foreground">{item.title}</h3>
              <p className="text-sm leading-relaxed text-muted">{item.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Câu hỏi thường gặp ── */}
      <section aria-labelledby="sec-faq" className={`${wrap} py-4`}>
        <div className="card p-6 sm:p-7">
          <div className="mb-4 flex flex-col gap-1">
            <p className="label">Giải đáp nhanh</p>
            <h2 id="sec-faq" className="section-title">
              Câu hỏi thường gặp
            </h2>
          </div>
          <div className="flex flex-col divide-y divide-line">
            {HOME_FAQ.map((f) => (
              <details key={f.q} className="faq-item group py-1">
                <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-4 py-2 text-sm font-semibold text-foreground sm:text-[0.9375rem]">
                  <span>{f.q}</span>
                  <ChevronDown className="size-4 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180" aria-hidden />
                </summary>
                <p className="max-w-[70ch] pb-3 text-sm leading-relaxed text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── App di động + CTA cuối trang ── */}
      <section className={`${wrap} grid gap-5 pt-10 pb-2 md:grid-cols-[0.85fr_1.15fr]`}>
        <Link href="/about?lang=vi" className="group card card-link flex flex-col justify-between gap-5 p-6">
          <span className="icon-bubble tint-accent size-10">
            <Smartphone className="size-5" />
          </span>
          <div className="flex flex-col gap-1.5">
            <h2 className="section-title">App điện thoại (sắp ra mắt)</h2>
            <p className="text-sm leading-relaxed text-muted">
              Ứng dụng HalloVN cho iOS &amp; Android dùng chung tài khoản đang được hoàn thiện. Hiện bạn có thể học mượt ngay trên trình duyệt điện thoại.
            </p>
            <span className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-link">
              Tìm hiểu thêm <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </Link>

        <div className="noel-cta card relative flex flex-col items-start justify-between gap-5 overflow-hidden p-6 sm:p-8">
          <div className="flex max-w-[44ch] flex-col gap-2">
            <h2 className="font-display text-2xl leading-snug font-bold tracking-[-0.02em]">
              Bắt đầu hôm nay — 10 phút mỗi ngày là đủ.
            </h2>
            <p className="text-sm leading-relaxed text-muted">
              Tạo tài khoản miễn phí để lưu tiến độ, sổ từ và lịch sử thi thử trên mọi thiết bị. Bạn cũng có thể vào học thử ngay lập tức.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
            <LoginLink href="/register" className="btn btn-primary btn-lg">
              Đăng ký miễn phí
            </LoginLink>
            <Link href="/lai-xe/thi-thu" className="btn btn-lg">
              Thi thử lái xe ngay
            </Link>
          </div>
          <Mascot className="pointer-events-none absolute right-5 bottom-4 hidden size-20 opacity-90 sm:block" />
        </div>
      </section>
    </main>
  );
}
