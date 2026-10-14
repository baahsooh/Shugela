"use client";

import { forwardRef } from "react";

import { MinusIcon, PlusIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { INPUT_LIMITS, classify, parseEnteredValue, statusLabel, stepValue } from "@/lib/glucose";
import { cn } from "@/lib/utils";
import type { GlucoseUnit, MeasurementType, TargetRanges } from "@/lib/types";

export interface GlucoseInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  unit: GlucoseUnit;
  measurementType: MeasurementType;
  targetRanges: TargetRanges;
  error?: string;
  describedById?: string;
}

/**
 * Large, thumb-friendly numeric entry with a decimal keypad and ± steppers.
 * The canonical mmol/L value is derived on every keystroke so the user sees
 * the range badge update live.
 */
export const GlucoseInput = forwardRef<HTMLInputElement, GlucoseInputProps>(function GlucoseInput(
  {
    id = "glucose-value",
    value,
    onChange,
    unit,
    measurementType,
    targetRanges,
    error,
    describedById,
  },
  ref,
) {
  const parsed = parseEnteredValue(value, unit);
  const limits = INPUT_LIMITS[unit];

  return (
    <div
      className={cn(
        "rounded-3xl border bg-surface p-4 shadow-card transition-colors",
        error ? "border-danger/50" : "border-line",
      )}
    >
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
          Reading
        </span>
        <Badge tone={unit === "mmol/L" ? "brand" : "neutral"}>{unit}</Badge>
      </div>

      <div className="mt-1 flex items-center gap-1">
        <button
          type="button"
          aria-label="Decrease by one step"
          onClick={() => onChange(stepValue(value, unit, -1))}
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-muted text-ink-soft active:bg-surface-sunken"
        >
          <MinusIcon className="size-6" />
        </button>

        <input
          ref={ref}
          id={id}
          name="enteredValue"
          value={value}
          onChange={(event) => onChange(event.target.value.replace(/[^0-9.,]/g, ""))}
          onBlur={() => {
            // Normalise "7," or "07.50" into "7.5" once the user leaves the field.
            const result = parseEnteredValue(value, unit);
            if (result.ok) onChange(String(result.value));
          }}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
          aria-invalid={Boolean(error)}
          aria-describedby={describedById}
          placeholder="–"
          className={cn(
            "min-w-0 flex-1 bg-transparent text-center text-[3.25rem] font-semibold leading-none tracking-tight tabular outline-none placeholder:text-line-strong",
          )}
        />

        <button
          type="button"
          aria-label="Increase by one step"
          onClick={() => onChange(stepValue(value, unit, 1))}
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-muted text-ink-soft active:bg-surface-sunken"
        >
          <PlusIcon className="size-6" />
        </button>
      </div>

      <div className="mt-2 min-h-5 px-1 text-center text-xs">
        {error ? (
          <span className="font-medium text-danger">{error}</span>
        ) : parsed.ok ? (
          <span className="flex flex-wrap items-center justify-center gap-2 text-ink-faint">
            <Badge tone={statusTone(measurementType, targetRanges, value, unit)}>
              {statusText(measurementType, targetRanges, value, unit)}
            </Badge>
            <span>
              plausible {limits.min}–{limits.max} {unit}
            </span>
          </span>
        ) : (
          <span className="text-ink-faint">
            Type the number from your meter · {limits.min}–{limits.max} {unit}
          </span>
        )}
      </div>
    </div>
  );
});

function statusTone(
  measurementType: MeasurementType,
  targetRanges: TargetRanges,
  value: string,
  unit: GlucoseUnit,
) {
  const parsed = parseEnteredValue(value, unit);
  if (!parsed.ok) return "neutral" as const;
  const mmol = unit === "mg/dL" ? parsed.value / 18.016 : parsed.value;
  const status = classify(mmol, measurementType, targetRanges);
  return status === "in-range" ? ("ok" as const) : status === "low" ? ("warn" as const) : ("danger" as const);
}

function statusText(
  measurementType: MeasurementType,
  targetRanges: TargetRanges,
  value: string,
  unit: GlucoseUnit,
) {
  const parsed = parseEnteredValue(value, unit);
  if (!parsed.ok) return "";
  const mmol = unit === "mg/dL" ? parsed.value / 18.016 : parsed.value;
  return statusLabel(classify(mmol, measurementType, targetRanges));
}