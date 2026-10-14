import { MEASUREMENT_TYPES, MEASUREMENT_TYPE_META, DEFAULT_TARGET_RANGES } from "./constants";
import { addDays, dayKey, startOfDay } from "./dates";
import { averageMmol, classify, isCritical } from "./glucose";
import { clamp, mean, roundTo } from "./utils";
import type { GlucoseReading, MeasurementType, TargetRanges } from "./types";

export interface TimeWindow {
  /** Inclusive start (00:00 local). */
  start: Date;
  /** Inclusive end (now). */
  end: Date;
  days: number;
}

export interface DayBucket {
  key: string;
  date: Date;
  /** "Mon" */
  weekday: string;
  /** "6" */
  dayOfMonth: string;
  /** "6 Oct" */
  label: string;
  count: number;
  averageMmol: number | null;
  lowestMmol: number | null;
  highestMmol: number | null;
}

/**
 * Window covering the last `days` calendar days including today, ending at
 * `now` so future-dated readings are never counted.
 */
export function getTimeWindow(days: number, now: Date = new Date()): TimeWindow {
  const clampedDays = Math.max(1, Math.round(days));
  return {
    start: addDays(startOfDay(now), -(clampedDays - 1)),
    end: now,
    days: clampedDays,
  };
}

export function isWithinWindow(date: Date, window: TimeWindow): boolean {
  const time = date.getTime();
  return time >= window.start.getTime() && time <= window.end.getTime();
}

export function filterByWindow(readings: GlucoseReading[], window: TimeWindow): GlucoseReading[] {
  return readings.filter((reading) => isWithinWindow(new Date(reading.measuredAt), window));
}

export function sortByMeasuredAt(readings: GlucoseReading[]): GlucoseReading[] {
  return [...readings].sort(
    (a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime(),
  );
}

export interface RangeStats {
  count: number;
  averageMmol: number | null;
  highestMmol: number | null;
  lowestMmol: number | null;
  inRangeCount: number;
  inRangeRatio: number;
  lowCount: number;
  highCount: number;
  criticalCount: number;
  /** Distinct calendar days with at least one reading. */
  activeDays: number;
}

export const EMPTY_STATS: RangeStats = {
  count: 0,
  averageMmol: null,
  highestMmol: null,
  lowestMmol: null,
  inRangeCount: 0,
  inRangeRatio: 0,
  lowCount: 0,
  highCount: 0,
  criticalCount: 0,
  activeDays: 0,
};

export function computeStats(
  readings: GlucoseReading[],
  targets: TargetRanges = DEFAULT_TARGET_RANGES,
): RangeStats {
  if (readings.length === 0) return EMPTY_STATS;

  const values = readings.map((reading) => reading.glucoseMmol);
  let inRangeCount = 0;
  let lowCount = 0;
  let highCount = 0;
  let criticalCount = 0;

  for (const reading of readings) {
    const status = classify(reading.glucoseMmol, reading.measurementType, targets);
    if (status === "in-range") inRangeCount += 1;
    if (status === "low") lowCount += 1;
    if (status === "high") highCount += 1;
    if (isCritical(reading.glucoseMmol)) criticalCount += 1;
  }

  return {
    count: readings.length,
    averageMmol: averageMmol(values),
    highestMmol: Math.max(...values),
    lowestMmol: Math.min(...values),
    inRangeCount,
    inRangeRatio: inRangeCount / readings.length,
    lowCount,
    highCount,
    criticalCount,
    activeDays: new Set(readings.map((reading) => dayKey(new Date(reading.measuredAt)))).size,
  };
}

export interface DaySeries {
  buckets: DayBucket[];
  /** Per-bucket average in mmol/L — `null` on days without readings. */
  averages: (number | null)[];
}

/** Continuous day buckets (including empty days) so charts keep an even x-axis. */
export function buildDaySeries(readings: GlucoseReading[], days: number, now: Date = new Date()): DaySeries {
  const window = getTimeWindow(days, now);
  const byKey = new Map<string, number[]>();

  for (const reading of readings) {
    const date = new Date(reading.measuredAt);
    if (!isWithinWindow(date, window)) continue;
    const key = dayKey(date);
    const bucket = byKey.get(key);
    if (bucket) bucket.push(reading.glucoseMmol);
    else byKey.set(key, [reading.glucoseMmol]);
  }

  const buckets: DayBucket[] = [];
  for (let index = 0; index < days; index += 1) {
    const date = addDays(window.start, index);
    const key = dayKey(date);
    const values = byKey.get(key) ?? [];
    buckets.push({
      key,
      date,
      weekday: date.toLocaleDateString(undefined, { weekday: "short" }),
      dayOfMonth: String(date.getDate()),
      label: date.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
      count: values.length,
      averageMmol: averageMmol(values),
      lowestMmol: values.length ? Math.min(...values) : null,
      highestMmol: values.length ? Math.max(...values) : null,
    });
  }

  return { buckets, averages: buckets.map((bucket) => bucket.averageMmol) };
}

export interface TypeSummary {
  type: MeasurementType;
  label: string;
  hint: string;
  count: number;
  averageMmol: number | null;
  lowestMmol: number | null;
  highestMmol: number | null;
  inRangeRatio: number;
}

/** Average / spread per measurement type, always in a stable display order. */
export function summariseByType(
  readings: GlucoseReading[],
  targets: TargetRanges = DEFAULT_TARGET_RANGES,
): TypeSummary[] {
  return MEASUREMENT_TYPES.map((type) => {
    const subset = readings.filter((reading) => reading.measurementType === type);
    const values = subset.map((reading) => reading.glucoseMmol);
    const inRange = subset.filter(
      (reading) => classify(reading.glucoseMmol, reading.measurementType, targets) === "in-range",
    ).length;

    return {
      type,
      label: MEASUREMENT_TYPE_META[type].label,
      hint: MEASUREMENT_TYPE_META[type].hint,
      count: subset.length,
      averageMmol: averageMmol(values),
      lowestMmol: values.length ? Math.min(...values) : null,
      highestMmol: values.length ? Math.max(...values) : null,
      inRangeRatio: subset.length ? inRange / subset.length : 0,
    };
  });
}

/** Centred moving average used for the smooth trend line. */
export function rollingAverage(values: (number | null)[], window = 3): (number | null)[] {
  const half = Math.floor(window / 2);
  return values.map((_, index) => {
    const slice: number[] = [];
    for (let i = index - half; i <= index + half; i += 1) {
      const value = values[i];
      if (typeof value === "number") slice.push(value);
    }
    return slice.length ? roundTo(mean(slice), 2) : null;
  });
}

/** Percentage change between two averages, guarding against a zero baseline. */
export function averageDelta(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function comparisonWindow(days: number, now: Date = new Date()): TimeWindow {
  const current = getTimeWindow(days, now);
  return {
    start: addDays(current.start, -days),
    end: current.start,
    days,
  };
}

export function clampDomain(values: (number | null)[], pad = 2): [number, number] {
  const numbers = values.filter((value): value is number => typeof value === "number");
  if (numbers.length === 0) return [2, 12];
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  if (min === max) return [clamp(min - pad, 0, 60), max + pad];
  return [Math.floor(min - pad), Math.ceil(max + pad)];
}