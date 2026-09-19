import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface DashboardPageHeaderProps {
  actions?: ReactNode;
  badge?: ReactNode;
  className?: string;
  description: ReactNode;
  eyebrow?: string;
  supporting?: ReactNode;
  title: ReactNode;
}

export function DashboardPageHeader({
  actions,
  badge,
  className,
  description,
  eyebrow,
  supporting,
  title,
}: DashboardPageHeaderProps) {
  return (
    <section className={cn("dashboard-page-header", className)}>
      <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 max-w-3xl space-y-2">
          {eyebrow ? <p className="section-kicker">{eyebrow}</p> : null}
          <div className="space-y-1.5">
            <h1 className="page-title">{title}</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-500">
              {description}
            </p>
          </div>
          {supporting ? (
            <div className="page-supporting">{supporting}</div>
          ) : null}
        </div>

        {badge || actions ? (
          <div className="page-actions flex flex-wrap items-center gap-2 xl:justify-end">
            {badge ? <div className="page-status">{badge}</div> : null}
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
}
