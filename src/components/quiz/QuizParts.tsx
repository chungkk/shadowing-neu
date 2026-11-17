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

/** Tiến trình cả khu: thanh đúng/sai + chú thích (đặt trong nhãn của PageHeader) */
export function QuizProgress({ total, ok, wrong, done }: { total: number; ok: number; wrong: number; done: number }) {
  return (
    <div className="flex flex-col gap-2 pt-1">
      <ProgressBar total={total} ok={ok} wrong={wrong} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium text-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-ok" aria-hidden /> Đúng <b className="font-bold text-foreground tabular-nums">{ok}</b>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-red" aria-hidden /> Sai <b className="font-bold text-foreground tabular-nums">{wrong}</b>
        </span>
        <span className="ml-auto tabular-nums">
          <b className="font-bold text-foreground">{done}</b> / {total} câu
        </span>
      </div>
    </div>
  );
}

/**
 * Thẻ hành động dạng dòng (Thống kê, Ôn câu sai, chủ đề…) — màu biểu tượng theo khu vực (data-sec của trang).
 * locked: cần đăng nhập → vẫn bấm được, dẫn tới trang đăng nhập rồi quay lại; chữ giữ rõ, ổ khoá thay mũi tên.
 * disabled: chưa có gì để mở (vd. chưa có câu sai) → không bấm được; khung viền đứt nét, chữ không bị làm mờ.
 */
export function ActionCard({ href, icon: Icon, title, text, tone = "", disabled, locked }: { href: string; icon: ComponentType<{ className?: string }>; title: string; text: ReactNode; tone?: string; disabled?: boolean; locked?: boolean }) {
  const body = (
    <>
      <span className={`icon-bubble size-11 ${tone || (disabled ? "tint-muted" : "tint-sec")}`}>
        <Icon className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-bold">{title}</span>
        <span className="text-sm text-muted">{text}</span>
      </span>
      {locked ? (
        <span className="badge badge-muted shrink-0 gap-1" aria-label="Cần đăng nhập">
          <Lock className="size-3.5" aria-hidden />
        </span>
      ) : (
        !disabled && <ArrowRight className="size-4 shrink-0 text-muted transition-transform duration-300 ease-[var(--ease-out)] group-hover:translate-x-1 group-hover:text-foreground motion-reduce:transition-none" aria-hidden />
      )}
    </>
  );
  const cls = "group tile card-link flex min-h-[4.5rem] items-center gap-3";
  if (locked) {
    return (
      <Link href={`/login?next=${encodeURIComponent(href)}`} className={cls}>
        {body}
      </Link>
    );
  }
  if (disabled) return <div className="flex min-h-[4.5rem] items-center gap-3 rounded-ui border border-dashed border-line-strong/50 p-3">{body}</div>;
  return (
    <Link href={href} className={cls}>
      {body}
    </Link>
  );
}

/**
 * Thẻ lớn ở màn chính các tab luyện thi (Lái xe, LiD): Học / Thi thử — hai cuốn vở của khu vực (DESIGN.md: bìa + nhãn).
 * primary: cuốn chính, bìa màu đặc của khu vực (mỗi màn chỉ một); cuốn còn lại bìa màu nhạt.
 */
export function BigCard({ href, icon: Icon, title, text, primary, cta }: { href: string; icon: ComponentType<{ className?: string; strokeWidth?: number }>; title: string; text: string; primary?: boolean; cta?: string }) {
  return (
    <Link href={href} className={`exam-heft quiz-heft group flex flex-col ${primary ? "" : "quiz-heft-soft"}`}>
      <div className="cover flex min-h-24 items-start justify-between pt-4 pr-4 pb-12 pl-7 sm:min-h-32 sm:pt-5 sm:pr-6 sm:pb-14 sm:pl-10">
        <Icon className="size-8 sm:size-10" strokeWidth={2.25} />
      </div>
      <div className="relative z-10 mx-2 -mt-10 flex flex-1 flex-col sm:mx-5 sm:-mt-11">
        <div className="nhan flex flex-1 flex-col gap-1 px-3 pt-2.5 pb-3 sm:gap-1.5 sm:px-5 sm:pt-3.5 sm:pb-4">
          <span className="font-display text-lg leading-tight font-extrabold tracking-[-0.02em] sm:text-2xl">{title}</span>
          <span className="nhan-line pb-1 text-sm text-muted">{text}</span>
          <span className="mt-auto inline-flex items-center gap-1.5 pt-1 text-sm font-semibold text-sec-text sm:text-base">
            {cta ?? (primary ? "Bắt đầu" : "Mở")}
            <ArrowRight className="size-4 transition-transform duration-300 ease-[var(--ease-out)] group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}

/**
 * Đầu trang con của Lái xe / LiD (học theo chủ đề, thi thử, đề mẫu, thống kê, cài đặt…):
 * nút quay lại nhỏ + bìa vở thấp (PageHeader compact) theo màu khu vực.
 */
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
