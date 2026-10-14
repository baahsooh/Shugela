"use client";

import { TREND_RANGES } from "@/lib/constants";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { TrendDays } from "@/lib/constants";

export function TrendRangePicker({
  value,
  onChange,
}: {
  value: TrendDays;
  onChange: (days: TrendDays) => void;
}) {
  return (
    <SegmentedControl<TrendDays>
      label="Trend range"
      value={value}
      onChange={onChange}
      options={TREND_RANGES.map((range) => ({ value: range.days, label: range.label }))}
    />
  );
}