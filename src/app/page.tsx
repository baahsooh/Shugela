"use client";

import Link from "next/link";
import { useMemo } from "react";

import { GlucoseTrendChart } from "@/components/charts/glucose-trend-chart";
import { DropletIcon, PlusIcon, TrendsIcon } from "@/components/icons";
import { MeasurementIcon } from "@/components/measurements/measurement-icon";
import { PageBody } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { ReadingRow } from "@/components/readings/reading-card";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { StatTile } from "@/components/ui/stat-tile";
import { useMounted } from "@/hooks/use-environment";
import { useReadings, useTodayReadings } from "@/hooks/use-readings";
import { useSettings } from "@/hooks/use-settings";
import { MEASUREMENT_TYPES, MEASUREMENT_TYPE_META } from "@/lib/constants";
import { dayKey, formatFullDateTime, greeting } from "@/lib/dates";
import { classify, formatGlucose, statusLabel } from "@/lib/glucose";
import { buildDaySeries, computeStats, filterByWindow, getTimeWindow } from "@/lib/trends";
import type { GlucoseReading, GlucoseUnit, MeasurementType, RangeStatus } from "@/lib/types";

export default function HomePage() {
  const mounted = useMounted();
  const { unit, targetRanges } = useSettings();
  const { readings, isLoading } = useReadings();
  const { readings: todayReadings } = useTodayReadings();

  const now = useMemo(() => new Date(), []);
  const latest = readings[0];

  const weekReadings = useMemo(
    () => filterByWindow(readings, getTimeWindow(7, now)),
    [readings, now],
  );
  const weekStats = useMemo(() => computeStats(weekReadings, targetRanges), [weekReadings, targetRanges]);
  const sparkline = useMemo(() => buildDaySeries(readings, 7, now), [readings, now]);

  const isEmpty = !isLoading && readings.length === 0;

  return (
    <>
      <PageHeader
        title={mounted ? greeting(now) : "Shugela"}
        subtitle={
          mounted
            ? latest
              ? `Last check-in ${formatFullDateTime(new Date(latest.measuredAt), now)}`
              : "Let's log your first reading"
            : "Blood glucose, logged locally"
        }
        action={
          <Link
            href="/trends"
            aria-label="Open trends"
            className="flex size-10 items-center justify-center rounded-full text-ink-soft active:bg-surface-muted"
          >
            <TrendsIcon className="size-5" />
          </Link>
        }
      />

      <PageBody>
        {isLoading || !mounted ? (
          <>
            <Skeleton className="h-36 w-full" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
            <Skeleton className="h-56 w-full" />
          </>
        ) : isEmpty ? (
          <EmptyState
            icon={<DropletIcon className="size-6" />}
            title="No readings yet"
            description="Type the number from your meter after each test. Everything stays on this device."
            action={
              <Link href="/log">
                <Button size="lg">
                  <PlusIcon className="size-5" />
                  Log your first reading
                </Button>
              </Link>
            }
          />
        ) : (
          <>
            <LatestReadingCard
              latest={latest}
              unit={unit}
              status={classify(latest.glucoseMmol, latest.measurementType, targetRanges)}
              now={now}
            />

            <section>
              <CardTitle>Quick log</CardTitle>
              <div className="grid grid-cols-2 gap-2.5">
                {MEASUREMENT_TYPES.map((type) => (
                  <QuickLogButton key={type} type={type} />
                ))}
              </div>
            </section>

            <section className="grid grid-cols-2 gap-3">
              <StatTile
                label="7-day average"
                value={weekStats.averageMmol === null ? null : formatGlucose(weekStats.averageMmol, unit)}
                unit={unit}
                hint={`${weekStats.count} reading${weekStats.count === 1 ? "" : "s"}`}
              />
              <StatTile
                label="In range"
                value={weekStats.count ? `${Math.round(weekStats.inRangeRatio * 100)}%` : null}
                tone="ok"
                hint="Last 7 days"
              />
              <StatTile
                label="Highest"
                value={weekStats.highestMmol === null ? null : formatGlucose(weekStats.highestMmol, unit)}
                unit={unit}
                tone={weekStats.highCount > 0 ? "danger" : "neutral"}
                hint={`${weekStats.highCount} above target`}
              />
              <StatTile
                label="Lowest"
                value={weekStats.lowestMmol === null ? null : formatGlucose(weekStats.lowestMmol, unit)}
                unit={unit}
                tone={weekStats.lowCount > 0 ? "warn" : "neutral"}
                hint={`${weekStats.lowCount} below target`}
              />
            </section>

            <Card>
              <CardTitle
                action={
                  <Link href="/trends" className="text-xs font-semibold text-brand">
                    See trends
                  </Link>
                }
              >
                Last 7 days
              </CardTitle>
              <GlucoseTrendChart
                buckets={sparkline.buckets}
                target={targetRanges.wakeup}
                unit={unit}
                overallAverage={weekStats.averageMmol}
              />
            </Card>

            <Card>
              <CardTitle
                action={
                  <Link href="/history" className="text-xs font-semibold text-brand">
                    View all
                  </Link>
                }
              >
                {todayReadings.length > 0 ? "Today" : "Recent readings"}
              </CardTitle>

              <div className="-mx-1 flex flex-col divide-y divide-line">
                {(todayReadings.length > 0 ? todayReadings : readings.slice(0, 5)).map((reading) => (
                  <ReadingRow key={reading.id} reading={reading} unit={unit} />
                ))}
              </div>
            </Card>
          </>
        )}
      </PageBody>
    </>
  );
}

function LatestReadingCard({
  latest,
  unit,
  status,
  now,
}: {
  latest: GlucoseReading;
  unit: GlucoseUnit;
  status: RangeStatus;
  now: Date;
}) {
  if (!latest) return null;
  const measuredAt = new Date(latest.measuredAt);
  const meta = MEASUREMENT_TYPE_META[latest.measurementType];

  return (
    <Link
      href={`/readings/${latest.id}`}
      className="block overflow-hidden rounded-3xl bg-gradient-to-br from-brand to-brand/80 p-5 text-brand-contrast shadow-card active:opacity-95"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-wider opacity-80">
            Latest reading
          </p>
          <p className="mt-0.5 text-sm opacity-90">{meta.label}</p>
        </div>
        <span className="rounded-full bg-white/20 px-2.5 py-1 text-[0.7rem] font-semibold">
          {statusLabel(status)}
        </span>
      </div>

      <p className="tabular mt-3 text-5xl font-semibold leading-none tracking-tight">
        {formatGlucose(latest.glucoseMmol, unit)}
        <span className="ml-1.5 text-base font-medium opacity-80">{unit}</span>
      </p>

      <p className="mt-3 text-xs opacity-85">
        {dayKey(measuredAt) === dayKey(now)
          ? `Today at ${measuredAt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`
          : formatFullDateTime(measuredAt, now)}
      </p>
    </Link>
  );
}

function QuickLogButton({ type }: { type: MeasurementType }) {
  const meta = MEASUREMENT_TYPE_META[type];
  return (
    <Link
      href={`/log?type=${type}`}
      className="flex items-center gap-2.5 rounded-2xl border border-line bg-surface p-3 shadow-card transition-colors active:bg-surface-muted"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-ink-soft">
        <MeasurementIcon icon={meta.icon} className="size-5" />
      </span>
      <span className="min-w-0 text-[0.8rem] font-semibold leading-tight text-ink">
        {meta.label}
      </span>
    </Link>
  );
}