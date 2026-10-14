"use client";

import type { RangeStats } from "@/lib/trends";
import { cn } from "@/lib/utils";

/**
 * Time-in-range strip. Segments are proportional so an empty range still
 * renders a full-width grey bar.
 */
export function TimeInRangeBar({ stats }: { stats: RangeStats }) {
  const total = stats.count;
  const safeTotal = total === 0 ? 1 : total;
  const inRange = (stats.inRangeCount / safeTotal) * 100;
  const high = (stats.highCount / safeTotal) * 100;
  const low = (stats.lowCount / safeTotal) * 100;

  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-sunken">
        <span className="bg-ok transition-[width] duration-500" style={{ width: `${inRange}%` }} />
        <span className="bg-warn transition-[width] duration-500" style={{ width: `${low}%` }} />
        <span className="bg-danger transition-[width] duration-500" style={{ width: `${high}%` }} />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <LegendDot className="bg-ok" label="In range" value={`${stats.inRangeCount}`} share={stats.count ? `${Math.round(inRange)}%` : "—"} />
        <LegendDot className="bg-warn" label="Low" value={`${stats.lowCount}`} share={stats.count ? `${Math.round(low)}%` : "—"} />
        <LegendDot className="bg-danger" label="High" value={`${stats.highCount}`} share={stats.count ? `${Math.round(high)}%` : "—"} />
      </div>
    </div>
  );
}

function LegendDot({
  className,
  label,
  value,
  share,
}: {
  className: string;
  label: string;
  value: string;
  share: string;
}) {
  return (
    <span className="flex items-center gap-1.5 text-ink-faint">
      <span className={cn("size-2 rounded-full", className)} />
      {label}
      <span className="tabular font-semibold text-ink">{value}</span>
      <span className="tabular">({share})</span>
    </span>
  );
}