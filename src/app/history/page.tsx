"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { DropletIcon } from "@/components/icons";
import { PageBody } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { ReadingCard } from "@/components/readings/reading-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ChipFilter } from "@/components/ui/chip-filter";
import { Skeleton } from "@/components/ui/skeleton";
import { useReadings } from "@/hooks/use-readings";
import { useSettings } from "@/hooks/use-settings";
import { HISTORY_PAGE_SIZE, MEASUREMENT_TYPES, MEASUREMENT_TYPE_META } from "@/lib/constants";
import { dayKey, formatRelativeDay } from "@/lib/dates";
import { fromMmol } from "@/lib/glucose";
import type { GlucoseReading, MeasurementType } from "@/lib/types";

type Filter = MeasurementType | "all";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  ...MEASUREMENT_TYPES.map((type) => ({ value: type as Filter, label: MEASUREMENT_TYPE_META[type].label })),
];

export default function HistoryPage() {
  const { readings, isLoading } = useReadings();
  const { unit, targetRanges } = useSettings();
  const [filter, setFilter] = useState<Filter>("all");
  const [visibleCount, setVisibleCount] = useState(HISTORY_PAGE_SIZE);

  const filtered = useMemo(
    () => (filter === "all" ? readings : readings.filter((item) => item.measurementType === filter)),
    [readings, filter],
  );

  const groups = useMemo(() => groupByDay(filtered), [filtered]);
  const visibleGroups = groups.slice(0, visibleCount);
  const visibleTotal = visibleGroups.reduce((total, group) => total + group.readings.length, 0);

  const handleFilterChange = (value: Filter) => {
    setFilter(value);
    setVisibleCount(HISTORY_PAGE_SIZE);
  };

  return (
    <>
      <PageHeader
        title="History"
        subtitle={isLoading ? "Loading…" : `${filtered.length} reading${filtered.length === 1 ? "" : "s"}`}
      />

      <PageBody>
        <ChipFilter<Filter>
          label="Filter by measurement"
          value={filter}
          onChange={handleFilterChange}
          options={FILTERS}
        />

        {isLoading ? (
          <>
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<DropletIcon className="size-6" />}
            title={readings.length === 0 ? "Nothing logged yet" : "No readings of this type"}
            description={
              readings.length === 0
                ? "Every reading you save will appear here, newest first."
                : "Try another filter, or add a reading of this type."
            }
            action={
              readings.length === 0 ? (
                <Link href="/log">
                  <Button size="lg">Log a reading</Button>
                </Link>
              ) : (
                <Button variant="secondary" onClick={() => handleFilterChange("all")}>
                  Show all readings
                </Button>
              )
            }
          />
        ) : (
          <>
            <div className="flex flex-col gap-6">
              {visibleGroups.map((group) => (
                <section key={group.key} className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between px-1">
                    <h2 className="text-sm font-semibold text-ink">
                      {formatRelativeDay(group.date)}
                    </h2>
                    <span className="tabular text-xs text-ink-faint">
                      {groupAverage(group.readings, unit)} {unit} avg
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {group.readings.map((reading) => (
                      <ReadingCard
                        key={reading.id}
                        reading={reading}
                        unit={unit}
                        targetRanges={targetRanges}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>

            {visibleTotal < filtered.length ? (
              <Button
                variant="secondary"
                size="lg"
                fullWidth
                onClick={() => setVisibleCount((count) => count + HISTORY_PAGE_SIZE)}
              >
                Load more ({filtered.length - visibleTotal} left)
              </Button>
            ) : null}
          </>
        )}
      </PageBody>
    </>
  );
}

interface DayGroup {
  key: string;
  date: Date;
  readings: GlucoseReading[];
}

function groupByDay(readings: GlucoseReading[]): DayGroup[] {
  const groups = new Map<string, DayGroup>();

  for (const reading of readings) {
    const date = new Date(reading.measuredAt);
    const key = dayKey(date);
    const group = groups.get(key);
    if (group) group.readings.push(reading);
    else groups.set(key, { key, date, readings: [reading] });
  }

  return Array.from(groups.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
}

function groupAverage(readings: GlucoseReading[], unit: "mmol/L" | "mg/dL"): string {
  const total = readings.reduce((sum, reading) => sum + reading.glucoseMmol, 0);
  const average = total / readings.length;
  return String(fromMmol(average, unit));
}