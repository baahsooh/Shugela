import { cn } from "@/lib/utils";

export interface SegmentOption<T extends string | number> {
  value: T;
  label: string;
  hint?: string;
}

/** Touch friendly radio group — the go-to control on small screens. */
export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  label,
  size = "md",
  className,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("flex gap-1 rounded-2xl bg-surface-muted p-1", className)}
    >
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
              "flex-1 truncate rounded-xl font-semibold transition-colors duration-150 whitespace-nowrap",
              size === "md" ? "h-10 text-sm" : "h-8 text-xs",
              active
                ? "bg-surface text-ink shadow-sm"
                : "text-ink-faint active:bg-surface/70",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}