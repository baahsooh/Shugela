"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { ChipFilter } from "@/components/ui/chip-filter";
import { useSettings } from "@/hooks/use-settings";
import { MEASUREMENT_TYPES, MEASUREMENT_TYPE_META } from "@/lib/constants";
import { fromMmol, toMmol } from "@/lib/glucose";
import { roundTo } from "@/lib/utils";
import { targetRangeFormSchema, type TargetRangeFormValues } from "@/lib/validation";
import type { MeasurementType } from "@/lib/types";

/** Per-measurement "in range" window, edited in the user's preferred unit. */
export function TargetRangeEditor() {
  const { unit, targetRanges, update } = useSettings();
  const [type, setType] = useState<MeasurementType>("wakeup");
  const range = targetRanges[type];

  const schema = useMemo(() => targetRangeFormSchema(unit), [unit]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TargetRangeFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      minValue: String(fromMmol(range.minMmol, unit)),
      maxValue: String(fromMmol(range.maxMmol, unit)),
    },
  });

  // Re-hydrate the inputs whenever the measurement or the unit changes.
  useEffect(() => {
    reset({
      minValue: String(fromMmol(range.minMmol, unit)),
      maxValue: String(fromMmol(range.maxMmol, unit)),
    });
  }, [range.minMmol, range.maxMmol, unit, reset]);

  const onSubmit = handleSubmit(async (values) => {
    const minMmol = roundTo(toMmol(Number(values.minValue.replace(",", ".")), unit), 1);
    const maxMmol = roundTo(toMmol(Number(values.maxValue.replace(",", ".")), unit), 1);

    await update({ targetRanges: { ...targetRanges, [type]: { minMmol, maxMmol } } });
    reset({ minValue: String(fromMmol(minMmol, unit)), maxValue: String(fromMmol(maxMmol, unit)) });
  });

  return (
    <Card>
      <CardTitle>Target ranges</CardTitle>

      <ChipFilter<MeasurementType>
        label="Measurement"
        value={type}
        onChange={setType}
        options={MEASUREMENT_TYPES.map((value) => ({
          value,
          label: MEASUREMENT_TYPE_META[value].label,
        }))}
      />

      <form onSubmit={onSubmit} className="mt-3 flex flex-col gap-3" noValidate>
        <p className="text-xs text-ink-faint">
          Used for the in-range badges and the time-in-range bar. Values in {unit}.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-ink-soft">Lower bound</span>
            <input
              {...register("minValue")}
              inputMode="decimal"
              aria-invalid={Boolean(errors.minValue)}
              className="h-12 w-full rounded-2xl border border-line bg-surface px-3.5 text-base font-semibold text-ink"
            />
            {errors.minValue ? (
              <span className="text-xs text-danger">{errors.minValue.message}</span>
            ) : null}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-ink-soft">Upper bound</span>
            <input
              {...register("maxValue")}
              inputMode="decimal"
              aria-invalid={Boolean(errors.maxValue)}
              className="h-12 w-full rounded-2xl border border-line bg-surface px-3.5 text-base font-semibold text-ink"
            />
            {errors.maxValue ? (
              <span className="text-xs text-danger">{errors.maxValue.message}</span>
            ) : null}
          </label>
        </div>

        <Button type="submit" variant="secondary" size="lg" fullWidth disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : `Save ${MEASUREMENT_TYPE_META[type].label} range`}
        </Button>
      </form>
    </Card>
  );
}