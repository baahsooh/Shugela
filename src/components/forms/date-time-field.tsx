"use client";

import { CalendarIcon, ClockIcon } from "@/components/icons";
import { addMinutes, formatRelativeDay, formatTime } from "@/lib/dates";
import { cn } from "@/lib/utils";

const QUICK_OFFSETS = [
  { label: "Now", minutes: 0 },
  { label: "15m ago", minutes: -15 },
  { label: "30m ago", minutes: -30 },
  { label: "1h ago", minutes: -60 },
  { label: "2h ago", minutes: -120 },
];

/** Date + time entry with one-tap offsets for the "just tested it" case. */
export function DateTimeField({
  value,
  onChange,
  error,
  id = "measuredAt",
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  id?: string;
}) {
  const parsed = value ? new Date(value) : null;
  const valid = parsed && !Number.isNaN(parsed.getTime());

  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-faint"
      >
        <CalendarIcon className="size-3.5" />
        Measured at
      </label>

      <input
        id={id}
        name="measuredAt"
        type="datetime-local"
        value={value}
        max={toInputValue(new Date())}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        className={cn(
          "h-12 w-full rounded-2xl border bg-surface px-3.5 text-base font-medium text-ink",
          error ? "border-danger/50" : "border-line",
        )}
      />

      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
        {QUICK_OFFSETS.map((offset) => (
          <button
            key={offset.label}
            type="button"
            onClick={() => onChange(toInputValue(addMinutes(new Date(), offset.minutes)))}
            className="h-9 shrink-0 rounded-full border border-line bg-surface px-3 text-xs font-semibold text-ink-soft active:bg-surface-muted"
          >
            {offset.label}
          </button>
        ))}
      </div>

      <p className="flex items-center gap-1.5 px-1 text-xs text-ink-faint">
        <ClockIcon className="size-3.5 shrink-0" />
        {valid ? `${formatRelativeDay(parsed)} at ${formatTime(parsed)}` : "Pick when you tested"}
      </p>

      {error ? <p className="px-1 text-xs font-medium text-danger">{error}</p> : null}
    </div>
  );
}

function toInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}