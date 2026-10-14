"use client";

import { cn } from "@/lib/utils";

export interface ChipOption<T extends string | number> {
  value: T;
  label: string;
}

/**
 * Horizontally scrollable filter row.
 *
 * Seven measurement types plus "All" no longer fit a segmented control on a
 * 360px screen, and a squashed one is worse than a swipe.
 */
export function ChipFilter<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5" role="radiogroup" aria-label={label}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-9 shrink-0 rounded-full border px-3.5 text-xs font-semibold transition-colors",
              active
                ? "border-brand bg-brand text-brand-contrast"
                : "border-line bg-surface text-ink-soft active:bg-surface-muted",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}