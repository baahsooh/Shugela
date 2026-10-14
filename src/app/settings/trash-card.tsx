"use client";

import { useEffect, useState } from "react";

import { HistoryIcon, TrashIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/providers/toast-provider";
import { emptyTrash, getTrash, restoreAllTrash, restoreReading } from "@/db/readings";
import { TRASH_RETENTION_DAYS, type TrashedReading } from "@/db/db";
import { MEASUREMENT_TYPE_META } from "@/lib/constants";
import { formatGlucose } from "@/lib/glucose";

/**
 * Recycle bin. Deletes are recoverable for 30 days, which turns the worst
 * possible mistake — "Delete all readings" — into a two-tap undo.
 */
export function TrashCard() {
  const toast = useToast();
  const [entries, setEntries] = useState<TrashedReading[]>([]);
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  const refresh = () => {
    void getTrash().then(setEntries);
  };

  useEffect(refresh, []);

  if (entries.length === 0) return null;

  const handleRestoreAll = async () => {
    const count = await restoreAllTrash();
    refresh();
    toast({ title: `${count} reading${count === 1 ? "" : "s"} restored` });
  };

  const handleEmpty = async () => {
    const count = await emptyTrash();
    refresh();
    toast({ title: `${count} reading${count === 1 ? "" : "s"} deleted for good` });
  };

  return (
    <Card>
      <CardTitle
        action={
          <span className="text-xs font-medium text-ink-faint">
            kept {TRASH_RETENTION_DAYS} days
          </span>
        }
      >
        Recently deleted
      </CardTitle>

      <div className="mb-3 flex flex-col divide-y divide-line">
        {entries.slice(0, 5).map((entry) => (
          <div key={entry.id} className="flex items-center gap-3 py-2">
            <HistoryIcon className="size-4 shrink-0 text-ink-faint" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">
                {MEASUREMENT_TYPE_META[entry.reading.measurementType].label}
              </p>
              <p className="tabular text-xs text-ink-faint">
                {new Date(entry.reading.measuredAt).toLocaleDateString()} ·{" "}
                {formatGlucose(entry.reading.glucoseMmol, entry.reading.enteredUnit)}{" "}
                {entry.reading.enteredUnit}
              </p>
            </div>
            <Button
              variant="subtle"
              size="sm"
              onClick={async () => {
                await restoreReading(entry.id);
                refresh();
              }}
            >
              Restore
            </Button>
          </div>
        ))}
        {entries.length > 5 ? (
          <p className="py-2 text-xs text-ink-faint">+{entries.length - 5} more</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Button variant="secondary" size="lg" fullWidth onClick={handleRestoreAll}>
          Restore all {entries.length}
        </Button>
        <Button variant="danger" size="lg" fullWidth onClick={() => setConfirmEmpty(true)}>
          <TrashIcon className="size-5" />
          Empty trash
        </Button>
      </div>

      <ConfirmDialog
        open={confirmEmpty}
        title="Delete for good?"
        description={`${entries.length} reading${entries.length === 1 ? "" : "s"} will be permanently removed, including from your cloud backup. This cannot be undone.`}
        confirmLabel="Delete for good"
        destructive
        onCancel={() => setConfirmEmpty(false)}
        onConfirm={handleEmpty}
      />
    </Card>
  );
}