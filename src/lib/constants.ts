import type { GlucoseUnit, MeasurementIconKey, MeasurementType, TargetRanges } from "./types";

export const APP_NAME = "Shugela";
export const APP_TAGLINE = "Blood glucose, logged locally";

export const MEASUREMENT_TYPES = [
  "wakeup",
  "pre_breakfast",
  "post_breakfast_2h",
  "pre_lunch",
  "post_lunch_2h",
  "pre_supper",
  "post_supper_2h",
] as const satisfies readonly MeasurementType[];

export const MEASUREMENT_TYPE_META: Record<
  MeasurementType,
  {
    label: string;
    short: string;
    hint: string;
    icon: MeasurementIconKey;
    /** Filled when the reading belongs to a meal, used by the food log. */
    meal?: MealType;
    timing: "fasting" | "pre-meal" | "post-meal";
  }
> = {
  wakeup: {
    label: "Wake up",
    short: "Wake up",
    hint: "On waking, before anything to eat",
    icon: "sun",
    timing: "fasting",
  },
  pre_breakfast: {
    label: "Before breakfast",
    short: "Pre breakfast",
    hint: "Just before your first meal",
    icon: "sunrise",
    timing: "pre-meal",
  },
  post_breakfast_2h: {
    label: "2h after breakfast",
    short: "After breakfast",
    hint: "Two hours after your first meal",
    icon: "toast",
    meal: "breakfast",
    timing: "post-meal",
  },
  pre_lunch: {
    label: "Before lunch",
    short: "Pre lunch",
    hint: "Just before lunch",
    icon: "noon",
    timing: "pre-meal",
  },
  post_lunch_2h: {
    label: "2h after lunch",
    short: "After lunch",
    hint: "Two hours after lunch",
    icon: "bowl",
    meal: "lunch",
    timing: "post-meal",
  },
  pre_supper: {
    label: "Before supper",
    short: "Pre supper",
    hint: "Just before your evening meal",
    icon: "evening",
    timing: "pre-meal",
  },
  post_supper_2h: {
    label: "2h after supper",
    short: "After supper",
    hint: "Two hours after your evening meal",
    icon: "moon",
    meal: "supper",
    timing: "post-meal",
  },
};

export type MealType = "breakfast" | "lunch" | "supper" | "snack";

export const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "supper", "snack"];

export const MEAL_TYPE_META: Record<MealType, { label: string; short: string; carbsHint: string }> = {
  breakfast: { label: "Breakfast", short: "Breakfast", carbsHint: "Start of the day" },
  lunch: { label: "Lunch", short: "Lunch", carbsHint: "Midday meal" },
  supper: { label: "Supper", short: "Supper", carbsHint: "Evening meal" },
  snack: { label: "Snack", short: "Snack", carbsHint: "Between meals" },
};

/** The measurement that belongs after each meal — used to attach carbs. */
export const POST_MEAL_MEASUREMENT: Record<MealType, MeasurementType | null> = {
  breakfast: "post_breakfast_2h",
  lunch: "post_lunch_2h",
  supper: "post_supper_2h",
  snack: null,
};

/**
 * Starting windows for the in-range badges. Pre-meal readings sit between the
 * fasting and post-meal targets — adjust them in Settings to match your plan.
 */
export const DEFAULT_TARGET_RANGES: TargetRanges = {
  wakeup: { minMmol: 3.9, maxMmol: 6.1 },
  pre_breakfast: { minMmol: 3.9, maxMmol: 6.1 },
  post_breakfast_2h: { minMmol: 4.4, maxMmol: 8 },
  pre_lunch: { minMmol: 4.0, maxMmol: 7.0 },
  post_lunch_2h: { minMmol: 4.4, maxMmol: 8 },
  pre_supper: { minMmol: 4.0, maxMmol: 7.0 },
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

export function measurementLabel(type: MeasurementType): string {
  return MEASUREMENT_TYPE_META[type]?.label ?? type;
}