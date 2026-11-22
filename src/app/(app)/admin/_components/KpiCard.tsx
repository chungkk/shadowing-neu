import Link from "next/link";
import type { ReactNode } from "react";

export type KpiTone = "ink" | "de" | "laixe" | "lid" | "ok" | "red" | "gem" | "muted";

const TONE_DOT: Record<KpiTone, string> = {
  ink: "bg-link",
  de: "bg-accent",
  laixe: "bg-gold",
  lid: "bg-coral",
  ok: "bg-ok",
  red: "bg-red",
  gem: "bg-gem",
  muted: "bg-muted",
};

const TONE_ICON: Record<KpiTone, string> = {
  ink: "bg-link-soft text-link",
  de: "bg-accent-soft text-accent-text",
  laixe: "bg-gold-soft text-amber",
  lid: "bg-coral-soft text-coral-text",
  ok: "bg-ok-soft text-ok-text",
  red: "bg-red-soft text-red-400",
  gem: "bg-gem-soft text-gem",
  muted: "bg-card-2 text-muted",
};

export default function KpiCard({
  label,
  value,
  sub,
  icon,
  tone = "ink",
  href,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  tone?: KpiTone;
  href?: string;
}) {
  const inner = (
    <div className="flex h-full flex-col justify-between gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-xs font-semibold text-muted">
          <span aria-hidden className={`size-2 rounded-full ${TONE_DOT[tone]}`} />
          {label}
        </span>
        {icon && <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${TONE_ICON[tone]}`}>{icon}</span>}
      </div>
      <div className="flex flex-col gap-0.5">
        <div className="font-mono text-2xl leading-tight font-bold tracking-tight text-foreground tabular-nums">
          {typeof value === "number" ? value.toLocaleString("vi-VN") : value}
        </div>
        {sub && <p className="text-xs leading-snug text-muted">{sub}</p>}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="card card-link block p-4">
        {inner}
      </Link>
    );
  }
  return <div className="card p-4">{inner}</div>;
}
