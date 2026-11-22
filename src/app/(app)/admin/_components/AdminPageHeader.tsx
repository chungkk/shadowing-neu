import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export type Crumb = { label: string; href?: string };

export default function AdminPageHeader({
  crumbs,
  title,
  count,
  description,
  actions,
}: {
  crumbs: Crumb[];
  title: string;
  count?: number | string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-2 border-b border-line pb-4">
      <nav aria-label="Đường dẫn" className="flex flex-wrap items-center gap-1 text-xs text-muted">
        <Link href="/admin" className="transition-colors hover:text-foreground">
          Quản trị
        </Link>
        {crumbs.map((c, i) => (
          <span key={`${c.label}-${i}`} className="inline-flex items-center gap-1">
            <ChevronRight className="size-3.5 opacity-60" aria-hidden />
            {c.href ? (
              <Link href={c.href} className="transition-colors hover:text-foreground">
                {c.label}
              </Link>
            ) : (
              <span className="font-medium text-foreground">{c.label}</span>
            )}
          </span>
        ))}
      </nav>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="page-title flex flex-wrap items-center gap-2.5">
            <span>{title}</span>
            {count !== undefined && (
              <span className="rounded-md border border-line bg-card-2 px-2 py-0.5 font-mono text-sm font-semibold text-muted tabular-nums">
                {typeof count === "number" ? count.toLocaleString("vi-VN") : count}
              </span>
            )}
          </h1>
          {description && <p className="max-w-[70ch] text-sm leading-relaxed text-muted">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2 max-sm:w-full">{actions}</div>}
      </div>
    </header>
  );
}
