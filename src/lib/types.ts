/**
 * Core domain types for Shugela.
 *
 * The app is local-first: every reading lives in IndexedDB on the device.
 * Glucose is always stored canonically in mmol/L (`glucoseMmol`) so that
 * trends stay consistent no matter which unit the user typed in. The raw
 * `enteredValue` / `enteredUnit` pair is kept for auditability (so the user
 * can always see the number exactly as their meter displayed it).
 */

export type GlucoseUnit = "mmol/L" | "mg/dL";

/**
 * The seven moments Shugela measures around a day's meals.
 * `pre_*` is a fasting-ish reading taken just before eating, `post_*_2h` is the
 * two-hour post-meal check that matters most for glucose.
 */
export type MeasurementType =
  | "wakeup"
  | "pre_breakfast"
  | "post_breakfast_2h"
  | "pre_lunch"
  | "post_lunch_2h"
  | "pre_supper"
  | "post_supper_2h";

/** Icon key resolved to a component in components/measurements/measurement-icon.tsx */
export type MeasurementIconKey =
  | "sun"
  | "sunrise"
  | "toast"
  | "noon"
  | "bowl"
  | "evening"
  | "moon";

export type ReadingSource = "manual";

export interface GlucoseReading {
  /** Stable client generated id (uuid). */
  id: string;
  /** Canonical value in mmol/L. Single source of truth for all maths. */
  glucoseMmol: number;
  /** Value exactly as the user typed it, in `enteredUnit`. */
  enteredValue: number;
  enteredUnit: GlucoseUnit;
  measurementType: MeasurementType;
  /** ISO-8601 timestamp (with offset) of the measurement itself. */
  measuredAt: string;
  note?: string;
  source: ReadingSource;
  /** Cloud owner. Absent until the reading is uploaded to an account. */
  userId?: string;
  /** ISO-8601 timestamps for record bookkeeping. */
  createdAt: string;
  updatedAt: string;
}

export interface TargetRange {
  /** Lower bound in mmol/L. */
  minMmol: number;
  /** Upper bound in mmol/L. */
  maxMmol: number;
}

export type TargetRanges = Record<MeasurementType, TargetRange>;

export type ThemePreference = "system" | "light" | "dark";

export interface AppSettings {
  id: typeof SETTINGS_ID;
  /** Unit used for entry and display across the app. */
  unit: GlucoseUnit;
  theme: ThemePreference;
  /** Per-measurement "in range" windows, used for badges and time-in-range. */
  targetRanges: TargetRanges;
  /** Set once the demo dataset has been generated so it is never duplicated. */
  hasSeededDemoData: boolean;
  createdAt: string;
  updatedAt: string;
}

export type RangeStatus = "low" | "in-range" | "high";

export interface ReadingDraft {
  enteredValue: number;
  enteredUnit: GlucoseUnit;
  measurementType: MeasurementType;
  measuredAt: string;
  note?: string;
}

export const SETTINGS_ID = "settings" as const;