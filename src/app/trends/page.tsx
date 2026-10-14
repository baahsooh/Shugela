"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { GlucoseTrendChart } from "@/components/charts/glucose-trend-chart";
import { TimeInRangeBar } from "@/components/charts/time-in-range-bar";
import { TrendRangePicker } from "@/components/charts/trend-range-picker";
import { TypeAverageChart } from "@/components/charts/type-average-chart";
import { DropletIcon, TrendDownIcon, TrendUpIcon } from "@/components/icons";
import { PageBody } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import { StatTile } from "@/components/ui/stat-tile";
import { useReadings } from "@/hooks/use-readings";
import { useSettings } from "@/hooks/use-settings";
import { DEFAULT_TREND_DAYS, type TrendDays } from "@/lib/constants";
import { formatGlucose, formatWithUnit } from "@/lib/glucose";
import {
  averageDelta,
  buildDaySeries,
  comparisonWindow,
  computeStats,
  filterByWindow,
  getTimeWindow,
  summariseByType,
} from "@/lib/trends";
import { cn } from "@/lib/utils";

type TargetMode = "wakeup" | "post";

export default function TrendsPage() {
  const { readings, isLoading } = useReadings();
  const { unit, targetRanges } = useSettings();
  const [days, setDays] = useState<TrendDays>(DEFAULT_TREND_DAYS);
  const [targetMode, setTargetMode] = useState<TargetMode>("wakeup");

  const now = useMemo(() => new Date(), []);

  const windowReadings = useMemo(
    () => filterByWindow(readings, getTimeWindow(days, now)),
    [readings, now, days],
  );

  const stats = useMemo(() => computeStats(windowReadings, targetRanges), [windowReadings, targetRanges]);
  const series = useMemo(() => buildDaySeries(readings, days, now), [readings, days, now]);
  const byType = useMemo(
    () => summariseByType(windowReadings, targetRanges),
    [windowReadings, targetRanges],
  );

  const delta = useMemo(() => {
    const previous = filterByWindow(readings, comparisonWindow(days, now));
    return averageDelta(stats.averageMmol, computeStats(previous, targetRanges).averageMmol);
  }, [readings, days, now, stats.averageMmol, targetRanges]);

  const target =
    targetMode === "wakeup" ? targetRanges.wakeup : targetRanges.post_breakfast_2h;

  const rangeLabel = `${days} days`;
  const hasData = windowReadings.length > 0;

  return (
    <>
      <PageHeader
        title="Trends"
        subtitle={isLoading ? "Loading…" : `${stats.count} reading${stats.count === 1 ? "" : "s"} in ${rangeLabel}`}
      />

      <PageBody>
        <TrendRangePicker value={days} onChange={setDays} />

        {isLoading ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
            <Skeleton className="h-64 w-full" />
          </>
        ) : !hasData ? (
          <EmptyState
            icon={<DropletIcon className="size-6" />}
            title={`No readings in the last ${rangeLabel}`}
            description="Log a reading, or switch to a longer window to see older data."
            action={
              <div className="flex gap-2">
                <Link href="/log">
                  <Button size="lg">Log a reading</Button>
                </Link>
                {readings.length > 0 && days !== 30 ? (
                  <Button variant="secondary" size="lg" onClick={() => setDays(30)}>
                    Show 30 days
                  </Button>
                ) : null}
              </div>
            }
          />
        ) : (
          <>
            <section className="grid grid-cols-2 gap-3">
              <StatTile
                label="Average"
                value={stats.averageMmol === null ? null : formatGlucose(stats.averageMmol, unit)}
                unit={unit}
                tone="brand"
                hint={
                  delta === null ? (
                    "No previous period"
                  ) : (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1",
                        delta > 0 ? "text-danger" : delta < 0 ? "text-ok" : "text-ink-faint",
                      )}
                    >
                      {delta > 0 ? (
                        <TrendUpIcon className="size-3.5" />
                      ) : (
                        <TrendDownIcon className="size-3.5" />
                      )}
                      {Math.abs(delta).toFixed(1)}% vs previous
                    </span>
                  )
                }
              />
              <StatTile
                label="Readings"
                value={String(stats.count)}
                hint={`${stats.activeDays} active day${stats.activeDays === 1 ? "" : "s"}`}
              />
              <StatTile
                label="Highest"
                value={stats.highestMmol === null ? null : formatGlucose(stats.highestMmol, unit)}
                unit={unit}
                tone={stats.highestMmol !== null && stats.highestMmol > target.maxMmol ? "danger" : "neutral"}
              />
              <StatTile
                label="Lowest"
                value={stats.lowestMmol === null ? null : formatGlucose(stats.lowestMmol, unit)}
                unit={unit}
                tone={stats.lowestMmol !== null && stats.lowestMmol < target.minMmol ? "warn" : "neutral"}
              />
            </section>

            <Card>
              <CardTitle
                action={
                  <SegmentedControl<TargetMode>
                    size="sm"
                    label="Target range"
                    className="w-32"
                    value={targetMode}
                    onChange={setTargetMode}
                    options={[
                      { value: "wakeup", label: "Wake" },
                      { value: "post", label: "Meals" },
                    ]}
                  />
                }
              >
                Daily average
              </CardTitle>

              <GlucoseTrendChart
                buckets={series.buckets}
                target={target}
                unit={unit}
                overallAverage={stats.averageMmol}
              />

              <p className="mt-1 text-center text-[0.7rem] text-ink-faint">
                Band and dashed line show the target window ({formatWithUnit(target.minMmol, unit)}–
                {formatWithUnit(target.maxMmol, unit)}) and your period average
              </p>
            </Card>

            <Card>
              <CardTitle>Time in range</CardTitle>
              <TimeInRangeBar stats={stats} />
            </Card>

            <Card>
              <CardTitle>Average by measurement</CardTitle>
              <TypeAverageChart summaries={byType} unit={unit} />

              <div className="mt-3 flex flex-col divide-y divide-line">
                {byType.map((summary) => (
                  <div key={summary.type} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{summary.label}</p>
                      <p className="text-xs text-ink-faint">
                        {summary.count} reading{summary.count === 1 ? "" : "s"}
                        {summary.lowestMmol !== null && summary.highestMmol !== null
                          ? ` · ${formatGlucose(summary.lowestMmol, unit)}–${formatGlucose(summary.highestMmol, unit)}`
                          : ""}
                      </p>
                    </div>
                    <p className="tabular shrink-0 text-sm font-semibold text-ink">
                      {summary.averageMmol === null ? "—" : formatGlucose(summary.averageMmol, unit)}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}
      </PageBody>
    </>
  );
}