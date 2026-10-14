import { z } from "zod";

import { MEASUREMENT_TYPES, NOTE_MAX_LENGTH } from "./constants";
import { fromDateTimeLocalValue } from "./dates";
import { INPUT_LIMITS, parseEnteredValue } from "./glucose";
import type { GlucoseUnit } from "./types";

const FUTURE_TOLERANCE_MS = 60_000;

/**
 * Reading form. Values are kept as raw strings so the keypad experience stays
 * predictable ("7." is a legal in-progress state) and conversion happens once,
 * on submit.
 */
export function readingFormSchema(unit: GlucoseUnit) {
  return z
    .object({
      enteredValue: z.string(),
      measurementType: z.enum(MEASUREMENT_TYPES, {
        error: "Choose what you measured",
      }),
      measuredAt: z.string().min(1, "Pick a date and time"),
      note: z.string(),
    })
    .superRefine((values, ctx) => {
      const parsed = parseEnteredValue(values.enteredValue, unit);
      if (!parsed.ok) {
        ctx.addIssue({ code: "custom", path: ["enteredValue"], message: parsed.message });
      }

      if (values.note.length > NOTE_MAX_LENGTH) {
        ctx.addIssue({
          code: "custom",
          path: ["note"],
          message: `Keep notes under ${NOTE_MAX_LENGTH} characters`,
        });
      }

      const measuredAt = fromDateTimeLocalValue(values.measuredAt);
      if (!measuredAt) {
        ctx.addIssue({ code: "custom", path: ["measuredAt"], message: "Pick a valid date and time" });
        return;
      }
      if (measuredAt.getTime() > Date.now() + FUTURE_TOLERANCE_MS) {
        ctx.addIssue({
          code: "custom",
          path: ["measuredAt"],
          message: "A reading cannot be in the future",
        });
      }
    });
}

export type ReadingFormValues = {
  enteredValue: string;
  measurementType: (typeof MEASUREMENT_TYPES)[number];
  measuredAt: string;
  note: string;
};

export function targetRangeFormSchema(unit: GlucoseUnit) {
  const { min, max } = INPUT_LIMITS[unit];

  return z
    .object({
      minValue: z.string().min(1, "Required"),
      maxValue: z.string().min(1, "Required"),
    })
    .superRefine((values, ctx) => {
      const parsedMin = Number(values.minValue.replace(",", "."));
      const parsedMax = Number(values.maxValue.replace(",", "."));

      if (!Number.isFinite(parsedMin) || !Number.isFinite(parsedMax)) {
        ctx.addIssue({ code: "custom", path: ["minValue"], message: "Use numbers only" });
        return;
      }
      if (parsedMin < min || parsedMin > max) {
        ctx.addIssue({
          code: "custom",
          path: ["minValue"],
          message: `Must be between ${min} and ${max} ${unit}`,
        });
      }
      if (parsedMax < min || parsedMax > max) {
        ctx.addIssue({
          code: "custom",
          path: ["maxValue"],
          message: `Must be between ${min} and ${max} ${unit}`,
        });
      }
      if (Number.isFinite(parsedMin) && Number.isFinite(parsedMax) && parsedMin >= parsedMax) {
        ctx.addIssue({
          code: "custom",
          path: ["maxValue"],
          message: "Upper bound must be above the lower bound",
        });
      }
    });
}

export type TargetRangeFormValues = { minValue: string; maxValue: string };