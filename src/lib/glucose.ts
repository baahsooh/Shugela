import { CRITICAL_MMOL } from "./constants";
import { mean, roundTo } from "./utils";
import type { GlucoseUnit, MeasurementType, RangeStatus, TargetRange } from "./types";

/**
 * Glucose conversion.
 *
 * Glucose has a molar mass of 180.156 g/mol, so 1 mmol/L === 18.016 mg/dL.
 * Internally we always keep mmol/L; the entered value is only rounded for
 * display in the user's preferred unit.
 */
export const MG_DL_PER_MMOL = 18.016;

/** Decimals used when *entering* / displaying a value in a given unit. */
export const UNIT_DECIMALS: Record<GlucoseUnit, number> = {
  "mmol/L": 1,
  "mg/dL": 0,
};

/** Physiologically plausible input window, expressed in the entered unit. */
export const INPUT_LIMITS: Record<GlucoseUnit, { min: number; max: number }> = {
  "mmol/L": { min: 1, max: 40 },
  "mg/dL": { min: 18, max: 720 },
};

export function convertValue(value: number, from: GlucoseUnit, to: GlucoseUnit): number {
  if (!Number.isFinite(value)) return Number.NaN;
  if (from === to) return value;
  return from === "mg/dL" ? value / MG_DL_PER_MMOL : value * MG_DL_PER_MMOL;
}

/** Canonical storage value. */
export function toMmol(value: number, unit: GlucoseUnit): number {
  return roundTo(convertValue(value, unit, "mmol/L"), 2);
}

/** Presentation value for the user's preferred unit. */
export function fromMmol(mmol: number, unit: GlucoseUnit): number {
  return roundTo(convertValue(mmol, "mmol/L", unit), UNIT_DECIMALS[unit]);
}

/** Round a number for display in `unit` (1 decimal for mmol/L, whole for mg/dL). */
export function roundForUnit(value: number, unit: GlucoseUnit): number {
  return roundTo(value, UNIT_DECIMALS[unit]);
}

export function formatGlucose(mmol: number, unit: GlucoseUnit): string {
  const decimals = UNIT_DECIMALS[unit];
  const value = fromMmol(mmol, unit);
  return decimals === 0 ? String(Math.round(value)) : value.toFixed(decimals);
}

export function formatWithUnit(mmol: number, unit: GlucoseUnit): string {
  return `${formatGlucose(mmol, unit)} ${unit}`;
}

/** Step size for the +/- nudge buttons, in the entered unit. */
export function stepForUnit(unit: GlucoseUnit): number {
  return unit === "mg/dL" ? 1 : 0.1;
}

/** Accepts "7", "7.2", "7,2" — tolerant of an in-progress decimal separator. */
export function parseDecimalInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  if (!/^\d{1,4}([.,]\d{0,2})?$/.test(trimmed)) return null;
  const parsed = Number(trimmed.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export type ParseResult =
  | { ok: true; value: number }
  | { ok: false; message: string };

/** Validate raw keypad text against the plausible range for the active unit. */
export function parseEnteredValue(raw: string, unit: GlucoseUnit): ParseResult {
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: false, message: "Enter your reading" };
  if (parseDecimalInput(trimmed) === null) {
    return { ok: false, message: "Use numbers only, for example 7.2" };
  }

  const parsed = Number(trimmed.replace(",", "."));
  const { min, max } = INPUT_LIMITS[unit];
  if (parsed < min || parsed > max) {
    return { ok: false, message: `Must be between ${min} and ${max} ${unit}` };
  }

  return { ok: true, value: roundForUnit(parsed, unit) };
}

export function targetFor(
  type: MeasurementType,
  targets: Record<MeasurementType, TargetRange>,
): TargetRange {
  return targets[type];
}

export function classify(
  mmol: number,
  type: MeasurementType,
  targets: Record<MeasurementType, TargetRange>,
): RangeStatus {
  const target = targetFor(type, targets);
  if (mmol < target.minMmol) return "low";
  if (mmol > target.maxMmol) return "high";
  return "in-range";
}

/** True for values that warrant immediate attention regardless of target window. */
export function isCritical(mmol: number): boolean {
  return mmol < CRITICAL_MMOL.min || mmol > CRITICAL_MMOL.max;
}

export function statusLabel(status: RangeStatus): string {
  switch (status) {
    case "low":
      return "Low";
    case "high":
      return "High";
    default:
      return "In range";
  }
}

export function averageMmol(values: number[]): number | null {
  if (values.length === 0) return null;
  return roundTo(mean(values), 2);
}

/**
 * Nudge helper for the big numeric input: keeps the raw string in sync with
 * the canonical value so the keypad never fights the caret.
 */
export function stepValue(raw: string, unit: GlucoseUnit, direction: 1 | -1): string {
  const current = parseDecimalInput(raw);
  const base = current ?? 0;
  const next = roundForUnit(base + direction * stepForUnit(unit), unit);
  const decimals = UNIT_DECIMALS[unit];
  const clamped = Math.min(Math.max(next, 0), INPUT_LIMITS[unit].max);
  return decimals === 0 ? String(clamped) : clamped.toFixed(decimals);
}