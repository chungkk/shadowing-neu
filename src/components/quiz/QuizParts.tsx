import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { ArrowRight, Lock } from "lucide-react";

/** Thanh tiến độ nhỏ: phần xanh = đang đúng, đỏ = đang sai */
export function ProgressBar({ total, ok, wrong }: { total: number; ok: number; wrong: number }) {
  const pct = (n: number) => `${total ? (n / total) * 100 : 0}%`;
  return (
    <div className="progress flex" aria-hidden>
      <span className="quiz-bar-ok h-full" style={{ width: pct(ok) }} />
      <span className="quiz-bar-bad h-full" style={{ width: pct(wrong) }} />
    </div>
  );
}

/**
 * Thẻ hành động dạng dòng (Thống kê, Ôn câu sai, chủ đề…).
 * locked: cần đăng nhập → vẫn bấm được, dẫn tới trang đăng nhập rồi quay lại; chữ giữ rõ, ổ khoá thay mũi tên.
 * disabled: chưa có gì để mở (vd. chưa có câu sai) → không bấm được; khung viền đứt nét, chữ không bị làm mờ.
 */
export function ActionCard({ href, icon: Icon, title, text, tone = "", disabled, locked }: { href: string; icon: ComponentType<{ className?: string }>; title: string; text: ReactNode; tone?: string; disabled?: boolean; locked?: boolean }) {
  const body = (
    <>
      <span className={`icon-bubble size-11 ${tone || (disabled ? "tint-muted" : locked ? "tint-gold" : "tint-accent")}`}>
        <Icon className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-extrabold">{title}</span>
        <span className="text-sm text-muted">{text}</span>
      </span>
      {locked ? (
        <span className="badge badge-gold shrink-0" aria-label="Cần đăng nhập">
          <Lock className="size-3.5" />
        </span>
      ) : (
        !disabled && (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full text-accent-text transition group-hover:translate-x-1 group-hover:bg-accent-soft motion-reduce:transition-none motion-reduce:group-hover:translate-x-0">
            <ArrowRight className="size-4" />
          </span>
        )
      )}
    </>
  );
  if (locked) {
    return (
      <Link href={`/login?next=${encodeURIComponent(href)}`} className="group tile card-link flex items-center gap-3">
        {body}
      </Link>
    );
  }
  if (disabled) return <div className="flex items-center gap-3 rounded-ui border-2 border-dashed border-line bg-card/60 p-3">{body}</div>;
  return (
    <Link href={href} className="group tile card-link flex items-center gap-3">
      {body}
    </Link>
  );
}

/** Đầu trang của tab Lái xe / LiD */
export function SectionHero({ emoji, title, subtitle, children }: { emoji: string; title: string; subtitle: string; children?: ReactNode }) {
  return (
    <section className="sticker hero flex flex-col gap-4 p-4 sm:p-6" style={{ ["--hero" as string]: "var(--gold)" }}>
      <div className="flex items-center gap-3 sm:gap-5">
        <span className="icon-bubble tint-gold size-16 rounded-3xl text-4xl sm:size-20 sm:text-5xl" aria-hidden>
          {emoji}
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="page-title">{title}</h1>
          <p className="text-sm text-muted sm:text-base">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

/**
 * Thẻ lớn ở màn chính các tab luyện thi (Lái xe, LiD): Học / Thi thử.
 * Theo luật màu (globals.css): học = xanh lá. primary: thẻ nền xanh đặc — mỗi màn chỉ một thẻ primary;
 * thẻ còn lại chỉ có biểu tượng xanh. Không dùng đỏ (= sai/huỷ) hay vàng (= chơi/thưởng).
 */
export function BigCard({ href, icon: Icon, title, text, primary }: { href: string; icon: ComponentType<{ className?: string }>; title: string; text: string; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={`sticker sticker-link group relative flex min-h-40 flex-col items-center justify-center gap-1 overflow-hidden p-4 text-center sm:min-h-52 ${primary ? "quiz-big-primary text-white" : "hero"}`}
    >
      <span
        className={`mb-2 flex size-14 items-center justify-center rounded-3xl transition-transform duration-200 group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:scale-100 sm:size-20 ${primary ? "bg-white/20 ring-2 ring-white/40" : "tint-accent"}`}
      >
        <Icon className="size-7 sm:size-9" />
      </span>
      <span className="font-display text-lg leading-tight font-extrabold sm:text-2xl">{title}</span>
      <span className={`text-sm ${primary ? "font-bold text-white/90" : "text-muted"}`}>{text}</span>
    </Link>
  );
}
