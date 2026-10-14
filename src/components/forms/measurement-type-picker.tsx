"use client";

import { MeasurementIcon } from "@/components/measurements/measurement-icon";
import { MEASUREMENT_TYPE_META, MEASUREMENT_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { MeasurementType } from "@/lib/types";

/**
 * Seven options, so this is a two-column grid that scrolls rather than a list —
 * thumb-reachable and still shows the icon and label for each.
 */
export function MeasurementTypePicker({
  value,
  onChange,
  name = "measurementType",
  error,
}: {
  value: MeasurementType;
  onChange: (value: MeasurementType) => void;
  name?: string;
  error?: string;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">
        Measurement
      </legend>

      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Measurement type">
        {MEASUREMENT_TYPES.map((type) => {
          const meta = MEASUREMENT_TYPE_META[type];
          const active = type === value;

          return (
            <label
              key={type}
              className={cn(
                "flex min-h-16 cursor-pointer items-center gap-2.5 rounded-2xl border p-3 transition-colors",
                active ? "border-brand bg-brand-soft" : "border-line bg-surface active:bg-surface-muted",
              )}
            >
              <input
                type="radio"
                name={name}
                value={type}
                checked={active}
                onChange={() => onChange(type)}
                className="sr-only"
              />
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-xl",
                  active ? "bg-surface text-brand" : "bg-surface-muted text-ink-soft",
                )}
              >
                <MeasurementIcon icon={meta.icon} className="size-5" />
              </span>
              <span
                className={cn(
                  "min-w-0 text-[0.8rem] font-semibold leading-tight",
                  active ? "text-brand" : "text-ink",
                )}
              >
                {meta.label}
              </span>
            </label>
          );
        })}
      </div>

      {error ? <p className="mt-1.5 px-1 text-xs font-medium text-danger">{error}</p> : null}
    </fieldset>
  );
}