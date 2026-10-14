"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { NOTE_MAX_LENGTH } from "@/lib/constants";
import { addMinutes, fromDateTimeLocalValue, toDateTimeLocalValue } from "@/lib/dates";
import { parseEnteredValue } from "@/lib/glucose";
import { readingFormSchema, type ReadingFormValues } from "@/lib/validation";
import { useSettings } from "@/hooks/use-settings";
import type { ReadingDraft } from "@/lib/types";
import { DateTimeField } from "./date-time-field";
import { GlucoseInput } from "./glucose-input";
import { MeasurementTypePicker } from "./measurement-type-picker";

export interface ReadingFormProps {
  /** Pre-fill for the edit flow. */
  defaultValues?: Partial<ReadingFormValues>;
  onSubmit: (draft: ReadingDraft) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  /** Rendered under the save button, e.g. a delete action. */
  footer?: React.ReactNode;
}

/**
 * Sensible default measurement for "I just tested": matches the time of day to
 * the reading that is most likely being logged.
 */
export function guessMeasurementType(now: Date = new Date()): ReadingFormValues["measurementType"] {
  const hour = now.getHours();
  if (hour < 10) return "wakeup";
  if (hour < 14) return "post_breakfast_2h";
  if (hour < 18) return "post_lunch_2h";
  return "post_supper_2h";
}

export function ReadingForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel = "Save reading",
  footer,
}: ReadingFormProps) {
  const { unit, targetRanges } = useSettings();
  const [isSaving, setIsSaving] = useState(false);

  const schema = useMemo(() => readingFormSchema(unit), [unit]);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<ReadingFormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: {
      enteredValue: defaultValues?.enteredValue ?? "",
      measurementType: defaultValues?.measurementType ?? guessMeasurementType(),
      measuredAt: defaultValues?.measuredAt ?? toDateTimeLocalValue(new Date()),
      note: defaultValues?.note ?? "",
    },
  });

  // `useWatch` keeps the fields reactive without returning `watch()` from
  // useForm, which the React Compiler lint rules treat as unmemoizable.
  const [enteredValue, measurementType, measuredAt, note] = useWatch({
    control,
    name: ["enteredValue", "measurementType", "measuredAt", "note"],
  });

  const handleValid = async (values: ReadingFormValues) => {
    const parsed = parseEnteredValue(values.enteredValue, unit);
    if (!parsed.ok) return;

    const measured = fromDateTimeLocalValue(values.measuredAt) ?? addMinutes(new Date(), 0);

    setIsSaving(true);
    try {
      await onSubmit({
        enteredValue: parsed.value,
        enteredUnit: unit,
        measurementType: values.measurementType,
        measuredAt: measured.toISOString(),
        ...(values.note.trim() ? { note: values.note.trim() } : {}),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleValid)} className="flex flex-col gap-5" noValidate>
      <GlucoseInput
        value={enteredValue}
        onChange={(value) =>
          // Validate on blur/submit rather than mid-keystroke — showing
          // "enter a reading" while the field is empty is just noise.
          setValue("enteredValue", value, { shouldDirty: true })
        }
        unit={unit}
        measurementType={measurementType}
        targetRanges={targetRanges}
        error={errors.enteredValue?.message}
      />

      <MeasurementTypePicker
        value={measurementType}
        onChange={(value) =>
          setValue("measurementType", value, { shouldValidate: true, shouldDirty: true })
        }
        error={errors.measurementType?.message}
      />

      <DateTimeField
        value={measuredAt}
        onChange={(value) => setValue("measuredAt", value, { shouldValidate: true, shouldDirty: true })}
        error={errors.measuredAt?.message}
      />

      <div>
        <label
          htmlFor="note"
          className="mb-2 block text-xs font-semibold uppercase tracking-wider text-ink-faint"
        >
          Note <span className="font-normal normal-case">(optional)</span>
        </label>
        <textarea
          id="note"
          rows={3}
          maxLength={NOTE_MAX_LENGTH}
          placeholder="Late meal, walked after dinner…"
          {...register("note")}
          className="w-full resize-none rounded-2xl border border-line bg-surface px-3.5 py-3 text-base text-ink placeholder:text-ink-faint/70"
        />
        <div className="mt-1 flex items-center justify-between px-1">
          <span className="text-xs text-danger">{errors.note?.message}</span>
          <span className="tabular text-xs text-ink-faint">
            {note.length}/{NOTE_MAX_LENGTH}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2 pt-1">
        <Button type="submit" size="lg" fullWidth disabled={isSaving}>
          {isSaving ? "Saving…" : submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="secondary" size="lg" fullWidth onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        {footer}
      </div>
    </form>
  );
}