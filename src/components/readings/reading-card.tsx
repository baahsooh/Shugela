"use client";

import Link from "next/link";

import { MeasurementIcon } from "@/components/measurements/measurement-icon";
import { MEASUREMENT_TYPE_META } from "@/lib/constants";
import { formatRelativeDay, formatTime } from "@/lib/dates";
import { classify, formatGlucose, isCritical, statusLabel } from "@/lib/glucose";
import type { GlucoseReading, GlucoseUnit, TargetRanges } from "@/lib/types";

export function ReadingCard({
  reading,
  unit,
  targetRanges,
  showDate,
}: {
  reading: GlucoseReading;
  unit: GlucoseUnit;
  targetRanges: TargetRanges;
  showDate?: boolean;
}) {
  const measuredAt = new Date(reading.measuredAt);
  const meta = MEASUREMENT_TYPE_META[reading.measurementType];
  const status = classify(reading.glucoseMmol, reading.measurementType, targetRanges);
  const critical = isCritical(reading.glucoseMmol);
  const converted = unit !== reading.enteredUnit;

  return (
    <Link
      href={`/readings/${reading.id}`}
      className="flex items-center gap-3 rounded-3xl border border-line bg-surface p-3.5 shadow-card transition-colors active:bg-surface-muted"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-surface-muted text-ink-soft">
        <MeasurementIcon icon={meta.icon} className="size-5" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{meta.label}</p>
        <p className="tabular text-xs text-ink-faint">
          {showDate ? `${formatRelativeDay(measuredAt)} · ` : ""}
          {formatTime(measuredAt)}
        </p>
        {reading.note ? (
          <p className="mt-1 truncate text-xs text-ink-soft">“{reading.note}”</p>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <p className="tabular text-lg font-semibold leading-none text-ink">
          {formatGlucose(reading.glucoseMmol, unit)}
          <span className="ml-0.5 text-[0.7rem] font-medium text-ink-faint">{unit}</span>
        </p>
        <StatusBadge status={status} critical={critical} />
        {converted ? (
          <span className="tabular text-[0.65rem] text-ink-faint">
            {formatGlucose(reading.glucoseMmol, reading.enteredUnit)} {reading.enteredUnit} entered
          </span>
        ) : null}
      </div>
    </Link>
  );
}

export function StatusBadge({
  status,
  critical,
}: {
  status: "low" | "in-range" | "high";
  critical?: boolean;
}) {
  const tone = critical
    ? "bg-danger-soft text-danger"
    : status === "in-range"
      ? "bg-ok-soft text-ok"
      : status === "low"
        ? "bg-warn-soft text-warn"
        : "bg-danger-soft text-danger";

  return (
    <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${tone}`}>
      {statusLabel(status)}
    </span>
  );
}

/** Compact variant used on the home screen. */
export function ReadingRow({
  reading,
  unit,
}: {
  reading: GlucoseReading;
  unit: GlucoseUnit;
}) {
  const meta = MEASUREMENT_TYPE_META[reading.measurementType];

  return (
    <Link
      href={`/readings/${reading.id}`}
      className="flex items-center gap-3 rounded-2xl px-1 py-2.5 transition-colors active:bg-surface-muted"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-ink-soft">
        <MeasurementIcon icon={meta.icon} className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{meta.short}</p>
        <p className="tabular text-xs text-ink-faint">
          {formatTime(new Date(reading.measuredAt))}
        </p>
      </div>
      <p className="tabular shrink-0 text-sm font-semibold text-ink">
        {formatGlucose(reading.glucoseMmol, unit)}
        <span className="ml-1 text-[0.65rem] font-medium text-ink-faint">{unit}</span>
      </p>
    </Link>
  );
}