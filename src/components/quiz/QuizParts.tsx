import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { ArrowLeft, ArrowRight, Lock } from "lucide-react";
import PageHeader, { type Sec } from "@/components/PageHeader";

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

const fmt = (n: number) => n.toLocaleString("de-DE");

/** Tiến trình cả khu: thanh đúng/sai + chú thích gọn */
export function QuizProgress({ total, ok, wrong, done }: { total: number; ok: number; wrong: number; done: number }) {
  const pct = total ? Math.round((ok / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-2">
      <ProgressBar total={total} ok={ok} wrong={wrong} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-muted sm:text-sm">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-ok" aria-hidden /> Đúng <b className="font-semibold text-foreground tabular-nums">{fmt(ok)}</b>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-red" aria-hidden /> Sai <b className="font-semibold text-foreground tabular-nums">{fmt(wrong)}</b>
        </span>
        <span className="ml-auto tabular-nums">
          <b className="font-semibold text-foreground">{fmt(done)}</b> / {fmt(total)} câu ({pct}% đúng)
        </span>
      </div>
    </div>
  );
}

/**
 * Thẻ hành động dạng dòng (Ôn câu sai, Đánh dấu, Thống kê…)
 */
export function ActionCard({
  href,
  icon: Icon,
  title,
  text,
  tone = "",
  disabled,
  locked,
}: {
  href: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  text: ReactNode;
  tone?: string;
  disabled?: boolean;
  locked?: boolean;
}) {
  const body = (
    <>
      <span className={`icon-bubble size-10 ${tone || (disabled ? "tint-muted" : "tint-sec")}`}>
        <Icon className="size-[18px]" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <span className="text-xs text-muted sm:text-[13px]">{text}</span>
      </span>
      {locked ? (
        <span className="badge badge-muted shrink-0 gap-1" aria-label="Cần đăng nhập">
          <Lock className="size-3" aria-hidden />
        </span>
      ) : (
        !disabled && (
          <ArrowRight
            className="size-4 shrink-0 text-muted transition-transform duration-200 ease-[var(--ease-out)] group-hover:translate-x-0.5 group-hover:text-foreground motion-reduce:transition-none"
            aria-hidden
          />
        )
      )}
    </>
  );
  const cls = "group tile card-link flex min-h-16 items-center gap-3 p-3.5";
  if (locked) {
    return (
      <Link href={`/login?next=${encodeURIComponent(href)}`} className={cls}>
        {body}
      </Link>
    );
  }
  if (disabled) return <div className="flex min-h-16 items-center gap-3 rounded-ui border border-dashed border-border p-3.5 opacity-75">{body}</div>;
  return (
    <Link href={href} className={cls}>
      {body}
    </Link>
  );
}

/**
 * Thẻ hành động chính (Học theo chủ đề / Thi thử): tối giản, viền sạch, phân biệt rõ thẻ chính & thẻ phụ
 */
export function BigCard({
  href,
  icon: Icon,
  title,
  text,
  primary,
  cta,
  badge,
}: {
  href: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  text: string;
  primary?: boolean;
  cta?: string;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className={`group card card-link flex flex-col gap-4 p-5 sm:p-6 ${
        primary ? "border-sec/35 bg-sec-soft/35 dark:bg-sec-soft/45" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`icon-bubble size-10 ${primary ? "bg-sec text-on-sec" : "tint-sec"}`}>
          <Icon className="size-5" strokeWidth={2} />
        </span>
        {badge && <span className="badge badge-muted font-mono tabular-nums">{badge}</span>}
      </div>
      <div className="flex flex-col gap-1">
        <span className="font-display text-lg leading-snug font-bold tracking-[-0.015em] text-foreground sm:text-xl">{title}</span>
        <span className="text-sm leading-relaxed text-muted">{text}</span>
      </div>
      <span className="mt-auto inline-flex items-center gap-1.5 pt-1 text-sm font-semibold text-sec-text">
        {cta ?? (primary ? "Bắt đầu" : "Mở")}
        <ArrowRight className="size-4 transition-transform duration-200 ease-[var(--ease-out)] group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
      </span>
    </Link>
  );
}

/** Đầu trang con của Lái xe / LiD */
export function SubHeader({
  sec,
  back,
  backLabel,
  icon,
  title,
  sub,
  meta,
  actions,
  children,
}: {
  sec: Sec;
  back: string;
  backLabel: string;
  icon?: ComponentType<{ className?: string; strokeWidth?: number }>;
  title: ReactNode;
  sub?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Link href={back} className="btn btn-ghost btn-sm hit-44 -ml-2 self-start text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> {backLabel}
      </Link>
      <PageHeader sec={sec} compact icon={icon} title={title} sub={sub} meta={meta} actions={actions}>
        {children}
      </PageHeader>
    </div>
  );
}
