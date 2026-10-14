"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";

import { getAllReadings } from "@/db/readings";
import { dayKey } from "@/lib/dates";
import { sortByMeasuredAt } from "@/lib/trends";
import type { GlucoseReading } from "@/lib/types";

/** All readings, newest first. Updates automatically on any write. */
export function useReadings(): { readings: GlucoseReading[]; isLoading: boolean } {
  const result = useLiveQuery(() => getAllReadings(), []);
  const readings = useMemo(() => sortByMeasuredAt(result ?? []), [result]);
  return { readings, isLoading: result === undefined };
}

export function useTodayReadings(now: Date = new Date()) {
  const { readings, isLoading } = useReadings();
  const key = dayKey(now);
  const today = useMemo(
    () => readings.filter((reading) => dayKey(new Date(reading.measuredAt)) === key),
    [readings, key],
  );
  return { readings: today, isLoading };
}
