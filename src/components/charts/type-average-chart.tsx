"use client";

import { useMemo } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { MEASUREMENT_TYPE_META } from "@/lib/constants";
import { fromMmol } from "@/lib/glucose";
import type { TypeSummary } from "@/lib/trends";
import type { GlucoseUnit } from "@/lib/types";

const BAR_COLORS: Record<string, string> = {
  ok: "var(--ok)",
  warn: "var(--warn)",
  danger: "var(--danger)",
  neutral: "var(--border-strong)",
};

/** Average glucose per measurement type — answers "which meal spikes me?" */
export function TypeAverageChart({
  summaries,
  unit,
}: {
  summaries: TypeSummary[];
  unit: GlucoseUnit;
}) {
  const data = useMemo(
    () =>
      summaries.map((summary) => ({
        type: summary.type,
        name: MEASUREMENT_TYPE_META[summary.type].short,
        average: summary.averageMmol === null ? 0 : fromMmol(summary.averageMmol, unit),
        present: summary.count > 0,
        tone:
          summary.averageMmol === null
            ? "neutral"
            : summary.inRangeRatio >= 0.75
              ? "ok"
              : summary.inRangeRatio >= 0.4
                ? "warn"
                : "danger",
      })),
    [summaries, unit],
  );

  const hasData = data.some((entry) => entry.present);

  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <YAxis
            type="category"
            dataKey="name"
            width={86}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--ink-soft)" }}
          />
          <Tooltip
            cursor={{ fill: "var(--surface-muted)" }}
            content={(props: unknown) => <BarTooltip unit={unit} {...(props as object)} />}
          />
          <Bar dataKey="average" radius={[0, 8, 8, 0]} barSize={18} isAnimationActive={false}>
            {data.map((entry) => (
              <Cell key={entry.type} fill={BAR_COLORS[entry.tone]} fillOpacity={entry.present ? 1 : 0.35} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {!hasData ? (
        <p className="-mt-32 text-center text-xs text-ink-faint">Nothing logged yet</p>
      ) : null}
    </div>
  );
}

function BarTooltip({ unit, active, payload }: { unit: GlucoseUnit; active?: boolean; payload?: { payload?: { average: number; present: boolean } }[] }) {
  const point = payload?.[0]?.payload;
  if (!active || !point || !point.present) return null;
  const decimals = unit === "mg/dL" ? 0 : 1;
  return (
    <div className="rounded-2xl border border-line bg-bg-elevated px-3 py-2 shadow-card">
      <p className="tabular text-sm font-semibold text-ink">
        {point.average.toFixed(decimals)} {unit}
      </p>
    </div>
  );
}