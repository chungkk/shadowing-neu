import type { ReactNode } from "react";

export default function SectionCard({
  title,
  description,
  aside,
  children,
  flush = false,
  className = "",
}: {
  title: string;
  description?: string;
  aside?: ReactNode;
  children: ReactNode;
  flush?: boolean;
  className?: string;
}) {
  return (
    <section className={`card flex flex-col overflow-hidden p-0 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-foreground sm:text-[0.95rem]">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
        </div>
        {aside && <div className="flex shrink-0 items-center gap-2">{aside}</div>}
      </div>
      <div className={flush ? "" : "p-4"}>{children}</div>
    </section>
  );
}
