import type { GlucoseUnit, MeasurementType, TargetRanges } from "./types";

export const APP_NAME = "Shugela";
export const APP_TAGLINE = "Blood glucose, logged locally";

export const MEASUREMENT_TYPES = [
  "wakeup",
  "post_breakfast_2h",
  "post_lunch_2h",
  "post_supper_2h",
] as const satisfies readonly MeasurementType[];

export const MEASUREMENT_TYPE_META: Record<
  MeasurementType,
  { label: string; short: string; hint: string; accent: string }
> = {
  wakeup: {
    label: "Wake up",
    short: "Wake up",
    hint: "Before breakfast, after waking",
    accent: "text-ink-soft",
  },
  post_breakfast_2h: {
    label: "2h after breakfast",
    short: "Breakfast",
    hint: "Two hours after your first meal",
    accent: "text-ink-soft",
  },
  post_lunch_2h: {
    label: "2h after lunch",
    short: "Lunch",
    hint: "Two hours after lunch",
    accent: "text-ink-soft",
  },
  post_supper_2h: {
    label: "2h after supper",
    short: "Supper",
    hint: "Two hours after your evening meal",
    accent: "text-ink-soft",
  },
};

export const DEFAULT_TARGET_RANGES: TargetRanges = {
  wakeup: { minMmol: 3.9, maxMmol: 6.1 },
  post_breakfast_2h: { minMmol: 4.4, maxMmol: 8 },
  post_lunch_2h: { minMmol: 4.4, maxMmol: 8 },
  post_supper_2h: { minMmol: 4.4, maxMmol: 8 },
};

/** Trend windows offered on the Trends screen. */
export const TREND_RANGES = [
  { days: 7, label: "7 days" },
  { days: 14, label: "14 days" },
  { days: 30, label: "30 days" },
] as const;

export type TrendDays = (typeof TREND_RANGES)[number]["days"];

export const DEFAULT_TREND_DAYS: TrendDays = 7;

/** Plausible physiological bounds used for input validation (still far outside clinical targets). */
export const CRITICAL_MMOL = {
  min: 2.8,
  max: 25,
} as const;

export const HISTORY_PAGE_SIZE = 25;

export const NOTE_MAX_LENGTH = 280;

export const UNITS: GlucoseUnit[] = ["mmol/L", "mg/dL"];

export function isMeasurementType(value: unknown): value is MeasurementType {
  return typeof value === "string" && (MEASUREMENT_TYPES as readonly string[]).includes(value);
}

export function isGlucoseUnit(value: unknown): value is GlucoseUnit {
  return value === "mmol/L" || value === "mg/dL";
}