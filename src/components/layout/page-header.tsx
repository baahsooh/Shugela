import Link from "next/link";
import type { ReactNode } from "react";

import { ChevronLeftIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  backHref,
  action,
  className,
}: {
  title: string;
  subtitle?: ReactNode;
  backHref?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b border-line bg-bg/85 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        {backHref ? (
          <Link
            href={backHref}
            aria-label="Go back"
            className="-ml-2 flex size-10 shrink-0 items-center justify-center rounded-full text-ink-soft active:bg-surface-muted"
          >
            <ChevronLeftIcon className="size-6" />
          </Link>
        ) : null}

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold tracking-tight text-ink">{title}</h1>
          {subtitle ? (
            <div className="truncate text-xs text-ink-faint">{subtitle}</div>
          ) : null}
        </div>

        {action ? <div className="flex shrink-0 items-center gap-1">{action}</div> : null}
      </div>
    </header>
  );
}