"use client";

import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { fromMmol } from "@/lib/glucose";
import { clampDomain, rollingAverage, type DayBucket } from "@/lib/trends";
import type { GlucoseUnit, TargetRange } from "@/lib/types";

interface ChartPoint {
  label: string;
  dayOfMonth: string;
  average: number | null;
  trend: number | null;
  low: number | null;
  high: number | null;
  count: number;
}

export function GlucoseTrendChart({
  buckets,
  target,
  unit,
  overallAverage,
}: {
  buckets: DayBucket[];
  target: TargetRange;
  unit: GlucoseUnit;
  overallAverage: number | null;
}) {
  const data = useMemo<ChartPoint[]>(() => {
    const averages = buckets.map((bucket) =>
      bucket.averageMmol === null ? null : fromMmol(bucket.averageMmol, unit),
    );
    const trend = rollingAverage(averages, 3);

    return buckets.map((bucket, index) => ({
      label: bucket.label,
      dayOfMonth: bucket.dayOfMonth,
      average: averages[index],
      trend: trend[index],
      low: bucket.lowestMmol === null ? null : fromMmol(bucket.lowestMmol, unit),
      high: bucket.highestMmol === null ? null : fromMmol(bucket.highestMmol, unit),
      count: bucket.count,
    }));
  }, [buckets, unit]);

  const [minDomain, maxDomain] = useMemo(() => {
    const values = data.flatMap((point) => [point.average, point.low, point.high]);
    const bounds = clampDomain(values, unit === "mg/dL" ? 10 : 0.5);
    const targetMin = fromMmol(target.minMmol, unit);
    const targetMax = fromMmol(target.maxMmol, unit);
    return [Math.min(bounds[0], targetMin - 1), Math.max(bounds[1], targetMax + 1)];
  }, [data, target, unit]);

  const averageLine = overallAverage === null ? null : fromMmol(overallAverage, unit);
  const hasData = data.some((point) => point.average !== null);

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 6, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--brand)" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="dayOfMonth"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--ink-faint)" }}
            interval="preserveStartEnd"
            minTickGap={12}
          />
          <YAxis
            domain={[minDomain, maxDomain]}
            tickLine={false}
            axisLine={false}
            width={46}
            tick={{ fontSize: 11, fill: "var(--ink-faint)" }}
            tickFormatter={(value: number) => String(Math.round(value * 10) / 10)}
          />

          <ReferenceArea
            y1={fromMmol(target.minMmol, unit)}
            y2={fromMmol(target.maxMmol, unit)}
            fill="var(--ok)"
            fillOpacity={0.09}
            stroke="none"
            ifOverflow="extendDomain"
          />

          {averageLine !== null ? (
            <ReferenceLine
              y={averageLine}
              stroke="var(--ink-faint)"
              strokeDasharray="4 4"
              strokeWidth={1}
              ifOverflow="extendDomain"
            />
          ) : null}

          {/* Daily min..max band: fill up to the day's maximum, then paint the
              part below the minimum in the card colour so only the range
              itself is tinted. `baseValue="dataMin"` keeps the y-axis tight. */}
          <Area
            type="monotone"
            dataKey="high"
            baseValue="dataMin"
            stroke="none"
            fill="var(--brand)"
            fillOpacity={0.16}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="low"
            baseValue="dataMin"
            stroke="none"
            fill="var(--surface)"
            fillOpacity={1}
            isAnimationActive={false}
          />

          <Area
            type="monotone"
            dataKey="average"
            baseValue={minDomain}
            stroke="var(--brand)"
            strokeWidth={2.25}
            fill="url(#trend-fill)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="trend"
            stroke="var(--ink-faint)"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            dot={false}
            activeDot={false}
            connectNulls
          />

          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <Tooltip
            cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }}
            content={renderTrendTooltip(unit)}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {!hasData ? (
        <p className="-mt-40 text-center text-xs text-ink-faint">No readings in this period</p>
      ) : null}
    </div>
  );
}

interface TooltipPayloadItem {
  value?: number | string | null;
  payload?: ChartPoint;
}

function renderTrendTooltip(unit: GlucoseUnit) {
  return function TooltipContent(props: unknown) {
    const payload = (props as { active?: boolean; payload?: TooltipPayloadItem[] }).payload ?? [];
    if (!payload || payload.length === 0) return null;

    const point = payload[0]?.payload;
    if (!point) return null;

    const decimals = unit === "mg/dL" ? 0 : 1;

    return (
      <div className="rounded-2xl border border-line bg-bg-elevated px-3 py-2 shadow-card">
        <p className="text-[0.7rem] font-semibold text-ink-faint">{point.label}</p>
        <p className="tabular mt-0.5 text-sm font-semibold text-ink">
          {point.average === null ? "—" : `${point.average.toFixed(decimals)} ${unit}`}
        </p>
        <p className="text-[0.7rem] text-ink-faint">
          {point.count} reading{point.count === 1 ? "" : "s"}
          {point.low !== null && point.high !== null
            ? ` · ${point.low.toFixed(decimals)}–${point.high.toFixed(decimals)}`
            : ""}
        </p>
      </div>
    );
  };
}