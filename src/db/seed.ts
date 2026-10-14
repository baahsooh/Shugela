import { addDays } from "@/lib/dates";
import { fromMmol, roundForUnit } from "@/lib/glucose";
import { roundTo } from "@/lib/utils";
import type { GlucoseReading, GlucoseUnit, MeasurementType } from "@/lib/types";
import { bulkInsertReadings, clearReadings } from "./readings";
import { setHasSeededDemoData } from "./settings";

/**
 * Deterministic demo data.
 *
 * Deterministic on purpose: the same seed always produces the same readings,
 * so screenshots, manual QA and bug reports stay comparable.
 */

const SEED = 20260910;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Slot {
  type: MeasurementType;
  hour: number;
  minute: number;
  jitterMinutes: number;
  /** Mean value in mmol/L. */
  base: number;
  /** Std-dev-ish spread in mmol/L. */
  spread: number;
  /** Probability the measurement was taken that day. */
  chance: number;
}

const SLOTS: Slot[] = [
  { type: "wakeup", hour: 6, minute: 40, jitterMinutes: 25, base: 5.3, spread: 0.5, chance: 1 },
  { type: "pre_breakfast", hour: 7, minute: 40, jitterMinutes: 15, base: 5.5, spread: 0.55, chance: 0.7 },
  { type: "post_breakfast_2h", hour: 9, minute: 15, jitterMinutes: 20, base: 6.8, spread: 0.95, chance: 0.94 },
  { type: "pre_lunch", hour: 12, minute: 20, jitterMinutes: 20, base: 5.6, spread: 0.6, chance: 0.62 },
  { type: "post_lunch_2h", hour: 13, minute: 20, jitterMinutes: 25, base: 7.1, spread: 1.05, chance: 0.9 },
  { type: "pre_supper", hour: 18, minute: 30, jitterMinutes: 25, base: 5.8, spread: 0.65, chance: 0.6 },
  { type: "post_supper_2h", hour: 20, minute: 5, jitterMinutes: 35, base: 7.5, spread: 1.1, chance: 0.82 },
];

const NOTES = [
  "30 minute walk after dinner",
  "Two slices of pizza",
  "Slept badly, around 5 hours",
  "Skipped breakfast, busy morning",
  "Stressful day",
  "Cooked at home",
  "Birthday dinner out",
  "Extra water today",
  "Late meal, read at 22:40",
  "New sensor strip",
];

function gaussian(random: () => number): number {
  const u = Math.max(random(), 1e-9);
  const v = Math.max(random(), 1e-9);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export interface SeedOptions {
  /** Number of days of history to generate, including today. */
  days?: number;
  now?: Date;
  /** Replace any existing readings instead of merging. */
  replace?: boolean;
}

export function buildDemoReadings({ days = 30, now = new Date() }: SeedOptions = {}): GlucoseReading[] {
  const random = mulberry32(SEED);
  const readings: GlucoseReading[] = [];
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  for (let dayIndex = days - 1; dayIndex >= 0; dayIndex -= 1) {
    const date = addDays(today, -dayIndex);
    const weekday = date.getDay();

    // Nobody tests perfectly: skip some weekend slots and a few weekdays.
    const daySkipChance = weekday === 0 ? 0.35 : weekday === 6 ? 0.15 : 0.06;
    if (random() < daySkipChance) continue;

    for (const slot of SLOTS) {
      if (random() > slot.chance) continue;

      // Slow multi-day drift, so the trend chart shows a believable shape.
      const drift = Math.sin((dayIndex / 7) * Math.PI) * slot.spread * 0.5;
      let value = slot.base + drift + gaussian(random) * slot.spread * 0.6;

      // A couple of realistic events across the dataset.
      if (slot.type === "wakeup" && dayIndex % 17 === 5) value = 3.3 + random() * 0.5;
      if (slot.type === "post_lunch_2h" && dayIndex % 19 === 9) value = 13.2 + random() * 2.4;
      if (slot.type === "post_supper_2h" && dayIndex % 23 === 11) value = 3.6 + random() * 0.6;
      // Pre-meal readings drift with the meal that follows: a carb-heavy
      // breakfast shows up as a higher "before breakfast" a while later.
      if (slot.type === "pre_breakfast" && dayIndex % 11 === 4) value = 6.4 + random() * 0.6;

      const glucoseMmol = roundTo(Math.min(Math.max(value, 2.6), 22), 1);

      const measured = new Date(date);
      measured.setHours(
        slot.hour,
        Math.max(0, Math.min(59, slot.minute + Math.round(gaussian(random) * slot.jitterMinutes))),
        0,
        0,
      );
      if (measured.getTime() > now.getTime()) continue;

      // Mix the units the user might realistically type in.
      const enteredUnit: GlucoseUnit = dayIndex % 4 === 0 ? "mg/dL" : "mmol/L";
      const enteredValue = roundForUnit(fromMmol(glucoseMmol, enteredUnit), enteredUnit);
      const hasNote = random() < 0.14;
      const timestamp = measured.toISOString();

      readings.push({
        id: `demo-${days}-${dayIndex}-${slot.type}`,
        glucoseMmol,
        enteredValue,
        enteredUnit,
        measurementType: slot.type,
        measuredAt: timestamp,
        ...(hasNote ? { note: NOTES[Math.floor(random() * NOTES.length)] } : {}),
        source: "manual",
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
  }

  return readings.sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
}

export async function seedDemoData(options: SeedOptions = {}): Promise<number> {
  const readings = buildDemoReadings(options);
  if (options.replace) await clearReadings();
  await bulkInsertReadings(readings);
  await setHasSeededDemoData(true);
  return readings.length;
}

/**
 * `NEXT_PUBLIC_SEED_DEMO=1 npm run dev` fills an empty database on first run
 * so the charts have something to show during development.
 */
export function shouldAutoSeedDemoData(): boolean {
  return process.env.NEXT_PUBLIC_SEED_DEMO === "1";
}