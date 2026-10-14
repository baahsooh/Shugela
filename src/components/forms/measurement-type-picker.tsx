"use client";

import { MEASUREMENT_TYPE_META, MEASUREMENT_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { MeasurementType } from "@/lib/types";

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
                "flex cursor-pointer flex-col justify-center gap-0.5 rounded-2xl border p-3 transition-colors",
                active
                  ? "border-brand bg-brand-soft"
                  : "border-line bg-surface active:bg-surface-muted",
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
                  "text-sm font-semibold leading-tight",
                  active ? "text-brand" : "text-ink",
                )}
              >
                {meta.label}
              </span>
              <span className="text-[0.68rem] leading-tight text-ink-faint">{meta.hint}</span>
            </label>
          );
        })}
      </div>

      {error ? <p className="mt-1.5 px-1 text-xs font-medium text-danger">{error}</p> : null}
    </fieldset>
  );
}