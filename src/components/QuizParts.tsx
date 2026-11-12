import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { ArrowRight } from "lucide-react";

/** Thanh tiến độ nhỏ: phần xanh = đang đúng, đỏ = đang sai */
export function ProgressBar({ total, ok, wrong }: { total: number; ok: number; wrong: number }) {
  const pct = (n: number) => `${total ? (n / total) * 100 : 0}%`;
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-foreground/10" aria-hidden>
      <span className="bg-accent" style={{ width: pct(ok) }} />
      <span className="bg-red" style={{ width: pct(wrong) }} />
    </div>
  );
}

/** Thẻ hành động lớn (Thi thử, Ôn câu sai…) */
export function ActionCard({ href, icon: Icon, title, text, tone = "", disabled }: { href: string; icon: ComponentType<{ className?: string }>; title: string; text: ReactNode; tone?: string; disabled?: boolean }) {
  const body = (
    <>
      <span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl border-2 border-ink ${tone || "bg-card-2"}`}>
        <Icon className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-extrabold">{title}</span>
        <span className="text-sm text-muted">{text}</span>
      </span>
      {!disabled && <ArrowRight className="size-4 shrink-0 text-amber transition group-hover:translate-x-1" />}
    </>
  );
  if (disabled) return <div className="sticker flex items-center gap-3 p-3 opacity-60">{body}</div>;
  return (
    <Link href={href} className="group sticker sticker-link flex items-center gap-3 p-3">
      {body}
    </Link>
  );
}

/** Đầu trang của tab Lái xe / LiD */
export function SectionHero({ emoji, title, subtitle, children }: { emoji: string; title: string; subtitle: string; children?: ReactNode }) {
  return (
    <section className="sticker flex flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-center gap-3 sm:gap-5">
        <span className="flex size-16 shrink-0 items-center justify-center rounded-3xl border-2 border-ink bg-gold text-4xl sm:size-20 sm:text-5xl" aria-hidden>
          {emoji}
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl leading-tight font-extrabold sm:text-3xl">{title}</h1>
          <p className="text-sm text-muted sm:text-base">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
