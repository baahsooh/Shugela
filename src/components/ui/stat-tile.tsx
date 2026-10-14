import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  unit,
  hint,
  tone = "neutral",
  icon,
  className,
}: {
  label: string;
  value: string | null;
  unit?: string;
  hint?: ReactNode;
  tone?: "neutral" | "ok" | "warn" | "danger" | "brand";
  icon?: ReactNode;
  className?: string;
}) {
  const valueTone =
    tone === "ok"
      ? "text-ok"
      : tone === "warn"
        ? "text-warn"
        : tone === "danger"
          ? "text-danger"
          : tone === "brand"
            ? "text-brand"
            : "text-ink";

  return (
    <div className={cn("rounded-3xl border border-line bg-surface p-3.5 shadow-card", className)}>
      <div className="flex items-center gap-1.5 text-ink-faint">
        {icon}
        <p className="text-[0.7rem] font-semibold uppercase tracking-wider">{label}</p>
      </div>
      <p className={cn("mt-2 text-2xl font-semibold leading-none tracking-tight tabular", valueTone)}>
        {value ?? "—"}
        {value !== null && unit ? (
          <span className="ml-1 text-xs font-medium text-ink-faint">{unit}</span>
        ) : null}
      </p>
      {hint ? <p className="mt-1.5 text-xs text-ink-faint">{hint}</p> : null}
    </div>
  );
}